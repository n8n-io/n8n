<script setup lang="ts">

import { useExternalHooks } from '@/composables/useExternalHooks';
import { useI18n } from '@/composables/useI18n';
import { useRunWorkflow } from '@/composables/useRunWorkflow';
import { useTelemetry } from '@/composables/useTelemetry';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useParameterOverridesStore } from '@/stores/parameterOverrides.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { createEventBus } from '@n8n/utils/event-bus';
import { type FromAIArgument, traverseNodeParametersWithParamNames } from 'n8n-workflow';
import { computed } from 'vue';
import { useRouter } from 'vue-router';


const props = defineProps<{
	modalName: string;
	data: {
		nodeName: string | undefined;
	};
}>();

const i18n = useI18n();
const modalBus = createEventBus();
const workflowsStore = useWorkflowsStore();
const ndvStore = useNDVStore();
const nodeTypesStore = useNodeTypesStore();
const telemetry = useTelemetry();
const externalHooks = useExternalHooks();
const router = useRouter();
const { runWorkflow } = useRunWorkflow({ router });
const parameterOverridesStore = useParameterOverridesStore();


const node = computed(() =>
	props.data.nodeName ? workflowsStore.getNodeByName(props.data.nodeName) : undefined,
);
const nodeType = computed(() => nodeTypesStore.getNodeType(node.value?.type ?? ''));

const mapTypes = {
	['string']: 'text',
	['boolean']: 'checkbox',
	['number']: 'number',
	['json']: 'text',
};


const parameters = computed(() => {
	if (!node.value) return [];
	const result = [];
	const params = node.value.parameters;
	const collectedArgs : Map<string, FromAIArgument> = new Map();
	traverseNodeParametersWithParamNames(params, collectedArgs);

	for(const paramName in collectedArgs.keys){
		const fromAiArgument = collectedArgs.get(paramName);
		if(! fromAiArgument) continue;
		result.push({
			name: paramName,
			initialValue: parameterOverridesStore.getParameterOverride(node.value.name, paramName) ?? '',
			properties: {
				label: fromAiArgument.key,
				type: mapTypes[fromAiArgument.type],
				required: true,
			},
		});
	}
	return result;
});

const onClose = () => {
	modalBus.emit('close');
};

const onExecute = async (submittedValues: INodeParameters) => {
	if (!node.value) return;

	// const telemetryPayload = {
	// 	node_type: nodeType.value?.name ?? null,
	// 	workflow_id: workflowsStore.workflowId,
	// 	source: 'TestExecuteModal',
	// 	push_ref: ndvStore.pushRef,
	// };
	//
	// telemetry.track('User clicked execute node button in modal', telemetryPayload);
	// await externalHooks.run('nodeExecuteButton.onClick', telemetryPayload);

	parameterOverridesStore.addParameterOverrides(node.value.name, submittedValues);

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
		:title="i18n.baseText('executeStepModal.title') + ' ' + node?.name"
		:event-bus="modalBus"
		:name="TEST_EXECUTE_MODAL_KEY"
		:center="true"
		:close-on-click-modal="false"
	>
		<template #content>
			<n8n-form-box
				:inputs="parameters"
				@submit="onExecute"
				:button-text="i18n.baseText('executeStepModal.execute')"
				/>
			</template>
	</Modal>
</template>

<style lang="scss" scoped>
</style>
