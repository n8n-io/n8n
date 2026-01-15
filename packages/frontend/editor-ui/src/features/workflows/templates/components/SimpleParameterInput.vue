<script setup lang="ts">
import { computed } from 'vue';
import type { INodeProperties, INodePropertyOptions, NodeParameterValueType } from 'n8n-workflow';
import { N8nInput, N8nInputLabel, N8nSelect, N8nOption, N8nInputNumber } from '@n8n/design-system';
import { ElSwitch } from 'element-plus';

const props = defineProps<{
	parameter: INodeProperties;
	value: NodeParameterValueType;
}>();

const emit = defineEmits<{
	'update:value': [value: NodeParameterValueType];
}>();

const displayName = computed(() => props.parameter.displayName);
const description = computed(() => props.parameter.description);
const placeholder = computed(() => props.parameter.placeholder ?? '');

const isString = computed(() => props.parameter.type === 'string');
const isNumber = computed(() => props.parameter.type === 'number');
const isBoolean = computed(() => props.parameter.type === 'boolean');
const isOptions = computed(() => props.parameter.type === 'options');
const isMultiOptions = computed(() => props.parameter.type === 'multiOptions');

const options = computed(() => {
	if (!props.parameter.options) return [];
	return props.parameter.options
		.filter((opt): opt is INodePropertyOptions => 'value' in opt && 'name' in opt)
		.map((opt) => ({
			label: opt.name,
			value: opt.value,
		}));
});

const stringValue = computed({
	get: () => String(props.value ?? ''),
	set: (val) => emit('update:value', val),
});

const numberValue = computed({
	get: () => Number(props.value ?? 0),
	set: (val) => emit('update:value', val),
});

const booleanValue = computed({
	get: () => Boolean(props.value),
	set: (val) => emit('update:value', val),
});
</script>

<template>
	<div :class="$style.inputContainer">
		<N8nInputLabel :label="displayName" :tooltip-text="description" :required="parameter.required">
			<N8nInput
				v-if="isString"
				v-model="stringValue"
				:placeholder="placeholder"
				data-test-id="simple-parameter-input-string"
			/>

			<N8nInputNumber
				v-else-if="isNumber"
				v-model="numberValue"
				:placeholder="placeholder"
				data-test-id="simple-parameter-input-number"
			/>

			<ElSwitch
				v-else-if="isBoolean"
				v-model="booleanValue"
				data-test-id="simple-parameter-input-boolean"
			/>

			<N8nSelect
				v-else-if="isOptions"
				:model-value="value"
				:placeholder="placeholder"
				data-test-id="simple-parameter-input-options"
				@update:model-value="emit('update:value', $event)"
			>
				<N8nOption
					v-for="option in options"
					:key="String(option.value)"
					:value="option.value"
					:label="option.label"
				/>
			</N8nSelect>

			<N8nSelect
				v-else-if="isMultiOptions"
				:model-value="value"
				:placeholder="placeholder"
				multiple
				data-test-id="simple-parameter-input-multioptions"
				@update:model-value="emit('update:value', $event)"
			>
				<N8nOption
					v-for="option in options"
					:key="String(option.value)"
					:value="option.value"
					:label="option.label"
				/>
			</N8nSelect>
		</N8nInputLabel>
	</div>
</template>

<style lang="scss" module>
.inputContainer {
	width: 100%;
}
</style>
