<script setup lang="ts">
import { N8nIconButton, N8nOption, N8nSelect, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useDebounceFn } from '@vueuse/core';
import type { AppContent, AppTheme } from '@n8n/api-types';
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

import { DEBOUNCE_TIME } from '@/app/constants';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import LayoutPanel from '@/features/apps/components/LayoutPanel.vue';
import PageContentEditor from '@/features/apps/components/PageContentEditor.vue';
import { useAppsStore } from '@/features/apps/apps.store';
import type { App, LayoutPreview, Page } from '@/features/apps/apps.types';
import {
	findPageIdByPath,
	flattenPageTree,
	getPageLabel,
	getPageOptions,
} from '@/features/apps/pageTree.utils';

const props = defineProps<{
	projectId: string;
	appId: string;
	pageId: string;
	app: App;
}>();

const emit = defineEmits<{
	'update:pageId': [pageId: string];
}>();

const RADIUS: Record<NonNullable<AppTheme['radius']>, string> = {
	none: '0px',
	sm: 'var(--radius--sm)',
	md: 'var(--radius--md)',
	lg: 'var(--radius--lg)',
};

const i18n = useI18n();
const toast = useToast();
const appsStore = useAppsStore();

const saving = ref(false);
const saved = ref(false);
/** Content waiting to be saved, pinned to the page it belongs to so a page switch cannot misfile it. */
const dirty = ref<{ pageId: string; content: AppContent } | null>(null);

const layoutPanelOpen = ref(false);
const layoutPreview = ref<LayoutPreview | null>(null);
const canvasRef = ref<HTMLDivElement>();
/** The element the content editor is teleported into; null while the canvas is (re)rendering. */
const slotEl = ref<HTMLElement | null>(null);

const page = computed(() => appsStore.pages.find((p) => p.id === props.pageId));
const menuRows = computed(() => flattenPageTree(appsStore.pages));
const pageOptions = computed(() =>
	getPageOptions(appsStore.pages, i18n.baseText('apps.page.home')),
);

// Same custom properties the server puts on :root; the stylesheet falls back to the design tokens.
const themeStyle = computed(() => {
	const theme = props.app.theme;
	return {
		'--app-color-primary': theme?.colors?.primary,
		'--app-color-background': theme?.colors?.background,
		'--app-color-surface': theme?.colors?.surface,
		'--app-color-text': theme?.colors?.text,
		'--app-color-muted': theme?.colors?.muted,
		'--app-radius': theme?.radius ? RADIUS[theme.radius] : undefined,
		'--app-font-family': theme?.fontFamily,
		'--app-content-width': theme?.contentWidth,
	};
});

// Both stylesheets reach the canvas only: `:root`/`body` rules inside the scope match nothing,
// the tokens come from the editor and the `--app-*` variables from `themeStyle`.
const scoped = (css: string | null | undefined) =>
	css ? `@scope ([data-app-canvas]) { ${css} }` : '';
const servedCss = computed(() => scoped(appsStore.servedCss));
const scopedCss = computed(() => scoped(props.app.theme?.customCss));

const menuLabel = (menuPage: Page) => getPageLabel(menuPage, i18n.baseText('apps.page.home'));

const save = async () => {
	const pending = dirty.value;
	if (!pending) return;
	dirty.value = null;
	saving.value = true;
	try {
		await appsStore.updatePage(props.projectId, props.appId, pending.pageId, {
			content: pending.content,
		});
		saved.value = true;
	} catch (error) {
		toast.showError(error, i18n.baseText('apps.page.save.error'));
	} finally {
		saving.value = false;
	}
};

const debouncedSave = useDebounceFn(save, getDebounceTime(DEBOUNCE_TIME.API.AUTOSAVE));

const onContentChange = (content: AppContent) => {
	dirty.value = { pageId: props.pageId, content };
	saved.value = false;
	void debouncedSave();
};

/** A layout that failed to render keeps the last good html on the canvas (the failing blocks are empty when there is none yet); only its errors are shown. */
const fetchLayoutPreview = async () => {
	try {
		const preview = await appsStore.fetchLayoutPreview(props.projectId, props.appId, props.pageId);
		const failed = Object.keys(preview.errors).length > 0;
		layoutPreview.value = failed
			? { ...preview, html: layoutPreview.value?.html ?? preview.html }
			: preview;
	} catch (error) {
		toast.showError(error, i18n.baseText('apps.builder.preview.error'));
	}
};

/** Links in the rendered layout switch the edited page instead of navigating the editor. */
const onLayoutClick = (event: MouseEvent) => {
	const href =
		event.target instanceof Element ? event.target.closest('a[href]')?.getAttribute('href') : null;
	if (!href) return;
	event.preventDefault();
	const { pathname } = new URL(href, window.location.href);
	const pageId = findPageIdByPath(appsStore.pages, props.app.namespace, pathname);
	if (pageId) emit('update:pageId', pageId);
};

// The slot lives inside `v-html` markup, so it has to be looked up after that
// markup is in the DOM and again whenever it is replaced.
watch(
	() => layoutPreview.value?.html,
	async () => {
		slotEl.value = null;
		await nextTick();
		slotEl.value = canvasRef.value?.querySelector('[data-app-slot]') ?? null;
	},
	{ immediate: true },
);

watch(
	() => props.pageId,
	async (_, previous) => {
		if (previous !== undefined) await save();
		await fetchLayoutPreview();
	},
	{ immediate: true },
);
onBeforeUnmount(save);

const loadServedCss = async () => {
	try {
		await appsStore.fetchServedCss();
	} catch (error) {
		toast.showError(error, i18n.baseText('apps.builder.preview.error'));
	}
};
void loadServedCss();
</script>

<template>
	<div :class="$style.editor" data-test-id="page-editor">
		<div :class="$style.bar">
			<N8nSelect
				:model-value="pageId"
				size="small"
				:class="$style.pageSelect"
				data-test-id="page-editor-page-select"
				@update:model-value="emit('update:pageId', $event)"
			>
				<N8nOption
					v-for="option in pageOptions"
					:key="option.value"
					:value="option.value"
					:label="option.label"
				/>
			</N8nSelect>
			<N8nText
				v-if="saving || saved"
				color="text-light"
				size="small"
				data-test-id="page-saved-indicator"
			>
				{{ saving ? i18n.baseText('generic.saving') : i18n.baseText('apps.page.save.saved') }}
			</N8nText>
			<N8nTooltip :content="i18n.baseText('apps.layout.title')" placement="bottom">
				<N8nIconButton
					icon="layout-template"
					:variant="layoutPanelOpen ? 'subtle' : 'ghost'"
					size="small"
					:class="$style.layoutToggle"
					:aria-label="i18n.baseText('apps.layout.title')"
					:aria-pressed="layoutPanelOpen"
					data-test-id="page-editor-layout-toggle"
					@click="layoutPanelOpen = !layoutPanelOpen"
				/>
			</N8nTooltip>
		</div>

		<div :class="$style.body">
			<div
				ref="canvasRef"
				:class="$style.canvas"
				:style="themeStyle"
				data-app-canvas
				data-test-id="page-editor-canvas"
			>
				<component :is="'style'" v-if="servedCss" data-test-id="page-editor-served-css">
					{{ servedCss }}
				</component>
				<component :is="'style'" v-if="scopedCss" data-test-id="page-editor-custom-css">
					{{ scopedCss }}
				</component>
				<div :class="$style.page" class="app-canvas app-text">
					<!-- eslint-disable vue/no-v-html -- sanitized on the server -->
					<div
						v-if="layoutPreview?.html"
						data-test-id="page-editor-layout"
						@click="onLayoutClick"
						v-html="layoutPreview.html"
					/>
					<!-- eslint-enable vue/no-v-html -->
					<div v-else class="app-shell">
						<nav class="app-menu" data-test-id="page-editor-menu">
							<span class="block text-xs font-semibold app-muted uppercase mb-sm">{{
								app.name
							}}</span>
							<ul class="list-none pl-sm text-sm">
								<li
									v-for="{ page: menuPage, depth } in menuRows"
									:key="menuPage.id"
									:style="{ paddingLeft: `calc(${depth} * var(--spacing--sm))` }"
								>
									<span v-if="menuPage.id === pageId" class="font-semibold app-text">
										{{ menuLabel(menuPage) }}
									</span>
									<a
										v-else
										href="#"
										class="app-link no-underline hover:underline"
										data-test-id="page-editor-menu-link"
										@click.prevent="emit('update:pageId', menuPage.id)"
									>
										{{ menuLabel(menuPage) }}
									</a>
								</li>
							</ul>
						</nav>
						<main class="app-main" data-app-slot />
					</div>
					<Teleport :to="slotEl" :disabled="!slotEl">
						<PageContentEditor
							v-if="page"
							:key="pageId"
							:content="page.content ?? []"
							:project-id="projectId"
							data-test-id="page-content-editor"
							@update:content="onContentChange"
						/>
					</Teleport>
				</div>
			</div>
			<LayoutPanel
				v-if="layoutPanelOpen && page"
				:project-id="projectId"
				:app-id="appId"
				:page="page"
				:owner-page-id="layoutPreview?.ownerPageId ?? null"
				:render-errors="layoutPreview?.errors ?? {}"
				@saved="fetchLayoutPreview"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.editor {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
	border: var(--border);
	border-radius: var(--radius--lg);
	overflow: hidden;
}

.bar {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border-bottom: var(--border);
	background: var(--background--surface);
}

.pageSelect {
	max-width: 220px;
}

.layoutToggle {
	margin-left: auto;
}

.body {
	display: flex;
	flex: 1;
	min-height: 0;
}

// The scope root itself is matched by `:scope` only, so the served `.app-canvas`
// and `.app-text` rules land on this inner element, as on the served `<body>`.
.canvas {
	display: flex;
	flex-direction: column;
	flex: 1;
	overflow: auto;
}

.page {
	flex: 1;
}
</style>
