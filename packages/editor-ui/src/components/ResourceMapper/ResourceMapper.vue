<script setup lang="ts">
import { IUpdateInformation, ResourceMapperReqParams } from '@/Interface';
import { resolveParameter } from '@/mixins/workflowHelpers';
import { useNodeTypesStore } from '@/stores/nodeTypes';
import {
	INode,
	INodeParameters,
	INodeProperties,
	INodeTypeDescription,
	NodePropertyTypes,
	ResourceMapperField,
	ResourceMapperValue,
} from 'n8n-workflow';
import { computed, getCurrentInstance, onMounted, reactive, ref, watch } from 'vue';
import MappingModeSelect from './MappingModeSelect.vue';
import MatchingColumnsSelect from './MatchingColumnsSelect.vue';
import ParameterInputList from '@/components/ParameterInputList.vue';
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

const instance = getCurrentInstance();
const nodeTypesStore = useNodeTypesStore();

const props = defineProps<Props>();

const emit = defineEmits<{
	(event: 'valueChanged', value: IUpdateInformation): void;
}>();

const state = reactive({
	paramValue: {
		// TODO: Check this
		mappingMode: props.parameter.mode || 'defineBelow',
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
		if ('columns' in params) {
			state.paramValue = params.columns as ResourceMapperValue;
		}
	}
});

const fieldsUi = computed<INodeProperties[]>(() => {
	const fields = state.fieldsToMap.map((field) => {
		return {
			displayName: getFieldLabel(field),
			// Set part of the path to each param name so value can be fetched properly by input parameter list component
			name: `value["${field.id}"]`,
			type: (field.type as NodePropertyTypes) || 'string',
			default: '',
			required: field.required,
		};
	});
	// Sort so that matching columns are first
	fields.forEach((field, i) => {
		if (state.paramValue.matchingColumns.includes(field.name)) {
			fields.splice(i, 1);
			fields.unshift(field);
		}
	});
	return fields;
});

const nodeType = computed<INodeTypeDescription | null>(() => {
	if (props.node) {
		return nodeTypesStore.getNodeType(props.node.type, props.node.typeVersion);
	}
	return null;
});

const showMappingFields = computed<boolean>(() => {
	return (
		state.paramValue.mappingMode === 'defineBelow' &&
		!state.loading &&
		!state.loadingError &&
		state.fieldsToMap.length > 0
	);
});

const showMatchingColumnsSelector = computed<boolean>(() => {
	return props.parameter.typeOptions?.resourceMapper?.mode !== 'add';
});

const matchingColumns = computed<string[]>(() => {
	if (!showMatchingColumnsSelector) {
		return [];
	}
	if (state.paramValue.matchingColumns.length > 0) {
		return state.paramValue.matchingColumns;
	}
	return defaultSelectedColumns.value;
});

const defaultSelectedColumns = computed<string[]>(() => {
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
		state.fieldsToMap = fetchedFields.fields.filter((field) => field.display !== false);
	}
}

function getFieldLabel(field: ResourceMapperField): string {
	if (state.paramValue.matchingColumns.includes(field.id)) {
		const suffix = instance?.proxy.$locale.baseText('resourceMapper.usingToMatch') || '';
		return `${field.displayName} ${suffix}`;
	}
	return field.displayName;
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
	state.paramValue.matchingColumns = matchingColumns;
	if (!state.loading) {
		emitValueChanged();
	}
}

function fieldValueChanged(updateInfo: IUpdateInformation): void {
	if (isResourceMapperValue(updateInfo.value)) {
		// Extract the name from the path
		const match = updateInfo.name.match(/.value\[\"(.+)\"\]/);
		if (match) {
			const name = match.pop();
			if (name) {
				state.paramValue.value[name] = updateInfo.value;
				emitValueChanged();
			}
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
	fieldsUi,
	state,
});
</script>

<template>
	<div class="mt-4xs">
		<mapping-mode-select
			v-if="props.parameter.typeOptions?.resourceMapper?.supportAutoMap !== false"
			:inputSize="inputSize"
			:labelSize="labelSize"
			:initialValue="props.parameter.mode || 'defineBelow'"
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
		<div class="mt-xs">
			<n8n-input-label
				:label="$locale.baseText('resourceMapper.valuesToSend.label')"
				:underline="true"
				:size="labelSize"
				color="text-dark"
			/>
			<parameter-input-list
				v-if="showMappingFields"
				:parameters="fieldsUi"
				:nodeValues="nodeValues"
				:isReadOnly="false"
				@valueChanged="fieldValueChanged"
				:hideDelete="true"
				:path="`${props.path}`"
			/>
		</div>
	</div>
</template>
