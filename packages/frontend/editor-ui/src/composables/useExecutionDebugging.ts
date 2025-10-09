import { h, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { useMessage } from '@/composables/useMessage';
import { useToast } from '@/composables/useToast';
import { injectWorkflowState } from '@/composables/useWorkflowState';
import {
	DEBUG_PAYWALL_MODAL_KEY,
	EnterpriseEditionFeature,
	MODAL_CONFIRM,
	VIEWS,
} from '@/constants';
import type { INodeUi } from '@/Interface';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUIStore } from '@/stores/ui.store';
import { useTelemetry } from './useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { isFullExecutionResponse } from '@/utils/typeGuards';
import { sanitizeHtml } from '@/utils/htmlUtils';
import { usePageRedirectionHelper } from './usePageRedirectionHelper';

export const useExecutionDebugging = () => {
	const telemetry = useTelemetry();

	const router = useRouter();
	const i18n = useI18n();
	const message = useMessage();
	const toast = useToast();
	const workflowsStore = useWorkflowsStore();
	const workflowState = injectWorkflowState();
	const settingsStore = useSettingsStore();
	const uiStore = useUIStore();

	const pageRedirectionHelper = usePageRedirectionHelper();

	const isDebugEnabled = computed(
		() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.DebugInEditor],
	);

	const applyExecutionData = async (executionId: string): Promise<void> => {
		const execution = await workflowsStore.getExecution(executionId);
		const workflowObject = workflowsStore.workflowObject;
		const workflowNodes = workflowsStore.getNodes();

		if (!execution?.data?.resultData) {
			return;
		}

		const { runData } = execution.data.resultData;

		const executionNodeNames = Object.keys(runData);
		const missingNodeNames = executionNodeNames.filter(
			(name) => !workflowNodes.some((node) => node.name === name),
		);

		// Using the pinned data of the workflow to check if the node is pinned
		// because workflowsStore.getCurrentWorkflow() returns a cached workflow without the updated pinned data
		const workflowPinnedNodeNames = Object.keys(workflowsStore.workflow.pinData ?? {});
		const matchingPinnedNodeNames = executionNodeNames.filter((name) =>
			workflowPinnedNodeNames.includes(name),
		);

		if (matchingPinnedNodeNames.length > 0) {
			const confirmMessage = h('p', [
				i18n.baseText('nodeView.confirmMessage.debug.message'),
				h(
					'ul',
					{ class: 'mt-l ml-l' },
					matchingPinnedNodeNames.map((name) => h('li', sanitizeHtml(name))),
				),
			]);

			const overWritePinnedDataConfirm = await message.confirm(
				confirmMessage,
				i18n.baseText('nodeView.confirmMessage.debug.headline'),
				{
					type: 'warning',
					confirmButtonText: i18n.baseText('nodeView.confirmMessage.debug.confirmButtonText'),
					cancelButtonText: i18n.baseText('nodeView.confirmMessage.debug.cancelButtonText'),

					customClass: 'matching-pinned-nodes-confirmation',
				},
			);

			if (overWritePinnedDataConfirm === MODAL_CONFIRM) {
				matchingPinnedNodeNames.forEach((name) => {
					const node = workflowsStore.getNodeByName(name);
					if (node) {
						workflowsStore.unpinData({ node });
					}
				});
			} else {
				await router.push({
					name: VIEWS.EXECUTION_PREVIEW,
					params: { name: workflowObject.id, executionId },
				});
				return;
			}
		}

		// Set execution data
		workflowState.resetAllNodesIssues();
		workflowState.setWorkflowExecutionData(execution);

		// Pin data of all nodes which do not have a parent node
		const pinnableNodes = workflowNodes.filter(
			(node: INodeUi) => !workflowObject.getParentNodes(node.name).length,
		);

		let pinnings = 0;

		pinnableNodes.forEach((node: INodeUi) => {
			const taskData = runData[node.name]?.[0];
			if (taskData?.data?.main) {
				// Get the first main output that has data, preserving all execution data including binary
				const nodeData = taskData.data.main.find((output) => output && output.length > 0);
				if (nodeData) {
					pinnings++;
					workflowsStore.pinData({
						node,
						data: nodeData,
						isRestoration: true,
					});
				}
			}
		});

		toast.showToast({
			title: i18n.baseText('nodeView.showMessage.debug.title'),
			message: i18n.baseText('nodeView.showMessage.debug.content'),
			type: 'info',
		});

		if (missingNodeNames.length) {
			toast.showToast({
				title: i18n.baseText('nodeView.showMessage.debug.missingNodes.title'),
				message: i18n.baseText('nodeView.showMessage.debug.missingNodes.content', {
					interpolate: { nodeNames: missingNodeNames.join(', ') },
				}),
				type: 'warning',
			});
		}

		telemetry.track('User clicked debug execution button', {
			instance_id: useRootStore().instanceId,
			exec_status: isFullExecutionResponse(execution) ? execution.status : '',
			override_pinned_data: pinnableNodes.length === pinnings,
			all_exec_data_imported: missingNodeNames.length === 0,
		});
	};

	const handleDebugLinkClick = (event: Event): void => {
		if (!isDebugEnabled.value) {
			uiStore.openModalWithData({
				name: DEBUG_PAYWALL_MODAL_KEY,
				data: {
					title: i18n.baseText('executionsList.debug.paywall.title'),
					footerButtonAction: () => {
						uiStore.closeModal(DEBUG_PAYWALL_MODAL_KEY);
						void pageRedirectionHelper.goToUpgrade('debug', 'upgrade-debug');
					},
				},
			});
			event.preventDefault();
			event.stopPropagation();
			return;
		}
		workflowsStore.isInDebugMode = false;
	};

	return {
		applyExecutionData,
		handleDebugLinkClick,
	};
};
