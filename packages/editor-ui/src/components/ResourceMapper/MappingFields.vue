<script setup lang="ts">
import type { IUpdateInformation } from '@/Interface';
import type {
	FieldType,
	INodeIssues,
	INodeParameters,
	INodeProperties,
	NodePropertyTypes,
	ResourceMapperField,
	ResourceMapperValue,
} from 'n8n-workflow';
import ParameterInputFull from '@/components/ParameterInputFull.vue';
import ParameterIssues from '../ParameterIssues.vue';
import ParameterOptions from '../ParameterOptions.vue';
import { computed } from 'vue';
import { i18n as locale } from '@/plugins/i18n';
import { useNDVStore } from '@/stores';
import { fieldCannotBeDeleted, isMatchingField, parseResourceMapperFieldName } from '@/utils';
import { useNodeSpecificationValues } from '@/composables';

interface Props {
	parameter: INodeProperties;
	path: string;
	nodeValues: INodeParameters | undefined;
	fieldsToMap: ResourceMapperField[];
	paramValue: ResourceMapperValue;
	labelSize: string;
	showMatchingColumnsSelector: boolean;
	showMappingModeSelect: boolean;
	loading: boolean;
	refreshInProgress: boolean;
}

const props = defineProps<Props>();
const FORCE_TEXT_INPUT_FOR_TYPES: FieldType[] = ['time', 'object', 'array'];

const {
	resourceMapperTypeOptions,
	singularFieldWord,
	singularFieldWordCapitalized,
	pluralFieldWord,
	pluralFieldWordCapitalized,
} = useNodeSpecificationValues(props.parameter.typeOptions);

const emit = defineEmits<{
	(event: 'fieldValueChanged', value: IUpdateInformation): void;
	(event: 'removeField', field: string): void;
	(event: 'addField', field: string): void;
	(event: 'refreshFieldList'): void;
}>();

const ndvStore = useNDVStore();

const fieldsUi = computed<INodeProperties[]>(() => {
	return props.fieldsToMap
		.filter((field) => field.display !== false && field.removed !== true)
		.map((field) => {
			return {
				displayName: getFieldLabel(field),
				// Set part of the path to each param name so value can be fetched properly by input parameter list component
				name: `value["${field.id}"]`,
				type: getParamType(field),
				default: field.type === 'boolean' ? false : '',
				required: field.required,
				description: getFieldDescription(field),
				options: field.options,
			};
		});
});

const orderedFields = computed<INodeProperties[]>(() => {
	// Sort so that matching columns are first
	if (props.paramValue.matchingColumns) {
		fieldsUi.value.forEach((field, i) => {
			const fieldName = parseResourceMapperFieldName(field.name);
			if (fieldName) {
				if (props.paramValue.matchingColumns.includes(fieldName)) {
					fieldsUi.value.splice(i, 1);
					fieldsUi.value.unshift(field);
				}
			}
		});
	}
	return fieldsUi.value;
});

const removedFields = computed<ResourceMapperField[]>(() => {
	return props.fieldsToMap.filter((field) => field.removed === true && field.display !== false);
});

const addFieldOptions = computed<Array<{ name: string; value: string; disabled?: boolean }>>(() => {
	return removedFields.value.map((field) => {
		return {
			name: field.displayName,
			value: field.id,
			disabled: false,
		};
	});
});

const parameterActions = computed<Array<{ label: string; value: string; disabled?: boolean }>>(
	() => {
		return [
			{
				label: locale.baseText('resourceMapper.refreshFieldList', {
					interpolate: { fieldWord: singularFieldWordCapitalized.value },
				}),
				value: 'refreshFieldList',
			},
			{
				label: locale.baseText('resourceMapper.addAllFields', {
					interpolate: { fieldWord: pluralFieldWordCapitalized.value },
				}),
				value: 'addAllFields',
				disabled: removedFields.value.length === 0,
			},
			{
				label: locale.baseText('resourceMapper.removeAllFields', {
					interpolate: { fieldWord: pluralFieldWordCapitalized.value },
				}),
				value: 'removeAllFields',
				disabled: isRemoveAllAvailable.value === false,
			},
		];
	},
);

const isRemoveAllAvailable = computed<boolean>(() => {
	return (
		removedFields.value.length !== props.fieldsToMap.length &&
		props.fieldsToMap.some((field) => {
			return (
				field.removed !== true &&
				!fieldCannotBeDeleted(
					field,
					props.showMatchingColumnsSelector,
					resourceMapperMode.value,
					props.paramValue.matchingColumns,
				)
			);
		})
	);
});

const resourceMapperMode = computed<string | undefined>(() => {
	return resourceMapperTypeOptions.value?.mode;
});

const valuesLabel = computed<string>(() => {
	if (resourceMapperMode.value && resourceMapperMode.value === 'update') {
		return locale.baseText('resourceMapper.valuesToUpdate.label');
	}
	return locale.baseText('resourceMapper.valuesToSend.label');
});

const fetchingFieldsLabel = computed<string>(() => {
	return locale.baseText('resourceMapper.fetchingFields.message', {
		interpolate: {
			fieldWord: pluralFieldWord.value,
		},
	});
});

function getFieldLabel(field: ResourceMapperField): string {
	if (
		isMatchingField(field.id, props.paramValue.matchingColumns, props.showMatchingColumnsSelector)
	) {
		const suffix = locale.baseText('resourceMapper.usingToMatch') || '';
		return `${field.displayName} ${suffix}`;
	}
	return field.displayName;
}

function getFieldDescription(field: ResourceMapperField): string {
	if (
		isMatchingField(field.id, props.paramValue.matchingColumns, props.showMatchingColumnsSelector)
	) {
		return (
			locale.baseText('resourceMapper.usingToMatch.description', {
				interpolate: {
					fieldWord: singularFieldWord.value,
				},
			}) || ''
		);
	}
	return '';
}

function getParameterValue(parameterName: string) {
	const fieldName = parseResourceMapperFieldName(parameterName);
	if (fieldName && props.paramValue.value) {
		return props.paramValue.value[fieldName];
	}
	return null;
}

function getFieldIssues(field: INodeProperties): string[] {
	if (!ndvStore.activeNode) return [];

	const nodeIssues = ndvStore.activeNode.issues || ({} as INodeIssues);
	const fieldName = parseResourceMapperFieldName(field.name);
	if (!fieldName) return [];

	let fieldIssues: string[] = [];
	const key = `${props.parameter.name}.${fieldName}`;
	if (nodeIssues['parameters'] && key in nodeIssues['parameters']) {
		fieldIssues = fieldIssues.concat(nodeIssues['parameters'][key]);
	}
	return fieldIssues;
}

function getParamType(field: ResourceMapperField): NodePropertyTypes {
	if (field.type && !FORCE_TEXT_INPUT_FOR_TYPES.includes(field.type)) {
		return field.type as NodePropertyTypes;
	}
	return 'string';
}

function onValueChanged(value: IUpdateInformation): void {
	emit('fieldValueChanged', value);
}

function removeField(fieldName: string) {
	emit('removeField', fieldName);
}

function addField(fieldName: string) {
	emit('addField', fieldName);
}

function onParameterActionSelected(action: string): void {
	switch (action) {
		case 'addAllFields':
			emit('addField', action);
			break;
		case 'removeAllFields':
			emit('removeField', action);
			break;
		case 'refreshFieldList':
			emit('refreshFieldList');
			break;
		default:
			break;
	}
}

defineExpose({
	orderedFields,
});
</script>

<template>
	<div class="mt-xs" data-test-id="mapping-fields-container">
		<n8n-input-label
			:label="valuesLabel"
			:underline="true"
			:size="labelSize"
			:showOptions="true"
			:showExpressionSelector="false"
			color="text-dark"
		>
			<template #options>
				<parameter-options
					:parameter="parameter"
					:customActions="parameterActions"
					:loading="props.refreshInProgress"
					:loadingMessage="fetchingFieldsLabel"
					@optionSelected="onParameterActionSelected"
				/>
			</template>
		</n8n-input-label>
		<div v-if="orderedFields.length === 0" class="mt-3xs mb-xs">
			<n8n-text size="small">{{
				$locale.baseText('fixedCollectionParameter.currentlyNoItemsExist')
			}}</n8n-text>
		</div>
		<div
			v-for="field in orderedFields"
			:key="field.name"
			:class="{
				['parameter-item']: true,
				[$style.parameterItem]: true,
				[$style.hasIssues]: getFieldIssues(field).length > 0,
			}"
		>
			<div
				v-if="resourceMapperMode === 'add' && field.required"
				:class="['delete-option', 'mt-5xs', $style.parameterTooltipIcon]"
			>
				<n8n-tooltip placement="top">
					<template #content>
						<span>{{
							locale.baseText('resourceMapper.mandatoryField.title', {
								interpolate: { fieldWord: singularFieldWord },
							})
						}}</span>
					</template>
					<font-awesome-icon icon="question-circle" />
				</n8n-tooltip>
			</div>
			<div
				v-else-if="
					!isMatchingField(
						field.name,
						props.paramValue.matchingColumns,
						props.showMatchingColumnsSelector,
					)
				"
				:class="['delete-option', 'clickable', 'mt-5xs']"
			>
				<font-awesome-icon
					icon="trash"
					:title="
						locale.baseText('resourceMapper.removeField', {
							interpolate: {
								fieldWord: singularFieldWordCapitalized,
							},
						})
					"
					data-test-id="remove-field-button"
					@click="removeField(field.name)"
				/>
			</div>
			<div :class="$style.parameterInput">
				<parameter-input-full
					:parameter="field"
					:value="getParameterValue(field.name)"
					:displayOptions="true"
					:path="`${props.path}.${field.name}`"
					:isReadOnly="refreshInProgress"
					:hideIssues="true"
					:nodeValues="nodeValues"
					:class="$style.parameterInputFull"
					@valueChanged="onValueChanged"
				/>
			</div>
			<parameter-issues
				v-if="getFieldIssues(field).length > 0"
				:issues="getFieldIssues(field)"
				:class="[$style.parameterIssues, 'ml-5xs']"
			/>
		</div>
		<div class="add-option" data-test-id="add-fields-select">
			<n8n-select
				:placeholder="
					locale.baseText('resourceMapper.addFieldToSend', {
						interpolate: { fieldWord: singularFieldWordCapitalized },
					})
				"
				size="small"
				:disabled="addFieldOptions.length == 0"
				@change="addField"
			>
				<n8n-option
					v-for="item in addFieldOptions"
					:key="item.value"
					:label="item.name"
					:value="item.value"
					:disabled="item.disabled"
				>
				</n8n-option>
			</n8n-select>
		</div>
	</div>
</template>

<style module lang="scss">
.parameterItem {
	display: flex;
	padding: 0 0 0 1em;

	.parameterInput {
		width: 100%;
	}

	&.hasIssues {
		.parameterIssues {
			float: none;
			padding-top: var(--spacing-xl);
		}
		input,
		input:focus {
			--input-border-color: var(--color-danger);
			border-color: var(--color-danger);
		}
	}
}

.parameterTooltipIcon {
	color: var(--color-text-light) !important;
}
</style>
