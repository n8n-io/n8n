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
	/** Where resource-access prompts are confirmed: in the n8n editor ('instance') or in this app ('client'). */
	permissionConfirmation: 'instance' | 'client';
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
	DesktopAssistantApplyEditsRequest,
	DesktopAssistantApplyEditsResponse,
	DesktopAssistantHistoryResponse,
	DesktopAssistantRecommendationsRequest,
	DesktopAssistantRecommendationsResponse,
	DesktopAssistantTaskDetailResponse,
	DesktopAssistantTaskRequest,
	DesktopAssistantTasksResponse,
	InstanceAiConfirmRequest,
	InstanceAiEvent,
	InstanceAiRichMessagesResponse,
} from '@n8n/api-types';
import type {
	DetectedContext,
	ScreenshotAttachment,
	WindowCaptureTarget,
} from '@n8n/computer-use/context';
import type { AffectedResource, ResourceDecision } from '@n8n/computer-use/tools/types';

export type {
	InstanceAiMessage,
	DesktopAssistantTasksResponse,
	DesktopAssistantTaskCard,
	DesktopAssistantTaskIcon,
	DesktopAssistantTriggerSummary,
	DesktopAssistantHistoryResponse,
	DesktopAssistantHistoryEntry,
	DesktopAssistantTaskOutcome,
	DesktopAssistantTaskRequest,
	DesktopAssistantTaskResponse,
	DesktopAssistantRecommendationsRequest,
	DesktopAssistantRecommendation,
	DesktopAssistantRecommendationsResponse,
	InstanceAiAgentNode,
	InstanceAiConfirmRequest,
	InstanceAiConfirmation,
	InstanceAiConfirmationRequestPayload,
	InstanceAiConfirmationSeverity,
	DesktopAssistantApplyEditsRequest,
	DesktopAssistantApplyEditsResponse,
	DesktopAssistantDescriptionPart,
	DesktopAssistantTaskDetailResponse,
	InstanceAiEvent,
	InstanceAiRichMessagesResponse,
	InstanceAiToolCallState,
	DomainAccessAction,
	DomainAccessMeta,
	WebSearchMeta,
	InstanceGatewayResourceDecision,
} from '@n8n/api-types';
export type { AffectedResource, ResourceDecision } from '@n8n/computer-use/tools/types';

// Type-only re-export: the detected-context shape comes from @n8n/computer-use,
// but importing it `type`-only means no Node runtime dependency leaks into the
// renderer bundle.
export type {
	DetectedContext,
	ScreenshotAttachment,
	WindowCaptureTarget,
} from '@n8n/computer-use/context';

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

/**
 * A resource-access prompt raised by computer-use's `client` permission mode,
 * pending in the main process until the user decides. Pushed to the renderer
 * for display; the decision travels back over `respondToPermissionPrompt`.
 */
export interface LocalPermissionPromptRequest {
	id: string;
	resource: AffectedResource;
	options: ResourceDecision[];
}

/**
 * Outcome of a thread-confirmation POST. A structured result instead of a
 * rejection because IPC flattens errors — the renderer needs the HTTP status
 * to tell a stale request (400/404 → drop the prompt) from a real failure.
 */
export interface ConfirmThreadResult {
	ok: boolean;
	status?: number;
	error?: string;
}

/** Result of starting a one-shot assistant task run from the composer. */
export interface CreateAssistantTaskResult {
	ok: boolean;
	threadId?: string;
	runId?: string;
	error?: string;
}

/** Result of ensuring a fresh Instance AI chat thread for the desktop chat view. */
export interface CreateChatThreadResult {
	ok: boolean;
	threadId?: string;
	error?: string;
}

/**
 * Result of asking the instance to promote a thread into a saved workflow.
 * Idempotent: `building` while the build runs, `done` (with `workflowId`)
 * once a promote has produced the workflow.
 */
export interface PromoteAssistantThreadResult {
	ok: boolean;
	status?: 'building' | 'done';
	/** The build run to watch, set while `status === 'building'`. */
	runId?: string;
	workflowId?: string;
	error?: string;
}

/** Grant state of a single macOS permission; `unknown` covers not-determined / non-macOS. */
export type MacPermissionState = 'granted' | 'denied' | 'unknown';

/** The macOS permissions context detection relies on. */
export type MacPermissionKind = 'accessibility' | 'screenRecording' | 'automation';

/**
 * Status of the macOS permissions the context layer uses. `supported` is `false`
 * off macOS, where the UI hides the whole permissions section. `automation` is
 * the AppleEvents grant our osascript calls need (e.g. to read the Finder folder).
 */
export interface MacPermissionStatus {
	supported: boolean;
	accessibility: MacPermissionState;
	screenRecording: MacPermissionState;
	automation: MacPermissionState;
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
	/** Start a one-shot assistant task run with the prompt + detected context. */
	createAssistantTask: (body: DesktopAssistantTaskRequest) => Promise<CreateAssistantTaskResult>;
	/** Ensure a fresh Instance AI chat thread (in the personal project); returns its id. */
	createChatThread: () => Promise<CreateChatThreadResult>;
	promoteAssistantThread: (
		threadId: string,
		name?: string,
		icon?: string,
	) => Promise<PromoteAssistantThreadResult>;
	openWorkflow: (workflowId: string) => Promise<void>;
	/** The task detail view's segmented description (LLM-generated, cached server-side). */
	getTaskDetail: (workflowId: string) => Promise<DesktopAssistantTaskDetailResponse>;
	/** Apply chip edits to the workflow via an Instance AI run; follow it over `onThreadEvent`. */
	applyTaskEdits: (
		workflowId: string,
		body: DesktopAssistantApplyEditsRequest,
	) => Promise<DesktopAssistantApplyEditsResponse>;
	/** Archive the task's workflow (soft delete — it drops out of the task list). */
	deleteTask: (workflowId: string) => Promise<{ ok: boolean; error?: string }>;
	/** Open the task's workflow with the Set up panel pre-opened in the browser (Connect CTA). */
	openWorkflowSetup: (workflowId: string) => Promise<void>;
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
	/** Send a user message to the thread; the assistant's reply streams over `onThreadEvent`. */
	postThreadMessage: (threadId: string, message: string) => Promise<{ runId: string }>;
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
	/** The open windows the user can pick as context (first = frontmost). */
	getContextOptions: () => Promise<DetectedContext[]>;
	/**
	 * Subscribe to context-option changes, pushed by the main process when it
	 * re-detects (on tray open). Returns a disposer to unsubscribe.
	 */
	onContextChanged: (onChangeCallback: (contexts: DetectedContext[]) => void) => () => void;
	/**
	 * Capture a task attachment (base64 JPEG). With a `target` window it captures
	 * just that window (excluding the assistant in front of it); otherwise the
	 * full screen.
	 */
	captureScreenshot: (target?: WindowCaptureTarget) => Promise<ScreenshotAttachment>;
	/**
	 * Generate task suggestions for the empty state, grounded in the selected
	 * context (optional) and the user's connected integrations.
	 */
	getRecommendations: (
		body: DesktopAssistantRecommendationsRequest,
	) => Promise<DesktopAssistantRecommendationsResponse>;
	/** Current grant state of the macOS permissions context detection relies on. */
	getMacPermissions: () => Promise<MacPermissionStatus>;
	/** Open the System Settings pane to grant a macOS permission. */
	openMacPermissionSettings: (kind: MacPermissionKind) => Promise<void>;
	/** Local resource-access prompts still pending in the main process (renderer-reload resync). */
	listPermissionPrompts: () => Promise<LocalPermissionPromptRequest[]>;
	/** Answer a local resource-access prompt; `ok: false` when the prompt is unknown (already resolved). */
	respondToPermissionPrompt: (id: string, decision: ResourceDecision) => Promise<{ ok: boolean }>;
	/** Subscribe to local prompts raised by the main process. Returns a disposer. */
	onPermissionPromptRequested: (
		onRequestCallback: (prompt: LocalPermissionPromptRequest) => void,
	) => () => void;
	/** Subscribe to local prompts withdrawn by the main process (resolved or cleared). Returns a disposer. */
	onPermissionPromptWithdrawn: (onWithdrawCallback: (id: string) => void) => () => void;
	/** Resolve an instance-ai confirmation request; the suspended thread resumes on success. */
	confirmThreadRequest: (
		threadId: string,
		requestId: string,
		body: InstanceAiConfirmRequest,
	) => Promise<ConfirmThreadResult>;
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
