/*
 * Renderer-side API surface for the assistant task flow: thin wrappers around
 * the `window.electronAPI` bridge methods that the task creation/promotion
 * feature uses, with types reused from the shared IPC contract.
 *
 * Note: migrating the rest of the renderer's `window.electronAPI` calls into
 * this module is deferred to a follow-up.
 */
import type {
	CreateAssistantTaskResult,
	DesktopAssistantTaskRequest,
	PromoteAssistantThreadResult,
} from '../../shared/types';

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
