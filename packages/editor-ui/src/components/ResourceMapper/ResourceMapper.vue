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
import { computed, getCurrentInstance, onMounted, ref, watch } from 'vue';
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

const paramValue = ref({
	// TODO: Check this
	mappingMode: props.parameter.mode || 'defineBelow',
	value: {},
	matchingColumns: [],
} as ResourceMapperValue);
const fieldsToMap = ref([] as ResourceMapperField[]);
const loading = ref(false);
const loadingError = ref(false);

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
			try {
				paramValue.value = JSON.parse(params.columns as string);
			} catch (error) {
				// Ignore
			}
		}
	}
});

const fieldsUi = computed<INodeProperties[]>(() => {
	const fields = fieldsToMap.value.map((field) => {
		return {
			displayName: getFieldLabel(field),
			name: field.id,
			type: (field.type as NodePropertyTypes) || 'string',
			default: '',
			required: field.required,
		};
	});
	// Sort so that matching columns are first
	fields.forEach((field, i) => {
		if (paramValue.value.matchingColumns.includes(field.name)) {
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
		paramValue.value.mappingMode === 'defineBelow' &&
		!loading.value &&
		!loadingError.value &&
		fieldsToMap.value.length > 0
	);
});

const showMatchingColumnsSelector = computed<boolean>(() => {
	return props.parameter.typeOptions?.resourceMapper?.mode !== 'add';
});

const preselectedMatchingColumns = computed<string[]>(() => {
	if (!showMatchingColumnsSelector) {
		return [];
	}
	return fieldsToMap.value.length === 1
		? [fieldsToMap.value[0].id]
		: fieldsToMap.value.reduce((acc, field) => {
				if (field.defaultMatch) {
					acc.push(field.id);
				}
				return acc;
		  }, [] as string[]);
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
		fieldsToMap.value = fetchedFields.fields.filter((field) => field.display !== false);
	}
}

function getFieldLabel(field: ResourceMapperField): string {
	if (paramValue.value.matchingColumns.includes(field.id)) {
		const suffix = instance?.proxy.$locale.baseText('resourceMapper.usingToMatch') || '';
		return `${field.displayName} ${suffix}`;
	}
	return field.displayName;
}

function onModeChanged(mode: string): void {
	paramValue.value.mappingMode = mode;
	if (mode === 'defineBelow') {
		initFetching();
	} else {
		loadingError.value = false;
	}
}

function onMatchingColumnsChanged(matchingColumns: string[]): void {
	paramValue.value.matchingColumns = matchingColumns;
}

function fieldValueChanged(value: IUpdateInformation): void {
	if (isResourceMapperValue(value.value)) {
		paramValue.value.value[value.name] = value.value;
		emitValueChanged();
	}
}

function emitValueChanged(): void {
	emit('valueChanged', {
		name: `${props.path}.columns`,
		value: paramValue.value,
		node: props.node?.name,
	});
}

defineExpose({
	fieldsUi,
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
			:loading="loading"
			:loadingError="loadingError"
			:fieldsToMap="fieldsToMap"
			@modeChanged="onModeChanged"
			@retryFetch="initFetching"
		/>
		<matching-columns-select
			v-if="showMatchingColumnsSelector"
			:label-size="labelSize"
			:fieldsToMap="fieldsToMap"
			:typeOptions="props.parameter.typeOptions?.resourceMapper"
			:inputSize="inputSize"
			:loading="loading"
			:initialValue="preselectedMatchingColumns"
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
			/>
		</div>
	</div>
</template>
