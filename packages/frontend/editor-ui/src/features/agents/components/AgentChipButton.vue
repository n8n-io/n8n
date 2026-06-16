<script setup lang="ts">
import { N8nIcon, N8nText } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system/components/N8nIcon';

const props = withDefaults(
	defineProps<{
		icon?: IconName;
		disabled?: boolean;
		variant?: 'default' | 'suggestion';
		active?: boolean;
	}>(),
	{
		disabled: false,
		variant: 'default',
		active: false,
	},
);

defineSlots<{
	icon?: () => unknown;
	default?: () => unknown;
}>();

const emit = defineEmits<{
	click: [event: MouseEvent];
}>();
</script>

<template>
	<button
		type="button"
		:class="[
			$style.chip,
			props.variant === 'suggestion' ? $style.suggestion : $style.default,
			{ [$style.active]: props.active },
		]"
		:disabled="props.disabled"
		@click="emit('click', $event)"
	>
		<span v-if="props.icon || $slots.icon" :class="$style.iconWrapper">
			<slot name="icon">
				<N8nIcon
					v-if="props.icon"
					:icon="props.icon"
					:size="16"
					:class="[$style.icon, { [$style.suggestionIcon]: props.variant === 'suggestion' }]"
				/>
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

.default:hover {
	background-color: var(--background--hover);
}

.chip:disabled {
	cursor: not-allowed;
	opacity: 0.6;
}

.suggestion {
	gap: var(--spacing--4xs);
	height: auto;
	padding: var(--spacing--3xs) var(--spacing--xs);
	color: var(--text-color--subtle);
	font-family: var(--font-family);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--sm);
	animation: suggestionSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
	transition:
		border-color 0.15s ease,
		background-color 0.15s ease,
		color 0.15s ease,
		box-shadow 0.15s ease,
		transform 0.15s ease;
}

.suggestion:hover,
.suggestion:focus-visible,
.suggestion.active {
	color: color-mix(in srgb, var(--background--brand) 68%, var(--text-color));
	border-color: color-mix(in srgb, var(--background--brand) 28%, var(--border-color--subtle));
	background: color-mix(in srgb, var(--background--brand) 12%, var(--background--hover));
	box-shadow: var(--shadow--xs);
	transform: translateY(-1px);
	outline-color: var(--focus--border-color);
}

.suggestion:active {
	transform: translateY(0);
	box-shadow: none;
}

.iconWrapper {
	display: inline-flex;
	align-items: center;
	flex-shrink: 0;
}

.icon {
	color: var(--text-color--subtler);
}

.suggestionIcon {
	opacity: 0.7;
	flex-shrink: 0;
	transition: opacity 0.15s ease;
}

.suggestion:hover .suggestionIcon,
.suggestion:focus-visible .suggestionIcon,
.suggestion.active .suggestionIcon {
	opacity: 1;
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

.suggestion .text {
	color: inherit;
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--normal);
	line-height: var(--line-height--sm);
	padding-right: 0;
}

@keyframes suggestionSlideIn {
	from {
		opacity: 0;
		transform: translateY(6px);
	}

	to {
		opacity: 1;
		transform: translateY(0);
	}
}
</style>
