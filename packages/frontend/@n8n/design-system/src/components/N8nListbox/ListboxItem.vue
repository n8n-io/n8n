<script setup lang="ts">
import { getCurrentInstance, onMounted, onUpdated, useAttrs } from 'vue';

import type { ListboxItemEmits, ListboxItemProps, ListboxItemSlots } from './ListboxItem.types';
import { ListboxItem } from './reka-ui';

defineOptions({ name: 'N8nListboxItem' });

const props = defineProps<ListboxItemProps>();
defineSlots<ListboxItemSlots>();

const emit = defineEmits<ListboxItemEmits>();
const attrs = useAttrs();
const instance = getCurrentInstance();

// Reka memos the option while the highlight and the selection stay the same.
// Copy caller attributes after each render so they stay current.
const appliedKeys = new Set<string>();

function applyAttrs() {
	const el = instance?.vnode.el;
	if (!(el instanceof HTMLElement)) return;

	const nextKeys = new Set<string>();
	for (const [key, value] of Object.entries(attrs)) {
		if (key === 'class' || key === 'style' || key.startsWith('on')) continue;
		writeAttr(el, key, value);
		nextKeys.add(key);
	}

	for (const key of appliedKeys) {
		if (!nextKeys.has(key)) el.removeAttribute(key);
	}
	appliedKeys.clear();
	for (const key of nextKeys) appliedKeys.add(key);

	writeAttr(el, 'data-value', props.value);
	if (props.disabled) writeAttr(el, 'aria-disabled', 'true');
	else el.removeAttribute('aria-disabled');
}

function writeAttr(el: HTMLElement, key: string, value: unknown) {
	if (value === undefined || value === null) {
		el.removeAttribute(key);
		return;
	}
	if (value === false) {
		if (key.startsWith('aria-') || key.startsWith('data-')) el.setAttribute(key, 'false');
		else el.removeAttribute(key);
		return;
	}
	if (value === true) {
		el.setAttribute(key, 'true');
		return;
	}
	if (typeof value === 'string' || typeof value === 'number') {
		el.setAttribute(key, String(value));
	}
}

onMounted(applyAttrs);
onUpdated(applyAttrs);

function onSelect(event: Event) {
	emit('select', event);
}
</script>

<template>
	<ListboxItem
		:value="value"
		:disabled="disabled"
		:aria-disabled="disabled ? 'true' : undefined"
		:data-value="value"
		:class="$style.item"
		@select="onSelect"
	>
		<span v-if="$slots.leading" :class="$style.leading">
			<slot name="leading" />
		</span>
		<span :class="$style.content">
			<slot />
		</span>
		<span v-if="$slots.trailing" :class="$style.trailing">
			<slot name="trailing" />
		</span>
	</ListboxItem>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/floating-item' as floating-item;

.item {
	@include floating-item.floating-item;

	gap: var(--n8n-listbox-item--gap, var(--spacing--2xs));
	min-height: var(--n8n-listbox-item--min-height, var(--spacing--xl));
	padding: var(--n8n-listbox-item--padding, var(--spacing--2xs) var(--spacing--xs));
	border-radius: var(--n8n-listbox-item--radius, var(--radius));

	&:not([data-disabled]) {
		cursor: pointer;

		&:not([data-state='checked'])[data-highlighted] {
			background-color: var(
				--n8n-listbox-item--color--background--highlight,
				var(--background--hover)
			);
		}
	}

	&[data-state='checked'] {
		background-color: var(
			--n8n-listbox-item--color--background--selected,
			var(--background--active)
		);
	}

	&[data-disabled] {
		color: var(--n8n-listbox-item--color--text--disabled, var(--text-color--disabled));
		cursor: not-allowed;
	}
}

.leading,
.trailing {
	display: inline-flex;
	flex: none;
	align-items: center;
}

.content {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-width: 0;
	gap: var(--n8n-listbox-item--content-gap, var(--spacing--5xs));
}
</style>
