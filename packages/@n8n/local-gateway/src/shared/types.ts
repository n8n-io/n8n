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
import type { DesktopAssistantTasksResponse } from '@n8n/api-types';

export type {
	DesktopAssistantTasksResponse,
	DesktopAssistantTaskCard,
	DesktopAssistantTaskIcon,
	DesktopAssistantTriggerSummary,
} from '@n8n/api-types';

/** Result of a renderer-initiated task run, surfaced back over IPC. */
export interface RunTaskResult {
	ok: boolean;
	executionId?: string;
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
	openWorkflow: (workflowId: string) => Promise<void>;
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
