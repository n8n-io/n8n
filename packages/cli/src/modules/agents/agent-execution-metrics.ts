import { EventService } from '@n8n/backend-services';
import { Service } from '@n8n/di';

import type {
	AgentMetricsExecutionStatus,
	AgentMetricsScope,
} from '@/events/maps/agent-metrics.event-map';

import { AgentExecutionProbe } from './agent-execution-probe';
import type { AgentExecutionHitlStatus } from './entities/agent-execution.entity';
import type { MessageRecord } from './execution-recorder';
import { SystemAgentRegistry } from './system-agents/system-agent-registry';

/** The ids that place an execution in the agent tree. */
export interface AgentMetricsSubject {
	agentId: string;
	/** The root agent that delegated the run. Absent for a top-level turn. */
	parentAgentId?: string | null;
}

/** The final row status of an execution, without `running` and `interrupted`. */
type FinishedRowStatus = 'success' | 'error' | 'cancelled' | 'awaiting';

/**
 * Turns the lifecycle of Agents executions into metrics events, and tracks the
 * executions that run in this process. Every agent reports, so the system
 * agents (such as the Assistant) and the agents of projects share one set of
 * series, told apart by the `agent` label.
 */
@Service()
export class AgentExecutionMetrics {
	constructor(
		private readonly eventService: EventService,
		private readonly systemAgents: SystemAgentRegistry,
		private readonly probe: AgentExecutionProbe,
	) {}

	/**
	 * A delegated run counts for the agent at the root of the tree: the
	 * runtime keeps the root id as the parent of nested delegations.
	 */
	scopeOf({ agentId, parentAgentId }: AgentMetricsSubject): AgentMetricsScope {
		const rootAgentId = parentAgentId ?? agentId;
		return {
			agent: this.systemAgents.has(rootAgentId) ? rootAgentId : 'project',
			kind: parentAgentId ? 'delegated' : 'turn',
		};
	}

	started(executionId: string, subject: AgentMetricsSubject): void {
		this.probe.track(executionId, this.scopeOf(subject));
	}

	/** The execution stopped running in this process, with or without a final record. */
	stopped(executionId: string): void {
		this.probe.untrack(executionId);
	}

	finished(
		subject: AgentMetricsSubject,
		outcome: { status: FinishedRowStatus; hitlStatus?: AgentExecutionHitlStatus },
		record: MessageRecord,
	): void {
		const status: Exclude<AgentMetricsExecutionStatus, 'interrupted'> =
			outcome.status === 'success' && outcome.hitlStatus === 'suspended'
				? 'suspended'
				: outcome.status;
		this.eventService.emit('agent-execution-finished', {
			...this.scopeOf(subject),
			status,
			durationMs: record.duration,
			toolCalls: countToolCalls(record),
			tokens: {
				input: record.usage?.promptTokens ?? 0,
				output: record.usage?.completionTokens ?? 0,
				cacheRead: record.cacheReadTokens ?? 0,
				cacheWrite: record.cacheWriteTokens ?? 0,
			},
			...(record.totalCost !== null ? { costUsd: record.totalCost } : {}),
		});
	}

	interrupted(subject: AgentMetricsSubject): void {
		this.eventService.emit('agent-execution-interrupted', this.scopeOf(subject));
	}
}

/**
 * Counts the tool calls that ended in this execution. A call that is still
 * open, or that suspended, has no result here: the turn that resumes it
 * records the result, so each call counts once.
 */
function countToolCalls(record: MessageRecord) {
	const suspended = new Set(
		record.timeline.flatMap((event) => (event.type === 'suspension' ? [event.toolCallId] : [])),
	);
	const counts = { success: 0, error: 0, cancelled: 0 };
	for (const event of record.timeline) {
		if (event.type !== 'tool-call' || event.endTime === 0) continue;
		if (suspended.has(event.toolCallId)) continue;
		if (event.canceled) counts.cancelled++;
		else if (event.success) counts.success++;
		else counts.error++;
	}
	return counts;
}
