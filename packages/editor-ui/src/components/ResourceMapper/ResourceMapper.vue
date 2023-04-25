<script setup lang="ts">
import type { IUpdateInformation, ResourceMapperReqParams } from '@/Interface';
import { resolveParameter } from '@/mixins/workflowHelpers';
import { useNodeTypesStore } from '@/stores/nodeTypes';
import type {
	INode,
	INodeParameters,
	INodeProperties,
	INodeTypeDescription,
	ResourceMapperField,
	ResourceMapperValue,
} from 'n8n-workflow';
import { computed, onMounted, reactive, watch } from 'vue';
import MappingModeSelect from './MappingModeSelect.vue';
import MatchingColumnsSelect from './MatchingColumnsSelect.vue';
import MappingFields from './MappingFields.vue';
import { isResourceMapperValue } from '@/utils';

export interface Props {
	parameter: INodeProperties;
	node: INode | null;
	path: string;
	inputSize: string;
	labelSize: string;
	dependentParametersValues: string | null;
	nodeValues: INodeParameters | undefined;
}

const FIELD_NAME_REGEX = /value\[\"(.+)\"\]/;

const nodeTypesStore = useNodeTypesStore();

const props = defineProps<Props>();

const emit = defineEmits<{
	(event: 'valueChanged', value: IUpdateInformation): void;
}>();

const state = reactive({
	paramValue: {
		mappingMode: 'defineBelow',
		value: {},
		matchingColumns: [],
	} as ResourceMapperValue,
	fieldsToMap: [] as ResourceMapperField[],
	loading: false,
	loadingError: false,
});

// Reload fields to map when dependent parameters change
watch(
	() => props.dependentParametersValues,
	async () => {
		await initFetching();
	},
);

onMounted(async () => {
	await initFetching();
	if (props.nodeValues && props.nodeValues.parameters) {
		const params = props.nodeValues.parameters as INodeParameters;
		const parameterName = props.parameter.name;
		if (parameterName in params) {
			state.paramValue = params[parameterName] as ResourceMapperValue;
			// TODO: Handle missing values properly once add/remove fields is implemented
			Object.keys(state.paramValue.value).forEach((key) => {
				if (state.paramValue.value[key] === '') {
					state.paramValue.value[key] = null;
				}
			});
		}
	}
	if (!state.paramValue.matchingColumns) {
		state.paramValue.matchingColumns = defaultSelectedMatchingColumns.value;
	}
});

const nodeType = computed<INodeTypeDescription | null>(() => {
	if (props.node) {
		return nodeTypesStore.getNodeType(props.node.type, props.node.typeVersion);
	}
	return null;
});

const showMappingModeSelect = computed<boolean>(() => {
	return props.parameter.typeOptions?.resourceMapper?.supportAutoMap !== false;
});

const showMatchingColumnsSelector = computed<boolean>(() => {
	return (
		!state.loading &&
		props.parameter.typeOptions?.resourceMapper?.mode !== 'add' &&
		state.fieldsToMap.length > 0
	);
});

const showMappingFields = computed<boolean>(() => {
	return (
		state.paramValue.mappingMode === 'defineBelow' &&
		!state.loading &&
		!state.loadingError &&
		state.fieldsToMap.length > 0
	);
});

const matchingColumns = computed<string[]>(() => {
	if (!showMatchingColumnsSelector) {
		return [];
	}
	if (state.paramValue.matchingColumns) {
		return state.paramValue.matchingColumns;
	}
	return defaultSelectedMatchingColumns.value;
});

const defaultSelectedMatchingColumns = computed<string[]>(() => {
	return state.fieldsToMap.length === 1
		? [state.fieldsToMap[0].id]
		: state.fieldsToMap.reduce((acc, field) => {
				if (field.defaultMatch) {
					acc.push(field.id);
				}
				return acc;
		  }, [] as string[]);
});

async function initFetching(): Promise<void> {
	state.loading = true;
	state.loadingError = false;
	try {
		await loadFieldsToMap();
		onMatchingColumnsChanged(defaultSelectedMatchingColumns.value);
	} catch (error) {
		state.loadingError = true;
	} finally {
		state.loading = false;
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
		state.fieldsToMap = fetchedFields.fields;
	}
}

async function onModeChanged(mode: string): Promise<void> {
	state.paramValue.mappingMode = mode;
	if (mode === 'defineBelow') {
		await initFetching();
	} else {
		state.loadingError = false;
	}
	emitValueChanged();
}

function onMatchingColumnsChanged(matchingColumns: string[]): void {
	state.paramValue = {
		...state.paramValue,
		matchingColumns,
	};
	if (!state.loading) {
		emitValueChanged();
	}
}

function fieldValueChanged(updateInfo: IUpdateInformation): void {
	let newValue = null;
	if (
		updateInfo.value !== undefined &&
		updateInfo.value !== '' &&
		updateInfo.value !== null &&
		isResourceMapperValue(updateInfo.value)
	) {
		newValue = updateInfo.value;
	}
	// Extract the name from the path
	const match = updateInfo.name.match(FIELD_NAME_REGEX);
	if (match) {
		const name = match.pop();
		if (name) {
			state.paramValue.value[name] = newValue;
			emitValueChanged();
		}
	}
}

function deleteOption(name: string): void {
	const match = name.match(FIELD_NAME_REGEX);
	if (match) {
		const fieldName = match.pop();
		const field = state.fieldsToMap.find((field) => field.id === fieldName);
		if (field) {
			field.display = false;
		}
	}
}

function emitValueChanged(): void {
	emit('valueChanged', {
		name: `${props.path}`,
		value: state.paramValue,
		node: props.node?.name,
	});
}

defineExpose({
	state,
});
</script>

<template>
	<div class="mt-4xs" data-test-id="resource-mapper-container">
		<mapping-mode-select
			v-if="showMappingModeSelect"
			:inputSize="inputSize"
			:labelSize="labelSize"
			:initialValue="state.paramValue.mappingMode || 'defineBelow'"
			:typeOptions="props.parameter.typeOptions?.resourceMapper"
			:serviceName="nodeType?.displayName || ''"
			:loading="state.loading"
			:loadingError="state.loadingError"
			:fieldsToMap="state.fieldsToMap"
			@modeChanged="onModeChanged"
			@retryFetch="initFetching"
		/>
		<matching-columns-select
			v-if="showMatchingColumnsSelector"
			:label-size="labelSize"
			:fieldsToMap="state.fieldsToMap"
			:typeOptions="props.parameter.typeOptions?.resourceMapper"
			:inputSize="inputSize"
			:loading="state.loading"
			:initialValue="matchingColumns"
			@matchingColumnsChanged="onMatchingColumnsChanged"
		/>
		<mapping-fields
			v-if="showMappingFields"
			:parameter="props.parameter"
			:path="props.path"
			:nodeValues="props.nodeValues"
			:fieldsToMap="state.fieldsToMap"
			:paramValue="state.paramValue"
			:FIELD_NAME_REGEX="FIELD_NAME_REGEX"
			:labelSize="labelSize"
			:showMatchingColumnsSelector="showMatchingColumnsSelector"
			:showMappingModeSelect="showMappingModeSelect"
			:loading="state.loading"
			@fieldValueChanged="fieldValueChanged"
			@removeField="deleteOption"
		/>
	</div>
</template>
