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

		if (!execution?.data?.resultData) {
			return;
		}

		workflowsStore.setWorkflowExecutionData(execution);

		const { runData } = execution.data.resultData;

		const executionNodeNames = Object.keys(runData);
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
			}
		}
	};

	return {
		applyExecutionData,
	};
};
