<script setup lang="ts">
import type { InboxItem } from '@n8n/api-types';
import { N8nButton, N8nIcon, N8nLoading, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUsersStore } from '@n8n/stores/users.store';

import type { CollapsibleReviewInboxSection } from '../composables/useReviewInboxSectionCollapse';
import type { InboxSectionKey } from '../inbox.constants';
import InboxListItem from './InboxListItem.vue';

export type InboxListSection = {
	key: InboxSectionKey;
	items: InboxItem[];
	loading: boolean;
	loadingMore: boolean;
	hasMore: boolean;
	error: Error | null;
	partial: boolean;
};

defineProps<{
	section: InboxListSection;
	collapsed: boolean;
	selectedKey: string | null;
}>();
const emit = defineEmits<{
	select: [item: InboxItem];
	toggle: [key: CollapsibleReviewInboxSection];
	loadMore: [];
	retry: [];
	refreshSection: [];
}>();
const i18n = useI18n();
const usersStore = useUsersStore();

function sectionTitle(key: 'waiting' | 'authored') {
	return key === 'waiting' && usersStore.isAdminOrOwner
		? i18n.baseText('workflowReviews.sidebar.section.waiting.titleAdmin')
		: i18n.baseText(`workflowReviews.sidebar.section.${key}.title`);
}
</script>

<template>
	<div :class="$style.section" :data-section="section.key">
		<button
			v-if="section.key !== 'closed'"
			:id="`inbox-section-header-${section.key}`"
			type="button"
			:class="$style.sectionHeader"
			:aria-expanded="!collapsed"
			:aria-controls="`inbox-section-${section.key}`"
			data-test-id="inbox-section-header"
			@click="emit('toggle', section.key)"
		>
			<N8nIcon
				icon="chevron-down"
				size="small"
				:class="[$style.chevron, { [$style.chevronCollapsed]: collapsed }]"
			/>
			<N8nText bold size="small" color="text-base">{{ sectionTitle(section.key) }}</N8nText>
		</button>
		<div
			:id="`inbox-section-${section.key}`"
			:class="$style.group"
			role="listbox"
			:aria-labelledby="
				section.key !== 'closed' ? `inbox-section-header-${section.key}` : undefined
			"
			:aria-label="section.key === 'closed' ? i18n.baseText('inbox.tabs.closed') : undefined"
		>
			<template v-if="!collapsed">
				<InboxListItem
					v-for="item in section.items"
					:key="`${item.type}:${item.id}`"
					:item="item"
					:selected="selectedKey === `${item.type}:${item.id}`"
					@select="emit('select', item)"
				/>
			</template>
		</div>
		<template v-if="!collapsed">
			<div v-if="section.loadingMore" :class="$style.loadingMore">
				<N8nLoading :loading="true" :rows="1" />
			</div>
			<div v-if="section.partial" :class="$style.notice" role="status" data-test-id="inbox-partial">
				<N8nText size="small">{{ i18n.baseText('inbox.partial') }}</N8nText>
				<N8nButton
					size="mini"
					variant="subtle"
					:label="i18n.baseText('generic.retry')"
					@click="emit('refreshSection')"
				/>
			</div>
			<div v-if="section.error" :class="$style.notice" role="alert" data-test-id="inbox-list-error">
				<N8nText color="danger" size="small">{{ i18n.baseText('inbox.loadError') }}</N8nText>
				<N8nButton
					size="mini"
					variant="subtle"
					:label="i18n.baseText('generic.retry')"
					@click="emit('retry')"
				/>
			</div>
			<N8nButton
				v-if="section.key !== 'closed' && section.hasMore"
				:class="$style.loadMore"
				size="small"
				variant="subtle"
				:loading="section.loadingMore"
				:disabled="section.loading"
				:label="i18n.baseText('inbox.loadMore')"
				data-test-id="inbox-load-more"
				@click="emit('loadMore')"
			/>
		</template>
	</div>
</template>

<style module lang="scss">
.section,
.group {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.sectionHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	width: 100%;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border: none;
	border-radius: var(--radius);
	background: transparent;
	cursor: pointer;
	text-align: left;
}
.sectionHeader:hover {
	background-color: var(--background--active);
}
.sectionHeader:focus-visible {
	outline: var(--border-width) solid var(--focus--border-color);
}
.chevron {
	transition: transform var(--duration--snappy) ease;
	color: var(--color--text--tint-1);
}
.chevronCollapsed {
	transform: rotate(-90deg);
}
.notice {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	padding: 0 var(--spacing--2xs);
}

.loadMore {
	align-self: center;
}

.loadingMore {
	padding: var(--spacing--sm);
}
</style>
