<template>
	<div v-if="aiData">
		<div v-for="(data, index) in aiData.aiRun" :key="`${data.node}__${data.runIndex}__index`">
			<RunDataAiContent :inputData="getReferencedData(data)" :contentIndex="index" />
		</div>
	</div>
</template>

<script lang="ts">
import { defineAsyncComponent, defineComponent } from 'vue';
import type { PropType } from 'vue';
import { mapStores } from 'pinia';
import type { ITaskAIRunMetadata, ITaskDataConnections, ITaskMetadata } from 'n8n-workflow';
import { useNDVStore } from '@/stores/ndv.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { EndpointType, IAiData, IAiDataContent, INodeUi } from '@/Interface';

const RunDataAiContent = defineAsyncComponent(
	async () => import('@/components/RunDataAiContent.vue'),
);

export default defineComponent({
	name: 'run-data-ai',
	mixins: [],
	components: {
		RunDataAiContent,
	},
	props: {
		node: {
			type: Object as PropType<INodeUi>,
		},
	},
	computed: {
		...mapStores(useNDVStore, useWorkflowsStore),
		aiData(): ITaskMetadata | undefined {
			if (this.node) {
				const resultData = this.workflowsStore.getWorkflowResultDataByNodeName(this.node.name);

				if (!resultData || !Array.isArray(resultData)) {
					return;
				}

				return resultData[resultData.length - 1!].metadata;
			}
			return;
		},
	},
	methods: {
		getReferencedData(reference: ITaskAIRunMetadata): IAiData | undefined {
			const resultData = this.workflowsStore.getWorkflowResultDataByNodeName(reference.node);

			if (!resultData?.[reference.runIndex]) {
				return;
			}

			const taskData = resultData[reference.runIndex];

			if (!taskData) {
				return;
			}

			const returnData: IAiDataContent[] = [];

			function addFunction(data: ITaskDataConnections | undefined, inOut: 'input' | 'output') {
				if (!data) {
					return;
				}

				Object.keys(data).map((type) => {
					returnData.push({
						data: data[type][0],
						inOut,
						type: type as EndpointType,
						metadata: {
							executionTime: taskData.executionTime,
							startTime: taskData.startTime,
						},
					});
				});
			}

			addFunction(taskData.inputOverride, 'input');
			addFunction(taskData.data, 'output');

			return {
				data: returnData,
				node: reference.node,
				runIndex: reference.runIndex,
			};
		},
	},
});
</script>
