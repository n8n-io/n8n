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
import { i18n as locale } from '@/plugins/i18n';

interface Props {
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
		manuallyRemovedColumns: [],
	} as ResourceMapperValue,
	fieldsToMap: [] as ResourceMapperField[],
	loading: false,
	loadingError: false,
});

// Reload fields to map when dependent parameters change
watch(
	() => props.dependentParametersValues,
	async () => {
		state.paramValue.value = null;
		emitValueChanged();
		await initFetching();
		setDefaultFieldValues();
	},
);

onMounted(async () => {
	if (props.nodeValues && props.nodeValues.parameters) {
		const params = props.nodeValues.parameters as INodeParameters;
		const parameterName = props.parameter.name;
		if (parameterName in params) {
			state.paramValue = params[parameterName] as ResourceMapperValue;
			if (!state.paramValue.manuallyRemovedColumns) {
				state.paramValue.manuallyRemovedColumns = [];
			}
			// TODO: Handle missing values properly once add/remove fields is implemented
			Object.keys(state.paramValue.value || {}).forEach((key) => {
				if (state.paramValue.value && state.paramValue.value[key] === '') {
					state.paramValue.value[key] = null;
				}
			});
		}
	}
	await initFetching();
	// Set default values if this is the first time the parameter is being set
	setDefaultFieldValues();
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

const pluralFieldWord = computed<string>(() => {
	return (
		props.parameter.typeOptions?.resourceMapper?.fieldWords?.plural ||
		locale.baseText('generic.fields')
	);
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
		state.fieldsToMap = fetchedFields.fields.map((field) => {
			if (state.paramValue.value !== null && !(field.id in state.paramValue.value)) {
				field.display = false;
			}
			return field;
		});
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

function setDefaultFieldValues(): void {
	if (!state.paramValue.value) {
		state.paramValue.value = {};
		state.fieldsToMap.forEach((field) => {
			if (state.paramValue.value) {
				state.paramValue.value[field.id] = null;
			}
		});
	}
	if (!state.paramValue.matchingColumns) {
		state.paramValue.matchingColumns = defaultSelectedMatchingColumns.value;
	}
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
		if (name && state.paramValue.value) {
			state.paramValue.value[name] = newValue;
			emitValueChanged();
		}
	}
}

function removeField(name: string): void {
	const match = name.match(FIELD_NAME_REGEX);
	if (match) {
		const fieldName = match.pop();

		if (fieldName) {
			if (state.paramValue.value) {
				delete state.paramValue.value[fieldName];
				state.paramValue.manuallyRemovedColumns.push(fieldName);
				emitValueChanged();
			}
		}
	}
}

function addField(name: string): void {
	state.paramValue.value = {
		...state.paramValue.value,
		[name]: null,
	};
	state.paramValue.manuallyRemovedColumns.splice(
		state.paramValue.manuallyRemovedColumns.indexOf(name),
		1,
	);
	emitValueChanged();
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
		<n8n-text v-if="!showMappingModeSelect && state.loading" size="small">
			<n8n-icon icon="sync-alt" size="xsmall" :spin="true" />
			{{
				locale.baseText('resourceMapper.fetchingFields.message', {
					interpolate: {
						fieldWord: pluralFieldWord,
					},
				})
			}}
		</n8n-text>
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
			@removeField="removeField"
			@addField="addField"
		/>
	</div>
</template>
