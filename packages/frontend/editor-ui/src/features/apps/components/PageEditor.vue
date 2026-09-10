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
import type { App, LayoutPreview } from '@/features/apps/apps.types';
import { findPageIdByPath, flattenPageTree, getPageOptions } from '@/features/apps/pageTree.utils';

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
	getPageOptions(appsStore.pages, i18n.baseText('apps.page.index')),
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
	};
});

const scopedCss = computed(() => {
	const css = props.app.theme?.customCss;
	return css ? `@scope ([data-app-canvas]) { ${css} }` : '';
});

const menuLabel = (route: string) => route || i18n.baseText('apps.page.home');

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
				:class="[$style.canvas, 'app-canvas']"
				:style="themeStyle"
				data-app-canvas
				data-test-id="page-editor-canvas"
			>
				<component :is="'style'" v-if="scopedCss" data-test-id="page-editor-custom-css">
					{{ scopedCss }}
				</component>
				<!-- eslint-disable vue/no-v-html -- sanitized on the server -->
				<div
					v-if="layoutPreview?.html"
					data-test-id="page-editor-layout"
					@click="onLayoutClick"
					v-html="layoutPreview.html"
				/>
				<!-- eslint-enable vue/no-v-html -->
				<div v-else :class="[$style.shell, 'app-shell']">
					<nav :class="[$style.menu, 'app-menu']" data-test-id="page-editor-menu">
						<span :class="$style.appName">{{ app.name }}</span>
						<ul :class="$style.menuList">
							<li
								v-for="{ page: menuPage, depth } in menuRows"
								:key="menuPage.id"
								:style="{ paddingLeft: `calc(${depth} * var(--spacing--sm))` }"
							>
								<span v-if="menuPage.id === pageId" :class="$style.menuCurrent">
									{{ menuLabel(menuPage.route) }}
								</span>
								<a
									v-else
									href="#"
									:class="$style.menuLink"
									data-test-id="page-editor-menu-link"
									@click.prevent="emit('update:pageId', menuPage.id)"
								>
									{{ menuLabel(menuPage.route) }}
								</a>
							</li>
						</ul>
					</nav>
					<main :class="[$style.main, 'app-main']" data-app-slot />
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

// Mirrors the served shell in packages/cli/src/modules/apps/rendering/styles/app.css.
.canvas {
	flex: 1;
	overflow: auto;
	background: var(--app-color-background, var(--background--subtle));
	color: var(--app-color-text, var(--text-color));
	font-family: var(--app-font-family, var(--font-family));

	:global(.app-menu),
	:global(.app-main) {
		background: var(--app-color-surface, var(--background--surface));
		border-radius: var(--app-radius, var(--radius--md));
		border: 1px solid var(--border-color);
	}

	:global(.app-layout) {
		display: flex;
		flex-direction: column;
		gap: var(--spacing--md);
		padding: var(--spacing--xl);
	}

	:global(.app-main) {
		padding: var(--spacing--xl);
	}
}

.shell {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--xl);
	max-width: 64rem;
	margin: 0 auto;
	padding: var(--spacing--xl);
}

.menu {
	flex: none;
	width: 14rem;
	padding: var(--spacing--md);
}

.appName {
	display: block;
	margin-bottom: var(--spacing--sm);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--bold);
	text-transform: uppercase;
	color: var(--app-color-muted, var(--text-color--subtle));
}

.menuList {
	list-style: none;
	margin: 0;
	padding: 0 0 0 var(--spacing--sm);
	font-size: var(--font-size--sm);

	li {
		padding: var(--spacing--2xs) 0;
	}
}

.menuCurrent {
	font-weight: var(--font-weight--bold);
}

.menuLink {
	color: var(--app-color-primary, var(--color--primary));
	text-decoration: none;

	&:hover {
		text-decoration: underline;
	}
}

.main {
	flex: 1;
	min-width: 0;
}
</style>
