import type {
	Agent as RuntimeAgent,
	ExecutionOptions,
	JSONObject,
	Message,
	ResumeOptions,
	RunOptions,
	SerializableAgentState,
} from '@n8n/agents';
import type { User } from '@n8n/db';

import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import type { ToolRegistry } from '../tool-registry';
import type { StoredAttachmentRef } from '../types/agent-chat-attachment';
import type { AgentExecutionStreamChunk } from '../types/agent-steering';

/** Provider-defined, JSON-safe turn options. The queue stores them with the message. */
export type SystemAgentTurnOptions = Record<string, unknown>;

interface SystemAgentTurnBase {
	user: User;
	thread: AgentExecutionThread;
	resourceId: string;
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

export interface SystemAgentResumeTurn extends SystemAgentTurnBase {
	type: 'resume';
	runId: string;
	toolCallId: string;
	/** Host metadata the suspended run stored in its checkpoint. */
	checkpointHostMetadata: JSONObject;
	resumeData: unknown;
}

export type SystemAgentTurn = SystemAgentStartTurn | SystemAgentResumeTurn;

export type SystemAgentTurnStatus = 'completed' | 'suspended' | 'errored' | 'cancelled';

export interface SystemAgentTurnOutcome {
	status: SystemAgentTurnStatus;
	executionId?: string;
	error?: unknown;
}

/** A built runtime for one turn, plus the hooks the host calls while the turn runs. */
export interface SystemAgentTurnHandle {
	agent: RuntimeAgent;
	toolRegistry?: ToolRegistry;
	/** Model input for a start turn. Defaults to the stored message. */
	input?: string | Message[];
	/** Stored on the checkpoint. A resume receives it back. */
	hostMetadata?: JSONObject;
	/** Extra SDK run options, such as telemetry. */
	runOptions?: Partial<RunOptions & ExecutionOptions> & Partial<ResumeOptions>;
	/** Hide the user message from the transcript (machine turns). */
	hideUserMessage?: boolean;
	onChunk?: (chunk: AgentExecutionStreamChunk) => void;
	onSettled?: (outcome: SystemAgentTurnOutcome) => Promise<void>;
}

/**
 * Rules for a thread that its owner shared with the thread's project. The owner keeps full
 * use of the thread. These checks apply only to users who do not own it.
 */
export interface SystemAgentSharingPolicy {
	/** Whether the user can read a thread that another user owns. */
	canRead(user: User, thread: AgentExecutionThread): Promise<boolean>;
	/** Whether the user can read the threads that other users shared in the project. */
	canReadSharedIn(user: User, projectId: string): Promise<boolean>;
	/** The error for a reader who tries to send a message to the thread. */
	sendError(user: User, thread: AgentExecutionThread): Promise<Error>;
	/**
	 * Check that a reader may answer the pending `call`. Throws when the reader may not.
	 * Returns the answer to resume with, which can differ from `resumeData`.
	 */
	authorizeAnswer(
		user: User,
		thread: AgentExecutionThread,
		call: SystemAgentPendingCall,
		resumeData: unknown,
	): Promise<unknown>;
}

/**
 * The suspended tool call that an answer resumes. The input is what the model sent. The
 * suspend payload is the card, as the tool stored it in the checkpoint.
 */
export type SystemAgentPendingCall = Pick<
	SerializableAgentState['pendingToolCalls'][string],
	'toolName' | 'input'
> & { suspendPayload: unknown };

/**
 * A code-defined, instance-level agent. The Agents runtime owns the queue,
 * steering, checkpoints, HITL resume and recording. The provider builds a
 * fresh runtime for each turn and decides who can use the agent.
 */
export interface SystemAgentProvider {
	readonly agentId: string;
	readonly name: string;
	/** Whether the user can use this agent in the given working project. */
	authorize(user: User, projectId: string): Promise<boolean>;
	prepareTurn(turn: SystemAgentTurn): Promise<SystemAgentTurnHandle>;
	/** Turn options for a message sent through the generic Agents chat endpoints. */
	chatTurnOptions?(
		user: User,
		thread: AgentExecutionThread,
		hostContext?: Record<string, unknown>,
	): Promise<SystemAgentTurnOptions>;
	/** Convert a resume payload from a client into the tool's resume data. */
	normalizeResumeData?(resumeData: unknown): unknown;
	/** Rules for shared threads. Without them, only the owner can use a thread. */
	readonly sharing?: SystemAgentSharingPolicy;
}
