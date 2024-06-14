<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import type { PropType } from 'vue';
import N8nFormInput from '../N8nFormInput';
import type { IFormInput, Validatable } from '../../types';
import ResizeObserver from '../ResizeObserver';
import type { EventBus } from '../../utils';
import { createEventBus } from '../../utils';

const props = defineProps({
	inputs: {
		type: Array as PropType<IFormInput[]>,
		default: (): IFormInput[] => [],
	},
	eventBus: {
		type: Object as PropType<EventBus>,
		default: createEventBus,
	},
	columnView: {
		type: Boolean,
		default: false,
	},
	verticalSpacing: {
		type: String,
		default: '',
		validator: (value: string): boolean => ['', 'xs', 's', 'm', 'm', 'l', 'xl'].includes(value),
	},
	teleported: {
		type: Boolean,
		default: true,
	},
	tagSize: {
		type: String as PropType<'small' | 'medium'>,
		default: 'small',
		validator: (value: string): boolean => ['small', 'medium'].includes(value),
	},
});

const emit = defineEmits({
	update: (_: { name: string; value: Validatable }) => true,
	'update:modelValue': (_: Record<string, Validatable>) => true,
	submit: (_: Record<string, Validatable>) => true,
	ready: (_: boolean) => true,
});

const showValidationWarnings = ref(false);
const values = reactive<Record<string, Validatable>>({});
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

function onUpdateModelValue(name: string, value: unknown) {
	values[name] = value as Validatable;
	emit('update', { name, value: value as Validatable });
	emit('update:modelValue', values);
}

function onValidate(name: string, isValid: boolean) {
	validity.value = {
		...validity.value,
		[name]: isValid,
	};
}

function onSubmit() {
	showValidationWarnings.value = true;

	if (!isReadyToSubmit.value) {
		return;
	}

	const toSubmit = filteredInputs.value.reduce<Record<string, Validatable>>(
		(valuesToSubmit, input) => {
			if (values[input.name]) {
				valuesToSubmit[input.name] = values[input.name];
			}
			return valuesToSubmit;
		},
		{},
	);

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
						:tag-size="tagSize"
						@update:model-value="(value) => onUpdateModelValue(input.name, value)"
						@validate="(value) => onValidate(input.name, value)"
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
