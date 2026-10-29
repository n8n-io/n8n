import type {
	Agent as RuntimeAgent,
	CheckpointStore,
	ExecutionOptions,
	JSONObject,
	ObservationLogObserverMemory,
	ResumeOptions,
	RunOptions,
	SideCallUsageReport,
	TokenUsage,
} from '@n8n/agents';
import type { User } from '@n8n/db';

import type { AgentTurnRequest } from '../agent-turn-execution.service';
import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import type { ToolRegistry } from '../tool-registry';
import type { StoredAttachmentRef } from '../types/agent-chat-attachment';
import type { AgentExecutionStreamChunk } from '../types/agent-steering';
import type {
	AgentTurnFinalizeOutcome,
	AgentTurnStatus,
	FormattedTurnError,
} from '../types/agent-turn-outcome';
import type { SystemAgentHostEventEmitter } from './system-agent-host-events';

/** Provider-defined, JSON-safe turn options. The queue stores them with the message. */
export type SystemAgentTurnOptions = Record<string, unknown>;

/** The "always allow" decisions that the user made in one thread of a system agent. */
export interface SystemAgentSessionGrants {
	load(): Promise<Set<string>>;
	grant(key: string): Promise<void>;
	revoke(key: string): Promise<void>;
}

interface SystemAgentTurnBase<TLease> {
	user: User;
	thread: AgentExecutionThread;
	resourceId: string;
	/** Aborts when the turn stops: a user cancel, the queue, or `runOptions.abortSignal`. */
	abortSignal: AbortSignal;
	/** The lease from the provider's workspace source. It is not set when the provider has no source. */
	workspace?: TLease;
	/**
	 * The memory of the agent in the Agents tables. Give it to the agent the
	 * provider builds, so the turn's messages, title and observations are stored
	 * with the thread.
	 */
	memory: ObservationLogObserverMemory;
	/**
	 * The checkpoint store of the agent. Give it to the agent the provider
	 * builds: the runtime resumes a suspended turn only from this store.
	 */
	checkpointStore: CheckpointStore;
	/** The "always allow" decisions in the thread. They last until the thread is deleted. */
	sessionGrants: SystemAgentSessionGrants;
	/**
	 * Send a custom event to the chat during this turn. The runtime streams it
	 * as a `host-event` SSE event and records it with the turn, so history
	 * shows it again after a reload. Pass a `key` to update an earlier event
	 * with the same name. The provider can keep the callback for its tools
	 * and hooks. `onSettled` can emit only when the turn has an execution
	 * record. Events after `onSettled` returns are dropped. It throws when
	 * the payload is larger than 64 KiB as JSON. The stream and history return
	 * the payload as it is, so do not put secrets in it.
	 */
	emitHostEvent: SystemAgentHostEventEmitter;
}

export interface SystemAgentStartTurn<TLease = unknown> extends SystemAgentTurnBase<TLease> {
	type: 'start';
	/** Execution id when the queue admitted the turn. */
	executionId?: string;
	/** The message as the user wrote it. It is the stored transcript text. */
	message: string;
	attachments: StoredAttachmentRef[];
	/**
	 * The content of one attachment of this turn. Gives `undefined` for a file
	 * that is not an attachment of this turn or no longer exists.
	 */
	readAttachment(ref: StoredAttachmentRef): Promise<Buffer | undefined>;
	options: SystemAgentTurnOptions;
}

export interface SystemAgentResumeTurn<TLease = unknown>
	extends SystemAgentTurnBase<TLease>,
		Pick<ResumeOptions, 'runId' | 'toolCallId'> {
	type: 'resume';
	/** Host metadata the suspended run stored in its checkpoint. */
	checkpointHostMetadata: JSONObject;
	resumeData: unknown;
}

export type SystemAgentTurn<TLease = unknown> =
	| SystemAgentStartTurn<TLease>
	| SystemAgentResumeTurn<TLease>;

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
	 * Use `onSideCallUsage` on the handle, not here.
	 */
	runOptions?: Omit<
		Partial<RunOptions & ExecutionOptions> & Partial<ResumeOptions>,
		'persistence' | 'onSideCallUsage'
	>;
	onChunk?: (chunk: AgentExecutionStreamChunk) => void;
	/**
	 * Called once for each model call that runs beside the turn: title
	 * generation, the observation-log observer and reflector, and episodic
	 * memory. The report has the model, the token usage, the cost and a
	 * `reportId` that is stable for the call, so a provider can bill it once.
	 * `cost` is absent when the catalog is unavailable or the model has no
	 * pricing, so bill from `usage`. The runtime sends no report for a call
	 * that returns no usage.
	 * The host still adds the cost to the execution. The runtime awaits the
	 * callback, so a slow callback delays title generation. A failing callback
	 * only logs a warning and does not stop the turn.
	 */
	onSideCallUsage?: (report: SideCallUsageReport) => void | Promise<void>;
	/**
	 * Called once per turn with its outcome, before the runtime stores the
	 * turn record. A turn without an execution record settles after it fails.
	 * When the turn has an execution record, host events that the hook emits
	 * reach the stream before `done` and are kept in history. Otherwise they
	 * are dropped. Do not read the stored execution here, because it is not
	 * final yet.
	 */
	onSettled?: (outcome: SystemAgentTurnOutcome) => Promise<void>;
	/**
	 * Give the user-facing form of a turn error: the text, and an optional
	 * client code such as `quota_exhausted`. The runtime awaits this once per
	 * error, before it sends the `error` event and stores the execution error,
	 * so it can do async work such as a credit check. Keep it short: the error
	 * event waits for it.
	 *
	 * The provider owns the text. The runtime sends the text and code to the
	 * client unchanged. It stores the text as the execution error, where the
	 * usual secret redaction of execution records applies. The code is not
	 * stored, so the history shows the text without it. Return `undefined`, or
	 * an empty message, to keep the raw error.
	 * When it throws, the runtime logs the failure and keeps the raw error.
	 * Errors that already have a client code, such as `turn_already_running`,
	 * are not formatted.
	 */
	formatError?: (error: unknown) => Promise<FormattedTurnError | undefined>;
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
	 * The turn settled. The source can drop cached handles. Keep this fast:
	 * the client gets the `done` event and the queue starts the next turn only
	 * after it returns. Start slow work, such as a sandbox stop, in the
	 * background. A failure is logged and does not change the turn result.
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
	/**
	 * The user-facing text and code of an error that `prepareTurn` threw. The
	 * turn has no handle yet, so its `formatError` cannot run. The same rules
	 * apply: return `undefined`, or an empty message, to keep the raw error.
	 * When it throws, the runtime logs the failure and keeps the raw error.
	 * The errors of a stopped turn and errors that already have a client code
	 * are not formatted.
	 */
	formatSetupError?(user: User, error: unknown): Promise<FormattedTurnError | undefined>;
	/** Turn options for a message sent through the system-agent chat route. */
	chatTurnOptions?(
		user: User,
		thread: AgentExecutionThread,
		clientContext?: Record<string, unknown>,
	): Promise<SystemAgentTurnOptions>;
	/** Convert a resume payload from a client into the tool's resume data. */
	normalizeResumeData?(resumeData: unknown): unknown;
	/**
	 * Called once for each execution of a run that a turn of this agent
	 * delegated, foreground or background, after the runner tries to store
	 * the execution record. The report is sent even when storing fails, so the
	 * row can be missing or not final. `thread` is the thread of that turn. A
	 * failing callback only logs a warning. A report that is still in progress
	 * at shutdown is lost.
	 */
	onDelegatedRunUsage?(
		report: SystemAgentDelegatedRunUsageReport,
		scope: { thread: AgentExecutionThread },
	): void | Promise<void>;
	/**
	 * Called once for each side call of a run that a turn of this agent
	 * delegated: title generation, the observation-log observer and
	 * reflector, and episodic memory. A side call can finish after the run.
	 * `thread` is the thread of the delegating turn. A failing callback only
	 * logs a warning.
	 */
	onDelegatedSideCallUsage?(
		report: SystemAgentDelegatedSideCallUsageReport,
		scope: { thread: AgentExecutionThread },
	): void | Promise<void>;
}

/** The usage of one execution of a delegated run. */
export interface SystemAgentDelegatedRunUsageReport {
	/** The execution of the delegated run. Stable, so a provider can bill it once. */
	executionId: string;
	/** The child thread of the delegated run. */
	threadId: string;
	/** The execution of the turn that delegated the run. */
	parentExecutionId: string;
	/**
	 * The outcome of the execution, not of the task. A budget stop and a
	 * paused run are `completed`, as for a top-level turn. A max-iterations
	 * stop and a `mark_session_failed` call are also `completed` here, but the
	 * stored row has status `error`.
	 */
	status: AgentTurnStatus;
	model: string | null;
	/**
	 * The usage from the run's `finish` chunk: tokens, cache details, the
	 * prompt-size split and the cost. Side calls of the run are not included.
	 */
	usage: TokenUsage;
}

/**
 * The usage of one side call of a delegated run. `reportId` is stable for the
 * call, so a provider can bill it once. `cost` is absent when the model has no
 * pricing.
 */
export interface SystemAgentDelegatedSideCallUsageReport extends SideCallUsageReport {
	/** The execution of the delegated run that made the side call. */
	executionId: string;
	/** The child thread of the delegated run. */
	threadId: string;
	/** The execution of the turn that delegated the run. */
	parentExecutionId: string;
}
