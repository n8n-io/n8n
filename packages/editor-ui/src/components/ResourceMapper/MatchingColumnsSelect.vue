<script setup lang="ts">
import type {
	INodePropertyTypeOptions,
	ResourceMapperField,
	ResourceMapperFields,
} from 'n8n-workflow';
import { computed, reactive, watch } from 'vue';
import { i18n as locale } from '@/plugins/i18n';
import { useNodeSpecificationValues } from '@/composables';

interface Props {
	initialValue: string[];
	fieldsToMap: ResourceMapperFields['fields'];
	typeOptions: INodePropertyTypeOptions | undefined;
	labelSize: string;
	inputSize: string;
	loading: boolean;
	serviceName: string;
}

const props = defineProps<Props>();
const {
	resourceMapperTypeOptions,
	singularFieldWord,
	singularFieldWordCapitalized,
	pluralFieldWord,
	pluralFieldWordCapitalized,
} = useNodeSpecificationValues(props.typeOptions);

// Depending on the mode (multiple/singe key column), the selected value can be a string or an array of strings
const state = reactive({
	selected: props.initialValue as string[] | string,
});

watch(
	() => props.initialValue,
	() => {
		state.selected =
			resourceMapperTypeOptions.value?.multiKeyMatch === true
				? props.initialValue
				: props.initialValue[0];
	},
);

const emit = defineEmits<{
	(event: 'matchingColumnsChanged', value: string[]): void;
}>();

const availableMatchingFields = computed<ResourceMapperField[]>(() => {
	return props.fieldsToMap.filter((field) => {
		return field.canBeUsedToMatch !== false && field.display !== false;
	});
});

// Field label, description and tooltip: Labels here use content and field words defined in parameter type options
const fieldLabel = computed<string>(() => {
	if (resourceMapperTypeOptions.value?.matchingFieldsLabels?.title) {
		return resourceMapperTypeOptions.value.matchingFieldsLabels.title;
	}
	const fieldWord =
		resourceMapperTypeOptions.value?.multiKeyMatch === true
			? pluralFieldWordCapitalized.value
			: singularFieldWordCapitalized.value;
	return locale.baseText('resourceMapper.columnsToMatchOn.label', {
		interpolate: {
			fieldWord,
		},
	});
});

const fieldDescription = computed<string>(() => {
	if (resourceMapperTypeOptions.value?.matchingFieldsLabels?.hint) {
		return resourceMapperTypeOptions.value.matchingFieldsLabels.hint;
	}
	const labeli18nKey =
		resourceMapperTypeOptions.value?.multiKeyMatch === true
			? 'resourceMapper.columnsToMatchOn.multi.description'
			: 'resourceMapper.columnsToMatchOn.single.description';
	return locale.baseText(labeli18nKey, {
		interpolate: {
			fieldWord:
				resourceMapperTypeOptions.value?.multiKeyMatch === true
					? `${pluralFieldWord.value}`
					: `${singularFieldWord.value}`,
		},
	});
});

const fieldTooltip = computed<string>(() => {
	if (resourceMapperTypeOptions.value?.matchingFieldsLabels?.description) {
		return resourceMapperTypeOptions.value.matchingFieldsLabels.description;
	}
	return locale.baseText('resourceMapper.columnsToMatchOn.tooltip', {
		interpolate: {
			fieldWord:
				resourceMapperTypeOptions.value?.multiKeyMatch === true
					? `${pluralFieldWord.value}`
					: `${singularFieldWord.value}`,
		},
	});
});

function onSelectionChange(value: string | string[]) {
	if (resourceMapperTypeOptions.value?.multiKeyMatch === true) {
		state.selected = value as string[];
	} else {
		state.selected = value as string;
	}
	emitValueChanged();
}

function emitValueChanged() {
	emit('matchingColumnsChanged', Array.isArray(state.selected) ? state.selected : [state.selected]);
}

defineExpose({
	state,
});
</script>

<template>
	<div class="mt-2xs" data-test-id="matching-column-select">
		<n8n-input-label
			v-if="availableMatchingFields.length > 0"
			:label="fieldLabel"
			:tooltipText="fieldTooltip"
			:bold="false"
			:required="false"
			:size="labelSize"
			color="text-dark"
		>
			<n8n-select
				:multiple="resourceMapperTypeOptions?.multiKeyMatch === true"
				:value="state.selected"
				:size="props.inputSize"
				:disabled="loading"
				@change="onSelectionChange"
			>
				<n8n-option v-for="field in availableMatchingFields" :key="field.id" :value="field.id">
					{{ field.displayName }}
				</n8n-option>
			</n8n-select>
			<n8n-text size="small">
				{{ fieldDescription }}
			</n8n-text>
		</n8n-input-label>
		<n8n-notice v-else>
			{{
				locale.baseText('resourceMapper.columnsToMatchOn.noFieldsFound', {
					interpolate: { fieldWord: singularFieldWord, serviceName: props.serviceName },
				})
			}}
		</n8n-notice>
	</div>
</template>
