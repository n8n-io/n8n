<script setup lang="ts">
import type {
	ResourceMapperField,
	ResourceMapperFields,
	ResourceMapperTypeOptions,
} from 'n8n-workflow';
import { computed, reactive, watch } from 'vue';
import { i18n as locale } from '@/plugins/i18n';

interface Props {
	initialValue: string[];
	fieldsToMap: ResourceMapperFields['fields'];
	typeOptions: ResourceMapperTypeOptions | undefined;
	labelSize: string;
	inputSize: string;
	loading: boolean;
}

const props = defineProps<Props>();

// Depending on the mode (multiple/singe key column), the selected value can be a string or an array of strings
const state = reactive({
	selected: props.initialValue as string[] | string,
});

watch(
	() => props.initialValue,
	() => {
		state.selected =
			props.typeOptions?.multiKeyMatch === true ? props.initialValue : props.initialValue[0];
	},
);

const emit = defineEmits<{
	(event: 'matchingColumnsChanged', value: string[]): void;
}>();

const availableMatchingFields = computed<ResourceMapperField[]>(() => {
	return props.fieldsToMap.filter((field) => {
		return field.canBeUsedToMatch !== false;
	});
});

// Field label and description: Labels here use field words defined in parameter type options
const fieldLabel = computed<string>(() => {
	const pluralFieldWord =
		props.typeOptions?.fieldWords?.plural || locale.baseText('generic.fields');
	const singularFieldWord =
		props.typeOptions?.fieldWords?.singular || locale.baseText('generic.field');
	let fieldWord = props.typeOptions?.multiKeyMatch === true ? pluralFieldWord : singularFieldWord;
	fieldWord = fieldWord.charAt(0).toUpperCase() + fieldWord.slice(1);
	return locale.baseText('resourceMapper.columnsToMatchOn.label', {
		interpolate: {
			fieldWord,
		},
	});
});

const fieldDescription = computed<string>(() => {
	const pluralFieldWord =
		props.typeOptions?.fieldWords?.plural || locale.baseText('generic.fields');
	const singularFieldWord =
		props.typeOptions?.fieldWords?.singular || locale.baseText('generic.field');
	return locale.baseText('resourceMapper.columnsToMatchOn.description', {
		interpolate: {
			fieldWord: props.typeOptions?.multiKeyMatch === true ? pluralFieldWord : singularFieldWord,
		},
	});
});

function onSelectionChange(value: string | string[]) {
	if (props.typeOptions?.multiKeyMatch === true) {
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
			:label="fieldLabel"
			:bold="false"
			:required="true"
			:size="labelSize"
			color="text-dark"
		>
			<n8n-select
				:multiple="typeOptions?.multiKeyMatch === true"
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
	</div>
</template>
