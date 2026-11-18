import type { PolicedSession, PolicedToolCallRecord } from '@n8n/decorators';
import { Service } from '@n8n/di';

import { AgentExecutionService } from './agent-execution.service';
import type { AgentExecution } from './entities/agent-execution.entity';
import { AgentExecutionThreadRepository } from './repositories/agent-execution-thread.repository';

function storedToolCalls(executions: AgentExecution[]): PolicedToolCallRecord[] {
	return executions.flatMap((execution) =>
		(execution.timeline ?? []).flatMap((event) =>
			event.type === 'tool-call'
				? [
						{
							toolCallId: event.toolCallId,
							toolName: event.name,
							input: event.input,
							status: event.canceled ? 'canceled' : event.success ? 'success' : 'error',
							output: event.output,
						} satisfies PolicedToolCallRecord,
					]
				: [],
		),
	);
}

/**
 * The stored timeline lags a turn that still runs, and the run can hold older turns in memory
 * too. So a call that both have comes from the run, and the calls that only the run has are
 * the newest and go last.
 */
function withRunToolCalls(
	stored: PolicedToolCallRecord[],
	run: readonly PolicedToolCallRecord[],
): PolicedToolCallRecord[] {
	const fromRun = new Map(run.map((call) => [call.toolCallId, call]));
	const storedIds = new Set(stored.map((call) => call.toolCallId));

	return [
		...stored.map((call) => fromRun.get(call.toolCallId) ?? call),
		...run.filter((call) => !storedIds.has(call.toolCallId)),
	];
}

/** Reads the tool call history that a tool call policy decides on. */
@Service()
export class AgentToolCallHistoryService {
	constructor(
		private readonly threadRepository: AgentExecutionThreadRepository,
		private readonly agentExecutionService: AgentExecutionService,
	) {}

	/**
	 * The tool calls of a session and of each session that delegated to it, from the session up
	 * to the root. `runToolCalls` are the calls that the running turn holds in memory.
	 *
	 * `threadId` must come from the run itself. No access check is made.
	 */
	async sessionHistory(
		threadId: string | null,
		agentId: string,
		runToolCalls: readonly PolicedToolCallRecord[],
	): Promise<PolicedSession[]> {
		if (threadId === null) return [{ threadId, agentId, toolCalls: runToolCalls }];

		const chain = await this.threadRepository.findDelegationChain(threadId);
		const sessions: PolicedSession[] = [];
		// ponytail: one read for each level, with whole timelines. Add a tool call projection
		// if a check on long sessions comes near its deadline.
		for (const [level, session] of chain.entries()) {
			const stored =
				session.agentId === null
					? []
					: storedToolCalls(
							await this.agentExecutionService.findThreadExecutions(session.id, session.agentId),
						);
			sessions.push({
				threadId: session.id,
				agentId: session.agentId,
				toolCalls: level === 0 ? withRunToolCalls(stored, runToolCalls) : stored,
			});
		}
		return sessions;
	}
}
