<script setup lang="ts">
import { ResourceMapperReqParams } from '@/Interface';
import { resolveParameter } from '@/mixins/workflowHelpers';
import { useNodeTypesStore } from '@/stores/nodeTypes';
import { INode, INodeParameters, INodeProperties } from 'n8n-workflow';
import { ResourceMapperFields } from 'n8n-workflow/src/Interfaces';
import { computed, onMounted, ref } from 'vue';

export interface Props {
	parameter: INodeProperties;
	node: INode | null;
	path: string;
}

const props = defineProps<Props>();

const fieldsToMap = ref([] as ResourceMapperFields['fields']);

const nodeTypesStore = useNodeTypesStore();

const fields = computed<string>(() => {
	if (fieldsToMap.value.length === 0) {
		return '[Loading...]';
	}
	return `[${fieldsToMap.value.map((f) => f.displayName).join(',')}]`;
});

const prefix = computed<string>(() => {
	return props.parameter.typeOptions?.resourceMapper.mode === 'add' ? '+' : '-';
});

onMounted(async () => {
	await loadFieldsToMap();
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
		methodName: props.parameter.typeOptions?.resourceMapper.resourceMapperMethod,
		credentials: props.node.credentials,
	};
	fieldsToMap.value = (await nodeTypesStore.getResourceMapperFields(requestParams)).fields;
}

defineExpose({
	fields,
});
</script>

<template>
	<n8n-notice :content="`${prefix} Resource mapper ${fields}`" />
</template>
