<script setup lang="ts">
import { N8nOption, N8nSelect, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useDebounceFn } from '@vueuse/core';
import type { AppContent, AppTheme } from '@n8n/api-types';
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { DEBOUNCE_TIME } from '@/app/constants';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import PageContentEditor from '@/features/apps/components/PageContentEditor.vue';
import { useAppsStore } from '@/features/apps/apps.store';
import type { App } from '@/features/apps/apps.types';
import { flattenPageTree, getPageOptions } from '@/features/apps/pageTree.utils';

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

watch(() => props.pageId, save);
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
		</div>

		<div
			:class="[$style.canvas, 'app-canvas']"
			:style="themeStyle"
			data-app-canvas
			data-test-id="page-editor-canvas"
		>
			<component :is="'style'" v-if="scopedCss" data-test-id="page-editor-custom-css">
				{{ scopedCss }}
			</component>
			<div :class="[$style.shell, 'app-shell']">
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
				<main :class="[$style.main, 'app-main']">
					<PageContentEditor
						v-if="page"
						:key="pageId"
						:content="page.content ?? []"
						:project-id="projectId"
						data-test-id="page-content-editor"
						@update:content="onContentChange"
					/>
				</main>
			</div>
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

// Mirrors the served shell in packages/cli/src/modules/apps/rendering/styles/app.css.
.canvas {
	flex: 1;
	overflow: auto;
	background: var(--app-color-background, var(--background--subtle));
	color: var(--app-color-text, var(--text-color));
	font-family: var(--app-font-family, var(--font-family));
}

.shell {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--xl);
	max-width: 64rem;
	margin: 0 auto;
	padding: var(--spacing--xl);
}

.menu,
.main {
	background: var(--app-color-surface, var(--background--surface));
	border-radius: var(--app-radius, var(--radius--md));
	border: 1px solid var(--border-color);
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
	padding: var(--spacing--xl);
}
</style>
