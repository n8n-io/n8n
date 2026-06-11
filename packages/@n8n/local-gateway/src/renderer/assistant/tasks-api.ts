/*
 * The renderer's single gateway to the main process.
 *
 * Every `window.electronAPI` call goes through these wrappers so components and
 * views never touch the bridge directly — when the IPC contract changes, this
 * file (plus `shared/types.ts`) is the whole renderer-side surface to update.
 * One flat function per `ElectronApi` method, types reused from the shared
 * contract, no state.
 */
import type {
	AppSettings,
	AuthStatus,
	CreateAssistantTaskResult,
	DesktopAssistantHistoryParams,
	DesktopAssistantHistoryResponse,
	DesktopAssistantRecommendationsRequest,
	DesktopAssistantRecommendationsResponse,
	DesktopAssistantTaskRequest,
	DesktopAssistantTasksResponse,
	DesktopAssistantTimeSaved,
	DetectedContext,
	MacPermissionKind,
	MacPermissionStatus,
	PromoteAssistantThreadResult,
	RunTaskResult,
	ScreenshotAttachment,
	StatusSnapshot,
	WindowCaptureTarget,
} from '../../shared/types';

// --- Auth ---

/** Kick off the browser sign-in flow against the given instance. */
export async function signIn(instanceUrl: string): Promise<{ ok: boolean; error?: string }> {
	return await window.electronAPI.signIn(instanceUrl);
}

/** Current auth snapshot; pair with `onAuthStatusChanged` for live updates. */
export async function getAuthStatus(): Promise<AuthStatus> {
	return await window.electronAPI.getAuthStatus();
}

/** Sign out; the resulting status arrives via `onAuthStatusChanged`. */
export async function signOut(): Promise<{ ok: boolean }> {
	return await window.electronAPI.signOut();
}

/** Subscribe to auth-state transitions pushed from the main process. */
export function onAuthStatusChanged(onChange: (status: AuthStatus) => void): void {
	window.electronAPI.onAuthStatusChanged(onChange);
}

// --- Settings & daemon ---

/** Read the persisted app settings. */
export async function getSettings(): Promise<AppSettings> {
	return await window.electronAPI.getSettings();
}

/** Persist a partial settings update. */
export async function setSettings(
	partial: Partial<AppSettings>,
): Promise<{ ok: boolean; error?: string }> {
	return await window.electronAPI.setSettings(partial);
}

/** Current daemon connection snapshot; pair with `onStatusChanged`. */
export async function getDaemonStatus(): Promise<StatusSnapshot> {
	return await window.electronAPI.getDaemonStatus();
}

/** Tear down the active gateway connection. */
export async function disconnectGateway(): Promise<{ ok: boolean }> {
	return await window.electronAPI.disconnectGateway();
}

/** Subscribe to daemon connection-state changes. */
export function onStatusChanged(onChange: (snapshot: StatusSnapshot) => void): void {
	window.electronAPI.onStatusChanged(onChange);
}

// --- Tasks ---

/** Fetch the bucketed task list (action needed / upcoming / ready to run). */
export async function getTasks(): Promise<DesktopAssistantTasksResponse> {
	return await window.electronAPI.getTasks();
}

/** Trigger a saved task (workflow) to run now. */
export async function runTask(workflowId: string): Promise<RunTaskResult> {
	return await window.electronAPI.runTask(workflowId);
}

/**
 * Start a one-shot assistant run for a free-text prompt plus the detected
 * context (structured pointer fields and an optional screenshot attachment).
 */
export async function createAssistantTask(
	body: DesktopAssistantTaskRequest,
): Promise<CreateAssistantTaskResult> {
	return await window.electronAPI.createAssistantTask(body);
}

/**
 * Capture a task attachment (base64 JPEG). With a `target` window it captures
 * just that window (excluding the assistant in front of it); otherwise the
 * full screen.
 */
export async function captureScreenshot(
	target?: WindowCaptureTarget,
): Promise<ScreenshotAttachment> {
	return await window.electronAPI.captureScreenshot(target);
}

// --- Context ---

/** The open windows the user can pick as context (first = frontmost). */
export async function getContextOptions(): Promise<DetectedContext[]> {
	return await window.electronAPI.getContextOptions();
}

/** Subscribe to context-option changes pushed on tray open. Returns a disposer. */
export function onContextChanged(onChange: (contexts: DetectedContext[]) => void): () => void {
	return window.electronAPI.onContextChanged(onChange);
}

/** Generate task suggestions grounded in the selected context + connected integrations. */
export async function getRecommendations(
	body: DesktopAssistantRecommendationsRequest,
): Promise<DesktopAssistantRecommendationsResponse> {
	return await window.electronAPI.getRecommendations(body);
}

/**
 * Ask the instance to promote a thread into a saved workflow. Idempotent —
 * poll until `status === 'done'` (see `use-pending-tasks.ts`). `name`, when
 * given, becomes the saved workflow's name.
 */
export async function promoteAssistantThread(
	threadId: string,
	name?: string,
	icon?: string,
): Promise<PromoteAssistantThreadResult> {
	return await window.electronAPI.promoteAssistantThread(threadId, name, icon);
}

/** Open a workflow in the instance UI (external browser). */
export async function openWorkflow(workflowId: string): Promise<void> {
	await window.electronAPI.openWorkflow(workflowId);
}

// --- History ---

/** Fetch a page of execution history. */
export async function getHistory(
	params?: DesktopAssistantHistoryParams,
): Promise<DesktopAssistantHistoryResponse> {
	return await window.electronAPI.getHistory(params);
}

/** Open a specific execution in the instance UI (external browser). */
export async function openExecution(workflowId: string, executionId: string): Promise<void> {
	await window.electronAPI.openExecution(workflowId, executionId);
}

/** Fetch the trailing week/month "time saved" figures. */
export async function getTimeSaved(): Promise<DesktopAssistantTimeSaved> {
	return await window.electronAPI.getTimeSaved();
}

// --- Window ---

/** Subscribe to window shown/hidden changes. Returns a disposer. */
export function onWindowActiveChanged(onChange: (active: boolean) => void): () => void {
	return window.electronAPI.onWindowActiveChanged(onChange);
}

// --- macOS permissions ---

/** Grant state of the macOS permissions context detection relies on. */
export async function getMacPermissions(): Promise<MacPermissionStatus> {
	return await window.electronAPI.getMacPermissions();
}

/** Open the System Settings pane for one of the context permissions. */
export async function openMacPermissionSettings(kind: MacPermissionKind): Promise<void> {
	await window.electronAPI.openMacPermissionSettings(kind);
}
