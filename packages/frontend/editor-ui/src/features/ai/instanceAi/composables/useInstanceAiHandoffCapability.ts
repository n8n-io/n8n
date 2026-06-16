import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { v4 as uuidv4 } from 'uuid';
import type { InstanceAiWorkflowAttachment } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';

import type {
	InstanceAiEditorActionSource,
	InstanceAiEditorCapability,
} from '@/app/composables/useInstanceAiEditorCapability';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';

import { INSTANCE_AI_THREAD_VIEW, INSTANCE_AI_VIEW } from '../constants';
import { useInstanceAiStore } from '../instanceAi.store';
import { canMessageInstanceAi } from '../instanceAiPermissions';

/**
 * The standalone editor's `InstanceAiEditorCapability`: hand the editor's
 * current workflow off to Instance AI. Creates a thread in the workflow's home
 * project and auto-sends an opening message that attaches the workflow (and the
 * execution shown on the canvas) — the agent orients on it, the thread view
 * shows it as an artifact. Then navigates to the thread.
 *
 * Call in the setup of an editor host (e.g. `WorkflowLayout`) and provide the
 * result under `InstanceAiEditorCapabilityKey`.
 */
export function useInstanceAiHandoffCapability(): InstanceAiEditorCapability {
	const settingsStore = useSettingsStore();
	const instanceAiStore = useInstanceAiStore();
	const documentStore = injectWorkflowDocumentStore();
	const workflowsListStore = useWorkflowsListStore();
	const rootStore = useRootStore();
	const route = useRoute();
	const router = useRouter();
	const telemetry = useTelemetry();
	const toast = useToast();

	/** Same gate as the Instance AI nav item and command-bar entries. */
	const isAvailable = computed(
		() =>
			settingsStore.isModuleActive('instance-ai') &&
			settingsStore.moduleSettings['instance-ai']?.enabled !== false &&
			canMessageInstanceAi(),
	);

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

	async function openWorkflow(source: InstanceAiEditorActionSource): Promise<void> {
		const doc = documentStore.value;
		const workflowId = doc.workflowId;
		const projectId = doc.homeProject?.id;

		// A new workflow still has a (temporary) id before it's saved, so the id
		// alone doesn't mean it exists on the backend. Hand off only persisted
		// workflows — the agent can't act on one the server doesn't know, and an
		// unsaved canvas is a "build something new" intent. Mirrors the store's
		// `isNewWorkflow` (not present in the list store = not persisted).
		const isPersisted = !!workflowId && !!workflowsListStore.getWorkflowById(workflowId)?.id;
		if (!isPersisted || !projectId) {
			telemetry.track('Instance AI opened from editor', {
				source,
				workflow_id: null,
				execution_id: null,
			});
			await router.push({ name: INSTANCE_AI_VIEW });
			return;
		}

		const executionId = resolveEditorExecutionId();
		const threadId = uuidv4();

		// Persist the thread on the BE before navigating — `/instance-ai/:threadId`
		// expects an existing thread.
		try {
			await instanceAiStore.syncThread(threadId, projectId);
		} catch {
			toast.showError(new Error('Failed to start a new thread. Try again.'), 'Open failed');
			return;
		}

		// Auto-send an opening turn that attaches the workflow (+ shown execution).
		// Empty text: the attachment is the message — the agent orients on it and
		// the thread view shows it as an artifact.
		const attachment: InstanceAiWorkflowAttachment = {
			type: 'workflow',
			id: workflowId,
			name: doc.name || undefined,
			executionId,
		};
		const thread = instanceAiStore.getOrCreateRuntime(threadId, projectId);
		// Hand the workflow (and the execution it was showing) off once, when the
		// artifact opens — transient, so it only applies on this redirect (not on
		// later reloads). Snapshot both now, while the editor's stores are still
		// alive (they're disposed on teardown), so the artifact seeds them without
		// a refetch. Either is omitted if not loaded, leaving a fetch fallback.
		const executionSnapshot = executionId
			? useExecutionDataStore(createExecutionDataId(executionId)).getExecutionSnapshot()
			: null;
		thread.setPendingHandoff({
			workflowId,
			workflow: doc.getSnapshot(),
			execution: executionSnapshot?.workflowId === workflowId ? executionSnapshot : undefined,
		});
		void thread.sendMessage('', [attachment], rootStore.pushRef);

		telemetry.track('Instance AI opened from editor', {
			source,
			workflow_id: workflowId,
			execution_id: executionId ?? null,
		});
		await router.push({ name: INSTANCE_AI_THREAD_VIEW, params: { threadId } });
	}

	return { isAvailable, openWorkflow };
}
