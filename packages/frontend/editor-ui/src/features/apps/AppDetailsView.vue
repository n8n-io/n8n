<script setup lang="ts">
import { N8nButton, N8nText } from '@n8n/design-system';
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
import { ADD_PAGE_MODAL_KEY, APP_PAGE_DETAILS, PROJECT_APPS } from '@/features/apps/apps.constants';
import type { App } from '@/features/apps/apps.types';
import { getChildCounts } from '@/features/apps/pageTree.utils';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';

const props = defineProps<{
	projectId: string;
	appId: string;
}>();

const i18n = useI18n();
const toast = useToast();
const router = useRouter();
const uiStore = useUIStore();
const documentTitle = useDocumentTitle();
const { confirmAndDeleteApp, confirmAndDeletePage } = useAppDeletion();

const appsStore = useAppsStore();

const app = ref<App | null>(null);
const loading = ref(false);

const rootPages = computed(() => appsStore.pages.filter((page) => page.parentPageId === null));
const childCounts = computed(() => getChildCounts(appsStore.pages));

const appUrl = computed(() =>
	app.value ? `${window.location.origin}/apps/${app.value.namespace}` : '',
);

const showErrorAndGoBack = async (error: unknown) => {
	toast.showError(error, i18n.baseText('apps.getDetails.error'));
	await router.push({ name: PROJECT_APPS, params: { projectId: props.projectId } });
};

const initialize = async () => {
	loading.value = true;
	try {
		const [result] = await Promise.all([
			appsStore.getApp(props.projectId, props.appId),
			appsStore.fetchPages(props.projectId, props.appId),
		]);
		app.value = result;
		documentTitle.set(`${i18n.baseText('apps.apps')} > ${result.name}`);
	} catch (error) {
		await showErrorAndGoBack(error);
	} finally {
		loading.value = false;
	}
};

const openAddPageModal = (parentPageId: string | null) => {
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

const onDeleteApp = async () => {
	if (!app.value) return;
	const deleted = await confirmAndDeleteApp(props.projectId, app.value);
	if (deleted) await router.push({ name: PROJECT_APPS, params: { projectId: props.projectId } });
};

const onDeletePage = async (pageId: string) => {
	await confirmAndDeletePage(props.projectId, props.appId, pageId);
};

onMounted(initialize);

// Navigating to a different app reuses this same route component instance —
// onMounted only fires once, so re-run on an appId change.
watch(() => props.appId, initialize);
</script>

<template>
	<PageViewLayout data-test-id="app-details-view">
		<template #header>
			<div :class="$style.breadcrumbsRow">
				<AppBreadcrumbs v-if="app" :project-id="projectId" :app-id="appId" :app-name="app.name" />
				<N8nButton
					v-if="app"
					icon-only
					icon="trash-2"
					variant="subtle"
					:aria-label="i18n.baseText('generic.delete')"
					data-test-id="app-delete"
					@click="onDeleteApp"
				/>
			</div>
		</template>

		<div :class="$style.container">
			<div v-if="app" :class="$style.urlCard">
				<CopyInput
					:label="i18n.baseText('apps.url.label')"
					:value="appUrl"
					data-test-id="app-url"
				/>
			</div>

			<div :class="$style.header">
				<N8nText tag="h2" size="medium" bold>{{ i18n.baseText('apps.pages') }}</N8nText>
				<N8nButton size="small" data-test-id="app-page-add-root" @click="openAddPageModal(null)">
					{{ i18n.baseText('apps.page.new') }}
				</N8nButton>
			</div>

			<N8nText v-if="rootPages.length === 0" color="text-light">
				{{ i18n.baseText('apps.pages.empty') }}
			</N8nText>

			<div :class="$style.pageGrid">
				<PageCard
					v-for="page in rootPages"
					:key="page.id"
					:page="page"
					:child-count="childCounts.get(page.id) ?? 0"
					@open="openPage"
					@add-child="openAddPageModal"
					@delete="onDeletePage"
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
