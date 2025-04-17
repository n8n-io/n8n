<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import { useRunWorkflow } from '@/composables/useRunWorkflow';
import { EXECUTE_STEP_MODAL_KEY } from '@/constants';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useParameterOverridesStore } from '@/stores/parameterOverrides.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { createEventBus } from '@n8n/utils/event-bus';
import {
	type FromAIArgument,
	NodeConnectionTypes,
	traverseNodeParametersWithParamNames,
} from 'n8n-workflow';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { type IFormInput } from '@n8n/design-system';

const props = defineProps<{
	modalName: string;
	data: {
		nodeName: string | undefined;
	};
}>();

const inputs = ref(null);
const i18n = useI18n();
const modalBus = createEventBus();
const workflowsStore = useWorkflowsStore();
const nodeTypesStore = useNodeTypesStore();
const router = useRouter();
const { runWorkflow } = useRunWorkflow({ router });
const parameterOverridesStore = useParameterOverridesStore();

const node = computed(() =>
	props.data.nodeName ? workflowsStore.getNodeByName(props.data.nodeName) : undefined,
);

const parentNode = computed(() => {
	if (!node.value) return undefined;
	const workflow = workflowsStore.getCurrentWorkflow();
	const parentNodes = workflow.getChildNodes(node.value.name, 'ALL', 1);
	if (parentNodes.length === 0) return '';
	return workflowsStore.getNodeByName(parentNodes[0]);
});

const nodeType = computed(() => nodeTypesStore.getNodeType(node.value?.type ?? ''));

const runData = computed(() => {
	if (!node.value) return undefined;

	const workflowExecutionData = workflowsStore.getWorkflowExecution;
	const lastRunData = workflowExecutionData?.data?.resultData.runData[node.value?.name];
	if (!lastRunData) return undefined;
	return lastRunData[0];
});

const mapTypes = {
	['string']: 'text',
	['boolean']: 'checkbox',
	['number']: 'number',
	['json']: 'text',
};

const parameters = computed(() => {
	if (!node.value) return [];
	const currentWorkflow = workflowsStore.getCurrentWorkflow();
	const result: IFormInput[] = [];
	const params = node.value.parameters;
	const collectedArgs: Map<string, FromAIArgument> = new Map();
	traverseNodeParametersWithParamNames(params, collectedArgs);
	const inputOverrides = runData.value?.inputOverride?.[NodeConnectionTypes.AiTool]?.[0]?.[0].json;

	collectedArgs.forEach((value, paramName, _) => {
		const initialValue = inputOverrides?.[value.key]
			? inputOverrides[value.key]
			: (parameterOverridesStore.getParameterOverride(
					currentWorkflow.id,
					node.value!.name,
					paramName,
				) ?? '');

		result.push({
			name: paramName,
			initialValue,
			properties: {
				label: value.key,
				type: mapTypes[value.type] ?? 'text',
				required: true,
			},
		});
	});
	return result;
});

const onClose = () => {
	modalBus.emit('close');
};

const onExecute = async () => {
	if (!node.value) return;
	const currentWorkflow = workflowsStore.getCurrentWorkflow();

	parameterOverridesStore.clearParameterOverrides(currentWorkflow.id, node.value.name);
	parameterOverridesStore.addParameterOverrides(
		currentWorkflow.id,
		node.value.name,
		inputs.value?.getValues(),
	);

	await runWorkflow({
		destinationNode: node.value.name,
		source: 'RunData.TestExecuteModal',
	});

	onClose();
};
</script>

<template>
	<Modal
		max-width="540px"
		:title="
			i18n.baseText('executeStepModal.title', { interpolate: { nodeName: node?.name || '' } })
		"
		:event-bus="modalBus"
		:name="EXECUTE_STEP_MODAL_KEY"
		:center="true"
		:close-on-click-modal="false"
	>
		<template #content>
			<el-col>
				<el-row :class="$style.row">
					<n8n-text>
						{{
							i18n.baseText('executeStepModal.description', {
								interpolate: { parentNodeName: parentNode?.name },
							})
						}}
					</n8n-text>
				</el-row>
			</el-col>
			<el-col>
				<el-row :class="$style.row">
					<N8nFormInputs
						ref="inputs"
						:inputs="parameters"
						:column-view="true"
						@submit="onExecute"
					></N8nFormInputs>
				</el-row>
			</el-col>
		</template>
		<template #footer>
			<el-row justify="end">
				<el-col :span="5" :offset="19">
					<n8n-button
						icon="flask"
						:label="i18n.baseText('executeStepModal.execute')"
						@click="onExecute"
					/>
				</el-col>
			</el-row>
		</template>
	</Modal>
</template>

<style lang="scss" scoped>
.row {
	margin-bottom: 10px;
}
</style>
