<script setup lang="ts">
import {
	N8nActionDropdown,
	N8nButton,
	N8nIconButton,
	N8nTabs,
	N8nToggle,
	N8nToggleGroup,
	N8nTooltip,
} from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import PageViewLayout from '@/app/components/layouts/PageViewLayout.vue';
import AppBreadcrumbs from '@/features/apps/AppBreadcrumbs.vue';
import AppBasicsForm from '@/features/apps/components/AppBasicsForm.vue';
import AppPreview from '@/features/apps/components/AppPreview.vue';
import AppComponentsForm from '@/features/apps/components/AppComponentsForm.vue';
import AppThemeForm from '@/features/apps/components/AppThemeForm.vue';
import PageEditor from '@/features/apps/components/PageEditor.vue';
import PageTree from '@/features/apps/components/PageTree.vue';
import { useAppsStore } from '@/features/apps/apps.store';
import { useAppDeletion } from '@/features/apps/useAppDeletion';
import { useInstanceAiHandoff } from '@/features/ai/instanceAi/composables/useInstanceAiHandoff';
import { APP_DETAILS, APP_PAGE_DETAILS, PROJECT_APPS } from '@/features/apps/apps.constants';
import type { App, AppVersionSummary } from '@/features/apps/apps.types';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';

type BuilderMode = 'settings' | 'edit' | 'preview';
type SettingsTab = 'build' | 'pages' | 'theme' | 'components';

const OPEN_APP = 'open';
const DELETE_APP = 'delete';

const props = withDefaults(
	defineProps<{
		projectId: string;
		appId: string;
		/** Set by the page route: opens that page in Edit mode. */
		pageId?: string;
		/** Embedded in the Instance AI preview tab: no page chrome, no navigation. */
		artifactMode?: boolean;
		/** Page to select first; the first root page when absent. */
		initialPageId?: string | null;
	}>(),
	{ pageId: undefined, artifactMode: false, initialPageId: null },
);

const i18n = useI18n();
const toast = useToast();
const router = useRouter();
const documentTitle = useDocumentTitle();
const { confirmAndDeleteApp } = useAppDeletion();
const { openAppArtifactThread } = useInstanceAiHandoff();

const appsStore = useAppsStore();

const app = ref<App | null>(null);
const publishing = ref(false);
const versions = ref<AppVersionSummary[]>([]);
const mode = ref<BuilderMode>(props.artifactMode ? 'preview' : props.pageId ? 'edit' : 'settings');
const settingsTab = ref<SettingsTab>('build');
const selectedPageId = ref<string | null>(null);

const rootPages = computed(() => appsStore.pages.filter((page) => page.parentPageId === null));
const selectedPage = computed(() =>
	appsStore.pages.find((page) => page.id === selectedPageId.value),
);

const appUrl = computed(() =>
	app.value ? `${window.location.origin}/apps/${app.value.namespace}/` : '',
);

const hasPublishedVersion = computed(() => app.value?.activeVersionId !== null);

const hasUnpublishedChanges = computed(() => {
	if (!app.value?.publishedAt) return hasPublishedVersion.value === false && app.value !== null;
	const publishedAt = new Date(app.value.publishedAt).getTime();
	return (
		new Date(app.value.updatedAt).getTime() > publishedAt ||
		appsStore.pages.some((page) => new Date(page.updatedAt).getTime() > publishedAt)
	);
});

const settingsTabOptions = computed(() => [
	{ value: 'build' as const, label: i18n.baseText('apps.builder.build') },
	{ value: 'pages' as const, label: i18n.baseText('apps.pages') },
	{ value: 'theme' as const, label: i18n.baseText('apps.builder.theme') },
	{ value: 'components' as const, label: i18n.baseText('apps.builder.components') },
]);

const publishMenuItems = computed<Array<ActionDropdownItem<string>>>(() => [
	{
		id: OPEN_APP,
		label: i18n.baseText('apps.builder.openApp'),
		icon: 'external-link',
		disabled: !hasPublishedVersion.value,
	},
	...versions.value.map((version, index) => ({
		id: version.id,
		label: `${new Date(version.createdAt).toLocaleString()}${version.active ? ` (${i18n.baseText('apps.builder.versions.active')})` : ''}`,
		disabled: version.active,
		divided: index === 0,
	})),
	...(props.artifactMode
		? []
		: [
				{
					id: DELETE_APP,
					label: i18n.baseText('apps.delete.app'),
					icon: 'trash-2' as const,
					variant: 'destructive' as const,
					divided: true,
				},
			]),
]);

const showErrorAndGoBack = async (error: unknown) => {
	toast.showError(error, i18n.baseText('apps.getDetails.error'));
	if (props.artifactMode) return;
	await router.push({ name: PROJECT_APPS, params: { projectId: props.projectId } });
};

const initialize = async () => {
	try {
		const [result] = await Promise.all([
			appsStore.getApp(props.projectId, props.appId),
			appsStore.fetchPages(props.projectId, props.appId),
		]);
		app.value = result;
		documentTitle.set(`${i18n.baseText('apps.apps')} > ${result.name}`);

		if (props.pageId && !appsStore.pages.some((page) => page.id === props.pageId)) {
			toast.showError(
				new Error(i18n.baseText('apps.page.notFound')),
				i18n.baseText('apps.page.notFound'),
			);
			mode.value = 'settings';
		}
		const requested = appsStore.pages.find(
			(page) => page.id === props.pageId || page.id === props.initialPageId,
		);
		selectedPageId.value = requested?.id ?? rootPages.value[0]?.id ?? null;
	} catch (error) {
		await showErrorAndGoBack(error);
	}
};

const onModeChange = (value: unknown) => {
	if (value === 'settings' || value === 'edit' || value === 'preview') mode.value = value;
};

const openPageInEditor = (pageId: string) => {
	selectedPageId.value = pageId;
	mode.value = 'edit';
};

const onDeleteApp = async () => {
	if (!app.value) return;
	const deleted = await confirmAndDeleteApp(props.projectId, app.value);
	if (deleted) await router.push({ name: PROJECT_APPS, params: { projectId: props.projectId } });
};

const onOpenInAssistant = async () => {
	if (!app.value) return;
	await openAppArtifactThread(
		{
			type: 'app',
			projectId: props.projectId,
			appId: props.appId,
			name: app.value.name,
			namespace: app.value.namespace,
		},
		{ source: 'app_builder_page', origin: 'internal', sourceContext: { appId: props.appId } },
	);
};

const onAppSaved = (updated: App) => {
	app.value = updated;
	documentTitle.set(`${i18n.baseText('apps.apps')} > ${updated.name}`);
};

const onThemeSaved = (theme: App['theme']) => {
	if (app.value) app.value = { ...app.value, theme };
};

const fetchVersions = async () => {
	versions.value = await appsStore.fetchVersions(props.projectId, props.appId);
};

const onPublish = async () => {
	if (!app.value) return;
	publishing.value = true;
	try {
		const result = await appsStore.publish(props.projectId, props.appId);
		app.value = {
			...app.value,
			activeVersionId: result.versionId,
			publishedAt: new Date().toISOString(),
		};
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('apps.builder.publish.success'),
		});
		await fetchVersions();
	} catch (error) {
		toast.showError(error, i18n.baseText('apps.builder.publish.error'));
	} finally {
		publishing.value = false;
	}
};

const onActivateVersion = async (versionId: string) => {
	if (!app.value) return;
	try {
		app.value = await appsStore.activateVersion(props.projectId, props.appId, versionId);
		await fetchVersions();
	} catch (error) {
		toast.showError(error, i18n.baseText('apps.builder.versions.activate.error'));
	}
};

const onPublishMenuSelect = async (id: string) => {
	if (id === OPEN_APP) window.open(appUrl.value, '_blank');
	else if (id === DELETE_APP) await onDeleteApp();
	else await onActivateVersion(id);
};

onMounted(async () => {
	await initialize();
	await fetchVersions();
});

// Navigating to a different app reuses this same route component instance —
// onMounted only fires once, so re-run on an appId change.
watch(() => props.appId, initialize);

// The selected page vanished (deleted in the Pages tab): fall back to the first root page.
watch(
	() => appsStore.pages,
	() => {
		if (selectedPageId.value && !selectedPage.value) {
			selectedPageId.value = rootPages.value[0]?.id ?? null;
		}
	},
);

// Route <-> state, both ways. Edit mode lives at apps/:appId/pages/:pageId so
// pages are deep-linkable; the equality checks stop the two watchers from
// feeding each other. The artifact panel never navigates.
watch([mode, selectedPageId], () => {
	if (props.artifactMode || !app.value) return;
	const wanted = mode.value === 'edit' ? (selectedPageId.value ?? undefined) : undefined;
	if (wanted === props.pageId) return;
	void router.replace(
		wanted
			? {
					name: APP_PAGE_DETAILS,
					params: { projectId: props.projectId, appId: props.appId, pageId: wanted },
				}
			: { name: APP_DETAILS, params: { projectId: props.projectId, appId: props.appId } },
	);
});

watch(
	() => props.pageId,
	(pageId) => {
		if (props.artifactMode) return;
		if (pageId) openPageInEditor(pageId);
		else if (mode.value === 'edit') mode.value = 'settings';
	},
);
</script>

<template>
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
						:current-page-id="mode === 'edit' ? (selectedPageId ?? undefined) : undefined"
					/>
				</div>
				<N8nToggleGroup
					:model-value="mode"
					variant="ghost"
					size="small"
					data-test-id="app-builder-mode"
					@update:model-value="onModeChange"
				>
					<template #default="{ variant, size }">
						<N8nToggle
							value="settings"
							icon="settings"
							:label="i18n.baseText('apps.builder.settings')"
							:variant="variant"
							:size="size"
							data-test-id="app-mode-settings"
						/>
						<N8nToggle
							value="edit"
							icon="pencil"
							:label="i18n.baseText('apps.builder.edit')"
							:variant="variant"
							:size="size"
							data-test-id="app-mode-edit"
						/>
						<N8nToggle
							value="preview"
							icon="play"
							:label="i18n.baseText('apps.builder.preview')"
							:variant="variant"
							:size="size"
							data-test-id="app-mode-preview"
						/>
					</template>
				</N8nToggleGroup>
				<div :class="$style.toolbarEnd">
					<template v-if="app">
						<N8nTooltip
							v-if="!props.artifactMode"
							:content="i18n.baseText('apps.builder.openInAssistant')"
						>
							<N8nIconButton
								icon="sparkles"
								variant="subtle"
								size="small"
								:aria-label="i18n.baseText('apps.builder.openInAssistant')"
								data-test-id="app-open-in-assistant"
								@click="onOpenInAssistant"
							/>
						</N8nTooltip>
						<N8nTooltip
							v-if="hasUnpublishedChanges"
							:content="i18n.baseText('apps.builder.unpublishedChanges')"
						>
							<span :class="$style.unpublishedBadge" data-test-id="app-unpublished-badge">
								{{ i18n.baseText('apps.builder.unpublishedChanges') }}
							</span>
						</N8nTooltip>
						<div :class="$style.buttonGroup">
							<N8nButton
								:class="$style.groupButtonLeft"
								:loading="publishing"
								size="small"
								data-test-id="app-publish"
								@click="onPublish"
							>
								{{ i18n.baseText('apps.builder.publish') }}
							</N8nButton>
							<N8nActionDropdown
								:items="publishMenuItems"
								placement="bottom-end"
								data-test-id="app-versions-dropdown"
								@select="onPublishMenuSelect"
							>
								<template #activator>
									<N8nIconButton
										:class="$style.groupButtonRight"
										icon="chevron-down"
										size="small"
										:aria-label="i18n.baseText('apps.builder.publishOptions')"
										data-test-id="app-publish-options"
									/>
								</template>
							</N8nActionDropdown>
						</div>
					</template>
				</div>
			</div>

			<template v-if="app">
				<AppPreview
					v-if="mode === 'preview'"
					:project-id="projectId"
					:app-id="appId"
					:app="app"
					:page-id="selectedPageId"
					@update:page-id="selectedPageId = $event"
				/>
				<PageEditor
					v-else-if="mode === 'edit' && selectedPageId"
					:project-id="projectId"
					:app-id="appId"
					:app="app"
					:page-id="selectedPageId"
					@update:page-id="selectedPageId = $event"
				/>
				<div v-else :class="$style.settings" data-test-id="app-builder-settings">
					<N8nTabs
						v-model="settingsTab"
						:options="settingsTabOptions"
						size="small"
						variant="modern"
						data-test-id="app-settings-tabs"
					/>
					<AppBasicsForm
						v-if="settingsTab === 'build'"
						:project-id="projectId"
						:app-id="appId"
						:app="app"
						@saved="onAppSaved"
					/>
					<PageTree
						v-else-if="settingsTab === 'pages'"
						:project-id="projectId"
						:app-id="appId"
						@open="openPageInEditor"
					/>
					<AppThemeForm
						v-else-if="settingsTab === 'theme'"
						:project-id="projectId"
						:app-id="appId"
						:theme="app.theme"
						@saved="onThemeSaved"
					/>
					<AppComponentsForm
						v-else
						:project-id="projectId"
						:app-id="appId"
						:components="app.components"
						@saved="onAppSaved"
					/>
				</div>
			</template>
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

.unpublishedBadge {
	font-size: var(--font-size--3xs);
	color: var(--color--warning);
	white-space: nowrap;
}

.buttonGroup {
	display: inline-flex;
}

.groupButtonLeft {
	border-top-right-radius: 0;
	border-bottom-right-radius: 0;
}

.groupButtonRight {
	border-top-left-radius: 0;
	border-bottom-left-radius: 0;
	border-left: 1px solid var(--color--neutral-white);
}

.settings {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
	gap: var(--spacing--sm);
	overflow: auto;
	padding-bottom: var(--spacing--lg);
}
</style>
