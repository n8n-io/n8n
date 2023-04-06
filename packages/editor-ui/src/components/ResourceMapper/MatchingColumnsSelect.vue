<script setup lang="ts">
import { ResourceMapperFields, ResourceMapperTypeOptions } from 'n8n-workflow';
import { computed, getCurrentInstance, ref, watch } from 'vue';

export interface Props {
	initialValue: string[];
	fieldsToMap: ResourceMapperFields['fields'];
	typeOptions: ResourceMapperTypeOptions | undefined;
	labelSize: string;
	inputSize: string;
	loading: boolean;
}

const instance = getCurrentInstance();

const props = defineProps<Props>();

// Depending on the mode (multiple/singe key column), the selected value can be a string or an array of strings
const selected = ref([] as string[] | string);

watch(
	() => props.initialValue,
	() => {
		selected.value =
			props.typeOptions?.multiKeyMatch === true ? props.initialValue : props.initialValue[0];
		emitValueChanged();
	},
);

const emit = defineEmits<{
	(event: 'matchingColumnsChanged', value: string[]): void;
}>();

// Field label and description: Labels here use field words defined in parameter type options
const fieldLabel = computed<string>(() => {
	if (instance) {
		const pluralFieldWord =
			props.typeOptions?.fieldWords?.plural || instance?.proxy.$locale.baseText('generic.fields');
		const singularFieldWord =
			props.typeOptions?.fieldWords?.singular || instance?.proxy.$locale.baseText('generic.field');
		let fieldWord = props.typeOptions?.multiKeyMatch === true ? pluralFieldWord : singularFieldWord;
		fieldWord = fieldWord.charAt(0).toUpperCase() + fieldWord.slice(1);
		return instance?.proxy.$locale.baseText('resourceMapper.columnsToMatchOn.label', {
			interpolate: {
				fieldWord,
			},
		});
	}
	// This should indicate that something is wrong since instance should be defined at this point
	return '';
});

const fieldDescription = computed<string>(() => {
	if (instance) {
		const pluralFieldWord =
			props.typeOptions?.fieldWords?.plural || instance?.proxy.$locale.baseText('generic.fields');
		const singularFieldWord =
			props.typeOptions?.fieldWords?.singular || instance?.proxy.$locale.baseText('generic.field');
		return instance?.proxy.$locale.baseText('resourceMapper.columnsToMatchOn.description', {
			interpolate: {
				fieldWord: props.typeOptions?.multiKeyMatch === true ? pluralFieldWord : singularFieldWord,
			},
		});
	}
	return '';
});

function onSelectionChange(value: string | string[]) {
	if (props.typeOptions?.multiKeyMatch === true) {
		selected.value = value as string[];
	} else {
		selected.value = value as string;
	}
	emitValueChanged();
}

function emitValueChanged() {
	emit('matchingColumnsChanged', Array.isArray(selected.value) ? selected.value : [selected.value]);
}

defineExpose({
	selected,
});
</script>

<template>
	<div class="mt-2xs">
		<n8n-input-label
			:label="fieldLabel"
			:bold="false"
			:required="true"
			:size="labelSize"
			color="text-dark"
		>
			<n8n-select
				:multiple="typeOptions?.multiKeyMatch === true"
				:value="selected"
				:size="props.inputSize"
				:disabled="loading"
				@change="onSelectionChange"
			>
				<n8n-option v-for="field in fieldsToMap" :key="field.id" :value="field.id">
					{{ field.displayName }}
				</n8n-option>
			</n8n-select>
			<n8n-text size="small">
				{{ fieldDescription }}
			</n8n-text>
		</n8n-input-label>
	</div>
</template>
