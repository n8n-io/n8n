import { useRoute, useRouter } from 'vue-router';
import { v4 as uuidv4 } from 'uuid';
import type { InstanceAiWorkflowAttachment } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';

import { VIEWS } from '@/app/constants';
import { EDITABLE_CANVAS_VIEWS } from '@/app/constants/navigation';
import { useToast } from '@/app/composables/useToast';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

import { INSTANCE_AI_THREAD_VIEW, INSTANCE_AI_VIEW } from '../constants';
import { useInstanceAiStore } from '../instanceAi.store';
import { useInstanceAiAvailable } from './useInstanceAiAvailability';

/** The credential type (and optional node) the user wants setup guidance for. */
export interface CredentialHelpContext {
	name: string;
	displayName: string;
	/** Node the credential is being configured for (editor scenario). */
	nodeName?: string;
}

/**
 * Asks Instance AI to guide a user through setting up a credential. Unlike the
 * editor workflow handoff, this is a directly-called composable (not the
 * injected `InstanceAiEditorCapability`) because the credential modal is a
 * global/teleported modal outside any host's provide scope. It resolves the
 * scenario from the route:
 *
 * - In an Instance AI thread (artifact) → append the question to that thread.
 * - In a workflow editor (persisted workflow) → new thread carrying the
 *   workflow + execution (reusing the workflow handoff) so the agent has full
 *   context; the node is named in the question.
 * - Anywhere else (e.g. the credentials list) → new thread for the credential
 *   alone.
 *
 * Guidance only: the question is auto-sent; the agent answers (it can resolve
 * the credential type and use its own credential tools from there).
 */
export function useInstanceAiCredentialHandoff() {
	const instanceAiStore = useInstanceAiStore();
	const projectsStore = useProjectsStore();
	const workflowsListStore = useWorkflowsListStore();
	const documentStore = injectWorkflowDocumentStore();
	const rootStore = useRootStore();
	const route = useRoute();
	const router = useRouter();
	const toast = useToast();

	const isAvailable = useInstanceAiAvailable();

	function buildQuestion(credential: CredentialHelpContext): string {
		const base = `How do I set up the ${credential.displayName} credential?`;
		return credential.nodeName ? `${base} It's for the "${credential.nodeName}" node.` : base;
	}

	function resolveEditorExecutionId(): string | undefined {
		const routeExecutionId = route.params.executionId;
		if (typeof routeExecutionId === 'string' && routeExecutionId !== '') {
			return routeExecutionId;
		}
		const executionState = useWorkflowExecutionStateStore(documentStore.value.documentId);
		if (typeof executionState.activeExecutionId === 'string') {
			return executionState.activeExecutionId;
		}
		if (typeof executionState.displayedExecutionId === 'string') {
			return executionState.displayedExecutionId;
		}
		return undefined;
	}

	async function startThread(
		projectId: string,
		message: string,
		attachments?: InstanceAiWorkflowAttachment[],
		prepare?: (threadId: string) => void,
	): Promise<void> {
		const threadId = uuidv4();
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

	async function openCredentialHelp(credential: CredentialHelpContext): Promise<void> {
		const question = buildQuestion(credential);

		// Artifact: append to the thread the user is already viewing.
		if (route.name === INSTANCE_AI_THREAD_VIEW) {
			const threadIdParam = route.params.threadId;
			const threadId = Array.isArray(threadIdParam) ? threadIdParam[0] : threadIdParam;
			if (threadId) {
				const thread = instanceAiStore.getOrCreateRuntime(threadId);
				void thread.sendMessage(question, undefined, rootStore.pushRef);
				return;
			}
		}

		// Editor: hand off the current workflow (+ execution) like the workflow
		// handoff, so the agent has full context; the node is named in the question.
		const doc = documentStore.value;
		const workflowId = doc.workflowId;
		const projectId = doc.homeProject?.id;
		const inEditor = EDITABLE_CANVAS_VIEWS.includes(route.name as VIEWS);
		const isPersisted = !!workflowId && !!workflowsListStore.getWorkflowById(workflowId)?.id;
		if (inEditor && isPersisted && projectId) {
			const executionId = resolveEditorExecutionId();
			const workflow = doc.getSnapshot();
			const executionSnapshot = executionId
				? useExecutionDataStore(createExecutionDataId(executionId)).getExecutionSnapshot()
				: null;
			const attachment: InstanceAiWorkflowAttachment = {
				type: 'workflow',
				id: workflowId,
				name: doc.name || undefined,
				executionId,
			};
			await startThread(projectId, question, [attachment], (threadId) => {
				instanceAiStore.getOrCreateRuntime(threadId, projectId).setPendingHandoff({
					workflowId,
					workflow,
					execution: executionSnapshot?.workflowId === workflowId ? executionSnapshot : undefined,
				});
			});
			return;
		}

		// Credentials list / elsewhere: a thread for the credential alone.
		const personalProjectId = projectsStore.personalProject?.id;
		if (!personalProjectId) {
			await router.push({ name: INSTANCE_AI_VIEW });
			return;
		}
		await startThread(personalProjectId, question);
	}

	return { isAvailable, openCredentialHelp };
}
