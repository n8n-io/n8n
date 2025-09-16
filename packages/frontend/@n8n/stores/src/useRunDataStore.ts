import type { NodeExecuteAfterData } from '@n8n/api-types';
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export type RunDataItemCountByNodeName = Record<string, Array<NodeExecuteAfterData['data']>>;
export type RunDataItemCountByExecutionId = Record<string, RunDataItemCountByNodeName>;

export const useRunDataStore = defineStore('runData', () => {
	/**
	 * Sets the active execution id
	 *
	 * @param {string} id used to indicate the id of the active execution
	 * @param {null} id used to indicate that an execution has started but its id has not been retrieved yet
	 * @param {undefined} id used to indicate there is no active execution
	 */

	const activeExecutionId = ref<string | null | undefined>();
	const previousExecutionId = ref<string | null | undefined>();

	function setActiveExecutionId(id: string | null | undefined) {
		if (id) previousExecutionId.value = activeExecutionId.value;
		activeExecutionId.value = id;
	}

	/**
	 * Stores the item count for each node in each execution.
	 * The structure is:
	 * ```ts
	 * {
	 * 	 [executionId]: {
	 * 	   [nodeName]: Array<NodeExecuteAfterData['data']>
	 *   }
	 * }
	 * ```
	 */

	const workflowExecutionDataById = ref<Record<string, IExecutionResponse>>({});

	const runDataItemCountByExecutionId = ref<RunDataItemCountByExecutionId>({});

	function addRunDataItemCount(pushData: NodeExecuteAfterData['data']) {
		runDataItemCountByExecutionId.value = {
			...runDataItemCountByExecutionId.value,
			[pushData.executionId]: {
				...runDataItemCountByExecutionId.value[pushData.executionId],
				[pushData.nodeName]: [
					...(runDataItemCountByExecutionId.value[pushData.executionId]?.[pushData.nodeName] || []),
					pushData,
				],
			},
		};
	}

	return {
		runDataItemCountByExecutionId,
		addRunDataItemCount,
		activeExecutionId: computed(() => activeExecutionId.value),
		previousExecutionId: computed(() => previousExecutionId.value),
		setActiveExecutionId,
	};
});
