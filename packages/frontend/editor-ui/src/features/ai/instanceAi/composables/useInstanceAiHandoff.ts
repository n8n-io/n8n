import { useRouter } from 'vue-router';
import { v4 as uuidv4 } from 'uuid';
import type { InstanceAiEditorExecution, InstanceAiWorkflowAttachment } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';

import type { InstanceAiCredentialContext } from '@/app/composables/useInstanceAiEditorCapability';
import { useToast } from '@/app/composables/useToast';

import { INSTANCE_AI_THREAD_VIEW } from '../constants';
import { useInstanceAiStore } from '../instanceAi.store';

/**
 * The question that opens a credential setup-guidance thread. Shared by every
 * surface that hands a credential to Instance AI (editor, artifact, credentials
 * list) so the agent always sees the same phrasing.
 */
export function buildInstanceAiCredentialQuestion(credential: InstanceAiCredentialContext): string {
	const base = `How do I set up the credentials for ${credential.displayName}?`;
	return credential.nodeName ? `${base} It's for the "${credential.nodeName}" node.` : base;
}

const pendingFirstMessageKey = (threadId: string) => `n8n-instance-ai-first-message:${threadId}`;

export interface PendingFirstMessage {
	message: string;
	attachments?: InstanceAiWorkflowAttachment[];
	editorExecution?: InstanceAiEditorExecution;
}

/**
 * Consume an opening message handed off from another tab. A new-tab hand-off can't
 * send it from the opening tab — the destination loads before the backend persists
 * it, so it wouldn't appear until a refresh. Instead the opener stashes it here
 * (keyed by thread) and the destination tab's own runtime sends it.
 */
export function consumePendingFirstMessage(threadId: string): PendingFirstMessage | null {
	const raw = localStorage.getItem(pendingFirstMessageKey(threadId));
	if (!raw) return null;
	localStorage.removeItem(pendingFirstMessageKey(threadId));
	try {
		return JSON.parse(raw) as PendingFirstMessage;
	} catch {
		return null;
	}
}

/**
 * Low-level Instance AI hand-off primitive shared by the capability adapters and
 * the credentials list: create a thread in `projectId`, optionally prepare its
 * runtime (e.g. seed a pending hand-off) before the opening turn, auto-send that
 * turn, and navigate to the thread view.
 */
export function useInstanceAiHandoff() {
	const instanceAiStore = useInstanceAiStore();
	const rootStore = useRootStore();
	const router = useRouter();
	const toast = useToast();

	async function startThread(
		projectId: string,
		message: string,
		attachments?: InstanceAiWorkflowAttachment[],
		prepare?: (threadId: string) => void,
		options?: { newTab?: boolean; editorExecution?: InstanceAiEditorExecution },
	): Promise<void> {
		const threadId = uuidv4();
		// Open the tab now, inside the click gesture, so it isn't popup-blocked.
		const tab = options?.newTab ? window.open('', '_blank') : null;
		// Persist the thread on the BE before navigating — `/instance-ai/:threadId`
		// expects an existing thread.
		try {
			await instanceAiStore.syncThread(threadId, projectId);
		} catch {
			tab?.close();
			toast.showError(new Error('Failed to start a new thread. Try again.'), 'Open failed');
			return;
		}
		const route = { name: INSTANCE_AI_THREAD_VIEW, params: { threadId } };
		if (options?.newTab) {
			// Hand the opening message to the destination tab so its own runtime sends
			// it (optimistic UI + streaming). Sending here races the destination's load
			// against backend persistence — the message wouldn't appear until a refresh.
			localStorage.setItem(
				pendingFirstMessageKey(threadId),
				JSON.stringify({ message, attachments, editorExecution: options?.editorExecution }),
			);
			if (tab) tab.location.href = router.resolve(route).href;
			else await router.push(route); // popup blocked → same tab; it consumes the message
			return;
		}
		const thread = instanceAiStore.getOrCreateRuntime(threadId, projectId);
		prepare?.(threadId);
		void thread.sendMessage(message, attachments, rootStore.pushRef, options?.editorExecution);
		await router.push(route);
	}

	return { startThread };
}
