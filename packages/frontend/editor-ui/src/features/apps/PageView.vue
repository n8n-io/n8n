<script setup lang="ts">
import {
	N8nButton,
	N8nIconButton,
	N8nSegmentControl,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue';
import { useRouter } from 'vue-router';

import CopyInput from '@/app/components/CopyInput.vue';
import PageViewLayout from '@/app/components/layouts/PageViewLayout.vue';
import AppBreadcrumbs from '@/features/apps/AppBreadcrumbs.vue';
import PageCard from '@/features/apps/PageCard.vue';
import AppPreviewFrame from '@/features/apps/components/AppPreviewFrame.vue';
import type { InspectedElement } from '@/features/apps/components/AppPreviewFrame.vue';
import { useAppsStore } from '@/features/apps/apps.store';
import { useAppElementSelection } from '@/features/apps/useAppElementSelection';
import { useAppPageAssistant } from '@/features/apps/useAppPageAssistant';
import { APP_DETAILS, APP_PAGE_DETAILS } from '@/features/apps/apps.constants';
import type { App } from '@/features/apps/apps.types';
import {
	buildPageRows,
	formatRoutePath,
	getAncestorPages,
	getChildCounts,
	getFullRoutePath,
	getPageUrl,
	joinRouteSegments,
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
const documentTitle = useDocumentTitle();
const { requestPageChange } = useAppPageAssistant();
const { selectElement } = useAppElementSelection();

const appsStore = useAppsStore();

type BuilderMode = 'build' | 'preview';

const app = ref<App | null>(null);
const route = ref('');
const loading = ref(false);
const mode = ref<BuilderMode>('build');
const inspecting = ref(false);
const previewFrame = useTemplateRef<InstanceType<typeof AppPreviewFrame>>('previewFrame');

const versionId = computed(() => app.value?.activeVersionId ?? undefined);

const modeOptions = computed(() => [
	{ label: i18n.baseText('apps.builder.build'), value: 'build' as const },
	{ label: i18n.baseText('apps.builder.preview'), value: 'preview' as const },
]);

const ancestorPages = computed(() => getAncestorPages(appsStore.pages, props.pageId));

const pageUrl = computed(() => {
	if (!app.value) return '';
	return getPageUrl(app.value.namespace, ancestorPages.value, route.value);
});

// Every ancestor's route plus this page's own — what a +/edit/delete prompt
// names the page as, so the assistant can't mistake it for a different page
// that happens to share a route segment (e.g. two different "loading" pages).
const fullPath = computed(() => joinRouteSegments(ancestorPages.value, route.value));

// The descendants of this page, indented, down to MAX_INLINE_PAGE_LEVELS
// deep — deeper pages still exist, just require opening their nearest
// shown ancestor to reach.
const pageRows = computed(() => buildPageRows(appsStore.pages, props.pageId));

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
		]);
		app.value = result;
		const page = appsStore.pages.find((p) => p.id === props.pageId);
		if (!page) {
			await showErrorAndGoBack(new Error(i18n.baseText('apps.page.notFound')));
			return;
		}
		route.value = page.route;
		mode.value = versionId.value ? 'preview' : 'build';
		documentTitle.set(formatRoutePath(route.value, i18n.baseText('apps.page.index')));
	} catch (error) {
		await showErrorAndGoBack(error);
	} finally {
		loading.value = false;
	}
};

const onEdit = async () => {
	if (!app.value) return;
	await requestPageChange('edit', app.value, fullPath.value);
};

const onDelete = async () => {
	if (!app.value) return;
	await requestPageChange('delete', app.value, fullPath.value);
};

const onToggleInspect = () => {
	inspecting.value = !inspecting.value;
	if (inspecting.value) previewFrame.value?.enableInspect();
	else previewFrame.value?.disableInspect();
};

// One pick and inspect mode ends (the iframe's own script already turned
// itself off; this keeps the toggle button and AppPreviewFrame's own flag —
// which a later refresh() would otherwise re-arm — in sync with it). This
// view is never embedded in a thread, so selectElement always opens/reveals
// the app's Instance AI thread with the pick pre-staged.
const onElementSelected = async (element: InspectedElement) => {
	inspecting.value = false;
	previewFrame.value?.disableInspect();
	if (!app.value) return;
	await selectElement(app.value, element, false);
};

const openPage = async (pageId: string) => {
	await router.push({
		name: APP_PAGE_DETAILS,
		params: { projectId: props.projectId, appId: props.appId, pageId },
	});
};

const onAddChildPage = async () => {
	if (!app.value) return;
	await requestPageChange('add-child', app.value, fullPath.value);
};

/** From a descendant card's own "+": adds a child of that specific card, not of the current page. */
const onAddChildUnder = async (parentPageId: string) => {
	if (!app.value) return;
	const page = appsStore.pages.find((p) => p.id === parentPageId);
	if (!page) return;
	await requestPageChange('add-child', app.value, getFullRoutePath(appsStore.pages, page));
};

const onEditDescendantPage = async (pageId: string) => {
	if (!app.value) return;
	const page = appsStore.pages.find((p) => p.id === pageId);
	if (!page) return;
	await requestPageChange('edit', app.value, getFullRoutePath(appsStore.pages, page));
};

const onDeleteDescendantPage = async (pageId: string) => {
	if (!app.value) return;
	const page = appsStore.pages.find((p) => p.id === pageId);
	if (!page) return;
	await requestPageChange('delete', app.value, getFullRoutePath(appsStore.pages, page));
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
				<N8nSegmentControl
					v-if="app"
					v-model="mode"
					:options="modeOptions"
					size="small"
					data-test-id="page-builder-mode"
				/>
				<div v-if="app" :class="$style.headerActions">
					<N8nTooltip :content="i18n.baseText('apps.page.edit')">
						<N8nButton
							icon-only
							icon="pencil"
							variant="subtle"
							:aria-label="i18n.baseText('apps.page.edit')"
							data-test-id="page-edit"
							@click="onEdit"
						/>
					</N8nTooltip>
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

			<div v-if="mode === 'preview' && app && versionId" :class="$style.preview">
				<div :class="$style.previewBar">
					<N8nTooltip :content="i18n.baseText('apps.builder.inspect')">
						<N8nIconButton
							icon="mouse-pointer"
							:variant="inspecting ? 'subtle' : 'ghost'"
							size="small"
							:aria-label="i18n.baseText('apps.builder.inspect')"
							data-test-id="page-preview-inspect"
							@click="onToggleInspect"
						/>
					</N8nTooltip>
				</div>
				<AppPreviewFrame
					ref="previewFrame"
					:namespace="app.namespace"
					:version-id="versionId"
					:path="fullPath"
					@element-selected="onElementSelected"
				/>
			</div>
			<div
				v-else-if="mode === 'preview' && !loading"
				:class="$style.emptyState"
				data-test-id="page-preview-empty"
			>
				<N8nText tag="h2" size="medium" bold>{{
					i18n.baseText('apps.builder.empty.title')
				}}</N8nText>
				<N8nText color="text-light">{{ i18n.baseText('apps.page.content.placeholder') }}</N8nText>
				<N8nButton
					size="small"
					icon="sparkles"
					data-test-id="page-preview-empty-edit"
					@click="onEdit"
				>
					{{ i18n.baseText('apps.builder.openInAssistant') }}
				</N8nButton>
			</div>

			<template v-else-if="mode === 'build'">
				<div :class="$style.content" data-test-id="page-content-placeholder">
					<N8nButton
						variant="subtle"
						icon="sparkles"
						data-test-id="page-content-edit"
						@click="onEdit"
					>
						{{ i18n.baseText('apps.page.content.placeholder') }}
					</N8nButton>
				</div>

				<div :class="$style.header">
					<N8nText tag="h2" size="medium" bold>{{ i18n.baseText('apps.page.subPages') }}</N8nText>
					<N8nButton
						v-if="route"
						size="small"
						data-test-id="page-add-child"
						@click="onAddChildPage"
					>
						{{ i18n.baseText('apps.page.new') }}
					</N8nButton>
				</div>

				<N8nText v-if="pageRows.length === 0" color="text-light">
					{{ i18n.baseText('apps.pages.empty') }}
				</N8nText>

				<div :class="$style.pageGrid">
					<PageCard
						v-for="row in pageRows"
						:key="row.page.id"
						:page="row.page"
						:indent="row.indent"
						:child-count="childCounts.get(row.page.id) ?? 0"
						@open="openPage"
						@add-child="onAddChildUnder"
						@edit="onEditDescendantPage"
						@delete="onDeleteDescendantPage"
					/>
				</div>
			</template>
		</div>
	</PageViewLayout>
</template>

<style lang="scss" module>
.breadcrumbsRow {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	margin-bottom: var(--spacing--lg);
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

.preview {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 400px;
	border: var(--border);
	border-radius: var(--radius--lg);
	overflow: hidden;
	background: var(--background--surface);
}

.previewBar {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border-bottom: var(--border);
}

.emptyState {
	flex: 1;
	min-height: 400px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--lg);
	text-align: center;
}

.pageGrid {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	width: 100%;
}
</style>
