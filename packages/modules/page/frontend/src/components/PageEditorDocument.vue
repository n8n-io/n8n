<script setup lang="ts">
import { PAGE_TITLE_MAX_LENGTH, type Page } from '@n8n/api-types';
import { N8nEmptyState, N8nLoading, N8nMarkdownEditor } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { Editor } from '@tiptap/core';
import { computed, nextTick, onBeforeUnmount, shallowRef, useTemplateRef, watch } from 'vue';

import { useInstanceLocation } from '../composables/useInstanceLocation';
import { usePageDocument, type PageSaveStatus } from '../composables/usePageDocument';
import { createPageEditorExtensions } from '../editor/pageEditorExtensions';
import { createResourceLinkInserter } from '../editor/resourceLinkInsertion';
import { createResourcePasteHandler } from '../editor/resourcePaste';
import type { SlashCommand } from '../editor/slashCommands';
import { RESOURCE_SEARCH_LIMIT } from '../page.constants';
import { getPagePermissions } from '../page.permissions';
import { usePageStore } from '../page.store';
import { usePageResourceStore } from '../resources/resource.store';
import { createResourceSearch } from '../resources/resourceSearch';

const props = defineProps<{
	pageId: string;
	projectId?: string;
	readonly: boolean;
	showTitle: boolean;
	slashCommands?: SlashCommand[];
}>();

defineSlots<{
	/** Shown between the title and the content of a page that has loaded. */
	meta?: (props: { page: Page }) => unknown;
}>();

const emit = defineEmits<{
	loaded: [page: Page];
	saved: [page: Page];
	conflict: [latest: Page];
	notFound: [];
	saveStatus: [status: PageSaveStatus];
}>();

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();
const pageStore = usePageStore();
const resourceStore = usePageResourceStore();
const getInstanceLocation = useInstanceLocation();

const titleInput = useTemplateRef<HTMLInputElement>('titleInput');
const editor = shallowRef<Editor>();

function tellPageChangedElsewhere(latest: Page): void {
	toast.showMessage({
		type: 'warning',
		title: i18n.baseText('page.editor.conflict.title'),
		message: i18n.baseText('page.editor.conflict.message'),
	});
	emit('conflict', latest);
}

/** Keeps the chips that link to this page in step with its title. */
function rememberSavedTitle(page: Page): void {
	resourceStore.rememberName({ resourceType: 'page', resourceId: page.id }, page.title);
	emit('saved', page);
}

const { base, title, content, loadStatus, saveStatus, load, setTitle, setContent, flush } =
	usePageDocument({
		pageId: props.pageId,
		projectId: props.projectId,
		onLoaded: (page) => emit('loaded', page),
		onSaved: rememberSavedTitle,
		onConflict: tellPageChangedElsewhere,
		onNotFound: () => emit('notFound'),
	});

const isReadonly = computed(
	() =>
		props.readonly ||
		base.value === undefined ||
		!getPagePermissions(base.value.projectId).canUpdate,
);

const extensions = createPageEditorExtensions({
	searchResources: createResourceSearch({
		getContext: () => rootStore.restApiContext,
		getProjectId: () => base.value?.projectId,
		listPages: async (projectId) =>
			pageStore.isListLoaded(projectId)
				? pageStore.pagesOf(projectId)
				: await pageStore.fetchPages(projectId),
		limit: RESOURCE_SEARCH_LIMIT,
	}),
	slashCommands: props.slashCommands,
});

const editorProps = {
	handleDOMEvents: {
		paste: createResourcePasteHandler({
			getEditor: () => editor.value,
			getInstance: getInstanceLocation,
			insertResourceLink: createResourceLinkInserter(resourceStore.resolveName),
		}),
	},
};

function readInputValue(event: Event): string {
	return event.target instanceof HTMLInputElement ? event.target.value : '';
}

function onTitleInput(event: Event): void {
	setTitle(readInputValue(event));
}

function focusContent(): void {
	editor.value?.commands.focus('start');
}

/** Selects the whole title, so that the user can type over it. */
async function focusTitle(): Promise<void> {
	await nextTick();
	titleInput.value?.focus();
	titleInput.value?.select();
}

watch(saveStatus, (status) => emit('saveStatus', status));

onBeforeUnmount(flush);

void load();

defineExpose({ focusTitle, focusContent, flush, reload: load });
</script>

<template>
	<div :class="$style.document" data-test-id="page-editor">
		<N8nLoading v-if="loadStatus === 'loading'" :rows="6" data-test-id="page-editor-loading" />
		<N8nEmptyState
			v-else-if="loadStatus === 'not-found'"
			:icon="{ type: 'icon', value: 'file-text' }"
			:heading="i18n.baseText('page.editor.notFound.heading')"
			:description="i18n.baseText('page.editor.notFound.description')"
			data-test-id="page-editor-not-found"
		/>
		<N8nEmptyState
			v-else-if="loadStatus === 'error'"
			:icon="{ type: 'icon', value: 'circle-alert' }"
			:heading="i18n.baseText('page.editor.loadError.heading')"
			:button-text="i18n.baseText('page.editor.loadError.retry')"
			button-variant="outline"
			data-test-id="page-editor-load-error"
			@click:button="load"
		/>
		<template v-else>
			<input
				v-if="showTitle"
				ref="titleInput"
				type="text"
				:value="title"
				:readonly="isReadonly"
				:maxlength="PAGE_TITLE_MAX_LENGTH"
				:placeholder="i18n.baseText('page.editor.title.placeholder')"
				:aria-label="i18n.baseText('page.editor.title.label')"
				:class="$style.title"
				data-test-id="page-editor-title"
				@input="onTitleInput"
				@keydown.enter.prevent="focusContent"
			/>
			<slot v-if="base" name="meta" :page="base" />
			<N8nMarkdownEditor
				:model-value="content"
				variant="ghost"
				show-toolbar="floating"
				max-height="none"
				:readonly="isReadonly"
				:placeholder="isReadonly ? '' : i18n.baseText('page.editor.content.placeholder')"
				:extensions="extensions"
				:editor-props="editorProps"
				:container-class="$style.content"
				@update:model-value="setContent"
				@ready="editor = $event"
			/>
		</template>
	</div>
</template>

<style lang="scss" module>
.document {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
	min-height: 100%;
}

.title {
	width: 100%;
	padding: 0 var(--spacing--xs);
	border: 0;
	outline: none;
	background-color: transparent;
	color: var(--text-color);
	font-family: inherit;
	font-size: var(--font-size--2xl);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--md);

	&::placeholder {
		color: var(--text-color--subtler);
	}
}

.content {
	flex: 1;
	overflow: visible;
	font-size: var(--font-size--md);

	:global(.n8n-markdown) {
		min-height: calc(var(--spacing--5xl) * 2);
		overflow-y: visible;
	}
}
</style>
