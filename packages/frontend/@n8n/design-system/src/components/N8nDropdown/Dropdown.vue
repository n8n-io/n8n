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
	--dropdown--offset--slide-x: 0;
	--dropdown--offset--slide-y: 0;
	--dropdown--offset--origin-x: center;
	--dropdown--offset--origin-y: center;

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
	will-change: transform, opacity;
	transform-origin: var(--dropdown--offset--origin-x) var(--dropdown--offset--origin-y);
	animation-duration: var(--duration--snappy);
	animation-timing-function: var(--easing--ease-out);

	&[data-state='open'] {
		animation-name: dropdownIn;
	}

	&[data-state='closed'] {
		display: none;
	}
}

.content[data-state='open'][data-side='top'] {
	--dropdown--offset--slide-y: -2px;
	--dropdown--offset--origin-y: bottom;
}

.content[data-state='open'][data-side='bottom'] {
	--dropdown--offset--slide-y: 2px;
	--dropdown--offset--origin-y: top;
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

@keyframes dropdownIn {
	from {
		opacity: 0;
		transform: translate(var(--dropdown--offset--slide-x), var(--dropdown--offset--slide-y))
			scale(0.96);
	}
	to {
		opacity: 1;
		transform: translate(0, 0) scale(1);
	}
}
</style>
