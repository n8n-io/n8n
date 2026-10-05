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
	chatTurnOptions?(user: User, thread: AgentExecutionThread): Promise<SystemAgentTurnOptions>;
	/** Convert a resume payload from a client into the tool's resume data. */
	normalizeResumeData?(resumeData: unknown): unknown;
}
