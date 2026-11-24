import type { RuntimeSkillSource, TokenUsage } from '@n8n/agents';
import type { InstanceContextInjection } from '@n8n/api-types';
import type { TelemetryProxy } from '@n8n/backend-services';
import {
	deriveInstanceContextReach,
	mapAgentChunkToEvent,
	orchestratorAgentId,
	patchThread,
	suspendedInstanceContextSchema,
	WorkSummaryAccumulator,
	type HubSkillTelemetryState,
} from '@n8n/instance-ai';
import { isRecord } from '@n8n/utils/is-record';

import type {
	AgentExecutionStreamChunk,
	SystemAgentTurnOutcome,
} from '@/modules/agents/system-agents/system-agent.types';

import { InstanceAiSkillTelemetry } from '../instance-ai-skill-telemetry';
import { trackInstanceContextTurn } from '../instance-context-turn-telemetry';
import type { AssistantTurnMemory } from '../turn-setup/assistant-turn-runtime';

/** Thread metadata key with the instance context of the suspended turn of the thread. */
export const SUSPENDED_CONTEXT_TURN_METADATA_KEY = 'assistantSuspendedContextTurn';

/** The instance context of one turn. A resume reports its segments with it. */
export interface AssistantContextTurnState {
	injection: InstanceContextInjection;
	instanceContextEnabled: boolean;
	nodeUsageEnabled: boolean;
	hubSkills?: HubSkillTelemetryState;
}

interface AssistantContextTurnScope {
	userId: string;
	threadId: string;
	runId: string;
	/** A resume reports a `resumed` segment when it ends the turn. */
	resumed: boolean;
	/** Cards that a resume sends again. They do not count as new questions. */
	openToolCallIds?: ReadonlySet<string>;
}

/**
 * Sends "Instance AI instance-context turn completed", with the Hub skill use,
 * for each segment of an Assistant turn on the Agents runtime. The runtime owns
 * the model stream, so the orchestrator events come from its chunks.
 */
export class AssistantContextTurnTelemetry {
	private readonly skills: InstanceAiSkillTelemetry;

	private readonly work = new WorkSummaryAccumulator();

	private context: Omit<AssistantContextTurnState, 'hubSkills'> | undefined;

	constructor(
		private readonly telemetry: TelemetryProxy,
		private readonly scope: AssistantContextTurnScope,
		saved?: AssistantContextTurnState,
	) {
		this.skills = new InstanceAiSkillTelemetry(orchestratorAgentId(scope.runId), saved?.hubSkills);
		if (saved) {
			const { hubSkills: _, ...context } = saved;
			this.context = context;
		}
	}

	bind(source?: RuntimeSkillSource): void {
		this.skills.bind(source);
	}

	/** The start turn builds the instance context block. Without it, no segment is reported. */
	setContext(context: Omit<AssistantContextTurnState, 'hubSkills'>): void {
		this.context = context;
	}

	observeChunk(chunk: AgentExecutionStreamChunk): void {
		if (chunk.type === 'tool-call-suspended' && this.scope.openToolCallIds?.has(chunk.toolCallId)) {
			return;
		}
		const agentId = orchestratorAgentId(this.scope.runId);
		const event = mapAgentChunkToEvent(this.scope.runId, agentId, chunk);
		if (!event) return;
		this.work.observe(event);
		this.skills.observe(event);
	}

	report(status: SystemAgentTurnOutcome['status'], usage?: TokenUsage): void {
		if (!this.context) return;
		const workSummary = this.work.toSummary();
		const { userId, threadId, runId, resumed } = this.scope;
		trackInstanceContextTurn(
			this.telemetry,
			{ runtime: 'agents', skills: this.skills, userId, threadId, runId, ...this.context },
			{
				segment: status === 'suspended' ? 'suspended' : resumed ? 'resumed' : 'whole',
				status,
				reach: deriveInstanceContextReach(workSummary.toolCalls),
				workSummary,
				...(usage
					? {
							usage: {
								promptTokens: usage.promptTokens,
								completionTokens: usage.completionTokens,
								totalTokens: usage.totalTokens,
								...(usage.cost !== undefined ? { costUsd: usage.cost } : {}),
							},
						}
					: {}),
			},
		);
	}

	save(): AssistantContextTurnState | undefined {
		return this.context && { ...this.context, hubSkills: this.skills.save() };
	}
}

/** The instance context that the suspended segment of the run stored, if any. */
export async function readSuspendedContextTurn(
	memory: AssistantTurnMemory,
	threadId: string,
	runId: string,
): Promise<AssistantContextTurnState | undefined> {
	const stored = (await memory.getThread(threadId))?.metadata?.[
		SUSPENDED_CONTEXT_TURN_METADATA_KEY
	];
	if (!isRecord(stored) || stored.runId !== runId) return undefined;
	return suspendedInstanceContextSchema.omit({ reachSoFar: true }).safeParse(stored.context).data;
}

/**
 * Stores the instance context of a suspended run, or removes it when the run
 * ends. A thread has one suspended run at a time, so a new suspension replaces
 * the context of a run that the user left.
 */
export async function writeSuspendedContextTurn(
	memory: AssistantTurnMemory,
	threadId: string,
	runId: string,
	context: AssistantContextTurnState | undefined,
): Promise<void> {
	await patchThread(memory, {
		threadId,
		update: ({ metadata }) => {
			const stored = metadata?.[SUSPENDED_CONTEXT_TURN_METADATA_KEY];
			if (context) {
				return {
					metadata: { ...metadata, [SUSPENDED_CONTEXT_TURN_METADATA_KEY]: { runId, context } },
				};
			}
			if (!isRecord(stored) || stored.runId !== runId) return null;
			const { [SUSPENDED_CONTEXT_TURN_METADATA_KEY]: _, ...rest } = metadata ?? {};
			return { metadata: rest };
		},
	});
}
