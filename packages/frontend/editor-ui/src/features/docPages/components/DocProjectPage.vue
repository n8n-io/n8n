<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import type { DocPage } from '@n8n/api-types';
import { N8nButton, N8nHeading, N8nIcon, N8nLoading, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { UnexpectedError } from '@n8n/errors';
import { MODAL_CONFIRM } from '@/app/constants';
import { useMessage } from '@/app/composables/useMessage';

import DocPageEditor from './DocPageEditor.vue';
import { useDocAutosave } from '../composables/useDocAutosave';
import { useDocPagesStore } from '../docPages.store';

/** The free-form home page of a project. It sits above the tables on the Docs tab. */
const props = defineProps<{
	projectId: string;
	/** False when the project has nothing for AI to summarize. */
	canSummarize: boolean;
}>();

const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const docPagesStore = useDocPagesStore();
const { saveStatus, queue, flush, drop } = useDocAutosave();

const page = ref<DocPage | null>(null);
const loading = ref(true);
const generating = ref(false);
const writeManually = ref(false);
/** Bumped to remount the editor, so it loads new markdown after a generate. */
const editorVersion = ref(0);

const canEdit = computed(() => page.value?.canEdit === true);
const isEmpty = computed(
	() => page.value !== null && page.value.content === null && page.value.markdown === null,
);

watch(
	() => props.projectId,
	async (projectId) => {
		await flush();
		saveStatus.value = 'idle';
		writeManually.value = false;
		loading.value = true;
		try {
			page.value = await docPagesStore.ensureProjectPage(projectId);
		} catch (error) {
			page.value = null;
			toast.showError(error, i18n.baseText('docPages.projectPage.error'));
		} finally {
			loading.value = false;
		}
	},
	{ immediate: true },
);

onBeforeUnmount(() => {
	void flush();
});

function onContentUpdate(content: Record<string, unknown>) {
	if (page.value) queue(page.value.id, content);
}

async function createChildPage(title: string) {
	if (!page.value) throw new UnexpectedError('No project page is loaded');
	const child = await docPagesStore.createChildPage(page.value.id, title);
	return { id: child.id, title: child.title };
}

async function summarize() {
	if (!page.value) return;
	if (!isEmpty.value) {
		const choice = await message.confirm(
			i18n.baseText('docPages.regenerate.confirm.message'),
			i18n.baseText('docPages.regenerate.confirm.title'),
			{
				type: 'warning',
				confirmButtonText: i18n.baseText('docPages.regenerate.confirm.button'),
				cancelButtonText: i18n.baseText('generic.cancel'),
			},
		);
		if (choice !== MODAL_CONFIRM) return;
	}
	// The new page replaces the old one, so a late autosave must not overwrite it.
	drop();
	generating.value = true;
	try {
		page.value = await docPagesStore.generatePage(page.value.id);
		editorVersion.value++;
	} catch (error) {
		toast.showError(error, i18n.baseText('docPages.generate.error'));
	} finally {
		generating.value = false;
	}
}
</script>

<template>
	<N8nLoading v-if="loading" :rows="3" />
	<!-- Viewers see nothing until somebody writes the page. -->
	<section
		v-else-if="page && (canEdit || !isEmpty)"
		:class="$style.page"
		data-testid="doc-project-page"
	>
		<header :class="$style.bar">
			<span :class="$style.label">
				<N8nIcon icon="book-open" size="small" />
				{{ i18n.baseText('docPages.projectPage.title') }}
			</span>
			<div v-if="canEdit && !isEmpty && !generating" :class="$style.actions">
				<span
					v-if="saveStatus !== 'idle'"
					:class="$style.status"
					data-testid="doc-project-page-save-status"
				>
					{{
						saveStatus === 'saving'
							? i18n.baseText('docPages.saving')
							: i18n.baseText('docPages.saved')
					}}
				</span>
				<N8nButton
					v-if="canSummarize"
					variant="ghost"
					size="xsmall"
					data-testid="doc-project-page-resummarize"
					@click="summarize"
				>
					<N8nIcon icon="sparkles" size="small" />
					{{ i18n.baseText('docPages.projectPage.summarize') }}
				</N8nButton>
			</div>
		</header>

		<div v-if="generating" :class="$style.body" data-testid="doc-project-page-generating">
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('docPages.generating') }}
			</N8nText>
			<N8nLoading :rows="5" />
		</div>

		<div
			v-else-if="isEmpty && !writeManually"
			:class="[$style.body, $style.empty]"
			data-testid="doc-project-page-empty"
		>
			<div :class="$style.emptyText">
				<N8nHeading tag="h2" size="medium" bold>
					{{ i18n.baseText('docPages.projectPage.empty.heading') }}
				</N8nHeading>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('docPages.projectPage.empty.description') }}
				</N8nText>
			</div>
			<div :class="$style.actions">
				<N8nButton
					v-if="canSummarize"
					variant="solid"
					size="small"
					data-testid="doc-project-page-summarize"
					@click="summarize"
				>
					<N8nIcon icon="sparkles" size="small" />
					{{ i18n.baseText('docPages.projectPage.summarize') }}
				</N8nButton>
				<N8nButton
					variant="ghost"
					size="small"
					data-testid="doc-project-page-write"
					@click="writeManually = true"
				>
					<N8nIcon icon="pencil" size="small" />
					{{ i18n.baseText('docPages.empty.writeManually') }}
				</N8nButton>
			</div>
		</div>

		<DocPageEditor
			v-else
			:key="`${page.id}-${editorVersion}`"
			:class="$style.body"
			:content="page.content"
			:markdown="page.markdown"
			:editable="canEdit"
			:project-id="page.projectId"
			:create-child-page="createChildPage"
			@update:content="onContentUpdate"
		/>
	</section>
</template>

<style lang="scss" module>
// Framed like the tables below, so the page and the tables read as one set.
.page {
	// The drag handle of the editor sits in this inset, left of each block.
	--doc-project-page--inset: var(--spacing--xl);

	border: var(--border-width) var(--border-style) var(--border-color);
	border-radius: var(--radius--md);
	background: var(--background--surface);
	overflow: hidden;
}

// Same height and type as a table header row.
.bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
	min-height: var(--height--lg);
	padding: var(--spacing--4xs) var(--spacing--3xs) var(--spacing--4xs)
		var(--doc-project-page--inset);
	border-bottom: var(--border-width) var(--border-style) var(--border-color);
	background: var(--background--subtle);
}

.label {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.status {
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm) var(--doc-project-page--inset) var(--spacing--md);
}

.empty {
	flex-direction: row;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--sm);
}

.emptyText {
	display: flex;
	flex: 1 1 16rem;
	flex-direction: column;
	gap: var(--spacing--5xs);
}
</style>
