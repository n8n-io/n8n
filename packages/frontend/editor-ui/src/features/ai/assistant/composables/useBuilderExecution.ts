import { computed, onBeforeUnmount, nextTick, watch, type ComputedRef } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';

import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useLogsStore } from '@/app/stores/logs.store';
import { useRunWorkflow } from '@/app/composables/useRunWorkflow';
import { useToast } from '@/app/composables/useToast';
import { isChatNode } from '@/app/utils/aiUtils';

const RUNNING_STATES: string[] = ['running', 'waiting'];

/**
 * Shared execution logic for the builder setup wizard and control variant.
 * Handles trigger selection, chat-node detection, execution watcher, and cleanup.
 *
 * @param isReady - When false, the execute button is disabled and trigger dropdown is hidden.
 */
export function useBuilderExecution(isReady: ComputedRef<boolean>) {
	const router = useRouter();
	const i18n = useI18n();
	const workflowsStore = useWorkflowsStore();
	const nodeTypesStore = useNodeTypesStore();
	const logsStore = useLogsStore();
	const toast = useToast();

	const { runWorkflow } = useRunWorkflow({ router });

	const triggerNodes = computed(() =>
		workflowsStore.workflow.nodes.filter((node) => nodeTypesStore.isTriggerNode(node.type)),
	);

	// Empty until ready — prevents trigger selection in the execute button while setup is pending
	const availableTriggerNodes = computed(() => (isReady.value ? triggerNodes.value : []));

	const executeButtonTooltip = computed(() =>
		!isReady.value ? i18n.baseText('aiAssistant.builder.executeMessage.validationTooltip') : '',
	);

	const isWorkflowRunning = computed(() => workflowsStore.isWorkflowRunning);
	const isExecutionWaitingForWebhook = computed(() => workflowsStore.executionWaitingForWebhook);

	// --- Execution watcher ---
	let executionWatcherStop: (() => void) | undefined;

	const stopExecutionWatcher = () => {
		if (executionWatcherStop) {
			executionWatcherStop();
			executionWatcherStop = undefined;
		}
	};

	const ensureExecutionWatcher = (onExecutionComplete: () => void) => {
		stopExecutionWatcher();

		executionWatcherStop = watch(
			() => workflowsStore.workflowExecutionData?.status,
			async (status) => {
				await nextTick();
				if (!status || RUNNING_STATES.includes(status)) return;

				stopExecutionWatcher();

				if (status !== 'canceled') {
					onExecutionComplete();
				}
			},
		);
	};

	/**
	 * Execute the workflow. Returns false if execution was blocked (not ready, chat trigger).
	 */
	async function execute(onExecutionComplete: () => void): Promise<boolean> {
		if (!isReady.value) return false;

		const selectedTriggerNode =
			workflowsStore.selectedTriggerNodeName ?? availableTriggerNodes.value[0]?.name;
		const selectedTriggerNodeType = selectedTriggerNode
			? workflowsStore.getNodeByName(selectedTriggerNode)
			: null;

		ensureExecutionWatcher(onExecutionComplete);

		if (selectedTriggerNodeType && isChatNode(selectedTriggerNodeType)) {
			toast.showMessage({
				title: i18n.baseText('aiAssistant.builder.toast.title'),
				message: i18n.baseText('aiAssistant.builder.toast.description'),
				type: 'info',
			});
			logsStore.toggleOpen(true);
			return false;
		}

		const runOptions: Parameters<typeof runWorkflow>[0] = {};
		if (selectedTriggerNode) {
			runOptions.triggerNode = selectedTriggerNode;
		}

		await runWorkflow(runOptions);
		return true;
	}

	onBeforeUnmount(stopExecutionWatcher);

	return {
		triggerNodes,
		availableTriggerNodes,
		executeButtonTooltip,
		isWorkflowRunning,
		isExecutionWaitingForWebhook,
		execute,
	};
}
