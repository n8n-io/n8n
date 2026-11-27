<script setup lang="ts">
import {
	APP_INSPECTOR_MESSAGE_SOURCE,
	APP_PREVIEW_FRAME_PARAM,
	appInspectorEventSchema,
	type AppPreviewElement,
	type AppResponse,
	type AppVersionResponse,
} from '@n8n/api-types';
import { useLatestFetch } from '@n8n/composables/useLatestFetch';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nBadge,
	N8nButton,
	N8nEmptyState,
	N8nIconButton,
	N8nHeading,
	N8nLoading,
	N8nSpinner,
	N8nText,
	N8nTooltip,
	type IconName,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';

import { createAppPreview } from '../apps.api';
import type { AppVersions } from '../composables/useAppVersions';
import AppPreviewOptionMenu from './AppPreviewOptionMenu.vue';
import AppFeedbackLink from './feedback/AppFeedbackLink.vue';

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
	assistantWorking?: boolean;
}>();

const emit = defineEmits<{ 'element-selected': [element: AppPreviewElement] }>();

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();
const latestFetch = useLatestFetch();

const { head, latestBuilt, building } = props.versions;

type Preview = {
	version: AppVersionResponse;
	url: string;
	frameUrl: string;
	authorizeUrl: string;
};

const preview = ref<Preview | null>(null);
const frameSrc = ref<string>();
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
// The Assistant saves a version only after its build, so while it works on a new
// app there is no version yet. Show the build state for that whole wait.
const firstBuild = computed(
	() => building.value || (!!props.assistantWorking && !latestBuilt.value && !buildFailed.value),
);

async function grant(versionId: string) {
	return await createAppPreview(rootStore.restApiContext, props.projectId, props.app.id, versionId);
}

function toFrameUrl(url: string): string {
	const frameUrl = new URL(url);
	frameUrl.searchParams.set(APP_PREVIEW_FRAME_PARAM, '1');
	return frameUrl.toString();
}

function showPreview(next: Preview | null) {
	clearTimeout(refreshTimer);
	preview.value = next;
	frameSrc.value = next?.frameUrl;
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
		const { url, authorizeUrl } = await grant(version.id);
		if (!isLatest()) return;
		showPreview({ version, url, frameUrl: toFrameUrl(url), authorizeUrl });
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
	// The first load only prepares the sign-in. The editor opens the sign-in itself, because a
	// browser can drop the n8n session cookie when the preview host redirects the frame.
	if (preview.value && frameSrc.value === preview.value.frameUrl) {
		frameSrc.value = preview.value.authorizeUrl;
		return;
	}
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
				<AppPreviewOptionMenu
					v-model="screenSize"
					:options="sizeOptions"
					:label="i18n.baseText('apps.preview.size.label')"
					:disabled="!preview"
					data-test-id="app-preview-size"
				/>
				<AppPreviewOptionMenu
					v-model="theme"
					:options="themeOptions"
					:label="i18n.baseText('apps.preview.theme.label')"
					:disabled="!preview"
					data-test-id="app-preview-theme"
				/>
			</div>
			<div :class="$style.center">
				<template v-if="inspecting">
					<N8nText
						size="small"
						color="text-light"
						:class="$style.hint"
						data-test-id="app-preview-inspect-hint"
					>
						{{ i18n.baseText('apps.preview.inspect.hint') }}
					</N8nText>
					<N8nButton
						variant="outline"
						size="xsmall"
						data-test-id="app-preview-inspect-cancel"
						@click="setInspecting(false)"
					>
						{{ i18n.baseText('generic.cancel') }}
					</N8nButton>
				</template>
				<template v-else>
					<N8nBadge v-if="building" variant="info" data-test-id="app-preview-status">
						{{ i18n.baseText('apps.preview.building') }}
					</N8nBadge>
					<N8nBadge v-else-if="buildFailed" variant="danger" data-test-id="app-preview-status">
						{{ i18n.baseText('apps.preview.buildFailed') }}
					</N8nBadge>
				</template>
			</div>
			<div :class="$style.right">
				<N8nTooltip v-if="inspectable" :content="i18n.baseText('apps.preview.inspect.select')">
					<N8nButton
						icon="mouse-pointer"
						variant="ghost"
						size="small"
						:class="{ [$style.active]: inspecting }"
						:aria-pressed="inspecting"
						:disabled="!preview"
						data-test-id="app-preview-select"
						@click="setInspecting(!inspecting)"
					>
						{{ i18n.baseText('apps.preview.inspect.selectLabel') }}
					</N8nButton>
				</N8nTooltip>
				<N8nTooltip :content="i18n.baseText('apps.preview.reload')">
					<N8nIconButton
						icon="refresh-cw"
						variant="ghost"
						size="small"
						:class="$style.groupStart"
						:aria-label="i18n.baseText('apps.preview.reload')"
						:loading="loading"
						:disabled="firstBuild && !preview && !failed"
						data-test-id="app-preview-reload"
						@click="reload"
					/>
				</N8nTooltip>
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
				:src="frameSrc"
				:title="i18n.baseText('apps.preview.frameTitle', { interpolate: { name: app.name } })"
				:style="{ width: SCREEN_WIDTHS[screenSize], colorScheme: theme }"
				:class="$style.frame"
				sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads"
				data-test-id="app-preview-frame"
				@load="onFrameLoad"
			/>
			<div
				v-else-if="firstBuild"
				:class="$style.firstBuild"
				role="status"
				data-test-id="app-preview-first-build"
			>
				<N8nSpinner type="grid" size="xlarge" />
				<div :class="$style.firstBuildText">
					<N8nHeading tag="h2" size="xlarge" align="center">
						{{ i18n.baseText('apps.preview.firstBuild.heading') }}
					</N8nHeading>
					<N8nText color="text-base" align="center">
						{{ i18n.baseText('apps.preview.firstBuild.description') }}
					</N8nText>
				</div>
			</div>
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
		</div>
		<AppFeedbackLink :app="app" />
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
	padding: var(--spacing--2xs) var(--spacing--xs);
}

.left,
.center,
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

.center {
	grid-column: 2;
	justify-content: center;
}

.active {
	background: var(--background--active);
}

.groupStart {
	margin-left: calc(var(--spacing--sm) - var(--spacing--2xs));
}

.hint {
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

	// The feedback footer holds the bottom spacing when it shows.
	&:not(:last-child) {
		padding-bottom: 0;
	}
}

.firstBuild {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--md);
	padding: var(--spacing--3xl) var(--spacing--xl);
}

.firstBuildText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	max-width: 32rem;
}

.frame {
	flex: 1;
	max-width: 100%;
	border: var(--border);
	border-radius: var(--radius--sm);
	transition: width var(--duration--snappy) var(--easing--ease-out);
}
</style>
