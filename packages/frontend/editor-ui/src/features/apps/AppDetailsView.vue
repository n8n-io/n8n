<script setup lang="ts">
import type { DescribedBinding } from '@n8n/api-types';
import type { AppPreviewStatus, InstanceAiAppPreviewDiagnostic } from '@n8n/api-types';
import {
	type ActionDropdownItem,
	N8nActionDropdown,
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nIcon,
	N8nIconButton,
	N8nLink,
	N8nSpinner,
	N8nTabs,
	N8nText,
	N8nToggle,
	N8nToggleGroup,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useClipboard } from '@n8n/composables/useClipboard';
import { useToast } from '@n8n/composables/useToast';
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue';
import { useRouter } from 'vue-router';

import PageViewLayout from '@/app/components/layouts/PageViewLayout.vue';
import TimeAgo from '@/app/components/TimeAgo.vue';
import { useMessage } from '@/app/composables/useMessage';
import { MODAL_CONFIRM } from '@/app/constants';
import AppBreadcrumbs from '@/features/apps/AppBreadcrumbs.vue';
import PageCard from '@/features/apps/PageCard.vue';
import AppBasicsEditor from '@/features/apps/components/AppBasicsEditor.vue';
import AppCodeViewer from '@/features/apps/components/AppCodeViewer.vue';
import AppPreviewFrame from '@/features/apps/components/AppPreviewFrame.vue';
import type { InspectedElement } from '@/features/apps/components/AppPreviewFrame.vue';
import AppThemeEditor from '@/features/apps/components/AppThemeEditor.vue';
import { useAppsStore } from '@/features/apps/apps.store';
import { useAppDeletion } from '@/features/apps/useAppDeletion';
import { useAppElementSelection } from '@/features/apps/useAppElementSelection';
import { useAppPageAssistant } from '@/features/apps/useAppPageAssistant';
import { APP_PAGE_DETAILS, PROJECT_APPS } from '@/features/apps/apps.constants';
import type { App, AppTheme, AppVersion } from '@/features/apps/apps.types';
import {
	buildPageRows,
	formatRoutePath,
	getChildCounts,
	getFullRoutePath,
} from '@/features/apps/pageTree.utils';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';

type BuilderMode = 'build' | 'code' | 'preview';
type PreviewDevice = 'desktop' | 'mobile';
type PreviewTheme = AppTheme['mode'];
type BuildTab = 'build' | 'pages' | 'theme' | 'versions';
type PublishMenuAction = 'open' | 'copy-url' | 'unpublish';

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
		/** Dev-server URL of the app's sandbox; shown instead of the build while present. */
		liveUrl?: string;
		/** State of the thread's live preview, `starting` until the server answers; drives the banner and the Live badge. */
		liveStatus?: AppPreviewStatus;
		/** Changes when an assistant turn has landed on the server; the app is re-read then. */
		refreshKey?: number;
		/** The live preview shows edits the stored publish state does not know about yet. */
		draftDirty?: boolean;
	}>(),
	{
		artifactMode: false,
		artifactVersionId: undefined,
		artifactPagePath: undefined,
		liveUrl: undefined,
		liveStatus: undefined,
		refreshKey: 0,
		draftDirty: false,
	},
);

const emit = defineEmits<{
	'assistant-handoff': [prompt: string];
	diagnostic: [InstanceAiAppPreviewDiagnostic];
	/** The app as the server last returned it; carries its namespace and publish state. */
	'app-loaded': [App];
}>();

const i18n = useI18n();
const toast = useToast();
const clipboard = useClipboard();
const message = useMessage();
const router = useRouter();
const documentTitle = useDocumentTitle();
const { confirmAndDeleteApp, confirmAndDeleteBinding } = useAppDeletion();
const { requestPageChange } = useAppPageAssistant();
const { selectElement } = useAppElementSelection();

const appsStore = useAppsStore();

const app = ref<App | null>(null);
const setApp = (next: App) => {
	app.value = next;
	emit('app-loaded', next);
};
const loading = ref(false);
const publishing = ref(false);
/** Id of the version whose activate/unpublish request is in flight. */
const switchingVersionId = ref<string | null>(null);
const mode = ref<BuilderMode>('preview');
const device = ref<PreviewDevice>('desktop');
const previewTheme = ref<PreviewTheme>('system');
const previewPath = ref(props.artifactPagePath ?? '');
const buildTab = ref<BuildTab>('build');
const inspecting = ref(false);
const previewFrame = useTemplateRef<InstanceType<typeof AppPreviewFrame>>('previewFrame');

const rootPages = computed(() => appsStore.pages.filter((page) => page.parentPageId === null));

const previewPages = computed<Array<ActionDropdownItem<string>>>(() =>
	appsStore.pages.map((page) => {
		const path = getFullRoutePath(appsStore.pages, page);
		return {
			id: page.id,
			label: formatRoutePath(path, i18n.baseText('apps.page.index')),
			checked: path === previewPath.value,
		};
	}),
);
const previewPathLabel = computed(() =>
	formatRoutePath(previewPath.value, i18n.baseText('apps.page.index')),
);
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

// Nothing to publish once the newest source is the served one.
const publishUpToDate = computed(
	() =>
		Boolean(app.value?.activeVersionId) && !app.value?.hasUnpublishedChanges && !props.draftDirty,
);
const publishLabelKey = computed(() => {
	if (publishing.value) return 'apps.builder.publish.inProgress' as const;
	return publishUpToDate.value ? ('generic.published' as const) : ('apps.builder.publish' as const);
});

const publishMenuActions = computed<Array<ActionDropdownItem<PublishMenuAction>>>(() => [
	{ id: 'open', label: i18n.baseText('apps.builder.openApp') },
	{ id: 'copy-url', label: i18n.baseText('apps.builder.copyUrl') },
	{ id: 'unpublish', label: i18n.baseText('apps.builder.versions.unpublish'), divided: true },
]);

// Without a build the preview pane shows the banner alone while n8n restores the
// app and starts its dev server; only `no-source` (nothing stored for the app at
// all) falls back to the "ask the assistant" empty state.
const livePending = computed(
	() =>
		props.artifactMode &&
		!hasPreviewSource.value &&
		props.liveStatus !== undefined &&
		props.liveStatus.status !== 'no-source',
);
const liveStarting = computed(() => livePending.value && props.liveStatus?.status === 'starting');

const showPreviewPane = computed(() => hasPreviewSource.value || livePending.value);

const LIVE_BANNER_KEYS = {
	starting: 'apps.builder.live.starting',
	'no-source': 'apps.builder.live.noSource',
	unsupported: 'apps.builder.live.unsupported',
	unavailable: 'apps.builder.live.unavailable',
} as const;

// "This is the last build." only when the frame below shows one.
const liveBanner = computed(() => {
	const live = props.liveStatus;
	if (!live || live.status === 'ready' || !(versionId.value || livePending.value)) return undefined;
	const theme = live.status === 'starting' || live.status === 'no-source' ? 'info' : 'warning';
	const key =
		live.status === 'unavailable' && live.reason === 'start-failed'
			? 'apps.builder.live.startFailed'
			: LIVE_BANNER_KEYS[live.status];
	const text = versionId.value
		? `${i18n.baseText(key)} ${i18n.baseText('apps.builder.live.lastBuild')}`
		: i18n.baseText(key);
	return { text, theme } as const;
});

const buildTabOptions = computed(() => [
	{ value: 'build' as const, label: i18n.baseText('apps.builder.build'), icon: 'wrench' as const },
	{ value: 'pages' as const, label: i18n.baseText('apps.pages'), icon: 'file' as const },
	{ value: 'theme' as const, label: i18n.baseText('apps.builder.theme'), icon: 'palette' as const },
	{
		value: 'versions' as const,
		label: i18n.baseText('apps.builder.versions'),
		icon: 'history' as const,
	},
]);

// The API reports warnings as one flat list; each starts with the quoted binding key.
// The key is not shown in the UI, so the tooltip drops that prefix.
const bindingWarnings = (key: string) => {
	const prefix = `Binding '${key}':`;
	return appsStore.bindingWarnings
		.filter((warning) => warning.startsWith(prefix))
		.map((warning) => warning.slice(prefix.length).trim());
};

// Warnings about bindings the API left out have no row.
const unlistedBindingWarnings = computed(() =>
	appsStore.bindingWarnings.filter(
		(warning) =>
			!appsStore.bindings.some((binding) => warning.startsWith(`Binding '${binding.key}':`)),
	),
);

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
			appsStore.fetchBindings(props.projectId, props.appId),
		]);
		setApp(result);
		previewTheme.value = result.theme?.mode ?? 'system';
		if (buildTab.value === 'versions') await refreshVersions();
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

const onDeleteBinding = async (binding: DescribedBinding) => {
	await confirmAndDeleteBinding(props.projectId, props.appId, binding);
};

// A toggle group lets the pressed option be clicked again, which yields
// undefined; the builder always shows one of its modes.
const onModeChange = (value: unknown) => {
	if (value === 'build' || value === 'code' || value === 'preview') mode.value = value;
};

const onDeviceChange = (value: unknown) => {
	if (value === 'desktop' || value === 'mobile') device.value = value;
};

const onPreviewThemeChange = (value: unknown) => {
	if (value === 'light' || value === 'dark' || value === 'system') previewTheme.value = value;
};

const onPreviewPageSelect = (pageId: string) => {
	const page = appsStore.pages.find((p) => p.id === pageId);
	if (page) previewPath.value = getFullRoutePath(appsStore.pages, page);
};

const onOpenPreviewTab = () => {
	const src = previewFrame.value?.src;
	if (src) window.open(src, '_blank', 'noopener');
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

// Only the live preview shows the draft; the published build stays as it was until a publish.
const onThemeSaved = (updated: App) => {
	setApp(updated);
	if (props.liveUrl) mode.value = 'preview';
};

const refreshVersions = async () => {
	try {
		await appsStore.fetchVersions(props.projectId, props.appId);
	} catch (error) {
		toast.showError(error, i18n.baseText('apps.builder.versions.error'));
	}
};

const setActiveVersion = async (versionId: string | null, errorTitle: string) => {
	switchingVersionId.value = versionId ?? app.value?.activeVersionId ?? null;
	try {
		setApp(await appsStore.setActiveVersion(props.projectId, props.appId, versionId));
		await refreshVersions();
		toast.showMessage({
			title: i18n.baseText(
				versionId
					? 'apps.builder.versions.activate.success'
					: 'apps.builder.versions.unpublish.success',
			),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, errorTitle);
	} finally {
		switchingVersionId.value = null;
	}
};

const onActivateVersion = async (version: AppVersion) => {
	await setActiveVersion(version.id, i18n.baseText('apps.builder.versions.activate.error'));
};

const onUnpublish = async () => {
	const response = await message.confirm(
		i18n.baseText('apps.builder.versions.unpublish.confirm.message', {
			interpolate: { url: appUrl.value },
		}),
		i18n.baseText('apps.builder.versions.unpublish.confirm.title'),
		{
			confirmButtonText: i18n.baseText('apps.builder.versions.unpublish.confirm.button'),
			cancelButtonText: i18n.baseText('generic.cancel'),
		},
	);
	if (response !== MODAL_CONFIRM) return;
	await setActiveVersion(null, i18n.baseText('apps.builder.versions.unpublish.error'));
};

const onPublish = async () => {
	if (!app.value) return;
	publishing.value = true;
	try {
		const result = await appsStore.publishApp(props.projectId, app.value.id);
		if ('error' in result) {
			toast.showMessage({
				title: i18n.baseText('apps.builder.publish.error'),
				message: result.log ? `${result.message}\n${result.log.slice(-1024)}` : result.message,
				type: 'error',
			});
			return;
		}
		setApp(await appsStore.getApp(props.projectId, app.value.id));
		if (buildTab.value === 'versions') await refreshVersions();
		toast.showMessage({
			title: i18n.baseText('apps.builder.publish.success'),
			message: result.url,
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('apps.builder.publish.error'));
	} finally {
		publishing.value = false;
	}
};

const onPublishMenuSelect = async (action: PublishMenuAction) => {
	if (action === 'open') {
		window.open(appUrl.value, '_blank', 'noopener');
	} else if (action === 'copy-url') {
		await clipboard.copy(appUrl.value);
		toast.showMessage({ title: i18n.baseText('generic.copiedToClipboard'), type: 'success' });
	} else {
		await onUnpublish();
	}
};

// Only the live preview shows the draft; unlike a theme save, stay in Code:
// the user is likely still editing.
const onCodeSaved = async (updated: App) => {
	setApp(updated);
	await appsStore.fetchPages(props.projectId, props.appId);
};

onMounted(initialize);

// Navigating to a different app reuses this same route component instance —
// onMounted only fires once, so re-run on an appId change.
watch(() => props.appId, initialize);

// The first build (or the live preview coming up) is what the user was waiting for while on Build.
watch(showPreviewPane, (next, previous) => {
	if (next && !previous) mode.value = 'preview';
});

// Fetched on demand: the list changes with every assistant turn and publish.
watch(buildTab, async (tab) => {
	if (tab === 'versions') await refreshVersions();
});

// The turn's snapshot decides whether the draft has unpublished changes and
// which pages the app has: routes are derived from the newest snapshot.
watch(
	() => props.refreshKey,
	async () => {
		try {
			const [updated] = await Promise.all([
				appsStore.getApp(props.projectId, props.appId),
				appsStore.fetchPages(props.projectId, props.appId),
			]);
			setApp(updated);
			if (buildTab.value === 'versions') await refreshVersions();
		} catch (error) {
			toast.showError(error, i18n.baseText('apps.getDetails.error'));
		}
	},
);
</script>

<template>
	<!-- The page layout only adds the page gutter, so a plain div stands in for it inside the assistant's preview tab. -->
	<component
		:is="props.artifactMode ? 'div' : PageViewLayout"
		:class="{ [$style.artifactRoot]: props.artifactMode }"
		data-test-id="app-details-view"
	>
		<div :class="$style.builder">
			<AppBreadcrumbs
				v-if="app && !props.artifactMode"
				:project-id="projectId"
				:app-id="appId"
				:app-name="app.name"
			/>
			<div :class="$style.toolbar">
				<div :class="$style.toolbarStart">
					<template v-if="app">
						<span :class="$style.appIcon"><N8nIcon icon="app-window" size="medium" /></span>
						<N8nText tag="h1" size="large" :class="$style.title" data-test-id="app-title">
							{{ app.name }}
						</N8nText>
					</template>
				</div>
				<div
					v-if="app && mode === 'preview'"
					:class="$style.addressBar"
					data-test-id="app-preview-address-bar"
				>
					<div :class="$style.addressPill">
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
						<N8nActionDropdown
							:class="$style.addressMenu"
							:items="previewPages"
							placement="bottom-start"
							:disabled="previewPages.length === 0"
							data-test-id="app-preview-page-menu"
							@select="onPreviewPageSelect"
						>
							<template #activator>
								<button
									type="button"
									:class="$style.addressButton"
									:disabled="previewPages.length === 0"
									data-test-id="app-preview-page"
								>
									<N8nText size="small" bold :class="$style.addressPath">
										{{ previewPathLabel }}
									</N8nText>
									<N8nIcon icon="chevron-down" size="small" :class="$style.addressChevron" />
								</button>
							</template>
						</N8nActionDropdown>
					</div>
					<N8nTooltip :content="i18n.baseText('apps.builder.openPreviewTab')">
						<N8nIconButton
							icon="external-link"
							variant="ghost"
							size="small"
							:disabled="!hasPreviewSource"
							:aria-label="i18n.baseText('apps.builder.openPreviewTab')"
							data-test-id="app-preview-open-tab"
							@click="onOpenPreviewTab"
						/>
					</N8nTooltip>
				</div>
				<div :class="$style.toolbarEnd">
					<N8nToggleGroup
						:model-value="mode"
						variant="ghost"
						size="small"
						:class="$style.modeGroup"
						data-test-id="app-builder-mode"
						@update:model-value="onModeChange"
					>
						<template #default="{ variant, size }">
							<N8nToggle
								value="build"
								:label="i18n.baseText('apps.builder.settings')"
								icon="settings"
								:variant="variant"
								:size="size"
								data-test-id="app-builder-mode-build"
							/>
							<N8nToggle
								value="code"
								:label="i18n.baseText('apps.builder.code')"
								icon="code"
								:variant="variant"
								:size="size"
								data-test-id="app-builder-mode-code"
							/>
							<N8nToggle
								value="preview"
								:label="i18n.baseText('apps.builder.preview')"
								icon="play"
								:variant="variant"
								:size="size"
								data-test-id="app-builder-mode-preview"
							/>
						</template>
					</N8nToggleGroup>
					<template v-if="app">
						<div :class="$style.buttonGroup">
							<N8nTooltip :disabled="!publishUpToDate">
								<template #content>{{ i18n.baseText('apps.builder.publish.upToDate') }}</template>
								<N8nButton
									:class="{ [$style.groupButtonLeft]: app.activeVersionId }"
									variant="ghost"
									size="small"
									:loading="publishing"
									:disabled="publishUpToDate"
									data-test-id="app-publish"
									@click="onPublish"
								>
									<span :class="$style.publishLabel">
										<span
											v-if="app.activeVersionId"
											:class="[
												$style.indicatorDot,
												publishUpToDate ? $style.indicatorPublished : $style.indicatorChanges,
											]"
											data-test-id="app-publish-indicator"
										/>
										<span :class="{ [$style.indicatorPublishedText]: publishUpToDate }">
											{{ i18n.baseText(publishLabelKey) }}
										</span>
									</span>
								</N8nButton>
							</N8nTooltip>
							<N8nActionDropdown
								v-if="app.activeVersionId"
								:items="publishMenuActions"
								placement="bottom-end"
								data-test-id="app-publish-menu"
								@select="onPublishMenuSelect"
							>
								<template #activator>
									<N8nIconButton
										:class="$style.groupButtonRight"
										variant="ghost"
										size="small"
										icon="chevron-down"
										:aria-label="i18n.baseText('node.moreActions')"
										data-test-id="app-publish-menu-button"
									/>
								</template>
							</N8nActionDropdown>
						</div>
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

			<!-- Both panes need the app, so neither renders before it. -->
			<div
				v-if="app && mode === 'preview'"
				:class="[$style.preview, { [$style.previewMobile]: device === 'mobile' }]"
				data-test-id="app-builder-preview"
			>
				<N8nCallout
					v-if="liveBanner"
					:theme="liveBanner.theme"
					slim
					:round-corners="false"
					data-test-id="app-preview-live-banner"
				>
					{{ liveBanner.text }}
				</N8nCallout>
				<AppPreviewFrame
					v-if="app && hasPreviewSource"
					ref="previewFrame"
					:namespace="app.namespace"
					:version-id="versionId"
					:path="previewPath"
					:live-url="props.liveUrl"
					:device="device"
					:theme="previewTheme"
					@diagnostic="emit('diagnostic', $event)"
					@element-selected="onElementSelected"
				/>
				<div v-if="hasPreviewSource" :class="$style.previewTools" data-test-id="app-preview-tools">
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
					<span :class="$style.previewToolsDivider" />
					<N8nToggleGroup
						:model-value="previewTheme"
						variant="ghost"
						size="small"
						data-test-id="app-preview-theme"
						@update:model-value="onPreviewThemeChange"
					>
						<template #default="{ variant, size }">
							<N8nToggle
								value="light"
								:label="i18n.baseText('apps.builder.theme.mode.light')"
								icon="sun"
								:variant="variant"
								:size="size"
								data-test-id="app-preview-theme-light"
							/>
							<N8nToggle
								value="dark"
								:label="i18n.baseText('apps.builder.theme.mode.dark')"
								icon="moon"
								:variant="variant"
								:size="size"
								data-test-id="app-preview-theme-dark"
							/>
							<N8nToggle
								value="system"
								:label="i18n.baseText('apps.builder.theme.mode.system')"
								icon="laptop"
								:variant="variant"
								:size="size"
								data-test-id="app-preview-theme-system"
							/>
						</template>
					</N8nToggleGroup>
					<span :class="$style.previewToolsDivider" />
					<N8nTooltip :content="i18n.baseText('apps.builder.inspect')">
						<N8nIconButton
							icon="mouse-pointer"
							:variant="inspecting ? 'subtle' : 'ghost'"
							size="small"
							:aria-label="i18n.baseText('apps.builder.inspect')"
							data-test-id="app-preview-inspect"
							@click="onToggleInspect"
						/>
					</N8nTooltip>
				</div>
				<div
					v-else-if="liveStarting"
					:class="$style.emptyState"
					data-test-id="app-preview-starting"
				>
					<N8nSpinner />
				</div>
				<div
					v-else-if="!loading && !livePending"
					:class="$style.emptyState"
					data-test-id="app-preview-empty"
				>
					<N8nText tag="h2" size="medium" bold>{{
						i18n.baseText('apps.builder.empty.title')
					}}</N8nText>
					<N8nText color="text-light">{{
						i18n.baseText('apps.builder.empty.description')
					}}</N8nText>
				</div>
			</div>

			<div
				v-else-if="app && mode === 'code'"
				:class="$style.codeContainer"
				data-test-id="app-builder-code"
			>
				<AppCodeViewer
					:project-id="projectId"
					:app-id="appId"
					:refresh-key="props.refreshKey"
					@saved="onCodeSaved"
				/>
			</div>

			<div v-else-if="app" :class="$style.build" data-test-id="app-builder-build">
				<N8nTabs v-model="buildTab" :options="buildTabOptions" data-test-id="app-builder-tabs" />
				<div v-if="buildTab === 'build'" :class="$style.container">
					<AppBasicsEditor :project-id="projectId" :app="app" @saved="setApp" />

					<div :class="$style.connectCard" data-test-id="app-connections">
						<N8nText tag="h2" size="medium" bold>{{ i18n.baseText('apps.connections') }}</N8nText>

						<N8nText
							v-if="appsStore.bindings.length === 0"
							color="text-light"
							data-test-id="app-connections-empty"
						>
							{{ i18n.baseText('apps.connections.empty') }}
						</N8nText>

						<div
							v-for="binding in appsStore.bindings"
							:key="binding.key"
							:class="$style.connectionRow"
							data-test-id="app-connection"
						>
							<N8nIcon :icon="binding.kind === 'dataTable' ? 'table' : 'workflow'" size="large" />
							<N8nText
								v-if="binding.missing"
								size="small"
								color="text-light"
								:class="$style.connectionName"
								data-test-id="app-connection-missing"
							>
								{{ binding.name }}
							</N8nText>
							<N8nLink
								v-else-if="binding.kind === 'dataTable'"
								:to="`/projects/${projectId}/datatables/${binding.dataTableId}`"
								new-window
								theme="text"
								size="small"
								:class="$style.connectionName"
								data-test-id="app-connection-data-table"
							>
								{{ binding.name }}
							</N8nLink>
							<N8nLink
								v-else
								:to="`/workflow/${binding.workflowId}`"
								new-window
								theme="text"
								size="small"
								:class="$style.connectionName"
								data-test-id="app-connection-workflow"
							>
								{{ binding.name }}
							</N8nLink>
							<N8nText
								v-if="binding.kind === 'dataTable' && !binding.missing"
								size="small"
								color="text-light"
								data-test-id="app-connection-access"
							>
								{{
									i18n.baseText(
										binding.permissions.includes('read')
											? binding.permissions.includes('write')
												? 'apps.connections.access.readWrite'
												: 'apps.connections.access.read'
											: 'apps.connections.access.write',
									)
								}}
							</N8nText>
							<N8nTooltip
								v-if="bindingWarnings(binding.key).length > 0"
								:content="bindingWarnings(binding.key).join(' ')"
							>
								<N8nIcon
									icon="triangle-alert"
									color="warning"
									size="small"
									data-test-id="app-connection-warning"
								/>
							</N8nTooltip>
							<N8nTooltip :content="i18n.baseText('generic.disconnect')">
								<N8nIconButton
									icon="trash-2"
									variant="ghost"
									size="small"
									:aria-label="i18n.baseText('generic.disconnect')"
									data-test-id="app-connection-delete"
									@click="onDeleteBinding(binding)"
								/>
							</N8nTooltip>
						</div>

						<N8nCallout
							v-if="unlistedBindingWarnings.length > 0"
							theme="warning"
							data-test-id="app-connections-warning"
						>
							{{ unlistedBindingWarnings.join(' ') }}
						</N8nCallout>
					</div>
				</div>

				<div v-else-if="buildTab === 'pages'" :class="$style.container">
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
					<AppThemeEditor :project-id="projectId" :app="app" @saved="onThemeSaved" />
				</div>

				<div
					v-else-if="buildTab === 'versions'"
					:class="$style.container"
					data-test-id="app-versions"
				>
					<N8nText v-if="appsStore.versions.length === 0" color="text-light">
						{{ i18n.baseText('apps.builder.versions.empty') }}
					</N8nText>
					<div
						v-for="version in appsStore.versions"
						:key="version.id"
						:class="$style.versionRow"
						data-test-id="app-version-row"
					>
						<div :class="$style.versionInfo">
							<N8nText size="small" bold>
								{{
									i18n.baseText(
										version.kind === 'publish'
											? 'apps.builder.versions.kind.publish'
											: 'apps.builder.versions.kind.snapshot',
									)
								}}
							</N8nText>
							<N8nText size="small" color="text-light">
								<TimeAgo :date="version.createdAt" capitalize />
							</N8nText>
							<N8nBadge v-if="version.isActive" theme="success" data-test-id="app-version-active">
								{{ i18n.baseText('apps.builder.versions.active') }}
							</N8nBadge>
						</div>
						<N8nButton
							v-if="version.isActive"
							variant="subtle"
							size="small"
							:loading="switchingVersionId === version.id"
							:disabled="switchingVersionId !== null"
							data-test-id="app-version-unpublish"
							@click="onUnpublish"
						>
							{{ i18n.baseText('apps.builder.versions.unpublish') }}
						</N8nButton>
						<N8nButton
							v-else-if="version.hasDist"
							variant="subtle"
							size="small"
							:loading="switchingVersionId === version.id"
							:disabled="switchingVersionId !== null"
							data-test-id="app-version-activate"
							@click="onActivateVersion(version)"
						>
							{{ i18n.baseText('apps.builder.versions.activate') }}
						</N8nButton>
					</div>
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
	padding-bottom: var(--spacing--sm);
	border-bottom: var(--border);
}

.toolbarStart,
.toolbarEnd {
	display: flex;
	flex: 1;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.toolbarStart {
	gap: var(--spacing--xs);
}

.toolbarEnd {
	justify-content: flex-end;
}

.appIcon {
	display: grid;
	place-items: center;
	flex: none;
	width: var(--spacing--xl);
	height: var(--spacing--xl);
	border-radius: var(--radius--md);
	background: var(--background--subtle);
	color: var(--color--text--tint-1);
}

.title {
	margin: 0;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.modeGroup {
	flex: none;
	border: var(--border);
	border-radius: var(--radius--3xs);
}

.buttonGroup {
	display: inline-flex;
	border: var(--border);
	border-radius: var(--radius--3xs);
}

.groupButtonLeft,
.groupButtonLeft:disabled,
.groupButtonLeft:hover:disabled {
	border-top-right-radius: 0;
	border-bottom-right-radius: 0;
	border-right-color: transparent;
}

.groupButtonLeft:hover {
	border-right-color: inherit;
}

.groupButtonRight {
	border-top-left-radius: 0;
	border-bottom-left-radius: 0;
	border-left: var(--border);
}

.buttonGroup:has(.groupButtonLeft:not(:disabled):hover) .groupButtonRight {
	border-left-color: transparent;
}

.publishLabel {
	display: flex;
	align-items: center;
}

.indicatorDot {
	height: var(--spacing--2xs);
	width: var(--spacing--2xs);
	border-radius: 50%;
	display: inline-block;
	margin-right: var(--spacing--2xs);
}

.indicatorPublished {
	background-color: var(--color--mint-600);
}

.indicatorChanges {
	background-color: var(--color--yellow-500);
}

.indicatorPublishedText {
	color: var(--color--text--tint-1);
}

.preview {
	position: relative;
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
	border: var(--border);
	border-radius: var(--radius--lg);
	overflow: hidden;
	background: var(--background--subtle);
	box-shadow: var(--shadow--sm);
}

// The phone frame is the only box; the pane itself disappears into the page.
.previewMobile {
	border-color: transparent;
	background: transparent;
	box-shadow: none;
}

// Floats over the frame like a browser devtools bar, so the document keeps the whole pane.
.previewTools {
	position: absolute;
	bottom: var(--spacing--sm);
	left: 50%;
	transform: translateX(-50%);
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--4xs);
	border: var(--border);
	border-radius: var(--radius--3xs);
	background: var(--background--surface);
	box-shadow: var(--shadow--md);
}

.previewToolsDivider {
	width: 1px;
	height: var(--spacing--sm);
	margin: 0 var(--spacing--4xs);
	background: var(--border-color);
}

.addressBar {
	display: flex;
	align-items: center;
	flex: none;
	gap: var(--spacing--4xs);
}

.addressPill {
	display: flex;
	align-items: center;
	width: 320px;
	max-width: 40vw;
	padding: var(--spacing--4xs);
	border: var(--border);
	border-radius: var(--radius--3xs);
	background: var(--background--surface);
}

// The dropdown wraps its activator in an inline trigger span (its only element
// child); it has to shrink with the pill so the label can ellipsise.
.addressMenu {
	display: flex;
	min-width: 0;

	> span {
		display: flex;
		min-width: 0;
	}
}

.addressButton {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	min-width: 0;
	max-width: 240px;
	height: 100%;
	min-height: var(--spacing--lg);
	padding: var(--spacing--4xs) var(--spacing--2xs) var(--spacing--4xs) var(--spacing--xs);
	border: 0;
	border-radius: var(--radius--3xs);
	background: none;
	color: var(--color--text);
	cursor: pointer;

	&:hover:not(:disabled) {
		background: var(--background--hover);
	}

	&:disabled {
		cursor: default;
		color: var(--color--text--tint-1);
	}
}

.addressPath {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.addressChevron {
	flex: none;
	color: var(--color--text--tint-1);
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
	gap: var(--spacing--lg);
	padding-top: var(--spacing--xs);
	overflow: auto;
	width: 100%;
	max-width: 900px;
}

.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
	padding-bottom: var(--spacing--lg);
}

// The tree + viewer need a bounded height to fill so each can scroll on its
// own, the same way `.preview` does.
.codeContainer {
	display: flex;
	flex: 1;
	min-height: 0;
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

.connectCard {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--md);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
}

.connectionRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs);
	border-radius: var(--radius);

	&:hover {
		background: var(--background--hover);
	}
}

.connectionName {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.versionRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
}

.versionInfo {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}
</style>
