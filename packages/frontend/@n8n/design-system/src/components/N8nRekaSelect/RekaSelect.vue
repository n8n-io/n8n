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
			<SelectTrigger
				v-if="!$slots.trigger"
				:class="[$style.defaultTrigger, $style[size]]"
				:aria-label="placeholder"
				:data-test-id="`dropdown-trigger-${modelValue || 'empty'}`"
			>
				<SelectValue :placeholder="placeholder" :class="$style.triggerText" />
				<N8nIcon
					icon="chevron-down"
					:class="[$style.triggerIcon, { [$style.open]: isOpen }]"
					size="large"
				/>
			</SelectTrigger>
			<SelectTrigger v-else as-child>
				<slot name="trigger" />
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
						<N8nIcon icon="chevron-up" size="large" />
					</SelectScrollUpButton>

					<SelectViewport :class="$style.viewport">
						<SelectItem
							v-for="option in options"
							:key="option.value"
							:value="option.value"
							:disabled="option.disabled"
							:class="$style.item"
							:data-test-id="`dropdown-option-${option.value}`"
						>
							<SelectItemText :class="$style.itemText">
								{{ option.label }}
							</SelectItemText>
							<SelectItemIndicator :class="$style.itemIndicator">
								<N8nIcon icon="check" size="large" />
							</SelectItemIndicator>
						</SelectItem>
					</SelectViewport>

					<SelectScrollDownButton :class="$style.scrollButton">
						<N8nIcon icon="chevron-down" size="large" />
					</SelectScrollDownButton>
				</SelectContent>
			</SelectPortal>
		</SelectRoot>
	</div>
</template>

<style lang="scss" module>
.defaultTrigger {
	display: inline-flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	padding: 0 var(--spacing--2xs);
	background-color: var(--color--foreground--tint-2);
	border: var(--border);
	border-radius: var(--radius);
	color: var(--color--text);
	font-family: var(--font-family);
	line-height: var(--line-height--md);
	gap: var(--spacing--3xs);

	&:hover {
		border-color: var(--color--foreground--shade-1);
	}

	&:focus {
		outline: none;
		border-color: var(--color--secondary);
	}

	&[data-placeholder] {
		color: var(--color--text--tint-1);
	}

	&[data-disabled] {
		cursor: not-allowed;
		background-color: var(--color--background--shade-1);
		opacity: 0.6;
	}

	&.small {
		height: 30px;
		font-size: var(--font-size--2xs);
		padding: 0 var(--spacing--3xs);
	}

	&.medium {
		height: 36px;
		font-size: var(--font-size--xs);
	}

	&.large {
		height: 42px;
		font-size: var(--font-size--sm);
	}
}

.triggerText {
	flex: 1;
	text-align: left;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-weight: var(--font-weight--regular);
}

.triggerIcon {
	color: var(--color--text--tint-1);
	transition: transform var(--animation--duration--spring) var(--animation--easing--spring);

	&.open {
		transform: rotate(180deg);
	}
}

.content {
	min-width: max(var(--reka-select-trigger-width), 200px);
	max-width: 400px;
	max-height: 320px;
	background-color: var(--color--foreground--tint-2);
	border: var(--border);
	border-radius: var(--radius--lg);
	box-shadow: var(--shadow--light);
	z-index: 9999;
	overflow: hidden;

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

.item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	padding: 0 var(--spacing--2xs);
	border-radius: var(--radius);
	cursor: pointer;
	user-select: none;
	font-size: var(--font-size--2xs);
	min-height: 28px;
	line-height: 28px;
	color: var(--color--text);
	transition:
		background-color var(--animation--duration--spring) var(--animation--easing--spring),
		color var(--animation--duration--spring) var(--animation--easing--spring);

	&[data-highlighted]:not([data-disabled]) {
		background-color: var(--color--background);
		color: var(--color--text--shade-1);
		outline: none;
	}

	&[data-disabled] {
		cursor: not-allowed;
		color: var(--color--text--tint-2);
		pointer-events: none;
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
	color: var(--color--text--tint-1);
	flex-shrink: 0;
}

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
