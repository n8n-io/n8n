<script lang="ts" setup>
/**
 * The Inbox list for the app's navigation panel. It shares the Inbox store with the Inbox
 * page, and the route holds the selection, so a row opens its item on the Inbox page from
 * anywhere in the app.
 */
import type { InboxItem } from '@n8n/api-types';
import { storeToRefs } from 'pinia';
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { inboxItemLocation, isInboxRoute, selectionFromRoute } from '../inbox.routes';
import { requestInboxSelectionClear } from '../inbox.selectionClear';
import { useInboxStore } from '../inbox.store';
import InboxList from './InboxList.vue';

const store = useInboxStore();
const { activeTab, openCount, closedCount } = storeToRefs(store);
const route = useRoute();
const router = useRouter();

const isOnInbox = computed(() => isInboxRoute(route));
const sections = computed(() =>
	store.activeSectionKeys.map((key) => ({ key, ...store.lists[key] })),
);
const selectedKey = computed(() => {
	if (!isOnInbox.value) return null;
	const selection = selectionFromRoute(route);
	return selection ? `${selection.type}:${selection.id}` : null;
});

function onSelect(item: InboxItem) {
	// On the Inbox page the selection replaces the current one; elsewhere it opens the page.
	if (isOnInbox.value) void router.replace(inboxItemLocation(item, route));
	else void router.push(inboxItemLocation(item));
}

function onActiveTabChange(tab: 'open' | 'closed') {
	if (!isOnInbox.value) {
		void store.setActiveTab(tab);
		return;
	}
	const query = { ...route.query };
	if (tab === 'closed') query.state = tab;
	else delete query.state;
	void router.replace({ query });
}

// The Inbox page clears the selection, because a clear also cancels its pending selections.
function onClear() {
	if (isOnInbox.value) requestInboxSelectionClear();
}

// The Inbox page loads the list itself; elsewhere the panel loads it on first show.
onMounted(() => {
	if (isOnInbox.value || store.loading) return;
	if (!store.activeLists.every((list) => list.hasLoaded)) void store.refreshListAndSummary();
});
</script>

<template>
	<InboxList
		embedded
		:sections="sections"
		:active-tab="activeTab"
		:selected-key="selectedKey"
		:open-count="openCount"
		:closed-count="closedCount"
		data-test-id="inbox-nav-list"
		@select="onSelect"
		@clear="onClear"
		@update:active-tab="onActiveTabChange"
		@load-more="(section) => store.lists[section].loadMore()"
		@retry="(section) => store.lists[section].retry()"
		@refresh-section="(section) => store.lists[section].fetchList()"
		@retry-active-tab="store.fetchActiveTab()"
	/>
</template>
