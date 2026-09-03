import { useRouter } from 'vue-router';
import { v4 as uuidv4 } from 'uuid';
import {
	instanceAiAgentAttachmentSchema,
	instanceAiNodesAttachmentSchema,
	type InstanceAiAgentAttachment,
	type InstanceAiHandoffContext,
	type InstanceAiNodesAttachment,
	type InstanceAiThreadOrigin,
	type InstanceAiThreadSource,
	type InstanceAiResourceAttachment,
	type InstanceAiWorkflowAttachment,
} from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { jsonParse } from 'n8n-workflow';

import type { InstanceAiCredentialContext } from '@/app/composables/useInstanceAiEditorCapability';
import type { IWorkflowDb } from '@/Interface';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

import {
	INSTANCE_AI_AGENT_BUILDER_TARGET_METADATA_KEY,
	INSTANCE_AI_AGENT_PREVIEW_VIEW_METADATA_KEY,
	INSTANCE_AI_THREAD_VIEW,
	INSTANCE_AI_VIEW,
} from '../constants';
import { useInstanceAiStore } from '../instanceAi.store';
import { useInstanceAiReady } from './useInstanceAiAvailability';

/** The existing credential id, when known, so the agent can act on it directly. */
function existingCredentialNote(credential: InstanceAiCredentialContext): string {
	return credential.id ? ` The existing credential id is \`${credential.id}\`.` : '';
}

/**
 * A recipe-created credential arrives pre-filled, so the visible question only
 * asks where to find the values — this text renders as the user's own message;
 * the paste-only steering travels invisibly in the handoff context.
 */
function templatedValuesQuestion(credential: InstanceAiCredentialContext): string {
	const titles = (credential.placeholderTitles ?? []).map((title) => `"${title}"`);
	const list =
		titles.length > 1
			? `${titles.slice(0, -1).join(', ')} and ${titles[titles.length - 1]} values`
			: titles[0];
	return `Where do I find the ${list} for my "${credential.displayName}" credential?`;
}

/**
 * Opening question for a new-tab credential hand-off (credentials list, editor):
 * the new thread carries no workflow, so it names the credential setup modal as
 * the user's context. The node isn't carried into the new tab, so it isn't named.
 */
export function buildInstanceAiCredentialQuestion(credential: InstanceAiCredentialContext): string {
	if (credential.placeholderTitles?.length) {
		return templatedValuesQuestion(credential);
	}
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
	if (credential.placeholderTitles?.length) {
		return `${templatedValuesQuestion(credential)}${node}`;
	}
	return `How do I set up the credentials for ${credential.displayName}?${node}${existingCredentialNote(credential)}`;
}

const pendingFirstMessageKey = (threadId: string) => `n8n-instance-ai-first-message:${threadId}`;
const pendingHandoffContextKey = (threadId: string) =>
	`n8n-instance-ai-handoff-context:${threadId}`;
const pendingComposerDraftKey = (threadId: string) => `n8n-instance-ai-composer-draft:${threadId}`;
const pendingAgentAttachmentKey = (threadId: string) =>
	`n8n-instance-ai-agent-attachment:${threadId}`;

export interface PendingFirstMessage {
	message: string;
	attachments?: InstanceAiResourceAttachment[];
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
			...(credential.placeholderTitles?.length
				? { placeholderTitles: credential.placeholderTitles }
				: {}),
			...(credential.docsUrl ? { docsUrl: credential.docsUrl } : {}),
			...(credential.documentationUrl ? { documentationUrl: credential.documentationUrl } : {}),
			...(credential.oauthRedirectUrl ? { oauthRedirectUrl: credential.oauthRedirectUrl } : {}),
		},
	};
}

export function buildInstanceAiAgentPreviewHandoffContext(params: {
	agentId: string;
	threadId: string;
	agentName?: string;
	agentIcon?: string;
	sessionTitle?: string;
	executionId?: string;
}): InstanceAiHandoffContext {
	return {
		source: 'agent-preview',
		agentId: params.agentId,
		threadId: params.threadId,
		...(params.agentName ? { agentName: params.agentName } : {}),
		...(params.agentIcon ? { agentIcon: params.agentIcon } : {}),
		...(params.sessionTitle ? { sessionTitle: params.sessionTitle } : {}),
		...(params.executionId ? { executionId: params.executionId } : {}),
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

export function stashPendingHandoffContext(
	threadId: string,
	context: InstanceAiHandoffContext,
): void {
	localStorage.setItem(pendingHandoffContextKey(threadId), JSON.stringify(context));
}

export function getPendingHandoffContext(threadId: string): InstanceAiHandoffContext | null {
	const raw = localStorage.getItem(pendingHandoffContextKey(threadId));
	if (!raw) return null;
	try {
		return JSON.parse(raw) as InstanceAiHandoffContext;
	} catch {
		clearPendingHandoffContext(threadId);
		return null;
	}
}

export function clearPendingHandoffContext(threadId: string): void {
	localStorage.removeItem(pendingHandoffContextKey(threadId));
}

export function stashPendingComposerDraft(threadId: string, draft: string): void {
	localStorage.setItem(pendingComposerDraftKey(threadId), draft);
}

export function getPendingComposerDraft(threadId: string): string | null {
	const draft = localStorage.getItem(pendingComposerDraftKey(threadId));
	if (!draft) return null;
	return draft;
}

export function clearPendingComposerDraft(threadId: string): void {
	localStorage.removeItem(pendingComposerDraftKey(threadId));
}

export function stashPendingAgentAttachment(
	threadId: string,
	attachment: InstanceAiAgentAttachment,
): void {
	localStorage.setItem(pendingAgentAttachmentKey(threadId), JSON.stringify(attachment));
}

export function getPendingAgentAttachment(threadId: string): InstanceAiAgentAttachment | null {
	const raw = localStorage.getItem(pendingAgentAttachmentKey(threadId));
	if (!raw) return null;
	try {
		const parsed = instanceAiAgentAttachmentSchema.safeParse(JSON.parse(raw));
		return parsed.success ? parsed.data : null;
	} catch {
		return null;
	}
}

export function clearPendingAgentAttachment(threadId: string): void {
	localStorage.removeItem(pendingAgentAttachmentKey(threadId));
}

const pendingDraftAttachmentKey = (threadId: string) =>
	`n8n-instance-ai-draft-attachment:${threadId}`;

export function stashPendingDraftAttachment(
	threadId: string,
	sets: InstanceAiNodesAttachment['sets'],
	workflowId: string,
): void {
	const attachment: InstanceAiNodesAttachment = { type: 'nodes', workflowId, sets };

	localStorage.setItem(pendingDraftAttachmentKey(threadId), JSON.stringify(attachment));
}

export function clearPendingDraftAttachment(threadId: string): void {
	localStorage.removeItem(pendingDraftAttachmentKey(threadId));
}

export function consumePendingDraftAttachment(threadId: string): InstanceAiNodesAttachment | null {
	const raw = localStorage.getItem(pendingDraftAttachmentKey(threadId));
	if (!raw) return null;
	localStorage.removeItem(pendingDraftAttachmentKey(threadId));

	const parsed = instanceAiNodesAttachmentSchema.safeParse(
		jsonParse(raw, { fallbackValue: undefined }),
	);
	return parsed.success ? parsed.data : null;
}

export function clearPendingThreadHandoff(threadId: string): void {
	clearPendingHandoffContext(threadId);
	clearPendingComposerDraft(threadId);
	clearPendingAgentAttachment(threadId);
	clearPendingDraftAttachment(threadId);
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
	launch: InstanceAiThreadLaunch,
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

export async function provisionContextOnlyThread(
	projectId: string,
	context: InstanceAiHandoffContext,
	launch: InstanceAiThreadLaunch,
	initialDraft?: string,
): Promise<string | null> {
	const threadId = uuidv4();
	try {
		await useInstanceAiStore().syncThread(threadId, projectId, launch);
	} catch {
		return null;
	}
	stashPendingHandoffContext(threadId, context);
	if (initialDraft) stashPendingComposerDraft(threadId, initialDraft);
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
	const i18n = useI18n();
	const instanceAiReady = useInstanceAiReady();

	/**
	 * Setup isn't finished yet. An admin reaches these entry points before it is
	 * (they need the way in to complete it), so opening a thread here would send
	 * a turn no model can answer. Take them to the assistant instead, where
	 * onboarding takes over. Every hand-off funnels through here, so a new entry
	 * point inherits the gate instead of having to remember it.
	 */
	async function routeToSetup(): Promise<void> {
		await router.push({ name: INSTANCE_AI_VIEW });
	}

	function showOpenFailed() {
		toast.showError(
			new Error(i18n.baseText('instanceAi.handoff.openFailed.message')),
			i18n.baseText('instanceAi.handoff.openFailed.title'),
		);
	}

	async function openAgentArtifactThread(
		attachment: InstanceAiAgentAttachment,
		launch: InstanceAiThreadLaunch,
		options?: {
			context?: InstanceAiHandoffContext;
			initialDraft?: string;
		},
	): Promise<boolean> {
		if (!instanceAiReady.value) {
			await routeToSetup();
			return false;
		}
		if (handoffInFlight) return false;
		handoffInFlight = true;
		try {
			const threadId = uuidv4();
			try {
				await instanceAiStore.syncThread(threadId, attachment.projectId, launch);
			} catch {
				showOpenFailed();
				return false;
			}
			try {
				await instanceAiStore.updateThreadMetadata(threadId, {
					[INSTANCE_AI_AGENT_BUILDER_TARGET_METADATA_KEY]: {
						agentId: attachment.id,
						projectId: attachment.projectId,
						...(attachment.name ? { name: attachment.name } : {}),
					},
					...(options?.context?.source === 'agent-preview'
						? {
								[INSTANCE_AI_AGENT_PREVIEW_VIEW_METADATA_KEY]: {
									agentId: options.context.agentId,
									threadId: options.context.threadId,
								},
							}
						: {}),
				});
			} catch {
				await instanceAiStore.deleteThread(threadId);
				showOpenFailed();
				return false;
			}
			stashPendingAgentAttachment(threadId, attachment);
			if (options?.context) stashPendingHandoffContext(threadId, options.context);
			if (options?.initialDraft) stashPendingComposerDraft(threadId, options.initialDraft);
			try {
				const failure = await router.push({
					name: INSTANCE_AI_THREAD_VIEW,
					params: { threadId },
				});
				if (failure) throw new Error('Navigation failed');
			} catch {
				clearPendingThreadHandoff(threadId);
				await instanceAiStore.deleteThread(threadId);
				showOpenFailed();
				return false;
			}
			return true;
		} finally {
			handoffInFlight = false;
		}
	}

	async function openThreadWithContext(
		projectId: string,
		context: InstanceAiHandoffContext,
		launch: InstanceAiThreadLaunch,
		options?: {
			newTab?: boolean;
			initialDraft?: string;
		},
	): Promise<boolean> {
		if (!instanceAiReady.value) {
			await routeToSetup();
			return false;
		}
		if (handoffInFlight) return false;
		handoffInFlight = true;
		try {
			const tab = options?.newTab ? window.open('', '_blank') : null;
			const threadId = await provisionContextOnlyThread(
				projectId,
				context,
				launch,
				options?.initialDraft,
			);
			if (!threadId) {
				tab?.close();
				showOpenFailed();
				return false;
			}
			const route = { name: INSTANCE_AI_THREAD_VIEW, params: { threadId } };
			if (tab) {
				tab.location.href = router.resolve(route).href;
			} else {
				await router.push(route);
			}
			return true;
		} finally {
			handoffInFlight = false;
		}
	}

	async function startThread(
		projectId: string,
		message: string,
		launch: InstanceAiThreadLaunch,
		attachments?: InstanceAiResourceAttachment[],
		prepare?: (threadId: string) => void,
		options?: {
			newTab?: boolean;
			context?: InstanceAiHandoffContext;
		},
	): Promise<void> {
		if (!instanceAiReady.value) {
			await routeToSetup();
			return;
		}
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
					launch,
				);
				if (!threadId) {
					tab?.close();
					showOpenFailed();
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
				await instanceAiStore.syncThread(threadId, projectId, launch);
			} catch {
				showOpenFailed();
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

	async function openThreadForDraft(workflow?: {
		id: string;
		name?: string;
		snapshot?: IWorkflowDb;
	}): Promise<string | null> {
		if (handoffInFlight) return null;
		handoffInFlight = true;
		try {
			const projectId = await ensurePersonalProjectId();
			if (!projectId) return null;
			const threadId = uuidv4();
			const launch: InstanceAiThreadLaunch = { source: 'canvas_action_button', origin: 'internal' };
			try {
				await instanceAiStore.syncThread(threadId, projectId, launch);
			} catch {
				toast.showError(
					new Error(i18n.baseText('instanceAi.handoff.openFailed.message')),
					i18n.baseText('instanceAi.handoff.openFailed.title'),
				);
				return null;
			}
			if (workflow) {
				const attachment: InstanceAiWorkflowAttachment = {
					type: 'workflow',
					id: workflow.id,
					name: workflow.name || undefined,
				};
				// Empty message → the editor-context block just greets; the attachment
				// opens the canvas preview via the thread view's firstAttachedArtifactId.
				stashPendingFirstMessage(threadId, { message: '', attachments: [attachment] });
				if (workflow.snapshot) {
					instanceAiStore
						.getOrCreateRuntime(threadId, projectId)
						.setPendingHandoff({ workflowId: workflow.id, workflow: workflow.snapshot });
				}
			}
			return threadId;
		} finally {
			handoffInFlight = false;
		}
	}

	return { startThread, openThreadWithContext, openAgentArtifactThread, openThreadForDraft };
}
