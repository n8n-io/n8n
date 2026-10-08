<script lang="ts" setup>
import type { InboxItem } from '@n8n/api-types';
import { useDocumentTitle } from '@n8n/composables/useDocumentTitle';
import {
	N8nEmptyState,
	N8nLoading,
	N8nResizeWrapper,
	useResizablePanel,
	type EmptyStateIconCards,
} from '@n8n/design-system';
import { VIEWS } from '@n8n/frontend-constants/views';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { storeToRefs } from 'pinia';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import InboxList from '../components/InboxList.vue';
import { INBOX_VIEW, type InboxItemChange } from '../inbox.constants';
import { inboxItemLocation, isInboxRoute, selectionFromRoute } from '../inbox.routes';
import { useInboxStore } from '../inbox.store';
import WorkflowReviewDetail from '../reviews/WorkflowReviewDetail.vue';
import SelfHealingResultDetail from '../self-healing/SelfHealingResultDetail.vue';

const store = useInboxStore();
const settingsStore = useSettingsStore();
const { activeTab, hasItems, loading, hasError, partial, isEmpty, openCount, closedCount } =
	storeToRefs(store);
const sections = computed(() =>
	store.activeSectionKeys.map((key) => ({ key, ...store.lists[key] })),
);
const route = useRoute();
const router = useRouter();
const i18n = useI18n();
const documentTitle = useDocumentTitle({ releaseChannel: settingsStore.settings.releaseChannel });
documentTitle.set(i18n.baseText('inbox.title'));

const contentRef = ref<HTMLElement | null>(null);
const sidebarResizer = useResizablePanel({
	container: contentRef,
	width: {
		localStorageKey: 'N8N_WORKFLOW_REVIEW_SIDEBAR_WIDTH',
		defaultSize: (size) => Math.min(Math.max(size * 0.25, 240), 400),
		minSize: 240,
		maxSize: (size) => Math.min(size * 0.5, 640),
		snap: true,
	},
});
const sidebarWidth = sidebarResizer.width;
const selection = computed(() => selectionFromRoute(route));
const selectedKey = computed(() =>
	selection.value ? `${selection.value.type}:${selection.value.id}` : null,
);
const selectedListItem = computed(() =>
	Object.values(store.lists)
		.flatMap((list) => list.items)
		.find((item) => `${item.type}:${item.id}` === selectedKey.value),
);
const selectedReviewItem = computed(() =>
	selectedListItem.value?.type === 'workflow_review' ? selectedListItem.value : undefined,
);
const detailTab = computed(() => (route.query.tab === 'changes' ? 'changes' : 'activity'));
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
let isMounted = false;

function isOnInbox() {
	return isInboxRoute(route);
}
// Reset on entry. A layout-swap copy can unmount after the next view has mounted.
store.reset();
store.activeTab = route.query.state === 'closed' ? 'closed' : 'open';

watch(
	() => route.query.state,
	(state) => {
		if (isOnInbox()) void store.setActiveTab(state === 'closed' ? 'closed' : 'open');
	},
);
watch(
	() => store.disabledSources,
	(types) => {
		if (selection.value && types.includes(selection.value.type)) onClearSelection();
	},
	{ immediate: true },
);

function onSelect(item: InboxItem) {
	void router.replace(inboxItemLocation(item, route));
}
function onClearSelection() {
	if (!isOnInbox()) return;
	const query = { ...route.query };
	for (const key of ['projectId', 'workflowId', 'tab']) delete query[key];
	void router.replace({ name: INBOX_VIEW, query });
}
function onActiveTabChange(tab: 'open' | 'closed') {
	const query = { ...route.query };
	if (tab === 'closed') query.state = tab;
	else delete query.state;
	void router.replace({ query });
}
function onDetailTabChange(tab: 'activity' | 'changes') {
	if (!isOnInbox()) return;
	const query = { ...route.query };
	if (tab === 'changes') query.tab = tab;
	else delete query.tab;
	void router.replace({ query });
}
function onItemChange(change: InboxItemChange) {
	if (!isMounted || !isOnInbox()) return;
	store.reconcileItemChange(change);
	if (change.unavailable) {
		void store.fetchSummary();
		return;
	}
	if (!change.state) void store.refreshListAndSummary();
	if (
		change.state === 'closed' &&
		activeTab.value !== 'closed' &&
		selection.value?.type === change.type &&
		selection.value.id === change.id
	) {
		void router.replace({ query: { ...route.query, state: 'closed' } });
	}
}

watch(
	() => store.enabled,
	(enabled) => {
		if (!enabled && isMounted && isOnInbox()) void router.replace({ name: VIEWS.HOMEPAGE });
	},
);
onMounted(() => {
	isMounted = true;
	void store.refreshListAndSummary();
});
onBeforeUnmount(() => {
	isMounted = false;
});
</script>

<template>
	<div :class="$style.layout" data-test-id="inbox-view">
		<main ref="contentRef" :class="$style.content">
			<N8nResizeWrapper
				:class="$style.sidebarResizer"
				:style="{ width: `${sidebarWidth}px` }"
				:resizer="sidebarResizer"
				:supported-directions="['right']"
			>
				<InboxList
					:class="$style.sidebar"
					:sections="sections"
					:active-tab="activeTab"
					:selected-key="selectedKey"
					:open-count="openCount"
					:closed-count="closedCount"
					@select="onSelect"
					@clear="onClearSelection"
					@update:active-tab="onActiveTabChange"
					@load-more="(section) => store.lists[section].loadMore()"
					@retry="(section) => store.lists[section].retry()"
					@refresh-section="(section) => store.lists[section].fetchList()"
					@retry-active-tab="store.refreshListAndSummary()"
				/>
			</N8nResizeWrapper>
			<div :class="$style.main">
				<WorkflowReviewDetail
					v-if="
						selection?.type === 'workflow_review' && !store.disabledSources.includes(selection.type)
					"
					:review-id="selection.id"
					:list-item="selectedReviewItem"
					:tab="detailTab"
					:on-item-change="onItemChange"
					@update:tab="onDetailTabChange"
				/>
				<template v-else>
					<div :class="$style.columnTitle" />
					<div :class="[$style.mainBody, { [$style.emptyStateWrapper]: !selection && !loading }]">
						<SelfHealingResultDetail
							v-if="
								selection?.type === 'self_healing_result' &&
								!store.disabledSources.includes(selection.type)
							"
							:selection="selection"
							@changed="store.refreshListAndSummary()"
						/>
						<N8nLoading v-else-if="loading && !hasItems" :loading="true" :rows="3" />
						<N8nEmptyState
							:class="$style.emptyState"
							v-else-if="hasError && !hasItems"
							:icon="alertIcon"
							:heading="i18n.baseText('inbox.loadError')"
							:button-text="i18n.baseText('generic.retry')"
							@click:button="store.refreshListAndSummary()"
						/>
						<N8nEmptyState
							:class="$style.emptyState"
							v-else-if="partial && !hasItems"
							:icon="alertIcon"
							:heading="i18n.baseText('inbox.partial')"
							:button-text="i18n.baseText('generic.retry')"
							@click:button="store.refreshListAndSummary()"
						/>
						<N8nEmptyState
							:class="$style.emptyState"
							v-else-if="isEmpty"
							:icon="inboxIcon"
							:heading="
								i18n.baseText(activeTab === 'open' ? 'inbox.empty.open' : 'inbox.empty.closed')
							"
							:description="i18n.baseText('inbox.empty.body')"
							data-test-id="inbox-empty"
						/>
						<N8nEmptyState
							:class="$style.emptyState"
							v-else-if="hasItems"
							:icon="inboxIcon"
							:heading="noSelectionHeading"
							:description="i18n.baseText('inbox.noSelection.body')"
						/>
					</div>
				</template>
			</div>
		</main>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/breakpoints';

.layout {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
	padding-inline: var(--spacing--md);
	box-sizing: border-box;
}

.content {
	--review-callout--max-width: 34rem;
	--review-activity--max-width: 45rem;
	--review-tab-bar--height: var(--height--sm);
	--review-tab-bar--indicator-overhang: calc(var(--spacing--sm) - var(--border-width));
	--review-tab-bar--gap: calc(var(--spacing--sm) + var(--review-tab-bar--indicator-overhang));
	display: flex;
	width: 100%;
	min-height: 0;
	height: 100%;
	overflow: hidden;
}
.sidebarResizer {
	flex: 0 0 auto;
}
.main {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-width: 0;
	min-height: 0;
	overflow: hidden;
	padding: 0 0 var(--spacing--md) var(--spacing--md);
}
.sidebar,
.main {
	padding-top: var(--spacing--lg);

	@include breakpoints.breakpoint('sm-and-down') {
		padding-top: var(--spacing--sm);
	}
}
.columnTitle {
	min-height: var(--spacing--2xl);
	padding-bottom: var(--spacing--sm);
}
.mainBody {
	flex: 1;
	min-height: 0;
	overflow: auto;
}
.emptyStateWrapper {
	display: flex;
	align-items: center;
	justify-content: center;
}
.emptyStateWrapper .emptyState {
	border: none;
	padding: 0;
}
</style>
