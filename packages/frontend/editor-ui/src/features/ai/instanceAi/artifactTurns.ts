import type {
	InstanceAiAgentActivity,
	InstanceAiAttachment,
	InstanceAiHandoffContext,
	InstanceAiTargetResource,
} from '@n8n/api-types';

/**
 * The input of the artifact readers: the artifacts panel, the previews and the
 * resource registry. Both runtimes map their own thread data to it. The tool
 * names, inputs and outputs are the same on both runtimes.
 */

/** The resource that a sub-agent was spawned to work on. */
export interface ArtifactSubAgentTarget extends InstanceAiTargetResource {
	activity?: InstanceAiAgentActivity;
}

export interface ArtifactToolCall {
	toolCallId: string;
	toolName: string;
	args: Record<string, unknown>;
	/** Absent while the call runs and when it failed. */
	result?: unknown;
	error?: string;
	isLoading: boolean;
	/** ISO timestamp. */
	startedAt?: string;
	/**
	 * The resource of the sub-agent that made or spawned the call. An old
	 * builder result has no resource id, so the readers take it from here.
	 * Only threads from before the builders ran in the main agent have it.
	 */
	subAgentTarget?: ArtifactSubAgentTarget;
}

/** The latest workflow that the setup flow announced in the turn. */
export interface ArtifactSetupAnnouncement {
	workflowId: string;
	/** ISO timestamp. Without it, every in-flight build of the turn can match. */
	timestamp?: string;
}

/** One message of the thread. */
export interface ArtifactTurn {
	id: string;
	role: 'user' | 'assistant';
	/** The agent still works on this turn. */
	isLive: boolean;
	/** The tool calls of the turn, oldest first. */
	toolCalls: ArtifactToolCall[];
	/** Resources attached to a user message. */
	attachments?: InstanceAiAttachment[];
	/** The hand-off context of a user message. */
	context?: InstanceAiHandoffContext;
	setupAnnouncement?: ArtifactSetupAnnouncement;
	/**
	 * The resources that the sub-agents of the turn were spawned onto, in
	 * spawn order. Only threads from before the builders ran in the main agent
	 * have sub-agents.
	 */
	subAgentTargets?: ArtifactSubAgentTarget[];
}

/** All tool calls of the thread, oldest first. */
export function* artifactToolCalls(turns: readonly ArtifactTurn[]): Generator<ArtifactToolCall> {
	for (const turn of turns) yield* turn.toolCalls;
}

/** The latest tool call of the thread for which `extract` returns a value. */
export function findLatestInTurns<T>(
	turns: readonly ArtifactTurn[],
	extract: (toolCall: ArtifactToolCall) => T | undefined,
): T | undefined {
	for (let i = turns.length - 1; i >= 0; i--) {
		const { toolCalls } = turns[i];
		for (let j = toolCalls.length - 1; j >= 0; j--) {
			const value = extract(toolCalls[j]);
			if (value !== undefined) return value;
		}
	}
	return undefined;
}
