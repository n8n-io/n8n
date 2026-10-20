import type {
	Agent as RuntimeAgent,
	ExecutionOptions,
	JSONObject,
	ResumeOptions,
	RunOptions,
} from '@n8n/agents';
import type { User } from '@n8n/db';

import type { AgentTurnRequest } from '../agent-turn-execution.service';
import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import type { ToolRegistry } from '../tool-registry';
import type { StoredAttachmentRef } from '../types/agent-chat-attachment';
import type { AgentExecutionStreamChunk } from '../types/agent-steering';
import type { AgentTurnFinalizeOutcome, AgentTurnStatus } from '../types/agent-turn-outcome';

/** Provider-defined, JSON-safe turn options. The queue stores them with the message. */
export type SystemAgentTurnOptions = Record<string, unknown>;

interface SystemAgentTurnBase {
	user: User;
	thread: AgentExecutionThread;
	resourceId: string;
	/** Aborts when the turn stops: a user cancel, the queue, or `runOptions.abortSignal`. */
	abortSignal: AbortSignal;
}

export interface SystemAgentStartTurn extends SystemAgentTurnBase {
	type: 'start';
	/** Execution id when the queue admitted the turn. */
	executionId?: string;
	/** The message as the user wrote it. It is the stored transcript text. */
	message: string;
	attachments: StoredAttachmentRef[];
	options: SystemAgentTurnOptions;
}

export interface SystemAgentResumeTurn
	extends SystemAgentTurnBase,
		Pick<ResumeOptions, 'runId' | 'toolCallId'> {
	type: 'resume';
	/** Host metadata the suspended run stored in its checkpoint. */
	checkpointHostMetadata: JSONObject;
	resumeData: unknown;
}

export type SystemAgentTurn = SystemAgentStartTurn | SystemAgentResumeTurn;

export type SystemAgentTurnStatus = AgentTurnStatus;

/**
 * The outcome that the runtime stores for the turn. A turn that failed
 * before it had an execution record has no `executionId`.
 */
export type SystemAgentTurnOutcome = Omit<AgentTurnFinalizeOutcome, 'executionId'> & {
	executionId?: string;
};

/** A built runtime for one turn, plus the hooks the host calls while the turn runs. */
export interface SystemAgentTurnHandle {
	agent: RuntimeAgent;
	toolRegistry?: ToolRegistry;
	/** Model input for a start turn. Defaults to the stored message. */
	input?: Extract<AgentTurnRequest, { type: 'start' }>['input'];
	/** Stored on the checkpoint. A resume receives it back. */
	hostMetadata?: JSONObject;
	/**
	 * Extra SDK run options, such as telemetry. `abortSignal` stops the turn at
	 * any time. The host sets `persistence`, so a provider cannot change it.
	 */
	runOptions?: Omit<Partial<RunOptions & ExecutionOptions> & Partial<ResumeOptions>, 'persistence'>;
	onChunk?: (chunk: AgentExecutionStreamChunk) => void;
	/**
	 * Called once per turn with its outcome, before the runtime stores the
	 * turn record. A turn without an execution record settles after it fails.
	 */
	onSettled?: (outcome: SystemAgentTurnOutcome) => Promise<void>;
}

/**
 * A code-defined, instance-level agent. The Agents runtime owns the queue,
 * steering, checkpoints, HITL resume and recording. The provider builds a
 * fresh runtime for each turn and adds its own access checks on top of the
 * runtime floor (see `canUseSystemAgent`).
 */
export interface SystemAgentProvider {
	readonly agentId: string;
	readonly name: string;
	/**
	 * Agent-specific access checks for the user in the working project. The
	 * runtime calls this only after its own floor check passed.
	 */
	authorize(user: User, projectId: string): Promise<boolean>;
	prepareTurn(turn: SystemAgentTurn): Promise<SystemAgentTurnHandle>;
	/** Turn options for a message sent through the system-agent chat route. */
	chatTurnOptions?(
		user: User,
		thread: AgentExecutionThread,
		clientContext?: Record<string, unknown>,
	): Promise<SystemAgentTurnOptions>;
	/** Convert a resume payload from a client into the tool's resume data. */
	normalizeResumeData?(resumeData: unknown): unknown;
}
