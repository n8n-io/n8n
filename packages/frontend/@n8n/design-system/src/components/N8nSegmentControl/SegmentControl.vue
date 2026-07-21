<script lang="ts" setup generic="Value extends string | boolean">
import type { AcceptableValue } from 'reka-ui';
import { RadioGroupRoot } from 'reka-ui';
import { reactiveOmit } from '@vueuse/core';
import { computed, ref, useAttrs } from 'vue';

import type { SegmentControlSize } from './SegmentControl.types';
import SegmentControlItem from './SegmentControlItem.vue';

export type { SegmentControlSize };

defineOptions({ inheritAttrs: false });

interface SegmentOption {
	label: string;
	value: Value;
	disabled?: boolean;
	data?: Record<string, string | number | boolean | undefined>;
}

interface SegmentControlProps {
	modelValue?: Value;
	options?: SegmentOption[];
	size?: SegmentControlSize;
	disabled?: boolean;
	squareButtons?: boolean;
}

const props = withDefaults(defineProps<SegmentControlProps>(), {
	disabled: false,
	size: 'medium',
	squareButtons: false,
});

const emit = defineEmits<{
	'update:modelValue': [value: Value, e: MouseEvent];
}>();

defineSlots<{ option?: ((props: SegmentOption) => {}) | undefined }>();

const attrs = useAttrs();
const rootClass = computed(() => attrs.class);
const rootAttrs = computed(() => reactiveOmit(attrs, 'class'));

const serializedModelValue = computed(() =>
	props.modelValue === undefined ? undefined : String(props.modelValue),
);

const lastPointerEvent = ref<MouseEvent>();

function onItemClickCapture(event: MouseEvent) {
	const target = event.target;
	if (!(target instanceof HTMLElement)) return;
	if (target.closest('[role="radio"]')) {
		lastPointerEvent.value = event;
	}
}

function findOption(raw: AcceptableValue): SegmentOption | undefined {
	return props.options?.find((option) => String(option.value) === String(raw));
}

function onUpdate(raw: AcceptableValue) {
	const option = findOption(raw);
	if (!option || props.disabled || option.disabled) {
		return;
	}

	const event = lastPointerEvent.value ?? new MouseEvent('click');
	lastPointerEvent.value = undefined;
	emit('update:modelValue', option.value, event);
}
</script>

<template>
	<div
		:class="[
			'n8n-segment-control',
			$style.segmentControl,
			$style[size],
			disabled && $style.disabled,
			rootClass,
		]"
	>
		<RadioGroupRoot
			v-bind="rootAttrs"
			:model-value="serializedModelValue"
			:disabled="disabled"
			orientation="horizontal"
			:loop="true"
			:class="$style.group"
			@update:model-value="onUpdate"
			@click.capture="onItemClickCapture"
		>
			<SegmentControlItem
				v-for="option in options"
				:key="`${option.value}`"
				:label="option.label"
				:value="`${option.value}`"
				:disabled="disabled || option.disabled"
				:square="squareButtons"
			>
				<slot name="option" v-bind="option" />
			</SegmentControlItem>
		</RadioGroupRoot>
	</div>
</template>

<style lang="scss" module>
@use '../../css/mixins/input' as input-mixin;

.segmentControl {
	@include input-mixin.size-variables('medium');

	--segment-control--padding: var(--spacing--5xs);
	--segment-control--font-size: var(--font-size--2xs);
	--segment-control--item-padding: 0 var(--spacing--xs);

	display: inline-flex;
	align-items: stretch;
	height: var(--input--height);
	line-height: 1;
	vertical-align: middle;
	background-color: var(--color--foreground);
	padding: var(--segment-control--padding);
	border-radius: var(--radius--2xs);
}

.mini {
	@include input-mixin.size-variables('mini');

	--segment-control--font-size: var(--font-size--3xs);
	--segment-control--item-padding: 0 var(--spacing--2xs);
}

.small {
	@include input-mixin.size-variables('small');

	--segment-control--font-size: var(--font-size--3xs);
	--segment-control--item-padding: 0 var(--spacing--2xs);
}

.medium {
	@include input-mixin.size-variables('medium');

	--segment-control--font-size: var(--font-size--2xs);
	--segment-control--item-padding: 0 var(--spacing--xs);
}

.large {
	@include input-mixin.size-variables('large');

	--segment-control--font-size: var(--font-size--xs);
	--segment-control--item-padding: 0 var(--spacing--xs);
}

.xlarge {
	@include input-mixin.size-variables('xlarge');

	--segment-control--font-size: var(--font-size--sm);
	--segment-control--item-padding: 0 var(--spacing--sm);
}

.group {
	display: flex;
	align-items: stretch;
	flex: 1;
	width: 100%;
	gap: var(--spacing--5xs);
}

.disabled {
	cursor: not-allowed;
	opacity: 0.7;
}
</style>
