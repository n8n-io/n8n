import { useRouter } from 'vue-router';
import { useI18n, useMessage, useToast } from '@/composables';
import { MODAL_CONFIRM, VIEWS } from '@/constants';
import { useWorkflowsStore } from '@/stores';
import type { INodeUi } from '@/Interface';

export const useExecutionDebugging = () => {
	const router = useRouter();
	const i18n = useI18n();
	const message = useMessage();
	const toast = useToast();
	const workflowsStore = useWorkflowsStore();

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
		const workflowPinnedNodeNames = Object.keys(workflow.pinData ?? {});
		const matchingPinnedNodeNames = executionNodeNames.filter((name) =>
			workflowPinnedNodeNames.includes(name),
		);
		const matchingPinnedNodeNamesToHtmlList = `<ul class="ml-l">${matchingPinnedNodeNames
			.map((name) => `<li>${name}</li>`)
			.join('')}</ul>`;

		if (matchingPinnedNodeNames.length > 0) {
			const overWritePinnedDataConfirm = await message.confirm(
				i18n.baseText('nodeView.confirmMessage.debug.message', {
					interpolate: { nodeNames: matchingPinnedNodeNamesToHtmlList },
				}),
				i18n.baseText('nodeView.confirmMessage.debug.headline'),
				{
					type: 'warning',
					confirmButtonText: i18n.baseText('nodeView.confirmMessage.debug.confirmButtonText'),
					cancelButtonText: i18n.baseText('nodeView.confirmMessage.debug.cancelButtonText'),
					dangerouslyUseHTMLString: true,
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

	return {
		applyExecutionData,
	};
};
