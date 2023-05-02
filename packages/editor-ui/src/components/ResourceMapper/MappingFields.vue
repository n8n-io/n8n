<script setup lang="ts">
import type { IUpdateInformation } from '@/Interface';
import type {
	INodeIssues,
	INodeParameters,
	INodeProperties,
	NodePropertyTypes,
	ResourceMapperField,
	ResourceMapperValue,
} from 'n8n-workflow';
import ParameterInputFull from '@/components/ParameterInputFull.vue';
import ParameterIssues from '../ParameterIssues.vue';
import { computed } from 'vue';
import { i18n as locale } from '@/plugins/i18n';
import { get } from 'lodash-es';
import { useNDVStore } from '@/stores';

interface Props {
	parameter: INodeProperties;
	path: string;
	nodeValues: INodeParameters | undefined;
	fieldsToMap: ResourceMapperField[];
	paramValue: ResourceMapperValue;
	FIELD_NAME_REGEX: RegExp;
	labelSize: string;
	showMatchingColumnsSelector: boolean;
	showMappingModeSelect: boolean;
	loading: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
	(event: 'fieldValueChanged', value: IUpdateInformation): void;
	(event: 'removeField', field: string): void;
	(event: 'addField', field: string): void;
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
				type: (field.type as NodePropertyTypes) || 'string',
				default: '',
				required: false,
				description: getFieldDescription(field),
			};
		});
});

const orderedFields = computed<INodeProperties[]>(() => {
	// Sort so that matching columns are first
	if (props.paramValue.matchingColumns) {
		fieldsUi.value.forEach((field, i) => {
			const match = field.name.match(props.FIELD_NAME_REGEX);
			const fieldName = match ? match.pop() : field.name;
			if (props.paramValue.matchingColumns.includes(fieldName || '')) {
				fieldsUi.value.splice(i, 1);
				fieldsUi.value.unshift(field);
			}
		});
	}
	return fieldsUi.value;
});

const removedFields = computed<ResourceMapperField[]>(() => {
	return props.fieldsToMap.filter((field) => field.removed === true);
});

const singularFieldWord = computed<string>(() => {
	const singularFieldWord =
		props.parameter.typeOptions?.resourceMapper?.fieldWords?.singular ||
		locale.baseText('generic.field');
	return singularFieldWord.charAt(0).toUpperCase() + singularFieldWord.slice(1);
});

const pluralFieldWord = computed<string>(() => {
	return (
		props.parameter.typeOptions?.resourceMapper?.fieldWords?.plural ||
		locale.baseText('generic.fields')
	);
});

const addFieldOptions = computed<Array<{ name: string; value: string; disabled?: boolean }>>(() => {
	return [
		{
			name: locale.baseText('resourceMapper.addAllFields', {
				interpolate: { fieldWord: pluralFieldWord.value },
			}),
			value: 'addAllFields',
			disabled: removedFields.value.length === 0,
		},
		{
			name: locale.baseText('resourceMapper.removeAllFields', {
				interpolate: { fieldWord: pluralFieldWord.value },
			}),
			value: 'removeAllFields',
			disabled: removedFields.value.length === props.fieldsToMap.length,
		},
	].concat(
		removedFields.value.map((field) => {
			return {
				name: field.displayName,
				value: field.id,
				disabled: false,
			};
		}),
	);
});

const resourceMapperMode = computed<string | undefined>(() => {
	return props.parameter.typeOptions?.resourceMapper?.mode;
});

const valuesLabel = computed<string>(() => {
	if (resourceMapperMode.value && resourceMapperMode.value === 'update') {
		return locale.baseText('resourceMapper.valuesToUpdate.label');
	}
	return locale.baseText('resourceMapper.valuesToSend.label');
});

function getFieldLabel(field: ResourceMapperField): string {
	if (isMatchingField(field.id)) {
		const suffix = locale.baseText('resourceMapper.usingToMatch') || '';
		return `${field.displayName} ${suffix}`;
	}
	return field.displayName;
}

function getFieldDescription(field: ResourceMapperField): string {
	if (isMatchingField(field.id)) {
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

function isMatchingField(field: string): boolean {
	const match = field.match(props.FIELD_NAME_REGEX);
	let fieldName = field;
	if (match) {
		fieldName = match.pop() || field;
	}
	return (
		props.showMatchingColumnsSelector &&
		(props.paramValue.matchingColumns || []).includes(fieldName)
	);
}

function fieldCannotBeDeleted(field: INodeProperties): boolean {
	return resourceMapperMode.value === 'add' && field.required === true;
}

function getParameterValue(
	nodeValues: INodeParameters | undefined,
	parameterName: string,
	path: string,
) {
	return get(nodeValues, path ? path + '.' + parameterName : parameterName);
}

function getFieldIssues(field: INodeProperties): string[] {
	let fieldIssues: string[] = [];
	if (ndvStore.activeNode) {
		const nodeIssues = ndvStore.activeNode.issues || ({} as INodeIssues);
		const match = field.name.match(props.FIELD_NAME_REGEX);
		let fieldName = field.name;
		if (match) {
			fieldName = match.pop() || field.name;
			const key = `${props.parameter.name}.${fieldName}`;
			if (nodeIssues['parameters'] && key in nodeIssues['parameters']) {
				fieldIssues = fieldIssues.concat(nodeIssues['parameters'][key]);
			}
		}
	}
	return fieldIssues;
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

defineExpose({
	orderedFields,
});
</script>

<template>
	<div class="mt-xs" data-test-id="mapping-fields-container">
		<n8n-input-label :label="valuesLabel" :underline="true" :size="labelSize" color="text-dark" />
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
				v-if="fieldCannotBeDeleted(field)"
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
				v-else-if="!isMatchingField(field.name)"
				:class="['delete-option', 'clickable', 'mt-5xs']"
			>
				<font-awesome-icon
					icon="trash"
					:title="
						locale.baseText('resourceMapper.removeField', {
							interpolate: {
								fieldWord: singularFieldWord,
							},
						})
					"
					@click="removeField(field.name)"
				/>
			</div>
			<div :class="$style.parameterInput">
				<parameter-input-full
					:parameter="field"
					:value="getParameterValue(nodeValues, field.name, path)"
					:displayOptions="true"
					:path="`${props.path}.${field.name}}`"
					:isReadOnly="false"
					:hideLabel="false"
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
		<div class="add-option">
			<n8n-select
				:placeholder="
					locale.baseText('resourceMapper.addFieldToSend', {
						interpolate: { fieldWord: singularFieldWord },
					})
				"
				size="small"
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
			align-self: flex-end;
			padding-bottom: var(--spacing-2xs);
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
