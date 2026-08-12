import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { VIEWS } from '@/app/constants';
import { nodeViewEventBus } from '@/app/event-bus/node-view';
import { useLogsStore } from '@/app/stores/logs.store';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';

import {
	getExecutionResultsByWorkflow,
	getLatestBuildResult,
	getLatestWorkflowSetupResult,
	getLatestWorkflowUpdateResult,
} from '../canvasPreview.utils';
import type { ThreadRuntime } from '../instanceAi.store';

/**
 * Keep the live editor canvas in sync with Instance AI floating-panel tool
 * results — the counterpart of `useCanvasPreview`'s `refreshKey` bumps and
 * execution-result painting on the assistant artifact host.
 *
 * - Mutation targets the open workflow → force-reload from the API
 * - Mutation targets another workflow (or the canvas is still `?new=true`) →
 *   replace the route so WorkflowLayout loads that workflow
 * - `verify-built-workflow` / `executions.run` for the open workflow → fetch
 *   and display that run on the canvas (node success/error states)
 * - Hydration / non-editor routes → no-op
 */
export function useInstanceAiCanvasSync(thread: ThreadRuntime) {
	const route = useRoute();
	const router = useRouter();
	const workflowsStore = useWorkflowsStore();
	const logsStore = useLogsStore();

	const latestBuildResult = computed(() => {
		for (let i = thread.messages.length - 1; i >= 0; i--) {
			const message = thread.messages[i];
			if (!message.agentTree) continue;
			const result = getLatestBuildResult(message.agentTree);
			if (result) return result;
		}
		return null;
	});

	const latestUpdateResult = computed(() => {
		for (let i = thread.messages.length - 1; i >= 0; i--) {
			const message = thread.messages[i];
			if (!message.agentTree) continue;
			const result = getLatestWorkflowUpdateResult(message.agentTree);
			if (result) return result;
		}
		return null;
	});

	const latestSetupResult = computed(() => {
		for (let i = thread.messages.length - 1; i >= 0; i--) {
			const message = thread.messages[i];
			if (!message.agentTree) continue;
			const result = getLatestWorkflowSetupResult(message.agentTree);
			if (result) return result;
		}
		return null;
	});

	/**
	 * Latest agent-produced execution for the workflow currently on the canvas
	 * (`verify-built-workflow` or `executions.run`). Later messages win.
	 */
	const latestExecutionForOpenWorkflow = computed(() => {
		if (!isOnWorkflowEditor() || isNewWorkflowRoute()) return null;
		const workflowId = currentWorkflowId();
		if (!workflowId) return null;

		let latest: { workflowId: string; executionId: string } | null = null;
		for (const message of thread.messages) {
			if (!message.agentTree) continue;
			const result = getExecutionResultsByWorkflow(message.agentTree).get(workflowId);
			if (result) {
				latest = { workflowId, executionId: result.executionId };
			}
		}
		return latest;
	});

	function currentWorkflowId(): string | undefined {
		const id = route.params.workflowId;
		return Array.isArray(id) ? id[0] : id;
	}

	function isNewWorkflowRoute(): boolean {
		return route.query.new === 'true' || route.query.new === '1';
	}

	function isOnWorkflowEditor(): boolean {
		return route.name === VIEWS.WORKFLOW;
	}

	function syncWorkflow(workflowId: string | undefined) {
		if (!workflowId || thread.isHydratingThread || !isOnWorkflowEditor()) return;

		const currentId = currentWorkflowId();
		const isNew = isNewWorkflowRoute();

		if (currentId === workflowId && !isNew) {
			nodeViewEventBus.emit('reloadWorkflow', { workflowId });
			return;
		}

		if (isNew || (currentId && currentId !== workflowId)) {
			void router.replace({
				name: VIEWS.WORKFLOW,
				params: { workflowId },
			});
		}
	}

	async function showAgentExecution(workflowId: string, executionId: string) {
		let execution;
		try {
			execution = await workflowsStore.fetchExecutionDataById(executionId);
		} catch {
			return;
		}
		if (!execution || execution.workflowId !== workflowId) return;
		if (currentWorkflowId() !== workflowId || isNewWorkflowRoute()) return;

		const executionState = useWorkflowExecutionStateStore(createWorkflowDocumentId(workflowId));
		// Don't clobber a different live run still in progress.
		if (
			typeof executionState.activeExecutionId === 'string' &&
			executionState.activeExecutionId !== executionId
		) {
			return;
		}
		if (executionState.displayedExecutionId === executionId) return;

		executionState.setWorkflowExecutionData(execution);
		logsStore.toggleOpen(true);
	}

	watch(
		() => latestBuildResult.value?.toolCallId,
		(toolCallId) => {
			if (!toolCallId || !latestBuildResult.value) return;
			syncWorkflow(latestBuildResult.value.workflowId);
		},
		{ flush: 'sync' },
	);

	watch(
		() => latestUpdateResult.value?.toolCallId,
		(toolCallId) => {
			if (!toolCallId || !latestUpdateResult.value) return;
			syncWorkflow(latestUpdateResult.value.workflowId);
		},
		{ flush: 'sync' },
	);

	watch(
		() => latestSetupResult.value?.toolCallId,
		(toolCallId) => {
			if (!toolCallId || !latestSetupResult.value) return;
			syncWorkflow(latestSetupResult.value.workflowId);
		},
		{ flush: 'sync' },
	);

	watch(
		() =>
			[
				latestExecutionForOpenWorkflow.value?.workflowId,
				latestExecutionForOpenWorkflow.value?.executionId,
			] as const,
		([workflowId, executionId]) => {
			if (!workflowId || !executionId || thread.isHydratingThread) return;
			void showAgentExecution(workflowId, executionId);
		},
		{ flush: 'sync' },
	);
}
