<script setup lang="ts">
import type { AppResponse } from '@n8n/api-types';
import { useDebounce } from '@n8n/composables/useDebounce';
import { useToast } from '@n8n/composables/useToast';
import { N8nEmptyState } from '@n8n/design-system';
import { DEBOUNCE_TIME } from '@n8n/frontend-constants/durations';
import { componentRegistry } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';

import { listApps } from '../apps.api';
import { APPS_PAGE_SIZE, APPS_SORT_MAP, type AppsSortBy } from '../apps.constants';
import AppCard from '../components/AppCard.vue';

const i18n = useI18n();
const route = useRoute();
const rootStore = useRootStore();
const toast = useToast();
const { callDebounced } = useDebounce();

const ResourcesListLayout = computed(() => componentRegistry.get('resources-list-layout'));
const ProjectHeader = computed(() => componentRegistry.get('project-header'));

const projectId = computed(() =>
	typeof route.params.projectId === 'string' ? route.params.projectId : undefined,
);

const apps = ref<AppResponse[]>([]);
const totalApps = ref(0);
const loading = ref(true);
const search = ref('');
const currentPage = ref(1);
const pageSize = ref(APPS_PAGE_SIZE);
const currentSort = ref<AppsSortBy>('updatedAt:desc');

function isSortKey(key: string): key is keyof typeof APPS_SORT_MAP {
	return key in APPS_SORT_MAP;
}

async function fetchApps() {
	loading.value = true;
	try {
		const { data, count } = await listApps(rootStore.restApiContext, projectId.value, {
			skip: (currentPage.value - 1) * pageSize.value,
			take: pageSize.value,
			sortBy: currentSort.value,
			name: search.value || undefined,
		});
		apps.value = data;
		totalApps.value = count;
	} catch (error) {
		toast.showError(error, i18n.baseText('apps.list.error'));
	} finally {
		loading.value = false;
	}
}

async function onSearchUpdated(value: string) {
	search.value = value;
	currentPage.value = 1;
	await callDebounced(fetchApps, { debounceTime: DEBOUNCE_TIME.INPUT.SEARCH, trailing: true });
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
	await callDebounced(fetchApps, {
		debounceTime: DEBOUNCE_TIME.API.RESOURCE_SEARCH,
		trailing: true,
	});
}

function onAppDeleted(appId: string) {
	apps.value = apps.value.filter((app) => app.id !== appId);
	totalApps.value = Math.max(0, totalApps.value - 1);
	if (apps.value.length === 0 && currentPage.value > 1) {
		currentPage.value -= 1;
	}
	void fetchApps();
}
</script>

<template>
	<component
		:is="ResourcesListLayout"
		v-if="ResourcesListLayout"
		resource-key="apps"
		type="list-paginated"
		tab-key="apps"
		:resources="apps"
		:initialize="fetchApps"
		:loading="false"
		:resources-refreshing="loading"
		:disabled="false"
		:sort-options="Object.keys(APPS_SORT_MAP)"
		:type-props="{ itemSize: 80 }"
		:custom-page-size="APPS_PAGE_SIZE"
		:total-items="totalApps"
		:dont-perform-sorting-and-filtering="true"
		:shareable="false"
		:ui-config="{ searchEnabled: true, showFiltersDropdown: false, sortEnabled: true }"
		@update:search="onSearchUpdated"
		@update:pagination-and-sort="onPaginationAndSortUpdated"
	>
		<template #header>
			<component :is="ProjectHeader" v-if="ProjectHeader" />
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
