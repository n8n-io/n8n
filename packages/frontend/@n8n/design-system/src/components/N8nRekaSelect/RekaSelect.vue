<script setup lang="ts" generic="T extends string | number">
import {
	SelectContent,
	SelectItem,
	SelectItemIndicator,
	SelectItemText,
	SelectPortal,
	SelectRoot,
	SelectScrollDownButton,
	SelectScrollUpButton,
	SelectTrigger,
	SelectValue,
	SelectViewport,
} from 'reka-ui';
import { computed, ref, useTemplateRef } from 'vue';

import N8nIcon from '../N8nIcon';

export interface RekaSelectOption<V = string | number> {
	label: string;
	value: V;
	disabled?: boolean;
}

export interface Props<T extends string | number> {
	/**
	 * The list of options to display in the dropdown
	 */
	options: Array<RekaSelectOption<T>>;
	/**
	 * The currently selected value
	 */
	modelValue?: T;
	/**
	 * Whether the dropdown is disabled
	 */
	disabled?: boolean;
	/**
	 * Placeholder text when no value is selected
	 */
	placeholder?: string;
	/**
	 * Size variant
	 */
	size?: 'small' | 'medium' | 'large';
}

const props = withDefaults(defineProps<Props<T>>(), {
	modelValue: undefined,
	disabled: false,
	placeholder: 'Select an option',
	size: 'medium',
});

const emit = defineEmits<{
	'update:model-value': [value: T];
}>();

const selectedValue = computed({
	get: () => props.modelValue,
	set: (value: T) => emit('update:model-value', value),
});

const isOpen = ref(false);
const rootRef = useTemplateRef<HTMLElement>('rootRef');

const selectedLabel = computed(() => {
	const selected = props.options.find((opt) => opt.value === props.modelValue);
	return selected?.label ?? props.placeholder;
});

const open = () => {
	if (!props.disabled) {
		isOpen.value = true;
	}
};

const close = () => {
	isOpen.value = false;
};

const scrollIntoView = (options?: ScrollIntoViewOptions) => {
	rootRef.value?.scrollIntoView(options);
};

defineExpose({
	open,
	close,
	scrollIntoView,
});
</script>

<template>
	<div ref="rootRef">
		<SelectRoot
			v-model="selectedValue"
			:disabled="disabled"
			:open="isOpen"
			@update:open="isOpen = $event"
		>
			<SelectTrigger as-child>
				<slot name="trigger">
					<button
						:class="[$style.defaultTrigger, $style[size], { [$style.disabled]: disabled }]"
						:aria-label="placeholder"
						:data-test-id="`dropdown-trigger-${modelValue || 'empty'}`"
					>
						<span :class="$style.triggerText">
							<SelectValue :placeholder="placeholder">
								{{ selectedLabel }}
							</SelectValue>
						</span>
						<N8nIcon
							icon="chevron-down"
							:class="[$style.triggerIcon, { [$style.open]: isOpen }]"
							size="xsmall"
						/>
					</button>
				</slot>
			</SelectTrigger>

			<SelectPortal>
				<SelectContent
					:class="$style.content"
					:side-offset="8"
					align="start"
					position="popper"
					:avoid-collisions="true"
				>
					<SelectScrollUpButton :class="$style.scrollButton">
						<N8nIcon icon="chevron-up" size="xsmall" />
					</SelectScrollUpButton>

					<SelectViewport :class="$style.viewport">
						<SelectItem
							v-for="option in options"
							:key="option.value"
							:value="option.value"
							:disabled="option.disabled"
							:class="[$style.item, { [$style.itemDisabled]: option.disabled }]"
							:data-test-id="`dropdown-option-${option.value}`"
						>
							<SelectItemText :class="$style.itemText">
								{{ option.label }}
							</SelectItemText>
							<SelectItemIndicator :class="$style.itemIndicator">
								<N8nIcon icon="check" size="xsmall" />
							</SelectItemIndicator>
						</SelectItem>
					</SelectViewport>

					<SelectScrollDownButton :class="$style.scrollButton">
						<N8nIcon icon="chevron-down" size="xsmall" />
					</SelectScrollDownButton>
				</SelectContent>
			</SelectPortal>
		</SelectRoot>
	</div>
</template>

<style lang="scss" module>
// Trigger button styles
.defaultTrigger {
	all: unset;
	box-sizing: border-box;
	display: inline-flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--3xs);
	padding: 0;
	background: transparent;
	color: var(--color--text);
	font-size: var(--font-size--xs);
	font-family: var(--font-family);
	line-height: var(--line-height--md);
	cursor: pointer;
	min-width: 80px;
	transition: color 0.15s ease;

	&:hover:not(.disabled) {
		color: var(--color--text--shade-1);
	}

	&:focus-visible {
		outline: 2px solid var(--color--primary);
		outline-offset: 2px;
	}

	&.disabled {
		cursor: not-allowed;
		opacity: 0.5;
		color: var(--color--text--tint-2);
	}

	// Size variants
	&.small {
		font-size: var(--font-size--2xs);
		min-width: 60px;
		gap: var(--spacing--4xs);
	}

	&.medium {
		font-size: var(--font-size--xs);
		min-width: 80px;
		gap: var(--spacing--3xs);
	}

	&.large {
		font-size: var(--font-size--s);
		min-width: 100px;
		gap: var(--spacing--2xs);
	}
}

.triggerText {
	flex: 1;
	text-align: left;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.triggerIcon {
	flex-shrink: 0;
	transition: transform var(--animation--duration--spring--snappy) var(--animation--easing--spring);
	color: currentColor;

	&.open {
		transform: rotate(180deg);
	}
}

// Dropdown content
.content {
	min-width: max(var(--reka-select-trigger-width), 200px);
	max-width: 400px;
	max-height: 320px;
	background-color: var(--color--foreground--tint-2);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius--lg);
	box-shadow: var(--shadow--light);
	z-index: 9999;
	overflow: hidden;

	// When opening downwards (default)
	&[data-side='bottom'] {
		transform-origin: top center;

		&[data-state='open'] {
			animation: slideDown var(--animation--duration--spring) var(--animation--easing--spring);
		}

		&[data-state='closed'] {
			animation: slideDown var(--animation--duration--spring) var(--animation--easing--spring)
				reverse;
		}
	}

	// When opening upwards
	&[data-side='top'] {
		transform-origin: bottom center;

		&[data-state='open'] {
			animation: slideUp var(--animation--duration--spring) var(--animation--easing--spring);
		}

		&[data-state='closed'] {
			animation: slideUp var(--animation--duration--spring) var(--animation--easing--spring) reverse;
		}
	}
}

.viewport {
	padding: var(--spacing--3xs);
}

// Scroll buttons
.scrollButton {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 24px;
	background-color: var(--color--foreground--tint-2);
	color: var(--color--text--tint-1);
	cursor: pointer;
	border: none;

	&:hover {
		background-color: var(--color--background);
	}
}

// Dropdown items
.item {
	all: unset;
	box-sizing: border-box;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	padding: var(--select--option--padding, 0 var(--spacing--2xs));
	border-radius: var(--radius);
	cursor: pointer;
	user-select: none;
	font-size: var(--font-size--2xs);
	min-height: 28px;
	line-height: var(--select--option--line-height, 28px);
	color: var(--color--text);
	background-color: transparent;
	transition:
		background-color var(--animation--duration--spring) var(--animation--easing--spring),
		color var(--animation--duration--spring) var(--animation--easing--spring);
	position: relative;

	&:hover:not(.itemDisabled),
	&[data-highlighted]:not(.itemDisabled) {
		background-color: var(--color--background);
		color: var(--color--text--shade-1);
	}

	&:focus-visible {
		background-color: var(--color--background);
		color: var(--color--text--shade-1);
		outline: none;
	}

	&[data-state='checked'] {
		color: var(--color--text);
		font-weight: var(--font-weight--bold);
		background-color: transparent;

		&:hover,
		&[data-highlighted] {
			background-color: var(--color--background);
		}
	}

	&.itemDisabled {
		cursor: not-allowed;
		color: var(--color--text--tint-2);

		&:hover {
			background-color: transparent;
			color: var(--color--text--tint-2);
		}
	}
}

.itemText {
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.itemIndicator {
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--color--text);
	flex-shrink: 0;
}

// Animations
@keyframes slideDown {
	from {
		opacity: 0;
		transform: translateY(-4px) scaleY(0.95);
	}
	to {
		opacity: 1;
		transform: translateY(0) scaleY(1);
	}
}

@keyframes slideUp {
	from {
		opacity: 0;
		transform: translateY(4px) scaleY(0.95);
	}
	to {
		opacity: 1;
		transform: translateY(0) scaleY(1);
	}
}
</style>
