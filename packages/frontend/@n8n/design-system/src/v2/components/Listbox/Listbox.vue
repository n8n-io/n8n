<script setup lang="ts">
import { reactiveOmit, reactivePick } from '@vueuse/core';
import { computed, provide, ref, toRef, useAttrs } from 'vue';

import { listboxContextKey } from './listbox-context';
import type { ListboxEmits, ListboxProps, ListboxSlots } from './Listbox.types';
import { ListboxContent, ListboxRoot, useForwardProps } from './reka-ui';

defineOptions({ inheritAttrs: false });

const attrs = useAttrs();
const rootClass = computed(() => attrs.class);
const rootAttrs = computed(() => reactiveOmit(attrs, ['class']));

const props = withDefaults(defineProps<Omit<ListboxProps, 'modelValue'>>(), {
	orientation: 'vertical',
	highlightOnHover: true,
	disabled: false,
	size: 'default',
	variant: 'boxed',
	maxHeight: '360px',
});

const emit = defineEmits<ListboxEmits>();
defineSlots<ListboxSlots>();

const modelValue = defineModel<ListboxProps['modelValue']>();

const openMenuCount = ref(0);
const isAnyMenuOpen = computed(() => openMenuCount.value > 0);
const isKeyboardNavigating = ref(false);

// Single-select defaults to replace (click keeps selection). Multi-select defaults to
// toggle (click adds/removes). Reka's own default is always toggle, which clears
// single selection on a second click.
const resolvedSelectionBehavior = computed(() => {
	if (props.selectionBehavior) {
		return props.selectionBehavior;
	}

	return props.multiple ? 'toggle' : 'replace';
});

provide(listboxContextKey, {
	size: toRef(props, 'size'),
	variant: toRef(props, 'variant'),
	isAnyMenuOpen,
	isKeyboardNavigating,
	registerMenuOpen: () => {
		openMenuCount.value += 1;
	},
	registerMenuClose: () => {
		openMenuCount.value = Math.max(0, openMenuCount.value - 1);
	},
});

const rootProps = useForwardProps(
	reactivePick(
		props,
		'disabled',
		'orientation',
		'multiple',
		'dir',
		'by',
		'name',
		'required',
		'defaultValue',
	),
);

function onKeydown(event: KeyboardEvent) {
	if (
		event.key === 'ArrowDown' ||
		event.key === 'ArrowUp' ||
		event.key === 'Home' ||
		event.key === 'End' ||
		event.key === 'PageDown' ||
		event.key === 'PageUp'
	) {
		isKeyboardNavigating.value = true;
	}
}

function onPointerMove() {
	if (isKeyboardNavigating.value) {
		isKeyboardNavigating.value = false;
	}
}
</script>

<template>
	<ListboxRoot
		v-bind="{ ...rootProps, ...rootAttrs }"
		v-model="modelValue"
		:selection-behavior="resolvedSelectionBehavior"
		:highlight-on-hover="highlightOnHover && !isAnyMenuOpen && !isKeyboardNavigating"
		:class="[$style.root, $style[size], $style[variant], rootClass]"
		data-test-id="listbox"
		@keydown="onKeydown"
		@pointermove="onPointerMove"
		@highlight="emit('highlight', $event)"
		@entry-focus="emit('entryFocus', $event)"
		@leave="emit('leave', $event)"
	>
		<ListboxContent
			:class="[
				$style.content,
				{ [$style.isFrozen]: isAnyMenuOpen, [$style.contentFlush]: variant === 'flush' },
			]"
			:style="{ maxHeight }"
			data-test-id="listbox-content"
		>
			<slot
				name="content"
				:is-frozen="isAnyMenuOpen"
				:ui="{ root: $style.root, content: $style.content, isFrozen: $style.isFrozen }"
			>
				<slot
					:is-frozen="isAnyMenuOpen"
					:ui="{ root: $style.root, content: $style.content, isFrozen: $style.isFrozen }"
				/>
			</slot>
		</ListboxContent>
	</ListboxRoot>
</template>

<style module>
.root {
	width: 100%;
	overflow: clip;
}

.boxed {
	border: var(--border-width) solid var(--border-color--subtle);
	border-radius: var(--radius);
	background: var(--background--surface);
}

.flush {
	border: none;
	border-radius: 0;
	background: transparent;
	overflow: visible;
	--listbox-flush-highlight-inset-inline: var(--spacing--md);
	--listbox-flush-highlight-inset-block: var(--spacing--2xs);
}

.content {
	overflow-y: auto;
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
	outline: none;
}

.contentFlush {
	--_inset-x: var(--listbox-flush-highlight-inset-inline, var(--spacing--md));
	--_inset-y: var(--listbox-flush-highlight-inset-block, var(--spacing--2xs));
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	/* Expand so rounded highlights can bleed while labels stay content-aligned */
	width: calc(100% + 2 * var(--_inset-x));
	margin-inline: calc(-1 * var(--_inset-x));
	padding-inline: var(--_inset-x);
	padding-block: var(--_inset-y);
	box-sizing: border-box;
}

.isFrozen {
	pointer-events: none;
}

.small {
	--listbox-row-min-height: var(--spacing--2xl);
	--listbox-row-padding-block: var(--spacing--2xs);
	--listbox-row-padding-inline: var(--spacing--sm);
	--listbox-label-font-size: var(--font-size--sm);
	--listbox-description-font-size: var(--font-size--2xs);
	--listbox-label-line-height: var(--line-height--md);
	--listbox-description-line-height: var(--line-height--sm);
}

.default {
	--listbox-row-min-height: var(--spacing--3xl);
	--listbox-row-padding-block: var(--spacing--sm);
	--listbox-row-padding-inline: var(--spacing--md);
	--listbox-label-font-size: var(--font-size--sm);
	--listbox-description-font-size: var(--font-size--xs);
	--listbox-label-line-height: var(--line-height--md);
	--listbox-description-line-height: var(--line-height--sm);
}

.medium {
	--listbox-row-min-height: var(--spacing--4xl);
	--listbox-row-padding-block: var(--spacing--sm);
	--listbox-row-padding-inline: var(--spacing--md);
	--listbox-label-font-size: var(--font-size--md);
	--listbox-description-font-size: var(--font-size--sm);
	--listbox-label-line-height: var(--line-height--lg);
	--listbox-description-line-height: var(--line-height--md);
}
</style>
