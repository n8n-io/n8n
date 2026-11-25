<script setup lang="ts">
import { N8nEmptyState, N8nLoading, type EmptyStateIconCards } from '@n8n/design-system';
import { PERSONAL_SELF_HEALING_CONFIGURATION_VIEW } from '@n8n/frontend-constants/self-healing';
import { useI18n } from '@n8n/i18n';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { useInboxStore } from '../inbox.store';

const store = useInboxStore();
const {
	activeTab,
	hasItems,
	loading,
	initialLoadFailed,
	partial,
	isEmpty,
	openCount,
	closedCount,
	emptyKind,
	emptyKindPending,
	selfHealingStatus,
} = storeToRefs(store);
// A next page that loads into an empty tab has no rows to show its progress.
const loadingFirstRows = computed(
	() => !hasItems.value && store.activeLists.some((list) => list.loadingMore),
);
const i18n = useI18n();
const router = useRouter();
const alertIcon = { type: 'icon', value: 'circle-alert' } as const;
const inboxIcon: EmptyStateIconCards = {
	type: 'cards',
	center: 'inbox',
	sides: ['file-diff', 'git-branch', 'circle-check', 'list', 'message-square'],
};
const openBodyKeys = {
	reviews: 'inbox.empty.body.open',
	reviewsAndSelfHealing: 'inbox.empty.reviewsAndSelfHealing.body.open',
	selfHealing: 'inbox.empty.selfHealing.body.open',
} as const;
const emptyCopy = computed(() => {
	const tab = activeTab.value;
	const kind = emptyKind.value;
	if (kind === 'selfHealingSetup') {
		return {
			heading: i18n.baseText('inbox.empty.setup.title'),
			description: i18n.baseText('inbox.empty.setup.body'),
			buttonText: i18n.baseText('inbox.empty.setup.button'),
		};
	}
	return {
		heading: i18n.baseText(`inbox.empty.${tab}`),
		description: i18n.baseText(tab === 'closed' ? 'inbox.empty.body.closed' : openBodyKeys[kind]),
	};
});

function setUpSelfHealing() {
	const projectId = selfHealingStatus.value?.setupProjectId;
	if (!projectId) return;
	void router.push({
		name: PERSONAL_SELF_HEALING_CONFIGURATION_VIEW,
		params: { projectId, configurationId: 'new' },
	});
}

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
	<N8nLoading
		v-if="loading || loadingFirstRows || (isEmpty && emptyKindPending)"
		:loading="true"
		:rows="3"
	/>
	<div v-else :class="$style.emptyStateWrapper">
		<N8nEmptyState
			v-if="initialLoadFailed && !hasItems"
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
			:heading="emptyCopy.heading"
			:description="emptyCopy.description"
			:button-text="emptyCopy.buttonText"
			data-test-id="inbox-empty"
			@click:button="setUpSelfHealing"
		/>
		<!-- Also covers a tab with no loaded rows and more pages to load. -->
		<N8nEmptyState
			v-else
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
