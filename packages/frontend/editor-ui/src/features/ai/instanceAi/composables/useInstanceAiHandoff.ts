import { useRouter } from 'vue-router';
import { v4 as uuidv4 } from 'uuid';
import type { InstanceAiWorkflowAttachment } from '@n8n/api-types';
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
	): Promise<void> {
		const threadId = uuidv4();
		// Persist the thread on the BE before navigating — `/instance-ai/:threadId`
		// expects an existing thread.
		try {
			await instanceAiStore.syncThread(threadId, projectId);
		} catch {
			toast.showError(new Error('Failed to start a new thread. Try again.'), 'Open failed');
			return;
		}
		const thread = instanceAiStore.getOrCreateRuntime(threadId, projectId);
		prepare?.(threadId);
		void thread.sendMessage(message, attachments, rootStore.pushRef);
		await router.push({ name: INSTANCE_AI_THREAD_VIEW, params: { threadId } });
	}

	return { startThread };
}
