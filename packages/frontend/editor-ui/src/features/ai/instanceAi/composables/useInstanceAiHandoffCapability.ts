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

import { INSTANCE_AI_VIEW } from '../constants';
import { useInstanceAiStore } from '../instanceAi.store';
import { buildInstanceAiCredentialQuestion, useInstanceAiHandoff } from './useInstanceAiHandoff';

/**
 * The standalone editor's `InstanceAiEditorCapability` — the *behavior* of its
 * Instance AI entry points (visibility is the `instanceAi` `EditorFeature`).
 * `openWorkflow` opens Instance AI in the same tab about the editor's current
 * workflow: a thread that attaches the workflow (and the execution shown on the
 * canvas) so the agent orients on it and the thread view shows it as an artifact.
 * An unsaved canvas can't be handed off (the server doesn't know it), so it falls
 * back to the Instance AI home.
 * `openCredential` opens a new tab asking for setup guidance on a credential —
 * just the question, no workflow or execution.
 *
 * Call in the setup of an editor host (e.g. `WorkflowLayout`) and provide the
 * result under `InstanceAiEditorCapabilityKey`.
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
	 * A new workflow still has a (temporary) id before it's saved, so the id alone
	 * doesn't mean it exists on the backend. Mirrors the store's `isNewWorkflow`
	 * (not present in the list store = not persisted).
	 */
	function persistedWorkflow(): { workflowId: string; projectId: string } | null {
		const doc = documentStore.value;
		const workflowId = doc.workflowId;
		const projectId = doc.homeProject?.id;
		const isPersisted = !!workflowId && !!workflowsListStore.getWorkflowById(workflowId)?.id;
		return isPersisted && workflowId && projectId ? { workflowId, projectId } : null;
	}

	/**
	 * Hand the editor's current (persisted) workflow off to a new thread: attach
	 * the workflow + the execution shown on the canvas, seed both as a one-shot
	 * pending hand-off (so the artifact opens them without a refetch), and send
	 * `message` as the opening turn — empty for a plain hand-off, the credential
	 * question for setup guidance.
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
		// Snapshot now, while the editor's stores are still alive (they're disposed
		// on teardown), so the artifact seeds them without a refetch. Either is
		// omitted if not loaded, leaving a fetch fallback.
		const executionSnapshot = executionId
			? useExecutionDataStore(createExecutionDataId(executionId)).getExecutionSnapshot()
			: null;
		await startThread(
			projectId,
			message,
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
	): Promise<void> {
		const question = buildInstanceAiCredentialQuestion(credential);
		// Credentials always open in a new tab with just the question — no workflow
		// or execution carried (the node is named in the question), so the user keeps
		// the credential form open beside the chat. Scope to the editor's project
		// when known, else the user's personal project.
		const projectId = persistedWorkflow()?.projectId ?? projectsStore.personalProject?.id;
		if (!projectId) {
			await router.push({ name: INSTANCE_AI_VIEW });
			return;
		}
		await startThread(projectId, question, undefined, undefined, { newTab: true });
		telemetry.track('Instance AI opened from editor', {
			source,
			workflow_id: null,
			execution_id: null,
		});
	}

	return { openWorkflow, openCredential };
}
