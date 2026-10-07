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

interface SystemAgentTurnBase<TWorkspace> {
	user: User;
	thread: AgentExecutionThread;
	resourceId: string;
	abortSignal: AbortSignal;
	/** The lease from the provider's workspace source, when it has one. */
	workspace?: TWorkspace;
}

export interface SystemAgentStartTurn<TWorkspace = unknown>
	extends SystemAgentTurnBase<TWorkspace> {
	type: 'start';
	/** Execution id when the queue admitted the turn. */
	executionId?: string;
	/** The message as the user wrote it. It is the stored transcript text. */
	message: string;
	attachments: StoredAttachmentRef[];
	options: SystemAgentTurnOptions;
}

export interface SystemAgentResumeTurn<TWorkspace = unknown>
	extends SystemAgentTurnBase<TWorkspace> {
	type: 'resume';
	runId: string;
	toolCallId: string;
	/** Host metadata the suspended run stored in its checkpoint. */
	checkpointHostMetadata: JSONObject;
	resumeData: unknown;
}

export type SystemAgentTurn<TWorkspace = unknown> =
	| SystemAgentStartTurn<TWorkspace>
	| SystemAgentResumeTurn<TWorkspace>;

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
	projectId: string;
	user: User;
}

/**
 * Supplies the sandbox workspace of a system agent. The provider keeps its own
 * sandbox identity, images and lifecycle. The runtime only reports when a turn
 * starts and ends, and when a thread is deleted. The lease is opaque to the
 * runtime: it passes it to `prepareTurn` and back to `release`.
 */
export interface SystemAgentWorkspaceSource<TWorkspace = unknown> {
	/**
	 * The workspace lease for one turn. Do not start a sandbox here: start it on
	 * first use, so turns that do not use the sandbox stay cheap.
	 */
	acquire(scope: SystemAgentWorkspaceScope): Promise<TWorkspace | undefined>;
	/** The turn settled. The source can let the sandbox sleep or drop cached handles. */
	release?(
		scope: SystemAgentWorkspaceScope,
		workspace: TWorkspace,
		outcome: SystemAgentTurnOutcome,
	): Promise<void>;
	/** The thread was deleted. Delete its sandbox. */
	destroy?(scope: { agentId: string; threadId: string; userId?: string }): Promise<void>;
}

/**
 * A code-defined, instance-level agent. The Agents runtime owns the queue,
 * steering, checkpoints, HITL resume and recording. The provider builds a
 * fresh runtime for each turn and decides who can use the agent.
 */
export interface SystemAgentProvider<TWorkspace = unknown> {
	readonly agentId: string;
	readonly name: string;
	/** Sandbox workspace source. Without it, the agent's turns have no sandbox. */
	readonly workspace?: SystemAgentWorkspaceSource<TWorkspace>;
	/** Whether the user can use this agent in the given working project. */
	authorize(user: User, projectId: string): Promise<boolean>;
	prepareTurn(turn: SystemAgentTurn<TWorkspace>): Promise<SystemAgentTurnHandle>;
	/** Turn options for a message sent through the generic Agents chat endpoints. */
	chatTurnOptions?(
		user: User,
		thread: AgentExecutionThread,
		hostContext?: Record<string, unknown>,
	): Promise<SystemAgentTurnOptions>;
	/** Convert a resume payload from a client into the tool's resume data. */
	normalizeResumeData?(resumeData: unknown): unknown;
}
