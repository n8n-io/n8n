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
	labelSize: string;
}

const nodeTypesStore = useNodeTypesStore();

const props = defineProps<Props>();

const paramValue = ref({ mappingMode: props.parameter.mode || 'defineBelow', value: {} } as {
	mappingMode: string;
	value: Object;
});
const fieldsToMap = ref([] as ResourceMapperFields['fields']);
const loading = ref(false);
const loadingError = ref(false);

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
	await initFetching();
});

const nodeType = computed<INodeTypeDescription | null>(() => {
	if (props.node) {
		return nodeTypesStore.getNodeType(props.node.type, props.node.typeVersion);
	}
	return null;
});

const showMappingFields = computed<boolean>(() => {
	return (
		paramValue.value.mappingMode === 'defineBelow' &&
		!loading.value &&
		!loadingError.value &&
		fieldsToMap.value.length > 0
	);
});

async function initFetching(): Promise<void> {
	loading.value = true;
	loadingError.value = false;
	try {
		await loadFieldsToMap();
	} catch (error) {
		loadingError.value = true;
	} finally {
		loading.value = false;
	}
}

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
	const fetchedFields = await nodeTypesStore.getResourceMapperFields(requestParams);
	if (fetchedFields !== null) {
		fieldsToMap.value = fetchedFields.fields;
	}
}

function onModeChanged(mode: string): void {
	paramValue.value.mappingMode = mode;
	if (mode === 'defineBelow') {
		initFetching();
	} else {
		loadingError.value = false;
	}
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
			:labelSize="labelSize"
			:initial-value="props.parameter.mode || 'defineBelow'"
			:type-options="props.parameter.typeOptions?.resourceMapper"
			:serviceName="nodeType?.displayName || ''"
			:loading="loading"
			:loadingError="loadingError"
			:fieldsToMap="fieldsToMap"
			@modeChanged="onModeChanged"
			@retryFetch="initFetching"
		/>
		<n8n-notice v-if="showMappingFields" :content="`${prefix} ${fields}`" />
	</div>
</template>
