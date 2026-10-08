<script setup lang="ts">
import { N8nEmptyState, N8nLoading, type EmptyStateIconCards } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';

import { useInboxStore } from '../inbox.store';

const store = useInboxStore();
const { activeTab, hasItems, loading, hasError, partial, isEmpty, openCount, closedCount } =
	storeToRefs(store);
const i18n = useI18n();
const alertIcon = { type: 'icon', value: 'circle-alert' } as const;
const inboxIcon: EmptyStateIconCards = {
	type: 'cards',
	center: 'message-square-text',
	sides: ['file-diff', 'git-branch', 'circle-check', 'list', 'message-square'],
};
const noSelectionHeading = computed(() => {
	const count = activeTab.value === 'closed' ? closedCount.value : openCount.value;
	if (count === null) return i18n.baseText(`inbox.items.${activeTab.value}`);
	return i18n.baseText(`inbox.noSelection.title.${activeTab.value}`, {
		adjustToNumber: count,
		interpolate: { count: String(count) },
	});
});
</script>

<template>
	<N8nLoading v-if="loading" :loading="true" :rows="3" />
	<div v-else :class="$style.emptyStateWrapper">
		<N8nEmptyState
			v-if="hasError && !hasItems"
			:class="$style.emptyState"
			:icon="alertIcon"
			:heading="i18n.baseText('inbox.loadError')"
			:button-text="i18n.baseText('generic.retry')"
			@click:button="store.fetchActiveTab()"
		/>
		<N8nEmptyState
			v-else-if="partial && !hasItems"
			:class="$style.emptyState"
			:icon="alertIcon"
			:heading="i18n.baseText('inbox.partial')"
			:button-text="i18n.baseText('generic.retry')"
			@click:button="store.refreshListAndSummary()"
		/>
		<N8nEmptyState
			v-else-if="isEmpty"
			:class="$style.emptyState"
			:icon="inboxIcon"
			:heading="i18n.baseText(activeTab === 'open' ? 'inbox.empty.open' : 'inbox.empty.closed')"
			:description="i18n.baseText('inbox.empty.body')"
			data-test-id="inbox-empty"
		/>
		<N8nEmptyState
			v-else-if="hasItems"
			:class="$style.emptyState"
			:icon="inboxIcon"
			:heading="noSelectionHeading"
			:description="i18n.baseText('inbox.noSelection.body')"
		/>
	</div>
</template>

<style lang="scss" module>
.emptyStateWrapper {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
}

.emptyStateWrapper .emptyState {
	border: none;
	padding: 0;
}
</style>
