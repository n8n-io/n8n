<script setup lang="ts">
import { ResourceMapperReqParams } from '@/Interface';
import { resolveParameter } from '@/mixins/workflowHelpers';
import { useNodeTypesStore } from '@/stores/nodeTypes';
import { INode, INodeParameters, INodeProperties, INodeTypeDescription } from 'n8n-workflow';
import { ResourceMapperFields } from 'n8n-workflow/src/Interfaces';
import { computed, onMounted, ref } from 'vue';
import MappingModeSelect from './MappingModeSelect.vue';

export interface Props {
	parameter: INodeProperties;
	node: INode | null;
	path: string;
	inputSize: string;
}

const nodeTypesStore = useNodeTypesStore();

const props = defineProps<Props>();

const fieldsToMap = ref([] as ResourceMapperFields['fields']);

const fields = computed<string>(() => {
	if (fieldsToMap.value.length === 0) {
		return '[Loading...]';
	}
	return `[${fieldsToMap.value.map((f) => f.displayName).join(',')}]`;
});

const prefix = computed<string>(() => {
	return props.parameter.typeOptions?.resourceMapper?.mode === 'add' ? '+' : '-';
});

const isInsertMode = computed<boolean>(() => {
	return props.parameter.typeOptions?.resourceMapper?.mode === 'add';
});

onMounted(async () => {
	await loadFieldsToMap();
});

const nodeType = computed<INodeTypeDescription | null>(() => {
	if (props.node) {
		return nodeTypesStore.getNodeType(props.node.type, props.node.typeVersion);
	}
	return null;
});

async function loadFieldsToMap(): Promise<void> {
	if (!props.node) {
		return;
	}
	const requestParams: ResourceMapperReqParams = {
		nodeTypeAndVersion: {
			name: props.node?.type,
			version: props.node.typeVersion,
		},
		currentNodeParameters: resolveParameter(props.node.parameters) as INodeParameters,
		path: props.path,
		methodName: props.parameter.typeOptions?.resourceMapper?.resourceMapperMethod,
		credentials: props.node.credentials,
	};
	fieldsToMap.value = (await nodeTypesStore.getResourceMapperFields(requestParams)).fields;
}

function onModeChanged(mode: string): void {
	console.log('MODE CHANGED', mode);
}

defineExpose({
	fields,
});
</script>

<template>
	<div class="mt-4xs">
		<mapping-mode-select
			v-if="isInsertMode"
			:inputSize="inputSize"
			:initial-value="props.parameter.mode || 'defineBelow'"
			:type-options="props.parameter.typeOptions?.resourceMapper"
			:serviceName="nodeType?.displayName || ''"
			@modeChanged="onModeChanged"
		/>
		<n8n-notice :content="`${prefix} ${fields}`" />
	</div>
</template>
