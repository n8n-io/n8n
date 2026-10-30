<script setup lang="ts">
import type { AppResponse, AppVersionResponse } from '@n8n/api-types';
import { useLatestFetch } from '@n8n/composables/useLatestFetch';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nBadge,
	N8nEmptyState,
	N8nIcon,
	N8nIconButton,
	N8nLoading,
	N8nSegmentControl,
	N8nText,
	N8nTooltip,
	type IconName,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { createAppPreview } from '../apps.api';
import type { AppVersions } from '../composables/useAppVersions';

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

const props = defineProps<{ projectId: string; app: AppResponse; versions: AppVersions }>();

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
let refreshTimer: ReturnType<typeof setTimeout> | undefined;

const sizeOptions = computed(() =>
	SCREEN_SIZES.map((value) => ({ value, label: i18n.baseText(`apps.preview.size.${value}`) })),
);
const themeOptions = computed(() =>
	THEMES.map((value) => ({ value, label: i18n.baseText(`apps.preview.theme.${value}`) })),
);
const loading = computed(() => props.versions.loading.value || granting.value);
const failed = computed(() => props.versions.failed.value || grantFailed.value);
const buildFailed = computed(() => head.value?.buildStatus === 'failed');
const versionLabel = computed(() => {
	const version = preview.value?.version;
	return version ? (version.label ?? version.id.slice(-8)) : null;
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

watch(
	() => latestBuilt.value?.id,
	async () => await show(),
	{ immediate: true },
);

onBeforeUnmount(() => {
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
				<N8nText
					v-if="versionLabel"
					size="small"
					color="text-light"
					data-test-id="app-preview-version"
				>
					{{ i18n.baseText('apps.preview.version', { interpolate: { version: versionLabel } }) }}
				</N8nText>
				<N8nBadge v-if="building" variant="info" data-test-id="app-preview-status">
					{{ i18n.baseText('apps.preview.building') }}
				</N8nBadge>
				<N8nBadge v-else-if="buildFailed" variant="danger" data-test-id="app-preview-status">
					{{ i18n.baseText('apps.preview.buildFailed') }}
				</N8nBadge>
			</div>
			<div :class="$style.right">
				<N8nSegmentControl
					v-model="screenSize"
					:options="sizeOptions"
					size="small"
					data-test-id="app-preview-size"
				>
					<template #option="{ value, label }">
						<span :class="$style.option">
							<N8nIcon :icon="OPTION_ICONS[value]" size="small" />{{ label }}
						</span>
					</template>
				</N8nSegmentControl>
				<N8nSegmentControl
					v-model="theme"
					:options="themeOptions"
					size="small"
					data-test-id="app-preview-theme"
				>
					<template #option="{ value, label }">
						<span :class="$style.option">
							<N8nIcon :icon="OPTION_ICONS[value]" size="small" />{{ label }}
						</span>
					</template>
				</N8nSegmentControl>
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
				:src="preview.url"
				:title="i18n.baseText('apps.preview.frameTitle', { interpolate: { name: app.name } })"
				:style="{ width: SCREEN_WIDTHS[screenSize], colorScheme: theme }"
				:class="$style.frame"
				sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads"
				data-test-id="app-preview-frame"
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
	grid-template-columns: 1fr 1fr;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xs) var(--spacing--md);
}

.left,
.right {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.right {
	justify-content: flex-end;
}

.option {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.stage {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	flex: 1;
	min-height: 0;
	padding: 0 var(--spacing--md) var(--spacing--md);
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
