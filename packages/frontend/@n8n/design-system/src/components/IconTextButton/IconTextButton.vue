<script setup lang="ts">
import { ref } from 'vue';

import type { IconSize } from '../../types/icon';
import N8nIcon from '../N8nIcon';
import type { IconName } from '../N8nIcon/icons';

interface Props {
	icon: IconName;
	iconSize?: IconSize;
	iconPosition?: 'left' | 'right';
	disabled?: boolean;
	active?: boolean;
}

withDefaults(defineProps<Props>(), {
	iconSize: 'medium',
	iconPosition: 'left',
	disabled: false,
	active: false,
});

defineEmits<{
	click: [];
}>();

const buttonRef = ref<HTMLButtonElement | null>(null);

defineExpose({
	buttonRef,
});
</script>

<template>
	<button
		ref="buttonRef"
		:class="[$style.button, { [$style.disabled]: disabled, [$style.active]: active }]"
		type="button"
		:disabled="disabled"
		@click="$emit('click')"
	>
		<N8nIcon v-if="iconPosition === 'left'" :icon="icon" :size="iconSize" />
		<slot />
		<N8nIcon v-if="iconPosition === 'right'" :icon="icon" :size="iconSize" />
	</button>
</template>

<style lang="scss" module>
.button {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	background: none;
	border: none;
	border-radius: var(--radius--lg);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	cursor: pointer;
	white-space: nowrap;
	transition:
		background-color 0.15s ease,
		color 0.15s ease;
	font-weight: var(--font-weight--medium);

	&:hover {
		background-color: var(--color--foreground--tint-1);
	}

	&:active,
	&.active {
		background-color: var(--color--foreground);
	}

	&.disabled {
		cursor: not-allowed;

		&:hover,
		&:active {
			background-color: transparent;
		}
	}
}
</style>
