import { reactive, readonly } from 'vue';

import {
	isInstanceGatewayResourceDecision,
	localPromptId,
	promptFromLocalRequest,
	type PermissionPrompt,
	type PromptResponse,
} from './prompt-classification';
import type { InstanceAiConfirmRequest } from '../../shared/types';

interface PermissionPromptState {
	/** Oldest first — chronological insertion order is the display order. */
	prompts: PermissionPrompt[];
	/** Prompts with an in-flight response (buttons disabled). */
	respondingIds: Set<string>;
	/** Prompts whose response failed retryably (card shows an error line). */
	failedIds: Set<string>;
}

const state = reactive<PermissionPromptState>({
	prompts: [],
	respondingIds: new Set(),
	failedIds: new Set(),
});

/** Reactive prompt state for the App-level stack and the chat's composer guard. */
export const permissionPromptState = readonly(state);

/** Adds a prompt unless one with the same id is already displayed (double listeners, SSE replays, re-seeds). */
export function addPrompt(prompt: PermissionPrompt): void {
	if (state.prompts.some((existing) => existing.id === prompt.id)) return;
	state.prompts.push(prompt);
}

function removePromptsWhere(predicate: (prompt: PermissionPrompt) => boolean): void {
	for (let i = state.prompts.length - 1; i >= 0; i--) {
		const prompt = state.prompts[i];
		if (!predicate(prompt)) continue;
		state.prompts.splice(i, 1);
		state.respondingIds.delete(prompt.id);
		state.failedIds.delete(prompt.id);
	}
}

export function removePrompt(id: string): void {
	removePromptsWhere((prompt) => prompt.id === id);
}

/** The tool call resolved (possibly from another client) — its prompt is obsolete. */
export function removeInstancePromptsByToolCall(threadId: string, toolCallId: string): void {
	removePromptsWhere(
		(prompt) =>
			prompt.source === 'instance' &&
			prompt.threadId === threadId &&
			prompt.toolCallId === toolCallId,
	);
}

/**
 * The run finished — nothing of it can still be pending. Prompts without a known
 * runId are cleared too; prompts of *other* runs survive (replayed finishes).
 */
export function removeInstancePromptsByRun(threadId: string, runId: string): void {
	removePromptsWhere(
		(prompt) =>
			prompt.source === 'instance' &&
			prompt.threadId === threadId &&
			(prompt.runId === runId || prompt.runId === undefined),
	);
}

/** The thread is no longer watched — drop everything it contributed. */
export function removeInstancePromptsByThread(threadId: string): void {
	removePromptsWhere((prompt) => prompt.source === 'instance' && prompt.threadId === threadId);
}

export function clearAllPrompts(): void {
	removePromptsWhere(() => true);
}

/** While any of the thread's confirmations is pending the run is suspended — the composer must refuse input. */
export function hasBlockingPromptForThread(threadId: string): boolean {
	return state.prompts.some(
		(prompt) => prompt.source === 'instance' && prompt.threadId === threadId,
	);
}

function confirmBodyFromResponse(response: PromptResponse): InstanceAiConfirmRequest | null {
	switch (response.kind) {
		case 'approval':
			return { kind: 'approval', approved: response.approved };
		case 'continue':
			return { kind: 'approval', approved: true };
		case 'resourceDecision':
			return isInstanceGatewayResourceDecision(response.decision)
				? { kind: 'resourceDecision', resourceDecision: response.decision }
				: null;
		case 'domainAccessApprove':
			return { kind: 'domainAccessApprove', domainAccessAction: response.action };
		case 'domainAccessDeny':
			return { kind: 'domainAccessDeny' };
		case 'openInWebUi':
			// Handled separately in respondToPrompt — not a confirm body.
			return null;
	}
}

/**
 * Answer a prompt. Local prompts resolve over IPC; instance prompts post the
 * confirmation to the instance. The prompt is removed on success — and on a
 * 400/404, which mean it was already expired or resolved elsewhere. Any other
 * failure keeps the prompt and flags it as failed so the card offers a retry.
 */
export async function respondToPrompt(id: string, response: PromptResponse): Promise<void> {
	const prompt = state.prompts.find((candidate) => candidate.id === id);
	if (!prompt || state.respondingIds.has(id)) return;

	state.respondingIds.add(id);
	state.failedIds.delete(id);
	try {
		if (prompt.source === 'local') {
			if (response.kind !== 'resourceDecision') return;
			await window.electronAPI.respondToPermissionPrompt(prompt.localId, response.decision);
			removePrompt(id);
			return;
		}

		if (response.kind === 'openInWebUi') {
			// Hand off to the web UI rather than answering here: open the thread so
			// the user finishes the flow (e.g. credential setup) there. Leave the
			// prompt in place — the run stays suspended and the prompt clears via the
			// live tool-result/run-finish once it's resolved in the web UI.
			await window.electronAPI.openThread(prompt.threadId);
			return;
		}

		const body = confirmBodyFromResponse(response);
		if (!body) return;
		const result = await window.electronAPI.confirmThreadRequest(
			prompt.threadId,
			prompt.requestId,
			body,
		);
		if (result.ok || result.status === 400 || result.status === 404) {
			removePrompt(id);
		} else {
			state.failedIds.add(id);
		}
	} catch (error) {
		console.error('Failed to respond to permission prompt', error);
		state.failedIds.add(id);
	} finally {
		state.respondingIds.delete(id);
	}
}

let localSourceDisposers: Array<() => void> | null = null;

/**
 * Mirror the main process's pending `client`-mode prompts into the store:
 * subscribe to the push channels and resync the already-pending ones (renderer
 * reload). Idempotent — only the first call subscribes.
 */
export function connectLocalPromptSource(): void {
	if (localSourceDisposers) return;
	localSourceDisposers = [
		window.electronAPI.onPermissionPromptRequested((request) => {
			addPrompt(promptFromLocalRequest(request));
		}),
		window.electronAPI.onPermissionPromptWithdrawn((id) => {
			removePrompt(localPromptId(id));
		}),
	];
	window.electronAPI.listPermissionPrompts().then(
		(requests) => {
			for (const request of requests) addPrompt(promptFromLocalRequest(request));
		},
		(error: unknown) => console.error('Failed to list pending permission prompts', error),
	);
}

export function __resetPermissionPromptsForTests(): void {
	clearAllPrompts();
	for (const dispose of localSourceDisposers ?? []) dispose();
	localSourceDisposers = null;
}
