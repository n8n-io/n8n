<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';

import type { IFormInput } from '../../types';
import type { FormEventBus } from '../../utils';
import { createFormEventBus } from '../../utils';
import N8nFormInput from '../N8nFormInput';
import ResizeObserver from '../ResizeObserver';

export type FormInputsProps = {
	inputs?: IFormInput[];
	eventBus?: FormEventBus;
	columnView?: boolean;
	verticalSpacing?: '' | 'xs' | 's' | 'm' | 'l' | 'xl';
	teleported?: boolean;
};

type Value = string | number | boolean | null | undefined;

const props = withDefaults(defineProps<FormInputsProps>(), {
	inputs: () => [],
	eventBus: createFormEventBus,
	columnView: false,
	verticalSpacing: '',
	teleported: true,
});

const emit = defineEmits<{
	update: [value: { name: string; value: Value }];
	'update:modelValue': [value: Record<string, Value>];
	submit: [value: Record<string, Value>];
	ready: [value: boolean];
}>();

const showValidationWarnings = ref(false);
const values = reactive<Record<string, Value>>({});
const validity = ref<Record<string, boolean>>({});

const filteredInputs = computed(() => {
	return props.inputs.filter((input) =>
		typeof input.shouldDisplay === 'function' ? input.shouldDisplay(values) : true,
	);
});

const isReadyToSubmit = computed(() => {
	return Object.values(validity.value).every((valid) => !!valid);
});

watch(isReadyToSubmit, (ready) => {
	emit('ready', ready);
});

function onUpdateModelValue(name: string, value: Value) {
	values[name] = value;
	emit('update', { name, value });
	emit('update:modelValue', values);
}

function onValidate(name: string, isValid: boolean) {
	validity.value = {
		...validity.value,
		[name]: isValid,
	};
}

function getValues() {
	return { ...values };
}

defineExpose({ getValues });

function onSubmit() {
	showValidationWarnings.value = true;

	if (!isReadyToSubmit.value) {
		return;
	}

	const toSubmit = filteredInputs.value.reduce<Record<string, Value>>((valuesToSubmit, input) => {
		if (values[input.name]) {
			valuesToSubmit[input.name] = values[input.name];
		}
		return valuesToSubmit;
	}, {});

	emit('submit', toSubmit);
}

onMounted(() => {
	for (const input of props.inputs) {
		if ('initialValue' in input) {
			values[input.name] = input.initialValue;
		}
	}

	if (props.eventBus) {
		props.eventBus.on('submit', onSubmit);
	}
});
</script>

<template>
	<ResizeObserver :breakpoints="[{ bp: 'md', width: 500 }]">
		<template #default="{ bp }">
			<div :class="bp === 'md' || columnView ? $style.grid : $style.gridMulti">
				<div
					v-for="(input, index) in filteredInputs"
					:key="input.name"
					:class="{ [`mt-${verticalSpacing}`]: verticalSpacing && index > 0 }"
				>
					<n8n-text
						v-if="input.properties.type === 'info'"
						color="text-base"
						tag="div"
						:size="input.properties.labelSize"
						:align="input.properties.labelAlignment"
						class="form-text"
					>
						{{ input.properties.label }}
					</n8n-text>
					<N8nFormInput
						v-else
						v-bind="input.properties"
						:name="input.name"
						:label="input.properties.label || ''"
						:model-value="values[input.name]"
						:data-test-id="input.name"
						:show-validation-warnings="showValidationWarnings"
						:teleported="teleported"
						@update:model-value="(value: Value) => onUpdateModelValue(input.name, value)"
						@validate="(value: boolean) => onValidate(input.name, value)"
						@enter="onSubmit"
					/>
				</div>
			</div>
		</template>
	</ResizeObserver>
</template>

<style lang="scss" module>
.grid {
	display: grid;
	grid-row-gap: var(--spacing-s);
	grid-column-gap: var(--spacing-2xs);
}

.gridMulti {
	composes: grid;
	grid-template-columns: repeat(2, 1fr);
}
</style>
