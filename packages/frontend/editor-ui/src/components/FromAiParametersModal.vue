<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import { useRunWorkflow } from '@/composables/useRunWorkflow';
import { FROM_AI_PARAMETERS_MODAL_KEY } from '@/constants';
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
import { useTelemetry } from '@/composables/useTelemetry';
import { useNDVStore } from '@/stores/ndv.store';

type Value = string | number | boolean | null | undefined;

const props = defineProps<{
	modalName: string;
	data: {
		nodeName: string | undefined;
	};
}>();

const inputs = ref<{ getValues: () => Record<string, Value> }>();
const i18n = useI18n();
const telemetry = useTelemetry();
const ndvStore = useNDVStore();
const modalBus = createEventBus();
const workflowsStore = useWorkflowsStore();
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
	if (parentNodes.length === 0) return undefined;
	return workflowsStore.getNodeByName(parentNodes[0])?.name;
});

const nodeRunData = computed(() => {
	if (!node.value) return undefined;

	const workflowExecutionData = workflowsStore.getWorkflowExecution;
	const lastRunData = workflowExecutionData?.data?.resultData.runData[node.value?.name];
	if (!lastRunData) return undefined;
	return lastRunData[0];
});

const mapTypes: {
	[key: string]: {
		inputType: 'text' | 'number' | 'checkbox';
		defaultValue: string | number | boolean | null | undefined;
	};
} = {
	['string']: {
		inputType: 'text',
		defaultValue: '',
	},
	['boolean']: {
		inputType: 'checkbox',
		defaultValue: true,
	},
	['number']: {
		inputType: 'number',
		defaultValue: 0,
	},
	['json']: {
		inputType: 'text',
		defaultValue: '',
	},
};

const parameters = computed(() => {
	if (!node.value) return [];

	const result: IFormInput[] = [];
	const params = node.value.parameters;
	const collectedArgs: Map<string, FromAIArgument> = new Map();
	traverseNodeParametersWithParamNames(params, collectedArgs);
	const inputOverrides =
		nodeRunData.value?.inputOverride?.[NodeConnectionTypes.AiTool]?.[0]?.[0].json;

	collectedArgs.forEach((value: FromAIArgument, paramName: string) => {
		const type = value.type ?? 'string';
		const initialValue = inputOverrides?.[value.key]
			? inputOverrides[value.key]
			: (parameterOverridesStore.getParameterOverride(
					workflowsStore.workflowId,
					node.value!.id,
					paramName,
				) ?? mapTypes[type]?.defaultValue);

		result.push({
			name: paramName,
			initialValue: initialValue as string | number | boolean | null | undefined,
			properties: {
				label: value.key,
				type: mapTypes[type].inputType,
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
	const inputValues = inputs.value!.getValues();

	parameterOverridesStore.clearParameterOverrides(workflowsStore.workflowId, node.value.id);
	parameterOverridesStore.addParameterOverrides(
		workflowsStore.workflowId,
		node.value.id,
		inputValues,
	);

	const telemetryPayload = {
		node_type: node.value.type,
		workflow_id: workflowsStore.workflowId,
		source: 'from-ai-parameters-modal',
		push_ref: ndvStore.pushRef,
	};

	telemetry.track('User clicked execute node button in modal', telemetryPayload);

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
			i18n.baseText('fromAiParametersModal.title', { interpolate: { nodeName: node?.name || '' } })
		"
		:event-bus="modalBus"
		:name="FROM_AI_PARAMETERS_MODAL_KEY"
		:center="true"
		:close-on-click-modal="false"
	>
		<template #content>
			<el-col>
				<el-row :class="$style.row">
					<n8n-text data-testid="from-ai-parameters-modal-description">
						{{
							i18n.baseText('fromAiParametersModal.description', {
								interpolate: { parentNodeName: parentNode || '' },
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
						data-test-id="from-ai-parameters-modal-inputs"
						@submit="onExecute"
					></N8nFormInputs>
				</el-row>
			</el-col>
		</template>
		<template #footer>
			<el-row justify="end">
				<el-col :span="5" :offset="19">
					<n8n-button
						data-test-id="execute-workflow-button"
						icon="flask"
						:label="i18n.baseText('fromAiParametersModal.execute')"
						@click="onExecute"
					/>
				</el-col>
			</el-row>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.row {
	margin-bottom: 10px;
}
</style>
