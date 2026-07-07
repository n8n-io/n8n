import { useRouter } from 'vue-router';
import { v4 as uuidv4 } from 'uuid';
import type {
	InstanceAiHandoffContext,
	InstanceAiThreadOrigin,
	InstanceAiThreadSource,
	InstanceAiWorkflowAttachment,
} from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';

import type { InstanceAiCredentialContext } from '@/app/composables/useInstanceAiEditorCapability';
import { useToast } from '@/app/composables/useToast';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

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

/** Where a launched thread came from — persisted on the thread and tracked by `syncThread`. */
export interface InstanceAiThreadLaunch {
	source: InstanceAiThreadSource;
	origin: InstanceAiThreadOrigin;
	sourceContext?: Record<string, unknown>;
}

/**
 * Stash the opening message for a thread the current context can't send itself
 * (a new tab, a router guard). The destination thread view consumes it after
 * hydration + SSE connect (see consumePendingFirstMessage) and sends it there.
 */
export function stashPendingFirstMessage(threadId: string, payload: PendingFirstMessage): void {
	localStorage.setItem(pendingFirstMessageKey(threadId), JSON.stringify(payload));
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

/** Resolve the personal project a launched thread binds to, loading it on first use. */
export async function ensurePersonalProjectId(): Promise<string | null> {
	const projectsStore = useProjectsStore();
	if (!projectsStore.personalProject) {
		try {
			await projectsStore.getPersonalProject();
		} catch {
			return null;
		}
	}
	return projectsStore.personalProject?.id ?? null;
}

/**
 * Provision a launched thread the destination view will send for: mint the id,
 * persist it, and stash the opening message. Shared by the deep-link router
 * guard and the new-tab hand-off, which both hand off delivery to the view.
 * Returns the thread id, or null if persistence failed.
 */
export async function provisionLaunchedThread(
	projectId: string,
	payload: PendingFirstMessage,
	launch?: InstanceAiThreadLaunch,
): Promise<string | null> {
	const threadId = uuidv4();
	try {
		await useInstanceAiStore().syncThread(threadId, projectId, launch);
	} catch {
		return null;
	}
	stashPendingFirstMessage(threadId, payload);
	return threadId;
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
		options?: {
			newTab?: boolean;
			context?: InstanceAiHandoffContext;
			launch?: InstanceAiThreadLaunch;
		},
	): Promise<void> {
		// Drop re-entrant clicks — each call mints a fresh thread, so spam would duplicate.
		if (handoffInFlight) return;
		handoffInFlight = true;
		try {
			if (options?.newTab) {
				// Open the tab now, inside the click gesture, so it isn't popup-blocked.
				// The destination view sends the stashed message (sending here would
				// race backend persistence in the separate window).
				const tab = window.open('', '_blank');
				const threadId = await provisionLaunchedThread(
					projectId,
					{ message, attachments, context: options?.context },
					options?.launch,
				);
				if (!threadId) {
					tab?.close();
					toast.showError(new Error('Failed to start a new thread. Try again.'), 'Open failed');
					return;
				}
				const route = { name: INSTANCE_AI_THREAD_VIEW, params: { threadId } };
				if (tab) tab.location.href = router.resolve(route).href;
				else await router.push(route); // popup blocked → same tab; it consumes the message
				return;
			}
			// Same tab: send through a runtime seeded here, which survives the navigation.
			const threadId = uuidv4();
			try {
				await instanceAiStore.syncThread(threadId, projectId, options?.launch);
			} catch {
				toast.showError(new Error('Failed to start a new thread. Try again.'), 'Open failed');
				return;
			}
			const thread = instanceAiStore.getOrCreateRuntime(threadId, projectId);
			prepare?.(threadId);
			void thread.sendMessage(message, attachments, rootStore.pushRef, options?.context);
			await router.push({ name: INSTANCE_AI_THREAD_VIEW, params: { threadId } });
		} finally {
			handoffInFlight = false;
		}
	}

	return { startThread };
}
