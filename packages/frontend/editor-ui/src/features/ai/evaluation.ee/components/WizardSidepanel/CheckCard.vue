<script setup lang="ts">
import { N8nIcon, N8nText } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';

import CheckHeader from './CheckHeader.vue';

defineProps<{
	icon: IconName;
	iconBg?: string;
	iconFg?: string;
	title: string;
	description?: string;
	badge?: string;
	badgeIcon?: IconName;
	selected?: boolean;
	readonly?: boolean;
	removable?: boolean;
	removeAriaLabel?: string;
	removeTestId?: string;
}>();

defineEmits<{
	toggle: [];
	remove: [];
}>();
</script>

<template>
	<div
		:class="[$style.card, selected ? $style.cardSelected : null]"
		:role="readonly ? undefined : 'button'"
		:tabindex="readonly ? undefined : 0"
		@click="!readonly && $emit('toggle')"
		@keydown.enter.self.prevent="!readonly && $emit('toggle')"
		@keydown.space.self.prevent="!readonly && $emit('toggle')"
	>
		<CheckHeader
			:icon="icon"
			:icon-bg="iconBg"
			:icon-fg="iconFg"
			:title="title"
			:badge="badge"
			:badge-icon="badgeIcon"
		>
			<template v-if="description" #description>
				<N8nText size="small" color="text-base" :class="$style.description">
					{{ description }}
				</N8nText>
			</template>
		</CheckHeader>
		<button
			v-if="removable"
			type="button"
			:class="$style.removeButton"
			:aria-label="removeAriaLabel"
			:data-test-id="removeTestId"
			@click.stop="$emit('remove')"
		>
			<N8nIcon icon="trash-2" size="small" />
		</button>
		<span v-else-if="selected && !readonly" :class="$style.selectedMark" aria-hidden="true">
			<N8nIcon icon="check" size="small" />
		</span>
		<div v-if="$slots.default" :class="$style.slotContainer" @click.stop @keydown.stop>
			<slot />
		</div>
	</div>
</template>

<style module lang="scss">
.card {
	display: grid;
	grid-template-columns: 1fr auto;
	align-items: flex-start;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--xs);
	background-color: var(--background--surface);
	cursor: pointer;
	transition:
		border-color var(--duration--snappy) ease,
		box-shadow var(--duration--snappy) ease;
	outline: none;

	&:hover,
	&:focus-visible {
		border-color: var(--border-color--strong);
	}
}

.cardSelected,
.cardSelected:hover,
.cardSelected:focus-visible {
	border-color: var(--background--brand);
	box-shadow: 0 0 0 1px var(--background--brand);
}

.description {
	display: block;
	line-height: 1.4;
}

.selectedMark {
	display: inline-flex;
	align-items: flex-start;
	justify-content: center;
	color: var(--background--brand);
	padding-top: 2px;
}

.removeButton {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	background: transparent;
	border: none;
	padding: var(--spacing--3xs);
	margin: calc(-1 * var(--spacing--3xs));
	border-radius: var(--border-radius--base);
	color: var(--color--text--tint-1);
	cursor: pointer;

	&:hover,
	&:focus-visible {
		color: var(--color--danger);
		background-color: var(--background--subtle);
	}

	&:focus-visible {
		outline: 1px solid var(--focus--border-color);
	}
}

.slotContainer {
	grid-column: 1 / -1;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding-top: var(--spacing--xs);
	border-top: var(--border);
	cursor: default;
}
</style>
