<script setup lang="ts">
import type { InboxItem, InboxState } from '@n8n/api-types';
import { N8nButton, N8nHeading, N8nLoading, N8nTabs, N8nText } from '@n8n/design-system';
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
	retryActiveTab: [];
	refreshSection: [section: InboxSectionKey];
}>();
const i18n = useI18n();
const { isCollapsed, toggleSection } = useReviewInboxSectionCollapse();
const loading = computed(() => props.sections.some((section) => section.loading));
const hasUsableRows = computed(() => props.sections.some((section) => section.items.length > 0));
const showInitialLoadError = computed(
	() =>
		!hasUsableRows.value &&
		props.sections.some((section) => section.error !== null) &&
		!props.sections.some((section) => section.partial),
);
const visibleSections = computed(() =>
	props.sections.filter(
		(section) =>
			!loading.value &&
			!showInitialLoadError.value &&
			(section.error || section.partial || section.items.length > 0 || section.hasMore),
	),
);
const listRef = useTemplateRef<HTMLElement>('list');
const loadMoreSentinel = useTemplateRef<HTMLElement>('loadMoreSentinel');
const canAutoLoad = computed(() => {
	const closed = props.sections.find((section) => section.key === 'closed');
	return (
		props.activeTab === 'closed' &&
		closed?.hasMore &&
		!loading.value &&
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

function onListBackgroundClick() {
	if (props.selectedKey) emit('clear');
}
</script>

<template>
	<aside :class="$style.sidebar" data-test-id="inbox-list">
		<div :class="$style.title">
			<N8nHeading bold tag="h2" size="xlarge">{{ i18n.baseText('inbox.title') }}</N8nHeading>
		</div>
		<div :class="$style.header">
			<N8nTabs
				:model-value="activeTab"
				:options="tabs"
				variant="modern"
				data-test-id="inbox-tabs"
				@update:model-value="onTabChange"
			/>
		</div>
		<div ref="list" :class="$style.list" @click.self="onListBackgroundClick">
			<N8nLoading v-if="loading" :loading="true" :rows="3" data-test-id="inbox-list-skeleton" />
			<div
				v-else-if="showInitialLoadError"
				:class="$style.sectionError"
				role="alert"
				data-test-id="inbox-list-error"
			>
				<N8nText color="danger" size="small">{{ i18n.baseText('inbox.loadError') }}</N8nText>
				<N8nButton
					variant="subtle"
					size="mini"
					:label="i18n.baseText('generic.retry')"
					@click="emit('retryActiveTab')"
				/>
			</div>
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
	width: 100%;
	min-width: 0;
	height: 100%;
	border-right: var(--border-width) solid var(--border-color);
}

.title {
	display: flex;
	align-items: center;
	min-height: var(--spacing--2xl);
	padding: 0 var(--spacing--md) var(--spacing--sm) 0;
}

.header {
	position: relative;
	display: flex;
	align-items: center;
	height: var(--review-tab-bar--height, var(--height--sm));
	padding-right: var(--spacing--md);
	margin-bottom: var(--review-tab-bar--gap);

	&::after {
		content: '';
		position: absolute;
		left: 0;
		right: var(--spacing--md);
		bottom: calc(-1 * var(--review-tab-bar--indicator-overhang) - var(--border-width));
		border-bottom: var(--border-width) solid var(--border-color);
	}
}

.list {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--sm);
	min-width: 0;
	overflow-y: auto;
	padding: 0 var(--spacing--md) var(--spacing--md) 0;
}

.sectionError {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	padding: 0 var(--spacing--2xs);
}

.sentinel {
	flex-shrink: 0;
	height: var(--border-width);
}
</style>
