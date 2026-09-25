<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core';
import { computed, inject, onBeforeUnmount, useAttrs, useCssModule, watch } from 'vue';
import type { StyleValue } from 'vue';

import { listboxContextKey } from './listbox-context';
import type { ListboxItemEmits, ListboxItemProps, ListboxItemSlots } from './Listbox.types';
import ListboxItemDefault from './ListboxItemDefault.vue';
import { ListboxItem as RekaListboxItem } from './reka-ui';

defineOptions({ inheritAttrs: false });

const props = defineProps<Omit<ListboxItemProps, 'menuOpen'>>();
const emit = defineEmits<ListboxItemEmits>();
const slots = defineSlots<ListboxItemSlots>();
const attrs = useAttrs();

const menuOpen = defineModel<boolean>('menuOpen', { default: false });
const listbox = inject(listboxContextKey, null);
const $style = useCssModule();
const isHoverSuppressed = computed(() => listbox?.isKeyboardNavigating.value ?? false);
const isFlush = computed(() => listbox?.variant.value === 'flush');

/*
	ListboxVirtualizer clones this component and passes absolute positioning via
	fallthrough attrs. Those must land on the row (outer root), while option attrs
	like data-index stay on the Reka option for keyboard/typeahead.
*/
const rowStyle = computed<StyleValue | undefined>(() => attrs.style as StyleValue | undefined);
const optionAttrs = computed(() => reactiveOmit(attrs, 'style'));

const slotUi = {
	row: $style.row,
	option: $style.option,
	trailing: $style.trailing,
};

watch(menuOpen, (open, previous) => {
	if (!listbox) {
		return;
	}

	if (open && !previous) {
		listbox.registerMenuOpen();
		return;
	}

	if (!open && previous) {
		listbox.registerMenuClose();
	}
});

onBeforeUnmount(() => {
	if (menuOpen.value) {
		listbox?.registerMenuClose();
	}
});

function setMenuOpen(open: boolean) {
	menuOpen.value = open;
}
</script>

<template>
	<div
		:class="{
			[$style.row]: true,
			[$style.rowFlush]: isFlush,
			[$style.isDisabled]: props.disabled,
			[$style.isMenuOpen]: menuOpen,
			[$style.isHoverSuppressed]: isHoverSuppressed,
		}"
		:style="rowStyle"
		data-test-id="listbox-item"
	>
		<span v-if="isFlush" :class="$style.highlight" aria-hidden="true" />
		<!--
			Padding lives on the option so the full visual item is the selection
			hit-target. Trailing overlays as a sibling (not nested in the Reka option)
			so dropdown menus are not remounted by highlight changes.
		-->
		<RekaListboxItem
			:value="props.value"
			:disabled="props.disabled"
			:class="$style.option"
			data-test-id="listbox-option"
			v-bind="optionAttrs"
			@select="emit('select', $event)"
		>
			<slot
				:label="props.label"
				:description="props.description"
				:disabled="props.disabled"
				:ui="slotUi"
			>
				<ListboxItemDefault
					:label="props.label"
					:description="props.description"
					:disabled="props.disabled"
				>
					<template v-if="!!slots.leading" #leading="leadingProps">
						<slot name="leading" v-bind="leadingProps" />
					</template>
					<template v-if="!!slots.label" #label="labelProps">
						<slot name="label" v-bind="labelProps" />
					</template>
					<template v-if="!!slots.description" #description="descriptionProps">
						<slot name="description" v-bind="descriptionProps" />
					</template>
				</ListboxItemDefault>
			</slot>
		</RekaListboxItem>

		<div
			v-if="!!slots.trailing"
			:class="$style.trailing"
			data-test-id="listbox-item-trailing"
			@click.stop
			@keydown.stop
			@pointerdown.stop
		>
			<slot name="trailing" :menu-open="menuOpen" :set-menu-open="setMenuOpen" :ui="slotUi" />
		</div>
	</div>
</template>

<style module>
.row {
	position: relative;
	width: 100%;
	box-sizing: border-box;
	border-bottom: var(--border-width) solid var(--border-color--subtle);
	cursor: pointer;

	&:last-child {
		border-bottom: none;
	}

	&:has([data-disabled]) {
		cursor: default;
	}

	&:not(.rowFlush):not(.isHoverSuppressed):hover,
	&:not(.rowFlush):has([data-highlighted]),
	&:not(.rowFlush):has(:focus-visible),
	&:not(.rowFlush).isMenuOpen {
		background-color: var(--background--hover, var(--color--background--light-2));
	}

	&:not(.rowFlush):has([data-state='checked']),
	&:not(.rowFlush):has([data-state='checked']):not(.isHoverSuppressed):hover,
	&:not(.rowFlush):has([data-state='checked']):has([data-highlighted]),
	&:not(.rowFlush).isMenuOpen:has([data-state='checked']) {
		background-color: var(--background--active, var(--color--background--light-1));
	}

	/* Alpha hover/active backgrounds stack with the divider and look darker — clear both edges */
	&:not(.rowFlush):not(.isHoverSuppressed):hover,
	&:not(.rowFlush):has([data-highlighted]),
	&:not(.rowFlush):has(:focus-visible),
	&:not(.rowFlush).isMenuOpen,
	&:not(.rowFlush):has([data-state='checked']),
	&:not(.rowFlush):has(+ .row:not(.isHoverSuppressed):hover),
	&:not(.rowFlush):has(+ .row:has([data-highlighted])),
	&:not(.rowFlush):has(+ .row:has(:focus-visible)),
	&:not(.rowFlush):has(+ .row.isMenuOpen),
	&:not(.rowFlush):has(+ .row:has([data-state='checked'])) {
		border-bottom-color: transparent;
	}
}

.rowFlush {
	isolation: isolate;
	border-bottom: none;
	background: transparent;
}

.highlight {
	position: absolute;
	z-index: 0;
	inset-block: calc(-1 * var(--listbox-flush-highlight-inset-block, var(--spacing--2xs)));
	inset-inline: calc(-1 * var(--listbox-flush-highlight-inset-inline, var(--spacing--md)));
	border-radius: var(--radius);
	background-color: var(--background--hover, var(--color--background--light-2));
	opacity: 0;
	pointer-events: none;
}

.rowFlush:not(.isHoverSuppressed):hover .highlight,
.rowFlush:has([data-highlighted]) .highlight,
.rowFlush:has(:focus-visible) .highlight,
.rowFlush.isMenuOpen .highlight {
	opacity: 1;
}

.rowFlush:has([data-state='checked']) .highlight,
.rowFlush:has([data-state='checked']):not(.isHoverSuppressed):hover .highlight,
.rowFlush:has([data-state='checked']):has([data-highlighted]) .highlight,
.rowFlush.isMenuOpen:has([data-state='checked']) .highlight {
	opacity: 1;
	background-color: var(--background--active, var(--color--background--light-1));
}

.option {
	position: relative;
	z-index: 1;
	outline: none;
	min-width: 0;
	display: flex;
	align-items: center;
	box-sizing: border-box;
	width: 100%;
	min-height: var(--listbox-row-min-height, var(--spacing--3xl));
	padding: var(--listbox-row-padding-block, var(--spacing--sm))
		var(--listbox-row-padding-inline, var(--spacing--md));
	cursor: inherit;
}

.rowFlush .option {
	/* Expand the hit-target to match the rounded highlight surface */
	margin-block: calc(-1 * var(--listbox-flush-highlight-inset-block, var(--spacing--2xs)));
	margin-inline: calc(-1 * var(--listbox-flush-highlight-inset-inline, var(--spacing--md)));
	padding-block: calc(
		var(--listbox-row-padding-block, var(--spacing--sm)) +
			var(--listbox-flush-highlight-inset-block, var(--spacing--2xs))
	);
	padding-inline: var(--listbox-flush-highlight-inset-inline, var(--spacing--md));
	width: auto;
}

/* Reserve space so labels don't sit under the overlaid trailing actions */
.row:has(.trailing) .option {
	padding-inline-end: calc(
		var(--listbox-row-padding-inline, var(--spacing--md)) + var(--spacing--2xl) + var(--spacing--sm)
	);
}

.rowFlush:has(.trailing) .option {
	padding-inline-end: calc(
		var(--listbox-flush-highlight-inset-inline, var(--spacing--md)) + var(--spacing--2xl) +
			var(--spacing--sm)
	);
}

.isDisabled {
	pointer-events: none;
	opacity: 0.6;
	cursor: default;
}

/*
	Trailing overlays the option so the option stays full-width (and fully clickable).
	When hidden, pointer-events are off so selection clicks reach the option underneath.
*/
.trailing {
	position: absolute;
	z-index: 2;
	inset-block: 0;
	inset-inline-end: 0;
	display: flex;
	justify-content: flex-end;
	align-items: center;
	gap: var(--spacing--2xs);
	box-sizing: border-box;
	padding-block: var(--listbox-row-padding-block, var(--spacing--sm));
	padding-inline-end: var(--listbox-row-padding-inline, var(--spacing--md));
	pointer-events: none;
	opacity: 0;
}

.rowFlush .trailing {
	inset-block: calc(-1 * var(--listbox-flush-highlight-inset-block, var(--spacing--2xs)));
	inset-inline-end: calc(-1 * var(--listbox-flush-highlight-inset-inline, var(--spacing--md)));
	padding-block: calc(
		var(--listbox-row-padding-block, var(--spacing--sm)) +
			var(--listbox-flush-highlight-inset-block, var(--spacing--2xs))
	);
	padding-inline-end: var(--listbox-flush-highlight-inset-inline, var(--spacing--md));
}

.row:not(.isHoverSuppressed):hover .trailing,
.row:has([data-highlighted]) .trailing,
.row.isMenuOpen .trailing {
	opacity: 1;
	pointer-events: auto;
}
</style>
