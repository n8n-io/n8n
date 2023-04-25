<script setup lang="ts">
import type { IUpdateInformation } from '@/Interface';
import type {
	INodeParameters,
	INodeProperties,
	NodePropertyTypes,
	ResourceMapperField,
	ResourceMapperValue,
} from 'n8n-workflow';
import ParameterInputFull from '@/components/ParameterInputFull.vue';
import { computed } from 'vue';
import { i18n as locale } from '@/plugins/i18n';
import { get } from 'lodash-es';

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
}>();

const fieldsUi = computed<INodeProperties[]>(() => {
	return props.fieldsToMap
		.filter((field) => field.display !== false)
		.map((field) => {
			return {
				displayName: getFieldLabel(field),
				// Set part of the path to each param name so value can be fetched properly by input parameter list component
				name: `value["${field.id}"]`,
				type: (field.type as NodePropertyTypes) || 'string',
				default: '',
				required: field.required,
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

const singularFieldWord = computed<string>(() => {
	return (
		props.parameter.typeOptions?.resourceMapper?.fieldWords?.singular ||
		locale.baseText('generic.field')
	);
});

const pluralFieldWord = computed<string>(() => {
	return (
		props.parameter.typeOptions?.resourceMapper?.fieldWords?.plural ||
		locale.baseText('generic.fields')
	);
});

const resourceMapperMode = computed<string | undefined>(() => {
	return props.parameter.typeOptions?.resourceMapper?.mode;
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

function onValueChanged(value: IUpdateInformation): void {
	emit('fieldValueChanged', value);
}

function removeField(fieldName: string) {
	emit('removeField', fieldName);
}

defineExpose({
	orderedFields,
});
</script>

<template>
	<div class="mt-xs" data-test-id="mapping-fields-container">
		<n8n-text v-if="!showMappingModeSelect && loading" size="small">
			<n8n-icon icon="sync-alt" size="xsmall" :spin="true" />
			{{
				locale.baseText('resourceMapper.fetchingFields.message', {
					interpolate: {
						fieldWord: pluralFieldWord,
					},
				})
			}}
		</n8n-text>
		<n8n-input-label
			:label="locale.baseText('resourceMapper.valuesToSend.label')"
			:underline="true"
			:size="labelSize"
			color="text-dark"
		/>
		<div
			v-for="field in orderedFields"
			:key="field.name"
			:class="['parameter-item', $style.parameterItem]"
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
			<parameter-input-full
				:parameter="field"
				:value="getParameterValue(nodeValues, field.name, path)"
				:displayOptions="true"
				:path="`${props.path}.${field.name}}`"
				:isReadOnly="false"
				:hideLabel="false"
				:nodeValues="nodeValues"
				@valueChanged="onValueChanged"
			/>
		</div>
	</div>
</template>

<style module lang="scss">
.parameterItem {
	position: relative;
	padding: 0 0 0 1em;
}

.parameterTooltipIcon {
	color: var(--color-text-light) !important;
}
</style>
