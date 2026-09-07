<script setup lang="ts">
import {
	N8nButton,
	N8nIconButton,
	N8nInput,
	N8nOption,
	N8nSegmentControl,
	N8nSelect,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSection,
	N8nTabs,
	N8nText,
	N8nToggle,
	N8nToggleGroup,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue';
import { useRouter } from 'vue-router';

import CopyInput from '@/app/components/CopyInput.vue';
import PageViewLayout from '@/app/components/layouts/PageViewLayout.vue';
import { useUIStore } from '@/app/stores/ui.store';
import AppBreadcrumbs from '@/features/apps/AppBreadcrumbs.vue';
import PageCard from '@/features/apps/PageCard.vue';
import PagePreviewFrame from '@/features/apps/components/PagePreviewFrame.vue';
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

type BuilderMode = 'build' | 'preview';
type PreviewDevice = 'desktop' | 'mobile';
type BuildTab = 'settings' | 'code';

const PREVIEW_WIDTHS: Record<PreviewDevice, string> = { desktop: '100%', mobile: '390px' };

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
const mode = ref<BuilderMode>('build');
const device = ref<PreviewDevice>('desktop');
const buildTab = ref<BuildTab>('settings');
const previewFrame = useTemplateRef<InstanceType<typeof PagePreviewFrame>>('previewFrame');

const modeOptions = computed(() => [
	{ label: i18n.baseText('apps.builder.build'), value: 'build' as const },
	{ label: i18n.baseText('apps.builder.preview'), value: 'preview' as const },
]);

const buildTabOptions = computed(() => [
	{ value: 'settings' as const, label: i18n.baseText('apps.page.tabs.settings') },
	{
		value: 'code' as const,
		label: i18n.baseText('apps.builder.code'),
		disabled: true,
		tooltip: i18n.baseText('apps.builder.codeComingSoon'),
	},
]);

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

const onDeviceChange = (value: unknown) => {
	if (value === 'desktop' || value === 'mobile') device.value = value;
};

onMounted(initialize);

// Navigating between sibling pages (e.g. via the breadcrumb) reuses this same
// route component instance — onMounted only fires once, so re-run on a pageId
// change or the view keeps showing the previous page.
watch(() => props.pageId, initialize);
</script>

<template>
	<PageViewLayout data-test-id="page-view">
		<div :class="$style.builder">
			<div :class="$style.toolbar">
				<div :class="$style.toolbarStart">
					<AppBreadcrumbs
						v-if="app"
						:project-id="projectId"
						:app-id="appId"
						:app-name="app.name"
						:current-page-id="pageId"
					/>
				</div>
				<N8nSegmentControl
					v-model="mode"
					:options="modeOptions"
					size="small"
					data-test-id="page-builder-mode"
				/>
				<div :class="$style.toolbarEnd">
					<template v-if="app">
						<CopyInput :class="$style.urlCopy" :value="pageUrl" collapse data-test-id="page-url" />
						<N8nButton :loading="saving" size="small" data-test-id="page-save" @click="onSave">
							{{ i18n.baseText('apps.page.save') }}
						</N8nButton>
						<N8nButton
							icon-only
							icon="trash-2"
							variant="subtle"
							size="small"
							:aria-label="i18n.baseText('generic.delete')"
							data-test-id="page-delete"
							@click="onDelete"
						/>
					</template>
				</div>
			</div>

			<div
				v-if="app && mode === 'preview'"
				:class="$style.preview"
				data-test-id="page-builder-preview"
			>
				<div :class="$style.previewBar">
					<N8nToggleGroup
						:model-value="device"
						variant="ghost"
						size="small"
						data-test-id="page-preview-device"
						@update:model-value="onDeviceChange"
					>
						<template #default="{ variant, size }">
							<N8nToggle
								value="desktop"
								:label="i18n.baseText('apps.builder.desktop')"
								icon="monitor"
								:variant="variant"
								:size="size"
								data-test-id="page-preview-device-desktop"
							/>
							<N8nToggle
								value="mobile"
								:label="i18n.baseText('apps.builder.mobile')"
								icon="smartphone"
								:variant="variant"
								:size="size"
								data-test-id="page-preview-device-mobile"
							/>
						</template>
					</N8nToggleGroup>
					<N8nTooltip :content="i18n.baseText('apps.builder.refresh')">
						<N8nIconButton
							icon="refresh-cw"
							variant="ghost"
							size="small"
							:aria-label="i18n.baseText('apps.builder.refresh')"
							data-test-id="page-preview-refresh"
							@click="previewFrame?.refresh()"
						/>
					</N8nTooltip>
				</div>
				<PagePreviewFrame ref="previewFrame" :page-url="pageUrl" :width="PREVIEW_WIDTHS[device]" />
			</div>

			<div v-else-if="app" :class="$style.build" data-test-id="page-builder-build">
				<N8nTabs
					v-model="buildTab"
					:options="buildTabOptions"
					size="small"
					variant="modern"
					data-test-id="page-builder-tabs"
				/>

				<div v-if="buildTab === 'settings'" :class="$style.container">
					<N8nSettingsSection>
						<N8nSettingsRowGroup>
							<N8nSettingsRow
								:title="i18n.baseText('apps.page.input.route.label')"
								:description="i18n.baseText('apps.page.add.input.route.hint')"
								:max-description-lines="3"
							>
								<template #action>
									<N8nInput
										v-model="route"
										:placeholder="i18n.baseText('apps.page.add.input.route.placeholder')"
										data-test-id="page-route-input"
									/>
								</template>
							</N8nSettingsRow>
							<N8nSettingsRow
								:title="i18n.baseText('apps.page.input.dataWorkflow.label')"
								:description="i18n.baseText('apps.page.input.dataWorkflow.hint')"
								:max-description-lines="3"
							>
								<template #action>
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
								</template>
							</N8nSettingsRow>
						</N8nSettingsRowGroup>
					</N8nSettingsSection>

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
			</div>
		</div>
	</PageViewLayout>
</template>

<style lang="scss" module>
.builder {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
	gap: var(--spacing--sm);
}

.toolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.toolbarStart,
.toolbarEnd {
	display: flex;
	flex: 1;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.toolbarEnd {
	justify-content: flex-end;
}

.urlCopy {
	max-width: 260px;
	min-width: 0;
}

.preview {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
	border: var(--border);
	border-radius: var(--radius--lg);
	overflow: hidden;
	background: var(--background--surface);
}

.previewBar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border-bottom: var(--border);
}

.build {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
	gap: var(--spacing--sm);
	overflow: auto;
}

.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
	padding-bottom: var(--spacing--lg);
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
