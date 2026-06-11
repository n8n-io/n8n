/*
 * Renderer-side API surface for the assistant task flow: thin wrappers around
 * the `window.electronAPI` bridge methods that the task creation/promotion
 * feature uses, with types reused from the shared IPC contract.
 *
 * Note: migrating the rest of the renderer's `window.electronAPI` calls into
 * this module is deferred to a follow-up.
 */
import type { CreateAssistantTaskResult, PromoteAssistantThreadResult } from '../../shared/types';

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
