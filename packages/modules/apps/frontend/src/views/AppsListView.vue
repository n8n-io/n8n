<script setup lang="ts">
import type { AppResponse } from '@n8n/api-types';
import { getDebounceTime, useDebounce } from '@n8n/composables/useDebounce';
import { useLatestFetch } from '@n8n/composables/useLatestFetch';
import { useToast } from '@n8n/composables/useToast';
import { N8nEmptyState } from '@n8n/design-system';
import { DEBOUNCE_TIME } from '@n8n/frontend-constants/durations';
import { componentRegistry } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, useTemplateRef } from 'vue';
import { useRoute } from 'vue-router';

import { listApps } from '../apps.api';
import { APPS_PAGE_SIZE, APPS_SORT_MAP, type AppsSortBy } from '../apps.constants';
import AppCard from '../components/AppCard.vue';

const i18n = useI18n();
const route = useRoute();
const rootStore = useRootStore();
const toast = useToast();
const { debounce } = useDebounce();
const latestFetch = useLatestFetch();

const ResourcesListLayout = computed(() => componentRegistry.get('resources-list-layout'));
const ProjectHeader = computed(() => componentRegistry.get('project-header'));
const InsightsSummary = computed(() => componentRegistry.get('insights-summary'));
// The layout keeps its own page state; changing the page through it keeps its pagination in sync.
const layout = useTemplateRef<{ setCurrentPage: (page: number) => Promise<void> }>('layout');

const projectId = computed(() =>
	typeof route.params.projectId === 'string' ? route.params.projectId : undefined,
);

const apps = ref<AppResponse[]>([]);
const totalApps = ref(0);
const loading = ref(true);
const hasApps = ref(false);
const filters = ref({ search: '', homeProject: '' });
const currentPage = ref(1);
const pageSize = ref(APPS_PAGE_SIZE);
const currentSort = ref<AppsSortBy>('updatedAt:desc');

function isSortKey(key: string): key is keyof typeof APPS_SORT_MAP {
	return Object.hasOwn(APPS_SORT_MAP, key);
}

async function fetchApps() {
	const isLatest = latestFetch.next();
	const search = filters.value.search;
	// Keep the shown list during a fast reload; the loading rows would only flicker.
	let loadingTimer: ReturnType<typeof setTimeout> | undefined;
	if (apps.value.length > 0) {
		loadingTimer = setTimeout(() => {
			if (isLatest()) loading.value = true;
		}, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));
	} else {
		loading.value = true;
	}
	try {
		const { data, count } = await listApps(rootStore.restApiContext, projectId.value, {
			skip: (currentPage.value - 1) * pageSize.value,
			take: pageSize.value,
			sortBy: currentSort.value,
			name: search || undefined,
		});
		if (!isLatest()) return;
		apps.value = data;
		totalApps.value = count;
		// A search without matches does not tell if the project has apps.
		if (!search || count > 0) hasApps.value = count > 0;
	} catch (error) {
		if (!isLatest()) return;
		toast.showError(error, i18n.baseText('apps.list.error'));
	} finally {
		clearTimeout(loadingTimer);
	}
	loading.value = false;
}

const fetchAppsDebounced = debounce(fetchApps, {
	debounceTime: DEBOUNCE_TIME.INPUT.SEARCH,
	trailing: true,
});

// Invalidate now, not when the debounced fetch starts: a response that is still in flight
// must not overwrite the list while the new request waits.
async function scheduleFetch() {
	latestFetch.invalidate();
	await fetchAppsDebounced();
}

// The layout emits `update:pagination-and-sort` right before it calls `initialize`.
async function initialize() {
	fetchAppsDebounced.cancel();
	await fetchApps();
}

async function onSearchUpdated(value: string) {
	filters.value = { ...filters.value, search: value };
	currentPage.value = 1;
	await scheduleFetch();
}

async function onPaginationAndSortUpdated(payload: {
	page?: number;
	pageSize?: number;
	sort?: string;
}) {
	if (payload.page) currentPage.value = payload.page;
	if (payload.pageSize) pageSize.value = payload.pageSize;
	if (payload.sort && isSortKey(payload.sort)) {
		currentSort.value = APPS_SORT_MAP[payload.sort];
	}
	await scheduleFetch();
}

function removeApp(appId: string) {
	if (!apps.value.some((app) => app.id === appId)) return;
	apps.value = apps.value.filter((app) => app.id !== appId);
	totalApps.value = Math.max(0, totalApps.value - 1);
}

async function onAppDeleted(appId: string) {
	const isOnlyAppOnPage = apps.value.length === 1 && apps.value[0].id === appId;
	if (isOnlyAppOnPage && currentPage.value > 1 && layout.value) {
		// Keep the card until the previous page loads, so the empty state does not flash.
		await layout.value.setCurrentPage(currentPage.value - 1);
		await initialize();
		// The reload can fail and keep the old page.
		removeApp(appId);
		return;
	}
	removeApp(appId);
	await fetchApps();
}
</script>

<template>
	<component
		:is="ResourcesListLayout"
		v-if="ResourcesListLayout"
		ref="layout"
		v-model:filters="filters"
		resource-key="apps"
		type="list-paginated"
		tab-key="apps"
		:resources="apps"
		:initialize="initialize"
		:loading="false"
		:resources-refreshing="loading"
		:disabled="false"
		:sort-options="Object.keys(APPS_SORT_MAP)"
		:type-props="{ itemSize: 80 }"
		:custom-page-size="APPS_PAGE_SIZE"
		:total-items="totalApps"
		:dont-perform-sorting-and-filtering="true"
		:has-empty-state="!hasApps"
		:shareable="false"
		:ui-config="{ searchEnabled: true, showFiltersDropdown: false, sortEnabled: true }"
		@update:search="onSearchUpdated"
		@update:pagination-and-sort="onPaginationAndSortUpdated"
	>
		<template #header>
			<component :is="ProjectHeader" v-if="ProjectHeader">
				<component :is="InsightsSummary" v-if="InsightsSummary && !projectId" />
			</component>
		</template>
		<template #empty>
			<N8nEmptyState
				:icon="{ type: 'icon', value: 'layout-template' }"
				:heading="i18n.baseText('apps.empty.heading')"
				:description="i18n.baseText('apps.empty.description')"
				data-test-id="apps-empty-state"
			/>
		</template>
		<template #item="{ item }">
			<AppCard class="mb-2xs" :app="item" @deleted="onAppDeleted" />
		</template>
	</component>
</template>
