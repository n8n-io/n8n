export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

export type DaemonStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface AppSettings {
	/** User-configured origin patterns for validating instances before connect (never derived from URLs). */
	allowedOrigins: string[];
	filesystemDir: string;
	filesystemEnabled: boolean;
	shellEnabled: boolean;
	screenshotEnabled: boolean;
	mouseKeyboardEnabled: boolean;
	browserEnabled: boolean;
	logLevel: LogLevel;
}

export interface StatusSnapshot {
	status: DaemonStatus;
	connectedUrl: string | null;
	lastError: string | null;
}

export interface ConnectPayload {
	url: string;
	apiKey?: string;
}

// Re-export the desktop-assistant task DTOs so the renderer can consume them
// without reaching across packages — the shapes live in @n8n/api-types and are
// reused verbatim, never redefined here.
import type {
	DesktopAssistantHistoryResponse,
	DesktopAssistantTaskOutcome,
	DesktopAssistantTasksResponse,
	InstanceAiEvent,
	InstanceAiRichMessagesResponse,
} from '@n8n/api-types';

export type {
	DesktopAssistantTasksResponse,
	DesktopAssistantTaskCard,
	DesktopAssistantTaskIcon,
	DesktopAssistantTriggerSummary,
	DesktopAssistantHistoryResponse,
	DesktopAssistantHistoryEntry,
	DesktopAssistantTaskOutcome,
	InstanceAiEvent,
	InstanceAiRichMessagesResponse,
} from '@n8n/api-types';

/** Cursor + page-size params for the history list. */
export interface DesktopAssistantHistoryParams {
	limit?: number;
	firstId?: string;
	lastId?: string;
}

/**
 * Minutes saved over the trailing week and month, for the History "Time saved"
 * panel. A figure is `null` when its insights call was unavailable (e.g. the
 * month range is license-capped, or insights is disabled); `0` means nothing
 * saved yet and is rendered as a motivational dash.
 */
export interface DesktopAssistantTimeSaved {
	weekMinutes: number | null;
	monthMinutes: number | null;
}

/** Result of a renderer-initiated task run, surfaced back over IPC. */
export interface RunTaskResult {
	ok: boolean;
	executionId?: string;
	error?: string;
}

/** Result of starting a one-shot assistant task run from the composer. */
export interface CreateAssistantTaskResult {
	ok: boolean;
	threadId?: string;
	runId?: string;
	error?: string;
}

/**
 * Final outcome of a one-shot assistant run. `timeout` means the app stopped
 * waiting; the run may still finish on the instance. `tookAction` is false when
 * the run ended without making any tool calls — the assistant declined the ask
 * (ambiguous, recurring, or out of scope) and the client should hand off to the
 * instance UI instead of claiming success. `outcome` is the agent's structured
 * self-report (task success, title, summary) when it filed one; prefer it over
 * the `tookAction` heuristic, and use `outcome.title` as the task label.
 */
export interface AssistantRunResult {
	ok: boolean;
	status: 'success' | 'error' | 'canceled' | 'timeout';
	tookAction: boolean;
	outcome?: DesktopAssistantTaskOutcome;
	error?: string;
}

/**
 * Result of asking the instance to promote a thread into a saved workflow.
 * The endpoint is idempotent — poll it until `status === 'done'`.
 */
export interface PromoteAssistantThreadResult {
	ok: boolean;
	status?: 'building' | 'done';
	workflowId?: string;
	error?: string;
}

/**
 * The contract exposed on `window.electronAPI` by the preload bridge. This is the
 * single source of truth shared by both sides: `preload.ts` implements it, and the
 * renderer augments `Window` with it (see `renderer/electron-api.d.ts`). Keep the
 * preload object typed as `ElectronApi` so drift is a compile error.
 */
export interface ElectronApi {
	signIn: (instanceUrl: string) => Promise<{ ok: boolean; error?: string }>;
	getAuthStatus: () => Promise<AuthStatus>;
	signOut: () => Promise<{ ok: boolean }>;
	onAuthStatusChanged: (onChangeCallback: (status: AuthStatus) => void) => void;
	getSettings: () => Promise<AppSettings>;
	setSettings: (partial: Partial<AppSettings>) => Promise<{ ok: boolean; error?: string }>;
	getDaemonStatus: () => Promise<StatusSnapshot>;
	disconnectGateway: () => Promise<{ ok: boolean }>;
	onStatusChanged: (onChangeCallback: (snapshot: StatusSnapshot) => void) => void;
	getTasks: () => Promise<DesktopAssistantTasksResponse>;
	runTask: (workflowId: string) => Promise<RunTaskResult>;
	createAssistantTask: (prompt: string, appHint?: string) => Promise<CreateAssistantTaskResult>;
	waitForAssistantRun: (threadId: string, runId: string) => Promise<AssistantRunResult>;
	promoteAssistantThread: (threadId: string, name?: string) => Promise<PromoteAssistantThreadResult>;
	openWorkflow: (workflowId: string) => Promise<void>;
	getHistory: (params?: DesktopAssistantHistoryParams) => Promise<DesktopAssistantHistoryResponse>;
	openExecution: (workflowId: string, executionId: string) => Promise<void>;
	getTimeSaved: () => Promise<DesktopAssistantTimeSaved>;
	/**
	 * Subscribe to window active-state changes (shown/focused vs hidden/blurred),
	 * driven by the main process. Returns a disposer to unsubscribe.
	 */
	onWindowActiveChanged: (onChangeCallback: (active: boolean) => void) => () => void;
	/** The thread's message snapshot, served from the main-process cache after the first fetch. */
	getThread: (
		threadId: string,
		options?: { refresh?: boolean },
	) => Promise<InstanceAiRichMessagesResponse>;
	/** Open the thread's SSE event stream in the main process (idempotent per thread). */
	listenToThread: (threadId: string, lastEventId?: number) => Promise<void>;
	/** Close the thread's SSE event stream. */
	unlistenToThread: (threadId: string) => Promise<void>;
	/**
	 * Subscribe to events from all open thread streams. Returns a disposer to
	 * unsubscribe. Fan-out per thread is the renderer ThreadClient's job.
	 */
	onThreadEvent: (
		onEventCallback: (threadId: string, event: InstanceAiEvent) => void,
	) => () => void;
}

export type AuthState = 'signedOut' | 'authorizing' | 'signedIn' | 'error';

export interface AuthStatus {
	state: AuthState;
	/** The instance the user is signing in to / signed in to, when known. */
	instanceUrl: string | null;
	/** The last successfully signed-in instance URL; survives sign-out and app relaunch. */
	lastInstanceUrl: string | null;
	/** Human-readable error, set when `state === 'error'`. */
	error: string | null;
}
