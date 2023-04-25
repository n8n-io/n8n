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

export interface Props {
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

function getFieldLabel(field: ResourceMapperField): string {
	if (isMatchingField(field.id)) {
		const suffix = locale.baseText('resourceMapper.usingToMatch') || '';
		return `${field.displayName} ${suffix}`;
	}
	return field.displayName;
}

function getFieldDescription(field: ResourceMapperField): string {
	if (isMatchingField(field.id)) {
		const singularFieldWord =
			props.parameter.typeOptions?.resourceMapper?.fieldWords?.singular ||
			locale.baseText('generic.field');
		return (
			locale.baseText('resourceMapper.usingToMatch.description', {
				interpolate: {
					fieldWord: singularFieldWord,
				},
			}) || ''
		);
	}
	return '';
}

function isMatchingField(field: string): boolean {
	return (
		props.showMatchingColumnsSelector && (props.paramValue.matchingColumns || []).includes(field)
	);
}

function getParameterValue(
	nodeValues: INodeParameters | undefined,
	parameterName: string,
	path: string,
) {
	return get(nodeValues, path ? path + '.' + parameterName : parameterName);
}

function onValueChanged(value: IUpdateInformation) {
	emit('fieldValueChanged', value);
}

function removeField(field: string) {
	emit('removeField', field);
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
						fieldWord:
							props.parameter.typeOptions?.fieldWords?.plural ||
							locale.baseText('generic.fields') ||
							'fields',
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
			<div class="delete-option clickable" :title="$locale.baseText('parameterInputList.delete')">
				<font-awesome-icon
					icon="trash"
					class="reset-icon clickable"
					:title="$locale.baseText('parameterInputList.deleteParameter')"
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
</style>
