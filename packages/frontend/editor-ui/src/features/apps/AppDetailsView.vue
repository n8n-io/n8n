<script setup lang="ts">
import type { AppPreviewStatus, InstanceAiAppPreviewDiagnostic } from '@n8n/api-types';
import {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nIconButton,
	N8nSegmentControl,
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
import AppBreadcrumbs from '@/features/apps/AppBreadcrumbs.vue';
import PageCard from '@/features/apps/PageCard.vue';
import AppPreviewFrame from '@/features/apps/components/AppPreviewFrame.vue';
import type { InspectedElement } from '@/features/apps/components/AppPreviewFrame.vue';
import AppThemeEditor from '@/features/apps/components/AppThemeEditor.vue';
import { useAppsStore } from '@/features/apps/apps.store';
import { useAppDeletion } from '@/features/apps/useAppDeletion';
import { useAppElementSelection } from '@/features/apps/useAppElementSelection';
import { useAppPageAssistant } from '@/features/apps/useAppPageAssistant';
import { APP_PAGE_DETAILS, PROJECT_APPS } from '@/features/apps/apps.constants';
import type { App } from '@/features/apps/apps.types';
import { buildPageRows, getChildCounts, getFullRoutePath } from '@/features/apps/pageTree.utils';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useInstanceAiAvailable } from '@/features/ai/instanceAi/composables/useInstanceAiAvailability';
import { useInstanceAiHandoff } from '@/features/ai/instanceAi/composables/useInstanceAiHandoff';

type BuilderMode = 'build' | 'preview';
type PreviewDevice = 'desktop' | 'mobile';
type BuildTab = 'pages' | 'theme' | 'code';

const PREVIEW_WIDTHS: Record<PreviewDevice, string> = { desktop: '100%', mobile: '390px' };

const props = withDefaults(
	defineProps<{
		projectId: string;
		appId: string;
		/** Embedded in the Instance AI preview tab: no page chrome, no navigation actions. */
		artifactMode?: boolean;
		/** Latest build the thread produced; overrides the stored active version while embedded. */
		artifactVersionId?: string;
		/** Page to open the preview to while embedded, e.g. when the thread was opened from that page's inspector. */
		artifactPagePath?: string;
		/** Dev-server URL of the thread's sandbox; shown instead of the build while present. */
		liveUrl?: string;
		/** Last answer of the live-preview ensure call; drives the banner and the Live badge. */
		liveStatus?: AppPreviewStatus;
	}>(),
	{
		artifactMode: false,
		artifactVersionId: undefined,
		artifactPagePath: undefined,
		liveUrl: undefined,
		liveStatus: undefined,
	},
);

const emit = defineEmits<{
	'assistant-handoff': [prompt: string];
	diagnostic: [InstanceAiAppPreviewDiagnostic];
}>();

const i18n = useI18n();
const toast = useToast();
const router = useRouter();
const documentTitle = useDocumentTitle();
const { confirmAndDeleteApp } = useAppDeletion();
const { requestPageChange } = useAppPageAssistant();
const { selectElement } = useAppElementSelection();
const instanceAiAvailable = useInstanceAiAvailable();
const { openAppArtifactThread } = useInstanceAiHandoff();

const appsStore = useAppsStore();

const app = ref<App | null>(null);
const loading = ref(false);
const mode = ref<BuilderMode>('build');
const device = ref<PreviewDevice>('desktop');
const buildTab = ref<BuildTab>('pages');
const inspecting = ref(false);
const previewFrame = useTemplateRef<InstanceType<typeof AppPreviewFrame>>('previewFrame');

const rootPages = computed(() => appsStore.pages.filter((page) => page.parentPageId === null));
const childCounts = computed(() => getChildCounts(appsStore.pages));

// The tree, indented, down to MAX_INLINE_PAGE_LEVELS deep — deeper pages
// still exist, just require opening their nearest shown ancestor to reach.
const pageRows = computed(() => buildPageRows(appsStore.pages, null));

const appUrl = computed(() =>
	app.value ? `${window.location.origin}/apps/${app.value.namespace}/` : '',
);

const versionId = computed(
	() => props.artifactVersionId ?? app.value?.activeVersionId ?? undefined,
);

const hasPreviewSource = computed(() => Boolean(props.liveUrl ?? versionId.value));

const LIVE_BANNER_KEYS = {
	starting: 'apps.builder.live.starting',
	'no-source': 'apps.builder.live.noSource',
	unsupported: 'apps.builder.live.unsupported',
	unavailable: 'apps.builder.live.unavailable',
} as const;

// Without a build there is nothing to fall back to, so the empty state speaks instead.
const liveBanner = computed(() => {
	const status = props.liveStatus?.status;
	if (!status || status === 'ready' || !versionId.value) return undefined;
	const theme = status === 'starting' || status === 'no-source' ? 'info' : 'warning';
	return { key: LIVE_BANNER_KEYS[status], theme } as const;
});

const modeOptions = computed(() => [
	{ label: i18n.baseText('apps.builder.build'), value: 'build' as const },
	{ label: i18n.baseText('apps.builder.preview'), value: 'preview' as const },
]);

const buildTabOptions = computed(() => [
	{ value: 'pages' as const, label: i18n.baseText('apps.pages') },
	{ value: 'theme' as const, label: i18n.baseText('apps.builder.theme') },
	{
		value: 'code' as const,
		label: i18n.baseText('apps.builder.code'),
		disabled: true,
		tooltip: i18n.baseText('apps.builder.codeComingSoon'),
	},
]);

const showErrorAndGoBack = async (error: unknown) => {
	toast.showError(error, i18n.baseText('apps.getDetails.error'));
	if (props.artifactMode) return;
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
		mode.value = hasPreviewSource.value ? 'preview' : 'build';
		if (!props.artifactMode) {
			documentTitle.set(`${i18n.baseText('apps.apps')} > ${result.name}`);
		}
	} catch (error) {
		await showErrorAndGoBack(error);
	} finally {
		loading.value = false;
	}
};

// Embedded inside the app's own Instance AI thread: fill its composer
// directly rather than opening another one — see `handleAppPreviewAssistantHandoff`.
const onEmbeddedDraft = props.artifactMode
	? (prompt: string) => emit('assistant-handoff', prompt)
	: undefined;

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

const onAddRootPage = async () => {
	if (!app.value) return;
	await requestPageChange('add-root', app.value, '', onEmbeddedDraft);
};

const onAddChildPage = async (parentPageId: string) => {
	if (!app.value) return;
	const parent = appsStore.pages.find((page) => page.id === parentPageId);
	if (!parent) return;
	await requestPageChange(
		'add-child',
		app.value,
		getFullRoutePath(appsStore.pages, parent),
		onEmbeddedDraft,
	);
};

const onEditPage = async (pageId: string) => {
	if (!app.value) return;
	const page = appsStore.pages.find((p) => p.id === pageId);
	if (!page) return;
	await requestPageChange(
		'edit',
		app.value,
		getFullRoutePath(appsStore.pages, page),
		onEmbeddedDraft,
	);
};

const onDeletePage = async (pageId: string) => {
	if (!app.value) return;
	const page = appsStore.pages.find((p) => p.id === pageId);
	if (!page) return;
	await requestPageChange(
		'delete',
		app.value,
		getFullRoutePath(appsStore.pages, page),
		onEmbeddedDraft,
	);
};

const onDeviceChange = (value: unknown) => {
	if (value === 'desktop' || value === 'mobile') device.value = value;
};

const onToggleInspect = () => {
	inspecting.value = !inspecting.value;
	if (inspecting.value) previewFrame.value?.enableInspect();
	else previewFrame.value?.disableInspect();
};

// One pick and inspect mode ends (the iframe's own script already turned
// itself off; this keeps the toggle button and AppPreviewFrame's own flag —
// which a later refresh() would otherwise re-arm — in sync with it).
const onElementSelected = async (element: InspectedElement) => {
	inspecting.value = false;
	previewFrame.value?.disableInspect();
	if (!app.value) return;
	await selectElement(app.value, element, props.artifactMode);
};

const onThemeApplied = (updated: App) => {
	app.value = updated;
	mode.value = 'preview';
};

const onOpenInAssistant = async () => {
	if (!app.value) return;
	await openAppArtifactThread(
		{ type: 'app', appId: app.value.id, projectId: props.projectId, name: app.value.name },
		{ source: 'app_builder_page', origin: 'internal', sourceContext: { appId: app.value.id } },
	);
};

onMounted(initialize);

// Navigating to a different app reuses this same route component instance —
// onMounted only fires once, so re-run on an appId change.
watch(() => props.appId, initialize);

// The first build (or the live preview coming up) is what the user was waiting for while on Build.
watch(hasPreviewSource, (next, previous) => {
	if (next && !previous) mode.value = 'preview';
});
</script>

<template>
	<!-- The page layout only adds the page gutter, so a plain div stands in for it inside the assistant's preview tab. -->
	<component
		:is="props.artifactMode ? 'div' : PageViewLayout"
		:class="{ [$style.artifactRoot]: props.artifactMode }"
		data-test-id="app-details-view"
	>
		<div :class="$style.builder">
			<div :class="$style.toolbar">
				<div :class="$style.toolbarStart">
					<AppBreadcrumbs
						v-if="app && !props.artifactMode"
						:project-id="projectId"
						:app-id="appId"
						:app-name="app.name"
					/>
				</div>
				<N8nSegmentControl
					v-model="mode"
					:options="modeOptions"
					size="small"
					data-test-id="app-builder-mode"
				/>
				<div :class="$style.toolbarEnd">
					<template v-if="app">
						<CopyInput :class="$style.urlCopy" :value="appUrl" collapse data-test-id="app-url" />
						<N8nButton
							:href="appUrl"
							target="_blank"
							variant="subtle"
							size="small"
							icon="external-link"
							:disabled="!versionId"
							data-test-id="app-open"
						>
							{{ i18n.baseText('apps.builder.openApp') }}
						</N8nButton>
						<N8nButton
							v-if="!props.artifactMode && instanceAiAvailable"
							variant="subtle"
							size="small"
							icon="sparkles"
							data-test-id="app-open-in-assistant"
							@click="onOpenInAssistant"
						>
							{{ i18n.baseText('apps.builder.openInAssistant') }}
						</N8nButton>
						<N8nButton
							v-if="!props.artifactMode"
							icon-only
							icon="trash-2"
							variant="subtle"
							size="small"
							:aria-label="i18n.baseText('generic.delete')"
							data-test-id="app-delete"
							@click="onDeleteApp"
						/>
					</template>
				</div>
			</div>

			<!-- The default mode depends on the fetched active version, so neither block renders before it. -->
			<div
				v-if="app && mode === 'preview'"
				:class="$style.preview"
				data-test-id="app-builder-preview"
			>
				<div :class="$style.previewBar">
					<N8nToggleGroup
						:model-value="device"
						variant="ghost"
						size="small"
						data-test-id="app-preview-device"
						@update:model-value="onDeviceChange"
					>
						<template #default="{ variant, size }">
							<N8nToggle
								value="desktop"
								:label="i18n.baseText('apps.builder.desktop')"
								icon="monitor"
								:variant="variant"
								:size="size"
								data-test-id="app-preview-device-desktop"
							/>
							<N8nToggle
								value="mobile"
								:label="i18n.baseText('apps.builder.mobile')"
								icon="smartphone"
								:variant="variant"
								:size="size"
								data-test-id="app-preview-device-mobile"
							/>
						</template>
					</N8nToggleGroup>
					<div :class="$style.previewBarEnd">
						<N8nBadge v-if="props.liveUrl" theme="success" data-test-id="app-preview-live-badge">
							{{ i18n.baseText('apps.builder.live.badge') }}
						</N8nBadge>
						<N8nTooltip :content="i18n.baseText('apps.builder.inspect')">
							<N8nIconButton
								icon="mouse-pointer"
								:variant="inspecting ? 'subtle' : 'ghost'"
								size="small"
								:disabled="!hasPreviewSource"
								:aria-label="i18n.baseText('apps.builder.inspect')"
								data-test-id="app-preview-inspect"
								@click="onToggleInspect"
							/>
						</N8nTooltip>
						<N8nTooltip :content="i18n.baseText('apps.builder.refresh')">
							<N8nIconButton
								icon="refresh-cw"
								variant="ghost"
								size="small"
								:disabled="!hasPreviewSource"
								:aria-label="i18n.baseText('apps.builder.refresh')"
								data-test-id="app-preview-refresh"
								@click="previewFrame?.refresh()"
							/>
						</N8nTooltip>
					</div>
				</div>
				<N8nCallout
					v-if="liveBanner"
					:theme="liveBanner.theme"
					slim
					:round-corners="false"
					data-test-id="app-preview-live-banner"
				>
					{{ i18n.baseText(liveBanner.key) }}
				</N8nCallout>
				<AppPreviewFrame
					v-if="app && hasPreviewSource"
					ref="previewFrame"
					:namespace="app.namespace"
					:version-id="versionId"
					:path="props.artifactPagePath"
					:live-url="props.liveUrl"
					:width="PREVIEW_WIDTHS[device]"
					@diagnostic="emit('diagnostic', $event)"
					@element-selected="onElementSelected"
				/>
				<div v-else-if="!loading" :class="$style.emptyState" data-test-id="app-preview-empty">
					<N8nText tag="h2" size="medium" bold>{{
						i18n.baseText('apps.builder.empty.title')
					}}</N8nText>
					<N8nText color="text-light">{{
						i18n.baseText(
							instanceAiAvailable
								? 'apps.builder.empty.description'
								: 'apps.builder.empty.descriptionNoAssistant',
						)
					}}</N8nText>
					<N8nButton
						v-if="!props.artifactMode && instanceAiAvailable"
						size="small"
						icon="sparkles"
						data-test-id="app-preview-empty-open-in-assistant"
						@click="onOpenInAssistant"
					>
						{{ i18n.baseText('apps.builder.openInAssistant') }}
					</N8nButton>
				</div>
			</div>

			<div v-else-if="app" :class="$style.build" data-test-id="app-builder-build">
				<N8nTabs
					v-model="buildTab"
					:options="buildTabOptions"
					size="small"
					variant="modern"
					data-test-id="app-builder-tabs"
				/>
				<div v-if="buildTab === 'pages'" :class="$style.container">
					<div :class="$style.header">
						<N8nText tag="h2" size="medium" bold>{{ i18n.baseText('apps.pages') }}</N8nText>
						<N8nButton size="small" data-test-id="app-page-add-root" @click="onAddRootPage">
							{{ i18n.baseText('apps.page.new') }}
						</N8nButton>
					</div>

					<N8nText v-if="rootPages.length === 0" color="text-light">
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
							@add-child="onAddChildPage"
							@edit="onEditPage"
							@delete="onDeletePage"
						/>
					</div>
				</div>

				<div v-else-if="buildTab === 'theme'" :class="$style.container">
					<AppThemeEditor :project-id="projectId" :app="app" @applied="onThemeApplied" />
				</div>
			</div>
		</div>
	</component>
</template>

<style lang="scss" module>
.artifactRoot {
	height: 100%;
	min-height: 0;
	padding: var(--spacing--xs) var(--spacing--sm);
}

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

.previewBarEnd {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.emptyState {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--lg);
	text-align: center;
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
