<script setup lang="ts">
import { N8nButton, N8nInput, N8nOption, N8nSelect, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import CopyInput from '@/app/components/CopyInput.vue';
import PageViewLayout from '@/app/components/layouts/PageViewLayout.vue';
import { useUIStore } from '@/app/stores/ui.store';
import AppBreadcrumbs from '@/features/apps/AppBreadcrumbs.vue';
import PageCard from '@/features/apps/PageCard.vue';
import { useAppsStore } from '@/features/apps/apps.store';
import { useAppDeletion } from '@/features/apps/useAppDeletion';
import { ADD_PAGE_MODAL_KEY, APP_DETAILS, APP_PAGE_DETAILS } from '@/features/apps/apps.constants';
import type { App } from '@/features/apps/apps.types';
import {
	formatRoutePath,
	getAncestorPages,
	getChildCounts,
	getPageUrl,
} from '@/features/apps/pageTree.utils';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';

const props = defineProps<{
	projectId: string;
	appId: string;
	pageId: string;
}>();

const i18n = useI18n();
const toast = useToast();
const router = useRouter();
const uiStore = useUIStore();
const documentTitle = useDocumentTitle();
const { confirmAndDeletePage } = useAppDeletion();

const appsStore = useAppsStore();

const app = ref<App | null>(null);
const route = ref('');
const dataWorkflowId = ref<string | null>(null);
const loading = ref(false);
const saving = ref(false);

const pageUrl = computed(() => {
	if (!app.value) return '';
	const ancestors = getAncestorPages(appsStore.pages, props.pageId);
	return getPageUrl(app.value.namespace, ancestors, route.value);
});

const childPages = computed(() =>
	appsStore.pages.filter((page) => page.parentPageId === props.pageId),
);

const childCounts = computed(() => getChildCounts(appsStore.pages));

const showErrorAndGoBack = async (error: unknown) => {
	toast.showError(error, i18n.baseText('apps.page.getDetails.error'));
	await router.push({
		name: APP_DETAILS,
		params: { projectId: props.projectId, appId: props.appId },
	});
};

const initialize = async () => {
	loading.value = true;
	try {
		const [result] = await Promise.all([
			appsStore.getApp(props.projectId, props.appId),
			appsStore.pages.length === 0
				? appsStore.fetchPages(props.projectId, props.appId)
				: Promise.resolve(),
			appsStore.dataWorkflowOptions.length === 0
				? appsStore.fetchDataWorkflows(props.projectId)
				: Promise.resolve(),
		]);
		app.value = result;
		const page = appsStore.pages.find((p) => p.id === props.pageId);
		if (!page) {
			await showErrorAndGoBack(new Error(i18n.baseText('apps.page.notFound')));
			return;
		}
		route.value = page.route;
		dataWorkflowId.value = page.dataWorkflowId;
		documentTitle.set(formatRoutePath(route.value, i18n.baseText('apps.page.index')));
	} catch (error) {
		await showErrorAndGoBack(error);
	} finally {
		loading.value = false;
	}
};

const onSave = async () => {
	saving.value = true;
	try {
		await appsStore.updatePage(props.projectId, props.appId, props.pageId, {
			route: route.value,
			dataWorkflowId: dataWorkflowId.value,
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('apps.page.save.error'));
	} finally {
		saving.value = false;
	}
};

const onDelete = async () => {
	const deleted = await confirmAndDeletePage(props.projectId, props.appId, props.pageId);
	if (deleted) {
		await router.push({
			name: APP_DETAILS,
			params: { projectId: props.projectId, appId: props.appId },
		});
	}
};

const openAddPageModal = (parentPageId: string) => {
	uiStore.openModalWithData({
		name: ADD_PAGE_MODAL_KEY,
		data: { projectId: props.projectId, appId: props.appId, parentPageId },
	});
};

const openPage = async (pageId: string) => {
	await router.push({
		name: APP_PAGE_DETAILS,
		params: { projectId: props.projectId, appId: props.appId, pageId },
	});
};

const onDeleteChildPage = async (pageId: string) => {
	await confirmAndDeletePage(props.projectId, props.appId, pageId);
};

onMounted(initialize);

// Navigating between sibling pages (e.g. via the breadcrumb) reuses this same
// route component instance — onMounted only fires once, so re-run on a pageId
// change or the view keeps showing the previous page.
watch(() => props.pageId, initialize);
</script>

<template>
	<PageViewLayout data-test-id="page-view">
		<template #header>
			<div :class="$style.breadcrumbsRow">
				<AppBreadcrumbs
					v-if="app"
					:project-id="projectId"
					:app-id="appId"
					:app-name="app.name"
					:current-page-id="pageId"
				/>
				<div v-if="app" :class="$style.headerActions">
					<N8nButton :loading="saving" data-test-id="page-save" @click="onSave">
						{{ i18n.baseText('apps.page.save') }}
					</N8nButton>
					<N8nButton
						icon-only
						icon="trash-2"
						variant="subtle"
						:aria-label="i18n.baseText('generic.delete')"
						data-test-id="page-delete"
						@click="onDelete"
					/>
				</div>
			</div>
		</template>

		<div :class="$style.container">
			<div v-if="app" :class="$style.urlCard">
				<CopyInput
					:label="i18n.baseText('apps.page.url.label')"
					:value="pageUrl"
					data-test-id="page-url"
				/>
			</div>

			<div :class="$style.routeRow">
				<N8nText tag="label">{{ i18n.baseText('apps.page.input.route.label') }}</N8nText>
				<N8nInput
					v-model="route"
					:placeholder="i18n.baseText('apps.page.add.input.route.placeholder')"
					data-test-id="page-route-input"
				/>
			</div>
			<N8nText color="text-light" size="small">
				{{ i18n.baseText('apps.page.add.input.route.hint') }}
			</N8nText>

			<div :class="$style.routeRow">
				<N8nText tag="label">{{ i18n.baseText('apps.page.input.dataWorkflow.label') }}</N8nText>
				<N8nSelect
					v-model="dataWorkflowId"
					clearable
					filterable
					:placeholder="i18n.baseText('apps.page.input.dataWorkflow.placeholder')"
					data-test-id="page-data-workflow-select"
				>
					<N8nOption
						v-for="option in appsStore.dataWorkflowOptions"
						:key="option.id"
						:value="option.id"
						:label="option.name"
					/>
				</N8nSelect>
			</div>
			<N8nText color="text-light" size="small">
				{{ i18n.baseText('apps.page.input.dataWorkflow.hint') }}
			</N8nText>

			<div :class="$style.content" data-test-id="page-content-placeholder">
				<N8nText color="text-light">{{ i18n.baseText('apps.page.content.placeholder') }}</N8nText>
			</div>

			<div :class="$style.header">
				<N8nText tag="h2" size="medium" bold>{{ i18n.baseText('apps.page.subPages') }}</N8nText>
				<N8nButton
					v-if="route"
					size="small"
					data-test-id="page-add-child"
					@click="openAddPageModal(pageId)"
				>
					{{ i18n.baseText('apps.page.new') }}
				</N8nButton>
			</div>

			<N8nText v-if="childPages.length === 0" color="text-light">
				{{ i18n.baseText('apps.pages.empty') }}
			</N8nText>

			<div :class="$style.pageGrid">
				<PageCard
					v-for="page in childPages"
					:key="page.id"
					:page="page"
					:child-count="childCounts.get(page.id) ?? 0"
					@open="openPage"
					@add-child="openAddPageModal"
					@delete="onDeleteChildPage"
				/>
			</div>
		</div>
	</PageViewLayout>
</template>

<style lang="scss" module>
.breadcrumbsRow {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
}

.headerActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
	padding-bottom: var(--spacing--lg);
}

.urlCard {
	background-color: var(--background--surface);
	border-radius: var(--radius--lg);
	padding: var(--spacing--md);
	margin-bottom: var(--spacing--sm);
}

.routeRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
}

.content {
	border: 1px dashed var(--border-color);
	border-radius: var(--radius--sm);
	padding: var(--spacing--xl);
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	margin-bottom: var(--spacing--sm);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: var(--spacing--xs);
}

.pageGrid {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	width: 100%;
}
</style>
