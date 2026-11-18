<script setup lang="ts">
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, nextTick, useTemplateRef, watch } from 'vue';

import type { ResourceSearchResult } from '../resources/resource.api';
import { toResourceDisplay } from '../resources/resourceDisplay';
import ResourceIcon from '../resources/ResourceIcon.vue';

const props = defineProps<{
	/** The results, with the results of one resource type next to each other. */
	items: ResourceSearchResult[];
	selectedIndex: number;
	/** A search runs and its results are not here yet. */
	isLoading: boolean;
}>();

const emit = defineEmits<{
	select: [item: ResourceSearchResult];
}>();

const i18n = useI18n();
const list = useTemplateRef<HTMLElement>('list');

const GROUP_LABELS = {
	workflow: 'page.mention.group.workflow',
	page: 'page.mention.group.page',
	credential: 'page.mention.group.credential',
	dataTable: 'page.mention.group.dataTable',
} as const;

/** Each result with the label of its group. Only the first result of a group has a label. */
const rows = computed(() =>
	props.items.map((item, index) => ({
		item,
		index,
		display: toResourceDisplay(item.resourceType, item.name),
		groupLabel:
			props.items[index - 1]?.resourceType === item.resourceType
				? undefined
				: i18n.baseText(GROUP_LABELS[item.resourceType]),
	})),
);

async function scrollSelectedIntoView() {
	await nextTick();
	list.value?.querySelector('[aria-selected="true"]')?.scrollIntoView?.({ block: 'nearest' });
}

watch(() => props.selectedIndex, scrollSelectedIntoView);
</script>

<template>
	<div :class="$style.menu" data-test-id="page-mention-menu">
		<N8nText v-if="items.length === 0" :class="$style.empty" size="small" color="text-light">
			{{ i18n.baseText(isLoading ? 'page.mention.loading' : 'page.mention.empty') }}
		</N8nText>
		<div v-else ref="list" role="listbox" :class="$style.list">
			<template v-for="row in rows" :key="`${row.item.resourceType}:${row.item.id}`">
				<div v-if="row.groupLabel" :class="$style.groupLabel">{{ row.groupLabel }}</div>
				<button
					type="button"
					role="option"
					:aria-selected="row.index === selectedIndex"
					:class="[$style.item, row.index === selectedIndex ? $style.selected : '']"
					data-test-id="page-mention-item"
					@mousedown.prevent
					@click="emit('select', row.item)"
				>
					<ResourceIcon :icon="row.display.icon" :emoji="row.display.emoji" :class="$style.icon" />
					<span :class="$style.name">{{ row.display.text }}</span>
				</button>
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
.menu {
	/* Above the dialogs and popovers of the design system, which use 2000. */
	z-index: 2100;
	width: calc(var(--spacing--5xl) * 2);
	max-width: 90vw;
	padding: var(--spacing--4xs);
	border: var(--border);
	border-radius: var(--radius--lg);
	background-color: var(--background--surface);
	box-shadow: var(--shadow--md);
	font-size: var(--font-size--sm);
}

.list {
	display: flex;
	flex-direction: column;
	max-height: calc(var(--spacing--5xl) * 2);
	overflow-y: auto;
	scrollbar-width: thin;
}

.groupLabel {
	padding: var(--spacing--2xs) var(--spacing--2xs) var(--spacing--4xs);
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
}

.item {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
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
	flex-shrink: 0;
	color: var(--text-color--subtle);
}

.name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.empty {
	display: block;
	padding: var(--spacing--2xs);
}
</style>
