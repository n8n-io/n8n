import { h, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n, useMessage, useToast } from '@/composables';
import {
	DEBUG_PAYWALL_MODAL_KEY,
	EnterpriseEditionFeature,
	MODAL_CONFIRM,
	VIEWS,
} from '@/constants';
import { useSettingsStore, useUIStore, useWorkflowsStore } from '@/stores';
import type { INodeUi } from '@/Interface';

export const useExecutionDebugging = () => {
	const router = useRouter();
	const i18n = useI18n();
	const message = useMessage();
	const toast = useToast();
	const workflowsStore = useWorkflowsStore();
	const settingsStore = useSettingsStore();
	const uiStore = useUIStore();

	const isDebugEnabled = computed(() =>
		settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.DebugInEditor),
	);

	const applyExecutionData = async (executionId: string): Promise<void> => {
		const execution = await workflowsStore.getExecution(executionId);
		const workflow = workflowsStore.getCurrentWorkflow();
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
					matchingPinnedNodeNames.map((name) => h('li', name)),
				),
			]);

			const overWritePinnedDataConfirm = await message.confirm(
				confirmMessage,
				i18n.baseText('nodeView.confirmMessage.debug.headline'),
				{
					type: 'warning',
					confirmButtonText: i18n.baseText('nodeView.confirmMessage.debug.confirmButtonText'),
					cancelButtonText: i18n.baseText('nodeView.confirmMessage.debug.cancelButtonText'),
					dangerouslyUseHTMLString: true,
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
					params: { name: workflow.id, executionId },
				});
				return;
			}
		}

		// Set execution data
		workflowsStore.setWorkflowExecutionData(execution);

		// Pin data of all nodes which do not have a parent node
		workflowNodes
			.filter((node: INodeUi) => !workflow.getParentNodes(node.name).length)
			.forEach((node: INodeUi) => {
				const nodeData = runData[node.name]?.[0].data?.main[0];
				if (nodeData) {
					workflowsStore.pinData({
						node,
						data: nodeData,
					});
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
	};

	const handleDebugLinkClick = (event: Event): void => {
		if (!isDebugEnabled.value) {
			uiStore.openModalWithData({
				name: DEBUG_PAYWALL_MODAL_KEY,
				data: {
					title: i18n.baseText(uiStore.contextBasedTranslationKeys.feature.unavailable.title),
					footerButtonAction: () => {
						uiStore.closeModal(DEBUG_PAYWALL_MODAL_KEY);
						uiStore.goToUpgrade('debug', 'upgrade-debug');
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
