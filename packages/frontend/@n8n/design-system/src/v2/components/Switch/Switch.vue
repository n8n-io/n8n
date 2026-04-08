<script setup lang="ts">
import { reactiveOmit, reactivePick } from '@vueuse/core';
import { Label, Primitive, SwitchRoot, SwitchThumb, useForwardProps } from 'reka-ui';
import { computed, useAttrs, useId } from 'vue';

import type { SwitchProps, SwitchSlots } from './Switch.types';

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<SwitchProps>(), {
	size: 'small',
});
const slots = defineSlots<SwitchSlots>();
const uuid = computed(() => props.id ?? useId());

const rootProps = useForwardProps(reactivePick(props, 'required', 'value', 'defaultValue'));

const modelValue = defineModel<boolean>({ default: undefined });

const attrs = useAttrs();
const primitiveClass = computed(() => attrs.class);
const rootAttrs = computed(() => reactiveOmit(attrs, ['class']));
</script>

<template>
	<Primitive
		:as
		:class="[$style.switch, $style[size], primitiveClass]"
		:data-disabled="disabled ? '' : undefined"
	>
		<SwitchRoot
			:id="uuid"
			v-bind="{ ...rootProps, ...rootAttrs }"
			v-model="modelValue"
			:name="name"
			:disabled="disabled"
			:class="$style.switchRoot"
		>
			<SwitchThumb :class="$style.switchThumb" />
		</SwitchRoot>
		<Label
			v-if="label || !!slots.label"
			:for="uuid"
			:class="$style.label"
			:data-disabled="disabled ? '' : undefined"
		>
			<slot name="label" :label="label">
				{{ label }}
			</slot>
		</Label>
	</Primitive>
</template>

<style lang="css" module>
.switch {
	display: inline-flex;
	flex-direction: row;
	align-items: center;
	gap: var(--spacing--2xs);
	cursor: pointer;

	&[data-disabled] {
		cursor: not-allowed;
		opacity: 0.6;
	}
}

.switchRoot {
	position: relative;
	box-sizing: content-box;
	padding: 0;
	margin: 0;
	background-color: var(--switch--color--background);
	border: 1px solid var(--switch--border-color);
	cursor: inherit;
	flex-shrink: 0;
	transition:
		background-color 0.15s ease,
		border-color 0.15s ease;

	&[data-state='checked'] {
		background-color: var(--switch--color--background--active);
		border-color: var(--switch--color--background--active);
	}

	&:focus-visible {
		box-shadow: 0 0 0 2px var(--color--secondary);
		outline: none;
		z-index: 1;
	}
}

.switchThumb {
	position: absolute;
	top: 50%;
	left: 2px;
	transform: translateY(-50%);
	display: block;
	background-color: var(--switch--toggle--color);
	border-radius: 50%;
	transition: left 0.15s ease;
	will-change: left;
	box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.label {
	flex: 1;
	font-size: var(--font-size--sm);
	line-height: 1.25;
	color: var(--color--text--shade-1);
	cursor: inherit;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;

	&[data-disabled] {
		color: var(--color--text--tint-1);
	}
}

/* Size: Small (for parameters panel) */
.small .switchRoot {
	width: 32px;
	height: 16px;
	border-radius: 48px;
}

.small .switchThumb {
	width: 12px;
	height: 12px;
}

.small .switchRoot[data-state='checked'] .switchThumb {
	left: calc(100% - 14px);
}

.small .label {
	font-size: var(--font-size--2xs);
}

/* Size: Large (for settings) */
.large .switchRoot {
	width: 40px;
	height: 20px;
	border-radius: 48px;
}

.large .switchThumb {
	width: 16px;
	height: 16px;
}

.large .switchRoot[data-state='checked'] .switchThumb {
	left: calc(100% - 18px);
}
</style>
