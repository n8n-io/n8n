<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { nextTick, useTemplateRef, watch } from 'vue';

import type { SlashCommand } from './slashCommands';

/** The `/` menu. It shows nothing when no command matches, so that a typed path stays readable. */
const props = defineProps<{
	items: SlashCommand[];
	selectedIndex: number;
	/** Present for every suggestion menu. The commands are known at once, so it is not shown. */
	isLoading?: boolean;
}>();

const emit = defineEmits<{
	select: [item: SlashCommand];
}>();

const i18n = useI18n();
const list = useTemplateRef<HTMLElement>('list');

async function scrollSelectedIntoView() {
	await nextTick();
	list.value?.querySelector('[aria-selected="true"]')?.scrollIntoView?.({ block: 'nearest' });
}

watch(() => props.selectedIndex, scrollSelectedIntoView);
</script>

<template>
	<div :class="$style.menu" data-test-id="page-slash-menu">
		<div
			v-if="items.length > 0"
			ref="list"
			role="listbox"
			:aria-label="i18n.baseText('page.slash.label')"
			:class="$style.list"
		>
			<div :class="$style.heading">{{ i18n.baseText('page.slash.label') }}</div>
			<button
				v-for="(item, index) in items"
				:key="item.id"
				type="button"
				role="option"
				:aria-selected="index === selectedIndex"
				:class="[$style.item, index === selectedIndex ? $style.selected : '']"
				:data-command-id="item.id"
				data-test-id="page-slash-item"
				@mousedown.prevent
				@click="emit('select', item)"
			>
				<span :class="$style.icon"><N8nIcon :icon="item.icon" size="medium" /></span>
				<span :class="$style.text">
					<span :class="$style.title">{{ i18n.baseText(item.title) }}</span>
					<span :class="$style.description">{{ i18n.baseText(item.description) }}</span>
				</span>
			</button>
		</div>
	</div>
</template>

<style lang="scss" module>
.menu {
	/* Above the dialogs and popovers of the design system, which use 2000. */
	z-index: 2100;
	font-size: var(--font-size--sm);
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	width: calc(var(--spacing--5xl) + var(--spacing--2xl));
	max-width: 90vw;
	max-height: calc(var(--spacing--5xl) + var(--spacing--3xl));
	padding: var(--spacing--4xs);
	overflow-y: auto;
	border: var(--border);
	border-radius: var(--radius--lg);
	background-color: var(--background--surface);
	box-shadow: var(--shadow--md);
	scrollbar-width: thin;
}

.heading {
	padding: var(--spacing--2xs) var(--spacing--2xs) var(--spacing--4xs);
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
}

.item {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	width: 100%;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border: 0;
	border-radius: var(--radius--sm);
	background-color: transparent;
	color: var(--text-color);
	font-family: inherit;
	font-size: inherit;
	text-align: left;
	cursor: pointer;

	&:hover {
		background-color: var(--background--hover);
	}
}

.selected,
.selected:hover {
	background-color: var(--background--active);
}

.icon {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: var(--spacing--xl);
	height: var(--spacing--xl);
	border: var(--border);
	border-color: var(--border-color--subtle);
	border-radius: var(--radius--2xs);
	background-color: var(--background--surface);
	color: var(--text-color--subtle);
}

.text {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.title {
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--md);
}

.description {
	overflow: hidden;
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--md);
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
