import { useI18n, useMessage } from '@/composables';
import { MODAL_CONFIRM } from '@/constants';
import { useWorkflowsStore } from '@/stores';

export const useExecutionDebugging = () => {
	const i18n = useI18n();
	const message = useMessage();
	const workflowsStore = useWorkflowsStore();

	const applyExecutionData = async (executionId: string): Promise<void> => {
		const { workflow } = workflowsStore;
		const execution = await workflowsStore.getExecution(executionId);

		console.log('applyExecutionData');
		console.log(workflow);
		console.log('exec');
		console.log(execution);

		// If no execution data is available, return the workflow as is
		if (!execution?.data?.resultData) {
			return;
		}

		const { runData, pinData } = execution.data.resultData;

		// Get nodes from execution data and apply their pinned data or the first execution data
		const executionNodesData = Object.entries(runData).map(([name, data]) => ({
			name,
			data: pinData?.[name] ?? data?.[0].data?.main[0],
		}));
		const workflowPinnedNodeNames = Object.keys(workflow.pinData ?? {});

		// Check if any of the workflow nodes have pinned data already and ask for confirmation
		if (executionNodesData.some((eNode) => workflowPinnedNodeNames.includes(eNode.name))) {
			const overWritePinnedDataConfirm = await message.confirm(
				i18n.baseText('nodeView.confirmMessage.debug.message'),
				i18n.baseText('nodeView.confirmMessage.debug.headline'),
				{
					type: 'warning',
					confirmButtonText: i18n.baseText('nodeView.confirmMessage.debug.confirmButtonText'),
					cancelButtonText: i18n.baseText('nodeView.confirmMessage.debug.cancelButtonText'),
					dangerouslyUseHTMLString: true,
				},
			);

			if (overWritePinnedDataConfirm !== MODAL_CONFIRM) {
				return;
			}
		}

		workflowsStore.setWorkflowExecutionData(execution);

		// Overwrite the workflow pinned data with the execution data
		/*workflow.pinData = executionNodesData.reduce(
			(acc, { name, data }) => {
				// Only add data if it exists and the node is in the workflow
				if (acc && data && workflow.nodes.some((node) => node.name === name)) {
					acc[name] = data;
				}
				return acc;
			},
			{} as IWorkflowDb['pinData'],
		);

		return workflow;*/
	};

	return {
		applyExecutionData,
	};
};
