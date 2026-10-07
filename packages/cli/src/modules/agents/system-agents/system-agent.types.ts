import type {
	Agent as RuntimeAgent,
	ExecutionOptions,
	JSONObject,
	Message,
	ResumeOptions,
	RunOptions,
} from '@n8n/agents';
import type { User } from '@n8n/db';

import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import type { ToolRegistry } from '../tool-registry';
import type { StoredAttachmentRef } from '../types/agent-chat-attachment';
import type { AgentExecutionStreamChunk } from '../types/agent-steering';

/** Provider-defined, JSON-safe turn options. The queue stores them with the message. */
export type SystemAgentTurnOptions = Record<string, unknown>;

interface SystemAgentTurnBase<TLease> {
	user: User;
	thread: AgentExecutionThread;
	resourceId: string;
	abortSignal: AbortSignal;
	/** The lease from the provider's workspace source. It is not set when the provider has no source. */
	workspace?: TLease;
}

export interface SystemAgentStartTurn<TLease = unknown> extends SystemAgentTurnBase<TLease> {
	type: 'start';
	/** Execution id when the queue admitted the turn. */
	executionId?: string;
	/** The message as the user wrote it. It is the stored transcript text. */
	message: string;
	attachments: StoredAttachmentRef[];
	options: SystemAgentTurnOptions;
}

export interface SystemAgentResumeTurn<TLease = unknown> extends SystemAgentTurnBase<TLease> {
	type: 'resume';
	runId: string;
	toolCallId: string;
	/** Host metadata the suspended run stored in its checkpoint. */
	checkpointHostMetadata: JSONObject;
	resumeData: unknown;
}

export type SystemAgentTurn<TLease = unknown> =
	| SystemAgentStartTurn<TLease>
	| SystemAgentResumeTurn<TLease>;

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

/** The sandbox scope of one thread of a system agent. */
export interface SystemAgentWorkspaceScope {
	agentId: string;
	threadId: string;
	/** The working project of the thread. */
	projectId: string;
	user: User;
}

/** The scope of a deleted thread. A host that deletes threads on its own path may not know the user. */
export interface SystemAgentWorkspaceDestroyScope {
	agentId: string;
	threadId: string;
	userId?: string;
}

/**
 * Supplies the sandbox workspace of a system agent. The provider keeps its own
 * sandbox identity, images and lifecycle. The runtime only reports when a turn
 * starts and settles, and when a thread is deleted. The lease is opaque to the
 * runtime: it passes the lease to `prepareTurn` and back to `release`.
 */
export interface SystemAgentWorkspaceSource<TLease = unknown> {
	/**
	 * Give the lease for one turn (start or resume). Return `undefined` when the
	 * turn has no workspace. Do not start a sandbox here. Start it on first use,
	 * so that a turn that does not use the sandbox stays cheap.
	 */
	acquire(scope: SystemAgentWorkspaceScope): Promise<TLease | undefined>;
	/**
	 * The turn settled. The source can let the sandbox sleep or drop cached
	 * handles. A failure is logged and does not change the turn result.
	 */
	release?(
		scope: SystemAgentWorkspaceScope,
		lease: TLease,
		outcome: SystemAgentTurnOutcome,
	): Promise<void>;
	/** The thread was deleted. Delete its sandbox. A failure is logged. */
	destroy?(scope: SystemAgentWorkspaceDestroyScope): Promise<void>;
}

/**
 * A code-defined, instance-level agent. The Agents runtime owns the queue,
 * steering, checkpoints, HITL resume and recording. The provider builds a
 * fresh runtime for each turn and adds its own access checks on top of the
 * runtime floor (see `canUseSystemAgent`).
 */
export interface SystemAgentProvider<TLease = unknown> {
	readonly agentId: string;
	readonly name: string;
	/** The sandbox workspace source. Without a source, the turns of the agent have no sandbox. */
	readonly workspace?: SystemAgentWorkspaceSource<TLease>;
	/**
	 * Agent-specific access checks for the user in the working project. The
	 * runtime calls this only after its own floor check passed.
	 */
	authorize(user: User, projectId: string): Promise<boolean>;
	prepareTurn(turn: SystemAgentTurn<TLease>): Promise<SystemAgentTurnHandle>;
	/** Turn options for a message sent through the system-agent chat route. */
	chatTurnOptions?(
		user: User,
		thread: AgentExecutionThread,
		clientContext?: Record<string, unknown>,
	): Promise<SystemAgentTurnOptions>;
	/** Convert a resume payload from a client into the tool's resume data. */
	normalizeResumeData?(resumeData: unknown): unknown;
}
