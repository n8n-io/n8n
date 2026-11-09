<script setup lang="ts">
import { nextTick, useTemplateRef } from 'vue';

defineSlots<{
	/** Attachment items supplied by the feature component. */
	default(): unknown;
}>();

const group = useTemplateRef<HTMLDivElement>('group');
let returnFocusTarget: HTMLElement | undefined;
let activeItem: HTMLElement | undefined;
let nextFocusTarget:
	| {
			removedItem: HTMLElement;
			nextItem: HTMLElement | undefined;
			returnTarget: HTMLElement | undefined;
	  }
	| undefined;

function getItems(): HTMLElement[] {
	const items: HTMLElement[] = [];
	for (const child of group.value?.children ?? []) {
		if (!(child instanceof HTMLElement) || child.hidden || child.style.display === 'none') continue;

		const target = child.matches('a[href], button, [tabindex]')
			? child
			: (child.querySelector<HTMLElement>('.n8n-attachment') ?? child);
		if (target.getAttribute('aria-hidden') === 'true' || target.matches(':disabled')) continue;
		items.push(target);
	}
	return items;
}

/** Keep only the active attachment in the Tab order. */
function updateTabStops(items = getItems()) {
	if (!activeItem || !items.includes(activeItem)) activeItem = items[0];
	for (const item of items) {
		item.tabIndex = item === activeItem ? 0 : -1;
	}
}

/** Focus the first attachment and keep the previous focus target for Escape. */
function focus() {
	const firstItem = getItems()[0];
	if (!firstItem) return;

	const activeElement = document.activeElement;
	if (!group.value?.contains(activeElement)) {
		returnFocusTarget = activeElement instanceof HTMLElement ? activeElement : undefined;
	}

	activeItem = firstItem;
	updateTabStops();
	firstItem.focus();
}

function onFocusIn(event: FocusEvent) {
	const items = getItems();
	const item = items.find((candidate) => candidate === event.target);
	if (!item) return;
	activeItem = item;
	updateTabStops(items);
}

/** Select the focus target before the attachment starts removal. */
function onKeydownCapture(event: KeyboardEvent) {
	if (event.key !== 'Backspace') return;
	nextFocusTarget = undefined;
	const items = getItems();
	const index = items.findIndex((item) => item === event.target);
	const removedItem = items[index];
	if (!removedItem) return;

	nextFocusTarget = {
		removedItem,
		nextItem: items[index - 1] ?? items[index + 1],
		returnTarget: returnFocusTarget,
	};
}

async function onKeydown(event: KeyboardEvent) {
	if (event.key === 'Backspace') {
		const targets = nextFocusTarget;
		nextFocusTarget = undefined;
		if (!event.defaultPrevented || !targets) return;
		const { removedItem, nextItem, returnTarget } = targets;

		event.stopPropagation();
		await nextTick();
		const remainingItems = getItems();
		if (remainingItems.includes(removedItem)) return;
		activeItem = nextItem;
		updateTabStops(remainingItems);
		if (nextItem) {
			returnFocusTarget = returnTarget;
			nextItem.focus();
		} else if (returnTarget?.isConnected) {
			returnFocusTarget = undefined;
			returnTarget.focus();
		}
		return;
	}

	if (
		(event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') ||
		event.altKey ||
		event.ctrlKey ||
		event.metaKey ||
		event.shiftKey ||
		event.isComposing
	) {
		return;
	}

	const items = getItems();
	const index = items.findIndex((item) => item === event.target);
	if (index === -1) return;

	const isRtl = group.value && getComputedStyle(group.value).direction === 'rtl';
	const direction = (event.key === 'ArrowRight' ? 1 : -1) * (isRtl ? -1 : 1);
	const nextItem = items[index + direction];
	event.preventDefault();
	event.stopPropagation();
	if (nextItem) {
		activeItem = nextItem;
		updateTabStops(items);
		nextItem.focus();
	}
}

function onEscape(event: KeyboardEvent) {
	if (!returnFocusTarget?.isConnected) return;

	event.preventDefault();
	event.stopPropagation();
	const target = returnFocusTarget;
	returnFocusTarget = undefined;
	target.focus();
}

function onFocusOut(event: FocusEvent) {
	if (!(event.relatedTarget instanceof Node) || !group.value?.contains(event.relatedTarget)) {
		returnFocusTarget = undefined;
	}
}

defineExpose({
	/** Focus the first attachment. Escape restores the previous focus target. */
	focus,
});
</script>

<template>
	<div
		ref="group"
		:class="$style.group"
		@keydown.capture="onKeydownCapture"
		@keydown="onKeydown"
		@keydown.esc="onEscape"
		@focusin="onFocusIn"
		@focusout="onFocusOut"
	>
		<slot />
	</div>
</template>

<style module lang="scss">
@use '../../../css/mixins/motion';
@use '../../../css/mixins/mixins' as scrollbar-mixins;

.group {
	--attachment-direction: 1;

	display: flex;
	flex-direction: row;
	overflow-x: scroll;
	gap: var(--spacing--4xs);
	padding: var(--spacing--4xs);
	margin-inline: calc(var(--spacing--4xs) * -1);

	@include scrollbar-mixins.hoverable-scroll-bar;
	@include scrollbar-mixins.scroll-mask(right);
}
</style>
