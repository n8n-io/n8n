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
import ParameterIssues from '@/components//ParameterIssues.vue';
import ParameterOptions from '@/components//ParameterOptions.vue';
import { computed } from 'vue';
import { i18n as locale, useI18n } from '@n8n/i18n';
import { useNDVStore } from '@/stores/ndv.store';
import {
	fieldCannotBeDeleted,
	isMatchingField,
	parseResourceMapperFieldName,
} from '@/utils/nodeTypesUtils';
import { useNodeSpecificationValues } from '@/composables/useNodeSpecificationValues';
import {
	N8nIcon,
	N8nIconButton,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
interface Props {
	parameter: INodeProperties;
	path: string;
	nodeValues: INodeParameters | undefined;
	fieldsToMap: ResourceMapperField[];
	paramValue: ResourceMapperValue;
	labelSize: 'small' | 'medium';
	showMatchingColumnsSelector: boolean;
	showMappingModeSelect: boolean;
	loading: boolean;
	refreshInProgress: boolean;
	teleported?: boolean;
	isReadOnly?: boolean;
	isDataStale?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	teleported: true,
	isReadOnly: false,
	isDataStale: false,
});
const FORCE_TEXT_INPUT_FOR_TYPES: FieldType[] = ['time', 'object', 'array'];

const {
	resourceMapperTypeOptions,
	singularFieldWord,
	singularFieldWordCapitalized,
	pluralFieldWord,
	pluralFieldWordCapitalized,
} = useNodeSpecificationValues(props.parameter.typeOptions);

const i18n = useI18n();

const emit = defineEmits<{
	fieldValueChanged: [value: IUpdateInformation];
	removeField: [field: string];
	addField: [field: string];
	refreshFieldList: [];
}>();

const ndvStore = useNDVStore();

function markAsReadOnly(field: ResourceMapperField): boolean {
	if (
		isMatchingField(field.id, props.paramValue.matchingColumns, props.showMatchingColumnsSelector)
	) {
		return false;
	}
	return field.readOnly || false;
}

const fieldsUi = computed<Array<INodeProperties & { readOnly: boolean }>>(() => {
	return props.fieldsToMap
		.filter((field) => field.display && field.removed !== true)
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
				readOnly: markAsReadOnly(field),
			};
		});
});

const orderedFields = computed<Array<INodeProperties & { readOnly: boolean }>>(() => {
	// Sort so that matching columns are first
	if (props.paramValue.matchingColumns) {
		fieldsUi.value.forEach((field, i) => {
			const fieldName = field.name && parseResourceMapperFieldName(field.name);
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
	return props.fieldsToMap.filter((field) => field.removed === true && field.display);
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
				disabled: !isRemoveAllAvailable.value,
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

const resourceMapperValuesLabel = computed<string | undefined>(() => {
	return resourceMapperTypeOptions.value?.valuesLabel;
});

const valuesLabel = computed<string>(() => {
	if (resourceMapperValuesLabel.value) {
		return resourceMapperValuesLabel.value;
	}
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

function getParameterValue(parameterName: string): string | number | boolean | null {
	const fieldName = parseResourceMapperFieldName(parameterName);
	if (fieldName && props.paramValue.value) {
		if (
			props.paramValue.value[fieldName] === undefined ||
			props.paramValue.value[fieldName] === null
		) {
			return '';
		}
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
	if (nodeIssues.parameters && key in nodeIssues.parameters) {
		fieldIssues = fieldIssues.concat(nodeIssues.parameters[key]);
	}
	return fieldIssues;
}

function getParamType(field: ResourceMapperField): NodePropertyTypes {
	if (field.type && !FORCE_TEXT_INPUT_FOR_TYPES.includes(field.type)) {
		return field.type as NodePropertyTypes;
	}
	return 'string';
}

function getParsedFieldName(fullName: string): string {
	return parseResourceMapperFieldName(fullName) ?? fullName;
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
		<N8nInputLabel
			:label="valuesLabel"
			:underline="true"
			:size="labelSize"
			:show-options="true"
			:show-expression-selector="false"
			input-name="columns"
			color="text-dark"
		>
			<template #options>
				<div v-if="props.isDataStale && !props.refreshInProgress" :class="$style.staleDataWarning">
					<N8nTooltip>
						<template #content>
							<span>{{
								locale.baseText('resourceMapper.staleDataWarning.tooltip', {
									interpolate: { fieldWord: pluralFieldWordCapitalized },
								})
							}}</span>
						</template>
						<N8nIcon icon="triangle-alert" size="small" color="warning" />
					</N8nTooltip>
					<N8nIconButton
						icon="refresh-cw"
						type="tertiary"
						size="small"
						:text="true"
						:title="locale.baseText('generic.refresh')"
						:disabled="props.refreshInProgress"
						@click="onParameterActionSelected('refreshFieldList')"
					/>
				</div>
				<ParameterOptions
					:parameter="parameter"
					:custom-actions="parameterActions"
					:loading="props.refreshInProgress"
					:loading-message="fetchingFieldsLabel"
					:is-read-only="isReadOnly"
					:value="props.paramValue"
					@update:model-value="onParameterActionSelected"
				/>
			</template>
		</N8nInputLabel>
		<div v-if="orderedFields.length === 0" class="mt-3xs mb-xs">
			<N8nText size="small">{{
				i18n.baseText('fixedCollectionParameter.currentlyNoItemsExist')
			}}</N8nText>
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
				:class="['delete-option', 'mt-2xs', $style.parameterTooltipIcon]"
			>
				<N8nTooltip placement="top">
					<template #content>
						<span>{{
							locale.baseText('resourceMapper.mandatoryField.title', {
								interpolate: { fieldWord: singularFieldWord },
							})
						}}</span>
					</template>
					<N8nIcon icon="circle-help" />
				</N8nTooltip>
			</div>
			<div
				v-else-if="
					!isMatchingField(
						field.name,
						props.paramValue.matchingColumns,
						props.showMatchingColumnsSelector,
					)
				"
				:class="['delete-option', 'mt-5xs']"
			>
				<N8nIconButton
					type="tertiary"
					text
					size="small"
					icon="trash-2"
					:data-test-id="`remove-field-button-${getParsedFieldName(field.name)}`"
					:title="
						locale.baseText('resourceMapper.removeField', {
							interpolate: {
								fieldWord: singularFieldWord,
							},
						})
					"
					:disabled="isReadOnly"
					@click="removeField(field.name)"
				></N8nIconButton>
			</div>
			<div :class="$style.parameterInput">
				<ParameterInputFull
					:parameter="field"
					:value="getParameterValue(field.name)"
					:display-options="true"
					:path="`${props.path}.${field.name}`"
					:is-read-only="refreshInProgress || field.readOnly || isReadOnly"
					:hide-issues="true"
					:node-values="nodeValues"
					:class="$style.parameterInputFull"
					@update="onValueChanged"
				/>
			</div>
			<ParameterIssues
				v-if="getFieldIssues(field).length > 0"
				:issues="getFieldIssues(field)"
				:class="[$style.parameterIssues, 'ml-5xs']"
			/>
		</div>
		<div :class="['add-option', $style.addOption]" data-test-id="add-fields-select">
			<N8nSelect
				:placeholder="
					locale.baseText('resourceMapper.addFieldToSend', {
						interpolate: { fieldWord: singularFieldWord },
					})
				"
				size="small"
				:teleported="teleported"
				:disabled="addFieldOptions.length == 0 || isReadOnly"
				@update:model-value="addField"
			>
				<N8nOption
					v-for="item in addFieldOptions"
					:key="item.value"
					:label="item.name"
					:value="item.value"
					:disabled="item.disabled"
				>
				</N8nOption>
			</N8nSelect>
		</div>
	</div>
</template>

<style module lang="scss">
.parameterItem {
	--delete-option-width: 22px;
	display: flex;
	padding: 0 0 0 var(--spacing--sm);

	.parameterInput {
		width: calc(100% - var(--delete-option-width));
	}

	.parameterInput:first-child {
		margin-left: var(--delete-option-width);
	}

	&.hasIssues {
		.parameterIssues {
			float: none;
			padding-top: var(--spacing--xl);
		}
		input,
		input:focus {
			--input-border-color: var(--color--danger);
			border-color: var(--color--danger);
		}
	}
}

.parameterTooltipIcon {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1) !important;
	width: 26px; // match trash button size
	text-align: center;
}

.addOption {
	margin-top: var(--spacing--lg);
	padding: 0 0 0 var(--spacing--sm);
}

.staleDataWarning {
	display: flex;
	height: var(--spacing--md);
	align-items: baseline;
	gap: var(--spacing--5xs);
}
</style>
