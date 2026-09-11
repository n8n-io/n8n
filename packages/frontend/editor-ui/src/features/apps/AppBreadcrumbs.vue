<script setup lang="ts">
import { N8nBreadcrumbs } from '@n8n/design-system';
import type { PathItem } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { useAppsStore } from '@/features/apps/apps.store';
import { formatRouteSegment, getAncestorPages } from '@/features/apps/pageTree.utils';

const props = defineProps<{
	projectId: string;
	appId: string;
	appName: string;
	// Omit when the breadcrumb trail ends at the App itself (no specific page open).
	currentPageId?: string;
}>();

const i18n = useI18n();
const router = useRouter();
const appsStore = useAppsStore();

// No leading slash here: the breadcrumb's own separator between items
// already renders one, so "route" wouldn't read "Apps / MyApp / /route".
const routeLabel = (route: string) => formatRouteSegment(route, i18n.baseText('apps.page.index'));

const ancestorPages = computed(() =>
	props.currentPageId ? getAncestorPages(appsStore.pages, props.currentPageId) : [],
);

const items = computed<PathItem[]>(() => {
	const result: PathItem[] = [
		{
			id: 'apps-root',
			label: i18n.baseText('apps.apps'),
			href: `/projects/${props.projectId}/apps`,
		},
		{
			id: props.appId,
			label: props.appName,
			href: props.currentPageId ? `/projects/${props.projectId}/apps/${props.appId}` : undefined,
		},
	];

	for (const page of ancestorPages.value) {
		result.push({
			id: page.id,
			label: routeLabel(page.route),
			href: `/projects/${props.projectId}/apps/${props.appId}/pages/${page.id}`,
		});
	}

	if (props.currentPageId) {
		const currentPage = appsStore.pages.find((page) => page.id === props.currentPageId);
		if (currentPage) {
			result.push({ id: currentPage.id, label: routeLabel(currentPage.route) });
		}
	}

	return result;
});

const onItemSelected = async (item: PathItem) => {
	if (item.href) await router.push(item.href);
};
</script>

<template>
	<N8nBreadcrumbs
		:items="items"
		separator="/"
		data-test-id="app-breadcrumbs"
		@item-selected="onItemSelected"
	/>
</template>
