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
	AssistantRunResult,
	AuthStatus,
	CreateAssistantTaskResult,
	DesktopAssistantHistoryParams,
	DesktopAssistantHistoryResponse,
	DesktopAssistantTasksResponse,
	DesktopAssistantTimeSaved,
	PromoteAssistantThreadResult,
	RunTaskResult,
	StatusSnapshot,
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
 * Start a one-shot assistant run for a free-text prompt. `appHint` is a short
 * "what the user is looking at" string (e.g. the active context's label).
 */
export async function createAssistantTask(
	prompt: string,
	appHint?: string,
): Promise<CreateAssistantTaskResult> {
	return await window.electronAPI.createAssistantTask(prompt, appHint);
}

/**
 * Wait for a one-shot assistant run to finish. Resolves when the run reaches a
 * final state — this can take minutes, so callers should keep their UI busy.
 */
export async function waitForAssistantRun(
	threadId: string,
	runId: string,
): Promise<AssistantRunResult> {
	return await window.electronAPI.waitForAssistantRun(threadId, runId);
}

/**
 * Ask the instance to promote a thread into a saved workflow. Idempotent —
 * poll until `status === 'done'` (see `use-pending-tasks.ts`). `name`, when
 * given, becomes the saved workflow's name.
 */
export async function promoteAssistantThread(
	threadId: string,
	name?: string,
): Promise<PromoteAssistantThreadResult> {
	return await window.electronAPI.promoteAssistantThread(threadId, name);
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
