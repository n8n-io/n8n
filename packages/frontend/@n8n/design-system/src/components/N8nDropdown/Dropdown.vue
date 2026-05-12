<script setup lang="ts" generic="T extends string | number">
import {
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuPortal,
	DropdownMenuRoot,
	DropdownMenuTrigger,
} from 'reka-ui';
import { ref, useTemplateRef } from 'vue';

import N8nIcon from '../N8nIcon';

export interface N8nDropdownOption<V = string | number> {
	label: string;
	value: V;
	disabled?: boolean;
}

export interface Props<T extends string | number> {
	/**
	 * The list of options to display in the dropdown
	 */
	options: Array<N8nDropdownOption<T>>;
	/**
	 * Whether the dropdown is disabled
	 */
	disabled?: boolean;
	/**
	 * Placeholder text for the default trigger
	 */
	placeholder?: string;
	/**
	 * Size variant for the default trigger
	 */
	size?: 'small' | 'medium' | 'large';
}

const props = withDefaults(defineProps<Props<T>>(), {
	disabled: false,
	placeholder: 'Select an option',
	size: 'medium',
});

const emit = defineEmits<{
	select: [value: T];
	'update:open': [value: boolean];
}>();

const isOpen = ref(false);

const handleOpenChange = (value: boolean) => {
	isOpen.value = value;
	emit('update:open', value);
};
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

const handleSelect = (option: N8nDropdownOption<T>) => {
	if (!option.disabled) {
		emit('select', option.value);
		close();
	}
};

defineExpose({
	open,
	close,
	scrollIntoView,
});
</script>

<template>
	<div ref="rootRef">
		<DropdownMenuRoot :open="isOpen" @update:open="handleOpenChange">
			<DropdownMenuTrigger
				v-if="!$slots.trigger"
				:class="[$style.defaultTrigger, $style[size]]"
				:aria-label="placeholder"
				:disabled="disabled"
				:data-test-id="`dropdown-trigger`"
			>
				<span :class="$style.triggerText">{{ placeholder }}</span>
				<N8nIcon
					icon="chevron-down"
					:class="[$style.triggerIcon, { [$style.open]: isOpen }]"
					size="large"
				/>
			</DropdownMenuTrigger>
			<DropdownMenuTrigger v-else as-child :disabled="disabled">
				<slot name="trigger" />
			</DropdownMenuTrigger>

			<DropdownMenuPortal>
				<DropdownMenuContent
					:class="$style.content"
					:side-offset="8"
					align="start"
					:avoid-collisions="true"
				>
					<DropdownMenuItem
						v-for="option in options"
						:key="option.value"
						:disabled="option.disabled"
						:class="$style.item"
						:data-test-id="`dropdown-option-${option.value}`"
						@select="handleSelect(option)"
					>
						<span :class="$style.itemText">
							{{ option.label }}
						</span>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenuPortal>
		</DropdownMenuRoot>
	</div>
</template>

<style lang="scss" module>
@use '../../css/mixins/motion';

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
	transition: transform var(--animation--duration) var(--animation--easing);

	&.open {
		transform: rotate(180deg);
	}
}

.content {
	--animation--popover-in--translate-x: 0;
	--animation--popover-in--translate-y: 0;
	--dropdown--transform-origin-x: center;
	--dropdown--transform-origin-y: center;

	min-width: 200px;
	max-width: 400px;
	max-height: 320px;
	background-color: var(--color--foreground--tint-2);
	border: var(--border);
	border-radius: var(--radius--lg);
	box-shadow: var(--shadow--light);
	z-index: 9999;
	overflow: auto;
	padding: var(--spacing--3xs);
	transform-origin: var(--dropdown--transform-origin-x) var(--dropdown--transform-origin-y);

	&[data-state='open'] {
		--animation--popover-in--duration: var(--animation--duration);
		--animation--popover-in--easing: var(--animation--easing);

		@include motion.popover-in;
	}

	&[data-side='bottom'] {
		--animation--popover-in--translate-y: 2px;
		--dropdown--transform-origin-y: top;
	}

	&[data-side='top'] {
		--animation--popover-in--translate-y: -2px;
		--dropdown--transform-origin-y: bottom;
	}

	&[data-side='right'] {
		--animation--popover-in--translate-x: 2px;
		--dropdown--transform-origin-x: left;
	}

	&[data-side='left'] {
		--animation--popover-in--translate-x: -2px;
		--dropdown--transform-origin-x: right;
	}

	&[data-side='top'][data-align='start'],
	&[data-side='bottom'][data-align='start'] {
		--animation--popover-in--translate-x: -2px;
		--dropdown--transform-origin-x: left;
	}

	&[data-side='top'][data-align='end'],
	&[data-side='bottom'][data-align='end'] {
		--animation--popover-in--translate-x: 2px;
		--dropdown--transform-origin-x: right;
	}

	&[data-side='left'][data-align='start'],
	&[data-side='right'][data-align='start'] {
		--animation--popover-in--translate-y: -2px;
		--dropdown--transform-origin-y: top;
	}

	&[data-side='left'][data-align='end'],
	&[data-side='right'][data-align='end'] {
		--animation--popover-in--translate-y: 2px;
		--dropdown--transform-origin-y: bottom;
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
		background-color var(--animation--duration) var(--animation--easing),
		color var(--animation--duration) var(--animation--easing);

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
</style>
