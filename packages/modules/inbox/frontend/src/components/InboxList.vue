<script setup lang="ts">
import type { InboxItem, InboxState } from '@n8n/api-types';
import { N8nButton, N8nHeading, N8nTabs } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useIntersectionObserver } from '@vueuse/core';
import { computed, useTemplateRef } from 'vue';

import { useReviewInboxSectionCollapse } from '../composables/useReviewInboxSectionCollapse';
import type { InboxSectionKey } from '../inbox.constants';
import InboxListSection from './InboxListSection.vue';
import type { InboxListSection as ListSection } from './InboxListSection.vue';

const props = defineProps<{
	sections: ListSection[];
	activeTab: InboxState;
	selectedKey: string | null;
	openCount: number | null;
	closedCount: number | null;
}>();
const emit = defineEmits<{
	select: [item: InboxItem];
	clear: [];
	'update:active-tab': [state: InboxState];
	loadMore: [section: InboxSectionKey];
	retry: [section: InboxSectionKey];
	refreshSection: [section: InboxSectionKey];
	refresh: [];
}>();
const i18n = useI18n();
const { isCollapsed, toggleSection } = useReviewInboxSectionCollapse();
const visibleSections = computed(() =>
	props.sections.filter(
		(section) =>
			!section.hasLoaded ||
			section.loading ||
			section.error ||
			section.partial ||
			section.items.length > 0 ||
			section.hasMore,
	),
);
const hasLoadedMore = computed(() => props.sections.some((section) => section.hasLoadedMore));
const refreshing = computed(() =>
	props.sections.some((section) => section.loading || section.loadingMore),
);
const listRef = useTemplateRef<HTMLElement>('list');
const loadMoreSentinel = useTemplateRef<HTMLElement>('loadMoreSentinel');
const canAutoLoad = computed(() => {
	const closed = props.sections.find((section) => section.key === 'closed');
	return (
		props.activeTab === 'closed' &&
		closed?.hasMore &&
		!closed.loading &&
		!closed.loadingMore &&
		!closed.error
	);
});
useIntersectionObserver(
	loadMoreSentinel,
	([entry]) => {
		if (entry?.isIntersecting && canAutoLoad.value) emit('loadMore', 'closed');
	},
	{ root: listRef, threshold: 0.01 },
);
const tabs = computed(() => [
	{
		value: 'open',
		label: i18n.baseText('inbox.tabs.open'),
		tag: props.openCount === null ? undefined : String(props.openCount),
	},
	{
		value: 'closed',
		label: i18n.baseText('inbox.tabs.closed'),
		tag: props.closedCount === null ? undefined : String(props.closedCount),
	},
]);
function onTabChange(value: string | number | boolean) {
	if (value === 'open' || value === 'closed') emit('update:active-tab', value);
}
</script>

<template>
	<aside :class="$style.sidebar" data-test-id="inbox-list">
		<div :class="$style.title">
			<N8nHeading bold tag="h2" size="xlarge">{{ i18n.baseText('inbox.title') }}</N8nHeading>
			<N8nButton
				v-if="hasLoadedMore"
				size="mini"
				variant="subtle"
				:disabled="refreshing"
				:label="i18n.baseText('generic.refresh')"
				@click="emit('refresh')"
			/>
		</div>
		<N8nTabs
			:model-value="activeTab"
			:options="tabs"
			variant="modern"
			data-test-id="inbox-tabs"
			@update:model-value="onTabChange"
		/>
		<div ref="list" :class="$style.list" @click.self="emit('clear')">
			<InboxListSection
				v-for="section in visibleSections"
				:key="section.key"
				:section="section"
				:collapsed="section.key !== 'closed' && isCollapsed(section.key)"
				:selected-key="selectedKey"
				@select="emit('select', $event)"
				@toggle="toggleSection"
				@load-more="emit('loadMore', section.key)"
				@retry="emit('retry', section.key)"
				@refresh-section="emit('refreshSection', section.key)"
			/>
			<div v-if="canAutoLoad" ref="loadMoreSentinel" :class="$style.sentinel" />
		</div>
	</aside>
</template>

<style module lang="scss">
.sidebar {
	display: flex;
	flex-direction: column;
	min-width: 0;
	height: 100%;
	border-right: var(--border);
	padding-right: var(--spacing--md);
}
.title {
	display: flex;
	justify-content: space-between;
	align-items: center;
	min-height: var(--spacing--2xl);
	padding-bottom: var(--spacing--sm);
}
.list {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--sm);
	overflow-y: auto;
	padding-block: var(--spacing--sm);
}
.sentinel {
	flex-shrink: 0;
	height: var(--border-width);
}
</style>
