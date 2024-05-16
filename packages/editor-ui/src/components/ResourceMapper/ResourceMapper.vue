<script setup lang="ts">
import type { IUpdateInformation, ResourceMapperReqParams } from '@/Interface';
import { resolveRequiredParameters } from '@/composables/useWorkflowHelpers';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import type {
	INode,
	INodeParameters,
	INodeProperties,
	INodeTypeDescription,
	ResourceMapperField,
	ResourceMapperValue,
} from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';
import { computed, onMounted, reactive, watch } from 'vue';
import MappingModeSelect from './MappingModeSelect.vue';
import MatchingColumnsSelect from './MatchingColumnsSelect.vue';
import MappingFields from './MappingFields.vue';
import { fieldCannotBeDeleted, parseResourceMapperFieldName } from '@/utils/nodeTypesUtils';
import { isResourceMapperValue } from '@/utils/typeGuards';
import { i18n as locale } from '@/plugins/i18n';
import { useNDVStore } from '@/stores/ndv.store';
import { useWorkflowsStore } from '@/stores/workflows.store';

type Props = {
	parameter: INodeProperties;
	node: INode | null;
	path: string;
	inputSize: string;
	labelSize: string;
	dependentParametersValues?: string | null;
	teleported: boolean;
};

const nodeTypesStore = useNodeTypesStore();
const ndvStore = useNDVStore();
const workflowsStore = useWorkflowsStore();

const props = withDefaults(defineProps<Props>(), {
	teleported: true,
});

const emit = defineEmits<{
	(event: 'valueChanged', value: IUpdateInformation): void;
}>();

const state = reactive({
	paramValue: {
		mappingMode: 'defineBelow',
		value: {},
		matchingColumns: [] as string[],
		schema: [] as ResourceMapperField[],
	} as ResourceMapperValue,
	parameterValues: {} as INodeParameters,
	loading: false,
	refreshInProgress: false, // Shows inline loader when refreshing fields
	loadingError: false,
});

// Reload fields to map when dependent parameters change
watch(
	() => props.dependentParametersValues,
	async (currentValue, oldValue) => {
		if (oldValue !== null && currentValue !== null && oldValue !== currentValue) {
			state.paramValue = {
				...state.paramValue,
				value: null,
				schema: [],
			};
			emitValueChanged();
			await initFetching();
			setDefaultFieldValues(true);
		}
	},
);

// Reload fields to map when node is executed
watch(
	() => workflowsStore.getWorkflowExecution,
	async (data) => {
		if (data?.status === 'success' && state.paramValue.mappingMode === 'autoMapInputData') {
			await initFetching(true);
		}
	},
);

onMounted(async () => {
	if (props.node) {
		state.parameterValues = {
			...state.parameterValues,
			parameters: props.node.parameters,
		};
	}
	const params = state.parameterValues.parameters as INodeParameters;
	const parameterName = props.parameter.name;

	if (!(parameterName in params)) {
		return;
	}
	let hasSchema = false;
	const nodeValues = params[parameterName] as unknown as ResourceMapperValue;
	state.paramValue = {
		...state.paramValue,
		...nodeValues,
	};
	if (!state.paramValue.schema) {
		state.paramValue = {
			...state.paramValue,
			schema: [],
		};
	} else {
		hasSchema = state.paramValue.schema.length > 0;
	}
	Object.keys(state.paramValue.value || {}).forEach((key) => {
		if (state.paramValue.value && state.paramValue.value[key] === '') {
			state.paramValue = {
				...state.paramValue,
				value: {
					...state.paramValue.value,
					[key]: null,
				},
			};
		}
	});
	if (nodeValues.matchingColumns) {
		state.paramValue = {
			...state.paramValue,
			matchingColumns: nodeValues.matchingColumns,
		};
	}
	if (!hasSchema) {
		// Only fetch a schema if it's not already set
		await initFetching();
	}
	// Set default values if this is the first time the parameter is being set
	if (!state.paramValue.value) {
		setDefaultFieldValues();
	}
	updateNodeIssues();
});

const resourceMapperMode = computed<string | undefined>(() => {
	return props.parameter.typeOptions?.resourceMapper?.mode;
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
		state.paramValue.schema.length > 0
	);
});

const showMappingFields = computed<boolean>(() => {
	return (
		state.paramValue.mappingMode === 'defineBelow' &&
		!state.loading &&
		!state.loadingError &&
		state.paramValue.schema.length > 0 &&
		hasAvailableMatchingColumns.value
	);
});

const matchingColumns = computed<string[]>(() => {
	if (!showMatchingColumnsSelector.value) {
		return [];
	}
	if (state.paramValue.matchingColumns) {
		return state.paramValue.matchingColumns;
	}
	return defaultSelectedMatchingColumns.value;
});

const hasAvailableMatchingColumns = computed<boolean>(() => {
	if (resourceMapperMode.value !== 'add') {
		return (
			state.paramValue.schema.filter(
				(field) =>
					(field.canBeUsedToMatch || field.defaultMatch) && field.display && field.removed !== true,
			).length > 0
		);
	}
	return true;
});

const defaultSelectedMatchingColumns = computed<string[]>(() => {
	return state.paramValue.schema.length === 1
		? [state.paramValue.schema[0].id]
		: state.paramValue.schema.reduce((acc, field) => {
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

async function initFetching(inlineLoading = false): Promise<void> {
	state.loadingError = false;
	if (inlineLoading) {
		state.refreshInProgress = true;
	} else {
		state.loading = true;
	}
	try {
		await loadFieldsToMap();
		if (!state.paramValue.matchingColumns || state.paramValue.matchingColumns.length === 0) {
			onMatchingColumnsChanged(defaultSelectedMatchingColumns.value);
		}
	} catch (error) {
		state.loadingError = true;
	} finally {
		state.loading = false;
		state.refreshInProgress = false;
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
		currentNodeParameters: resolveRequiredParameters(
			props.parameter,
			props.node.parameters,
		) as INodeParameters,
		path: props.path,
		methodName: props.parameter.typeOptions?.resourceMapper?.resourceMapperMethod,
		credentials: props.node.credentials,
	};
	const fetchedFields = await nodeTypesStore.getResourceMapperFields(requestParams);
	if (fetchedFields !== null) {
		const newSchema = fetchedFields.fields.map((field) => {
			const existingField = state.paramValue.schema.find((f) => f.id === field.id);
			if (existingField) {
				field.removed = existingField.removed;
			} else if (state.paramValue.value !== null && !(field.id in state.paramValue.value)) {
				// New fields are shown by default
				field.removed = false;
			}
			return field;
		});
		state.paramValue = {
			...state.paramValue,
			schema: newSchema,
		};
		emitValueChanged();
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

function setDefaultFieldValues(forceMatchingFieldsUpdate = false): void {
	state.paramValue.value = {};
	const hideAllFields = props.parameter.typeOptions?.resourceMapper?.addAllFields === false;
	state.paramValue.schema.forEach((field) => {
		if (state.paramValue.value) {
			// Hide all non-required fields if it's configured in node definition
			if (hideAllFields) {
				field.removed = !field.required;
			}
			if (field.type === 'boolean') {
				state.paramValue.value = {
					...state.paramValue.value,
					[field.id]: false,
				};
			} else {
				state.paramValue.value = {
					...state.paramValue.value,
					[field.id]: null,
				};
			}
		}
	});
	emitValueChanged();
	if (!state.paramValue.matchingColumns || forceMatchingFieldsUpdate) {
		state.paramValue.matchingColumns = defaultSelectedMatchingColumns.value;
		emitValueChanged();
	}
}

function updateNodeIssues(): void {
	if (props.node) {
		const parameterIssues = NodeHelpers.getNodeParametersIssues(
			nodeType.value?.properties || [],
			props.node,
		);
		if (parameterIssues) {
			ndvStore.updateNodeParameterIssues(parameterIssues);
		}
	}
}

function onMatchingColumnsChanged(matchingColumns: string[]): void {
	state.paramValue = {
		...state.paramValue,
		matchingColumns,
	};
	// Set all matching fields to be visible
	state.paramValue.schema.forEach((field) => {
		if (state.paramValue.matchingColumns?.includes(field.id)) {
			field.removed = false;
			state.paramValue.schema.splice(state.paramValue.schema.indexOf(field), 1, field);
		}
	});
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
	const fieldName = parseResourceMapperFieldName(updateInfo.name);
	if (fieldName && state.paramValue.value) {
		state.paramValue.value = {
			...state.paramValue.value,
			[fieldName]: newValue,
		};
		emitValueChanged();
	}
}

function removeField(name: string): void {
	if (name === 'removeAllFields') {
		return removeAllFields();
	}
	const fieldName = parseResourceMapperFieldName(name);
	if (fieldName) {
		const field = state.paramValue.schema.find((f) => f.id === fieldName);
		if (field) {
			deleteField(field);
			emitValueChanged();
		}
	}
}

function removeAllFields(): void {
	state.paramValue.schema.forEach((field) => {
		if (
			!fieldCannotBeDeleted(
				field,
				showMatchingColumnsSelector.value,
				resourceMapperMode.value,
				matchingColumns.value,
			)
		) {
			deleteField(field);
		}
	});
	emitValueChanged();
}

// Delete a single field from the mapping (set removed flag to true and delete from value)
// Used when removing one or all fields
function deleteField(field: ResourceMapperField): void {
	if (state.paramValue.value) {
		delete state.paramValue.value[field.id];
		field.removed = true;
		state.paramValue.schema.splice(state.paramValue.schema.indexOf(field), 1, field);
	}
}

function addField(name: string): void {
	if (name === 'addAllFields') {
		return addAllFields();
	}
	if (name === 'removeAllFields') {
		return removeAllFields();
	}
	state.paramValue.value = {
		...state.paramValue.value,
		[name]: null,
	};
	const field = state.paramValue.schema.find((f) => f.id === name);
	if (field) {
		field.removed = false;
		state.paramValue.schema.splice(state.paramValue.schema.indexOf(field), 1, field);
	}
	emitValueChanged();
}

function addAllFields(): void {
	const newValues: { [name: string]: null } = {};
	state.paramValue.schema.forEach((field) => {
		if (field.display && field.removed) {
			newValues[field.id] = null;
			field.removed = false;
			state.paramValue.schema.splice(state.paramValue.schema.indexOf(field), 1, field);
		}
	});
	state.paramValue.value = {
		...state.paramValue.value,
		...newValues,
	};
	emitValueChanged();
}

function emitValueChanged(): void {
	pruneParamValues();
	emit('valueChanged', {
		name: `${props.path}`,
		value: state.paramValue,
		node: props.node?.name,
	});
	updateNodeIssues();
}

function pruneParamValues(): void {
	const { value, schema } = state.paramValue;
	if (!value) {
		return;
	}

	const schemaKeys = new Set(schema.map((s) => s.id));
	for (const key of Object.keys(value)) {
		if (value[key] === null || !schemaKeys.has(key)) {
			delete value[key];
		}
	}
}

defineExpose({
	state,
});
</script>

<template>
	<div class="mt-4xs" data-test-id="resource-mapper-container">
		<MappingModeSelect
			v-if="showMappingModeSelect"
			:input-size="inputSize"
			:label-size="labelSize"
			:initial-value="state.paramValue.mappingMode || 'defineBelow'"
			:type-options="props.parameter.typeOptions"
			:service-name="nodeType?.displayName || locale.baseText('generic.service')"
			:loading="state.loading"
			:loading-error="state.loadingError"
			:fields-to-map="state.paramValue.schema"
			:teleported="teleported"
			@mode-changed="onModeChanged"
			@retry-fetch="initFetching"
		/>
		<MatchingColumnsSelect
			v-if="showMatchingColumnsSelector"
			:parameter="props.parameter"
			:label-size="labelSize"
			:fields-to-map="state.paramValue.schema"
			:type-options="props.parameter.typeOptions"
			:input-size="inputSize"
			:loading="state.loading"
			:initial-value="matchingColumns"
			:service-name="nodeType?.displayName || locale.baseText('generic.service')"
			:teleported="teleported"
			:refresh-in-progress="state.refreshInProgress"
			@matching-columns-changed="onMatchingColumnsChanged"
			@refresh-field-list="initFetching(true)"
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
		<MappingFields
			v-if="showMappingFields"
			:parameter="props.parameter"
			:path="props.path"
			:node-values="state.parameterValues"
			:fields-to-map="state.paramValue.schema"
			:param-value="state.paramValue"
			:label-size="labelSize"
			:show-matching-columns-selector="showMatchingColumnsSelector"
			:show-mapping-mode-select="showMappingModeSelect"
			:loading="state.loading"
			:teleported="teleported"
			:refresh-in-progress="state.refreshInProgress"
			@field-value-changed="fieldValueChanged"
			@remove-field="removeField"
			@add-field="addField"
			@refresh-field-list="initFetching(true)"
		/>
		<n8n-notice
			v-if="state.paramValue.mappingMode === 'autoMapInputData' && hasAvailableMatchingColumns"
		>
			{{
				locale.baseText('resourceMapper.autoMappingNotice', {
					interpolate: {
						fieldWord: pluralFieldWord,
						serviceName: nodeType?.displayName || locale.baseText('generic.service'),
					},
				})
			}}
		</n8n-notice>
	</div>
</template>
