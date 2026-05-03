<script setup lang="ts">
import { N8nIcon, N8nText } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system/components/N8nIcon';

defineProps<{
	icon?: IconName;
	disabled?: boolean;
}>();

const emit = defineEmits<{
	click: [event: MouseEvent];
}>();
</script>

<template>
	<button type="button" :class="$style.chip" :disabled="disabled" @click="emit('click', $event)">
		<span v-if="icon || $slots.icon" :class="$style.iconWrapper">
			<slot name="icon">
				<N8nIcon v-if="icon" :icon="icon" :size="16" :class="$style.icon" />
			</slot>
		</span>
		<N8nText size="small" color="text-dark" :class="$style.text">
			<slot />
		</N8nText>
	</button>
</template>

<style module lang="scss">
.chip {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
	height: var(--height--md);
	padding: var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--full);
	background: light-dark(var(--background--surface), var(--background--subtle));
	box-shadow: var(--shadow--xs);
	font-family: inherit;
	cursor: pointer;
}

.chip:hover {
	background-color: var(--background--hover);
}

.chip:disabled {
	cursor: not-allowed;
	opacity: 0.6;
}

.iconWrapper {
	display: inline-flex;
	align-items: center;
	flex-shrink: 0;
}

.icon {
	color: var(--text-color--subtler);
}

.text {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	padding-right: var(--spacing--4xs);
}
</style>
