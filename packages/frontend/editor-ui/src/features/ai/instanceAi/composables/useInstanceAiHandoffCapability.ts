import { nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { InstanceAiWorkflowAttachment } from '@n8n/api-types';

import type {
	InstanceAiCredentialContext,
	InstanceAiEditorActionSource,
	InstanceAiEditorCapability,
} from '@/app/composables/useInstanceAiEditorCapability';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';

import { INSTANCE_AI_VIEW } from '../constants';
import { useInstanceAiStore } from '../instanceAi.store';
import {
	buildInstanceAiCredentialHandoffContext,
	buildInstanceAiCredentialQuestion,
	useInstanceAiHandoff,
} from './useInstanceAiHandoff';

/**
 * The standalone editor's `InstanceAiEditorCapability` (behavior; visibility is the
 * `instanceAi` `EditorFeature`). `openWorkflow` hands the current workflow (+ shown
 * execution) to Instance AI in the same tab — an unsaved canvas falls back to home.
 * `openCredential` opens a new tab with just the credential question. Provide the
 * result from an editor host (e.g. `WorkflowLayout`).
 */
export function useInstanceAiHandoffCapability(): InstanceAiEditorCapability {
	const instanceAiStore = useInstanceAiStore();
	const documentStore = injectWorkflowDocumentStore();
	const workflowsListStore = useWorkflowsListStore();
	const projectsStore = useProjectsStore();
	const route = useRoute();
	const router = useRouter();
	const telemetry = useTelemetry();
	const { startThread } = useInstanceAiHandoff();

	/**
	 * The execution currently shown in the editor: the debug route's execution,
	 * a live/just-finished run, or the displayed past run — in that order.
	 */
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

	/**
	 * Whether the editor's workflow exists on the backend — a new workflow has a
	 * temporary id before it's saved, so the id alone isn't enough.
	 */
	function persistedWorkflow(): { workflowId: string; projectId: string } | null {
		const doc = documentStore.value;
		const workflowId = doc.workflowId;
		const projectId = doc.homeProject?.id;
		const isPersisted = !!workflowId && !!workflowsListStore.getWorkflowById(workflowId)?.id;
		return isPersisted && workflowId && projectId ? { workflowId, projectId } : null;
	}

	/**
	 * Hand the editor's (persisted) workflow off to a new thread: attach it (+ the
	 * shown execution), seed both for the artifact, and send `message` as the opening turn.
	 */
	async function handOffWorkflow(
		message: string,
		source: InstanceAiEditorActionSource,
		workflowId: string,
		projectId: string,
		newTab = false,
	): Promise<void> {
		const doc = documentStore.value;
		const executionId = resolveEditorExecutionId();
		const attachment: InstanceAiWorkflowAttachment = {
			type: 'workflow',
			id: workflowId,
			name: doc.name || undefined,
			executionId,
		};
		// Snapshot now — the editor's stores are disposed on teardown — so the artifact
		// seeds it without a refetch. Omitted if not loaded, leaving a fetch fallback.
		const executionSnapshot = executionId
			? useExecutionDataStore(createExecutionDataId(executionId)).getExecutionSnapshot()
			: null;
		// An error hand-off (the node-error view, or a failed run shown on the canvas)
		// asks the agent to investigate; a plain hand-off keeps the empty message so the
		// editor-context block has it just greet.
		const executionFailed =
			executionSnapshot?.status === 'error' || executionSnapshot?.status === 'crashed';
		const openingMessage =
			message ||
			(executionFailed
				? 'The execution failed. Look into what went wrong and help me fix it.'
				: '');
		// Close any open NDV before navigating. Otherwise its children unmount during
		// the route change — after the workflow document store is gone — and throw via
		// injectNDVStore(), aborting the navigation and leaving a blank screen. No-op
		// when nothing is open (e.g. the canvas action button).
		const ndvStore = useNDVStore(documentStore.value.documentId);
		if (ndvStore.activeNode) {
			ndvStore.unsetActiveNodeName();
			await nextTick();
		}
		await startThread(
			projectId,
			openingMessage,
			[attachment],
			(threadId) => {
				instanceAiStore.getOrCreateRuntime(threadId, projectId).setPendingHandoff({
					workflowId,
					workflow: doc.getSnapshot(),
					execution: executionSnapshot?.workflowId === workflowId ? executionSnapshot : undefined,
				});
			},
			{ newTab },
		);
		telemetry.track('Instance AI opened from editor', {
			source,
			workflow_id: workflowId,
			execution_id: executionId ?? null,
		});
	}

	async function openWorkflow(source: InstanceAiEditorActionSource): Promise<void> {
		const persisted = persistedWorkflow();
		// Hand off only persisted workflows — the agent can't act on one the server
		// doesn't know, and an unsaved canvas is a "build something new" intent.
		if (!persisted) {
			telemetry.track('Instance AI opened from editor', {
				source,
				workflow_id: null,
				execution_id: null,
			});
			await router.push({ name: INSTANCE_AI_VIEW });
			return;
		}
		await handOffWorkflow('', source, persisted.workflowId, persisted.projectId);
	}

	async function openCredential(
		credential: InstanceAiCredentialContext,
		source: InstanceAiEditorActionSource,
	): Promise<boolean> {
		const question = buildInstanceAiCredentialQuestion(credential);
		// New tab with just the question (no workflow/execution) so the user keeps the
		// credential form open beside the chat. Scope to the editor's project, else personal.
		const projectId = persistedWorkflow()?.projectId ?? projectsStore.personalProject?.id;
		if (!projectId) {
			await router.push({ name: INSTANCE_AI_VIEW });
			return false;
		}
		await startThread(projectId, question, undefined, undefined, {
			newTab: true,
			context: buildInstanceAiCredentialHandoffContext(credential),
		});
		telemetry.track('Instance AI opened from editor', {
			source,
			workflow_id: null,
			execution_id: null,
		});
		// New tab → keep the credential modal open so the user can finish the form.
		return false;
	}

	return { openWorkflow, openCredential };
}
