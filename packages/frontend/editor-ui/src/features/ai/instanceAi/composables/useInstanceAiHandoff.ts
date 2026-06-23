import { useRouter } from 'vue-router';
import { v4 as uuidv4 } from 'uuid';
import type { InstanceAiHandoffContext, InstanceAiWorkflowAttachment } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';

import type { InstanceAiCredentialContext } from '@/app/composables/useInstanceAiEditorCapability';
import { useToast } from '@/app/composables/useToast';

import { INSTANCE_AI_THREAD_VIEW } from '../constants';
import { useInstanceAiStore } from '../instanceAi.store';

/** The existing credential id, when known, so the agent can act on it directly. */
function existingCredentialNote(credential: InstanceAiCredentialContext): string {
	return credential.id ? ` The existing credential id is \`${credential.id}\`.` : '';
}

/**
 * Opening question for a new-tab credential hand-off (credentials list, editor):
 * the new thread carries no workflow, so it names the credential setup modal as
 * the user's context. The node isn't carried into the new tab, so it isn't named.
 */
export function buildInstanceAiCredentialQuestion(credential: InstanceAiCredentialContext): string {
	return `How do I set up the credentials for ${credential.displayName}?${existingCredentialNote(credential)} I'm looking at the credential setup modal.`;
}

/**
 * Opening question for an in-thread credential hand-off (the workflow artifact):
 * the workflow is already the thread's subject, so it names the node and omits
 * the modal context.
 */
export function buildInstanceAiArtifactCredentialQuestion(
	credential: InstanceAiCredentialContext,
): string {
	const node = credential.nodeName ? ` It's for the "${credential.nodeName}" node.` : '';
	return `How do I set up the credentials for ${credential.displayName}?${node}${existingCredentialNote(credential)}`;
}

const pendingFirstMessageKey = (threadId: string) => `n8n-instance-ai-first-message:${threadId}`;

export interface PendingFirstMessage {
	message: string;
	attachments?: InstanceAiWorkflowAttachment[];
	context?: InstanceAiHandoffContext;
}

export function buildInstanceAiCredentialHandoffContext(
	credential: InstanceAiCredentialContext,
): InstanceAiHandoffContext {
	return {
		source: 'credential-modal',
		credential: {
			credentialType: credential.credentialType,
			displayName: credential.displayName,
			...(credential.id ? { id: credential.id } : {}),
			...(credential.nodeName ? { nodeName: credential.nodeName } : {}),
			...(credential.nodeType ? { nodeType: credential.nodeType } : {}),
			...(credential.documentationUrl ? { documentationUrl: credential.documentationUrl } : {}),
			...(credential.oauthRedirectUrl ? { oauthRedirectUrl: credential.oauthRedirectUrl } : {}),
		},
	};
}

/**
 * Consume the opening message a new-tab hand-off stashed here. A separate window
 * can't send it (the destination loads before the BE persists it), so it does.
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

// One hand-off at a time across all entry points (module-level to share the guard).
let handoffInFlight = false;

/**
 * Create a thread, optionally seed its runtime (`prepare`), send the opening turn,
 * and navigate to it. Shared by the capability adapters and the credentials list.
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
		options?: { newTab?: boolean; context?: InstanceAiHandoffContext },
	): Promise<void> {
		// Drop re-entrant clicks — each call mints a fresh thread, so spam would duplicate.
		if (handoffInFlight) return;
		handoffInFlight = true;
		try {
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
				// Separate window: the destination's runtime sends the message (see
				// consumePendingFirstMessage); sending here races backend persistence.
				localStorage.setItem(
					pendingFirstMessageKey(threadId),
					JSON.stringify({ message, attachments, context: options?.context }),
				);
				if (tab) tab.location.href = router.resolve(route).href;
				else await router.push(route); // popup blocked → same tab; it consumes the message
				return;
			}
			// Same tab: seed the runtime, send, and redirect — it survives the in-store nav.
			const thread = instanceAiStore.getOrCreateRuntime(threadId, projectId);
			prepare?.(threadId);
			void thread.sendMessage(message, attachments, rootStore.pushRef, options?.context);
			await router.push(route);
		} finally {
			handoffInFlight = false;
		}
	}

	return { startThread };
}
