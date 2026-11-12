<script setup lang="ts">
import {
	APP_INSPECTOR_MESSAGE_SOURCE,
	appInspectorEventSchema,
	type AppPreviewElement,
	type AppResponse,
	type AppVersionResponse,
} from '@n8n/api-types';
import { useLatestFetch } from '@n8n/composables/useLatestFetch';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nBadge,
	N8nEmptyState,
	N8nIconButton,
	N8nLoading,
	N8nText,
	N8nTooltip,
	type IconName,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';

import { createAppPreview } from '../apps.api';
import { getAppVersionLabel, type AppVersions } from '../composables/useAppVersions';
import AppPreviewOptionMenu from './AppPreviewOptionMenu.vue';

const SCREEN_SIZES = ['desktop', 'tablet', 'mobile'] as const;
type ScreenSize = (typeof SCREEN_SIZES)[number];
const SCREEN_WIDTHS: Record<ScreenSize, string> = {
	desktop: '100%',
	tablet: '768px',
	mobile: '375px',
};

const THEMES = ['light', 'dark'] as const;
type PreviewTheme = (typeof THEMES)[number];

const OPTION_ICONS: Record<ScreenSize | PreviewTheme, IconName> = {
	desktop: 'monitor',
	tablet: 'tablet',
	mobile: 'smartphone',
	light: 'sun',
	dark: 'moon',
};
const GRANT_REFRESH_MS = 55 * 60 * 1000;

function editorTheme(): PreviewTheme {
	const theme = document.body.dataset.theme;
	if (theme === 'light' || theme === 'dark') return theme;
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const props = defineProps<{
	projectId: string;
	app: AppResponse;
	versions: AppVersions;
	inspectable?: boolean;
	elementSelected?: boolean;
}>();

const emit = defineEmits<{ 'element-selected': [element: AppPreviewElement] }>();

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();
const latestFetch = useLatestFetch();

const { head, latestBuilt, building } = props.versions;

type Preview = { version: AppVersionResponse; url: string };

const preview = ref<Preview | null>(null);
const granting = ref(false);
const grantFailed = ref(false);
const screenSize = ref<ScreenSize>('desktop');
const theme = ref<PreviewTheme>(editorTheme());
const inspecting = ref(false);
const frame = useTemplateRef<HTMLIFrameElement>('frame');
let refreshTimer: ReturnType<typeof setTimeout> | undefined;

const sizeOptions = computed(() =>
	SCREEN_SIZES.map((value) => ({
		value,
		label: i18n.baseText(`apps.preview.size.${value}`),
		icon: OPTION_ICONS[value],
	})),
);
const themeOptions = computed(() =>
	THEMES.map((value) => ({
		value,
		label: i18n.baseText(`apps.preview.theme.${value}`),
		icon: OPTION_ICONS[value],
	})),
);
const previewOrigin = computed(() =>
	preview.value ? new URL(preview.value.url).origin : undefined,
);
const loading = computed(() => props.versions.loading.value || granting.value);
const failed = computed(() => props.versions.failed.value || grantFailed.value);
const buildFailed = computed(() => head.value?.buildStatus === 'failed');
const versionLabel = computed(() => {
	const version = preview.value?.version;
	return version ? getAppVersionLabel(version) : null;
});

async function grant(versionId: string) {
	return await createAppPreview(rootStore.restApiContext, props.projectId, props.app.id, versionId);
}

function showPreview(next: Preview | null) {
	clearTimeout(refreshTimer);
	preview.value = next;
	if (next) refreshTimer = setTimeout(async () => await show(true), GRANT_REFRESH_MS);
}

async function show(force = false) {
	const version = latestBuilt.value;
	if (!force && version?.id === preview.value?.version.id) return;
	const isLatest = latestFetch.next();
	if (!version) {
		granting.value = false;
		showPreview(null);
		return;
	}
	granting.value = true;
	try {
		const { url } = await grant(version.id);
		if (!isLatest()) return;
		showPreview({ version, url });
		grantFailed.value = false;
	} catch (error) {
		if (!isLatest()) return;
		grantFailed.value = true;
		toast.showError(error, i18n.baseText('apps.preview.loadError'));
	} finally {
		if (isLatest()) granting.value = false;
	}
}

async function reload() {
	await props.versions.refresh();
	if (!props.versions.failed.value) await show(true);
}

async function openInNewTab() {
	const version = preview.value?.version;
	if (!version) return;
	const tab = window.open('about:blank', '_blank');
	if (!tab) return;
	tab.opener = null;
	try {
		tab.location.href = (await grant(version.id)).url;
	} catch (error) {
		tab.close();
		toast.showError(error, i18n.baseText('apps.preview.loadError'));
	}
}

function postInspectCommand(type: 'inspect:enable' | 'inspect:disable' | 'inspect:clear') {
	if (!previewOrigin.value) return;
	frame.value?.contentWindow?.postMessage(
		{ source: APP_INSPECTOR_MESSAGE_SOURCE, type },
		previewOrigin.value,
	);
}

function setInspecting(value: boolean) {
	inspecting.value = value;
	postInspectCommand(value ? 'inspect:enable' : 'inspect:disable');
}

function onFrameLoad() {
	if (inspecting.value) postInspectCommand('inspect:enable');
}

function onMessage(event: MessageEvent<unknown>) {
	if (!inspecting.value) return;
	if (event.source !== frame.value?.contentWindow || event.origin !== previewOrigin.value) return;
	const parsed = appInspectorEventSchema.safeParse(event.data);
	if (!parsed.success) return;
	inspecting.value = false;
	if (parsed.data.type === 'inspect:selected') emit('element-selected', parsed.data.element);
}

function onKeyDown(event: KeyboardEvent) {
	if (event.key === 'Escape' && inspecting.value) setInspecting(false);
}

watch(
	() => props.elementSelected,
	(selected, wasSelected) => {
		if (wasSelected && !selected) postInspectCommand('inspect:clear');
	},
);

onMounted(() => {
	window.addEventListener('message', onMessage);
	window.addEventListener('keydown', onKeyDown);
});

watch(
	() => latestBuilt.value?.id,
	async () => await show(),
	{ immediate: true },
);

onBeforeUnmount(() => {
	window.removeEventListener('message', onMessage);
	window.removeEventListener('keydown', onKeyDown);
	clearTimeout(refreshTimer);
	latestFetch.invalidate();
});
</script>

<template>
	<div :class="$style.preview" data-test-id="app-preview">
		<div :class="$style.toolbar">
			<div :class="$style.left">
				<N8nTooltip :content="i18n.baseText('apps.preview.reload')">
					<N8nIconButton
						icon="refresh-cw"
						variant="ghost"
						size="small"
						:aria-label="i18n.baseText('apps.preview.reload')"
						:loading="loading"
						data-test-id="app-preview-reload"
						@click="reload"
					/>
				</N8nTooltip>
				<N8nBadge v-if="building" variant="info" data-test-id="app-preview-status">
					{{ i18n.baseText('apps.preview.building') }}
				</N8nBadge>
				<N8nBadge v-else-if="buildFailed" variant="danger" data-test-id="app-preview-status">
					{{ i18n.baseText('apps.preview.buildFailed') }}
				</N8nBadge>
			</div>
			<N8nText
				v-if="inspecting"
				size="small"
				color="text-light"
				:class="$style.version"
				data-test-id="app-preview-inspect-hint"
			>
				{{ i18n.baseText('apps.preview.inspect.hint') }}
			</N8nText>
			<N8nText
				v-else-if="versionLabel"
				size="small"
				color="text-light"
				:class="$style.version"
				data-test-id="app-preview-version"
			>
				{{ i18n.baseText('apps.preview.version', { interpolate: { version: versionLabel } }) }}
			</N8nText>
			<div :class="$style.right">
				<AppPreviewOptionMenu
					v-model="screenSize"
					:options="sizeOptions"
					:label="i18n.baseText('apps.preview.size.label')"
					data-test-id="app-preview-size"
				/>
				<AppPreviewOptionMenu
					v-model="theme"
					:options="themeOptions"
					:label="i18n.baseText('apps.preview.theme.label')"
					data-test-id="app-preview-theme"
				/>
				<N8nTooltip :content="i18n.baseText('apps.preview.openInNewTab')">
					<N8nIconButton
						icon="external-link"
						variant="ghost"
						size="small"
						:aria-label="i18n.baseText('apps.preview.openInNewTab')"
						:disabled="!preview"
						data-test-id="app-preview-open"
						@click="openInNewTab"
					/>
				</N8nTooltip>
			</div>
		</div>

		<div :class="$style.stage">
			<N8nLoading
				v-if="loading && !preview && !failed"
				:loading="true"
				:rows="3"
				data-test-id="app-preview-loading"
			/>
			<N8nEmptyState
				v-else-if="failed && !preview"
				:icon="{ type: 'icon', value: 'triangle-alert' }"
				:heading="i18n.baseText('apps.preview.error.heading')"
				:description="i18n.baseText('apps.preview.error.description')"
				data-test-id="app-preview-error"
			/>
			<iframe
				v-else-if="preview"
				:key="preview.url"
				ref="frame"
				:src="preview.url"
				:title="i18n.baseText('apps.preview.frameTitle', { interpolate: { name: app.name } })"
				:style="{ width: SCREEN_WIDTHS[screenSize], colorScheme: theme }"
				:class="$style.frame"
				sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads"
				data-test-id="app-preview-frame"
				@load="onFrameLoad"
			/>
			<N8nEmptyState
				v-else-if="building"
				:icon="{ type: 'icon', value: 'wrench' }"
				:heading="i18n.baseText('apps.preview.firstBuild.heading')"
				:description="i18n.baseText('apps.preview.firstBuild.description')"
				data-test-id="app-preview-first-build"
			/>
			<N8nEmptyState
				v-else-if="buildFailed"
				:icon="{ type: 'icon', value: 'triangle-alert' }"
				:heading="i18n.baseText('apps.preview.buildFailedState.heading')"
				:description="i18n.baseText('apps.preview.buildFailedState.description')"
				data-test-id="app-preview-build-failed"
			/>
			<N8nEmptyState
				v-else
				:icon="{ type: 'icon', value: 'eye' }"
				:heading="i18n.baseText('apps.preview.empty.heading')"
				:description="i18n.baseText('apps.preview.empty.description')"
				data-test-id="app-preview-empty"
			/>
			<div v-if="inspectable && preview" :class="$style.modes" data-test-id="app-preview-modes">
				<N8nTooltip :content="i18n.baseText('apps.preview.inspect.browse')">
					<N8nIconButton
						icon="mouse-pointer"
						variant="ghost"
						size="small"
						:class="{ [$style.active]: !inspecting }"
						:aria-label="i18n.baseText('apps.preview.inspect.browse')"
						:aria-pressed="!inspecting"
						data-test-id="app-preview-mode-browse"
						@click="setInspecting(false)"
					/>
				</N8nTooltip>
				<N8nTooltip :content="i18n.baseText('apps.preview.inspect.select')">
					<N8nIconButton
						icon="crosshair"
						variant="ghost"
						size="small"
						:class="{ [$style.active]: inspecting }"
						:aria-label="i18n.baseText('apps.preview.inspect.select')"
						:aria-pressed="inspecting"
						data-test-id="app-preview-mode-select"
						@click="setInspecting(true)"
					/>
				</N8nTooltip>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.preview {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
}

.toolbar {
	display: grid;
	grid-template-columns: minmax(max-content, 1fr) minmax(0, auto) minmax(max-content, 1fr);
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xs) var(--spacing--md) var(--spacing--2xs) var(--spacing--2xs);
}

.left,
.right {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.left {
	grid-column: 1;
}

.right {
	grid-column: 3;
	justify-content: flex-end;

	> * {
		flex-shrink: 0;
	}
}

.modes {
	position: absolute;
	bottom: calc(var(--spacing--xs) * 2);
	left: 50%;
	transform: translateX(-50%);
	display: flex;
	gap: var(--spacing--2xs);
	padding: var(--spacing--4xs);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
	box-shadow: var(--shadow--sm);
}

.active {
	background: var(--background--subtle);
}

.version {
	grid-column: 2;
	min-width: 0;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.stage {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	flex: 1;
	min-height: 0;
	padding: 0 var(--spacing--xs) var(--spacing--xs);
	overflow: auto;
}

.frame {
	flex: 1;
	max-width: 100%;
	border: var(--border);
	border-radius: var(--radius--sm);
	transition: width var(--duration--snappy) var(--easing--ease-out);
}
</style>
