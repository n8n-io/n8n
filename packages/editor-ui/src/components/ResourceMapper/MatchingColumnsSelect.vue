<script setup lang="ts">
import type {
	INodeProperties,
	INodePropertyTypeOptions,
	ResourceMapperField,
	ResourceMapperFields,
} from 'n8n-workflow';
import { computed, reactive, watch } from 'vue';
import { i18n as locale } from '@/plugins/i18n';
import { useNodeSpecificationValues } from '@/composables/useNodeSpecificationValues';
import ParameterOptions from '@/components/ParameterOptions.vue';

interface Props {
	parameter: INodeProperties;
	initialValue: string[];
	fieldsToMap: ResourceMapperFields['fields'];
	typeOptions: INodePropertyTypeOptions | undefined;
	labelSize: string;
	inputSize: string;
	loading: boolean;
	serviceName: string;
	teleported?: boolean;
	refreshInProgress: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	teleported: true,
});
const {
	resourceMapperTypeOptions,
	singularFieldWord,
	singularFieldWordCapitalized,
	pluralFieldWord,
	pluralFieldWordCapitalized,
} = useNodeSpecificationValues(props.typeOptions);

const initialValue = computed<string | string[]>(() => {
	return resourceMapperTypeOptions.value?.multiKeyMatch === true
		? props.initialValue
		: props.initialValue[0];
});

// Depending on the mode (multiple/singe key column), the selected value can be a string or an array of strings
const state = reactive({
	selected: initialValue.value,
});

watch(
	() => props.initialValue,
	() => {
		state.selected = initialValue.value;
	},
);

const emit = defineEmits<{
	matchingColumnsChanged: [value: string[]];
	refreshFieldList: [];
}>();

const availableMatchingFields = computed<ResourceMapperField[]>(() => {
	return props.fieldsToMap.filter((field) => {
		return (field.canBeUsedToMatch || field.defaultMatch) && field.display;
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

const parameterActions = computed<Array<{ label: string; value: string; disabled?: boolean }>>(
	() => {
		return [
			{
				label: locale.baseText('resourceMapper.refreshFieldList', {
					interpolate: { fieldWord: singularFieldWordCapitalized.value },
				}),
				value: 'refreshFieldList',
			},
		];
	},
);

const fetchingFieldsLabel = computed<string>(() => {
	return locale.baseText('resourceMapper.fetchingFields.message', {
		interpolate: {
			fieldWord: pluralFieldWord.value,
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
	if (state.selected) {
		emit(
			'matchingColumnsChanged',
			Array.isArray(state.selected) ? state.selected : [state.selected],
		);
	}
}

function onParameterActionSelected(action: string): void {
	switch (action) {
		case 'refreshFieldList':
			emit('refreshFieldList');
			break;
		default:
			break;
	}
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
			:tooltip-text="fieldTooltip"
			:bold="false"
			:required="false"
			:size="labelSize"
			color="text-dark"
		>
			<template #options>
				<ParameterOptions
					:parameter="parameter"
					:custom-actions="parameterActions"
					:loading="props.refreshInProgress"
					:loading-message="fetchingFieldsLabel"
					@update:model-value="onParameterActionSelected"
				/>
			</template>
			<n8n-select
				:multiple="resourceMapperTypeOptions?.multiKeyMatch === true"
				:model-value="state.selected"
				:size="props.inputSize"
				:disabled="loading"
				:teleported="teleported"
				@update:model-value="onSelectionChange"
			>
				<n8n-option
					v-for="field in availableMatchingFields"
					:key="field.id"
					:value="field.id"
					:data-test-id="`matching-column-option-${field.id}`"
				>
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
