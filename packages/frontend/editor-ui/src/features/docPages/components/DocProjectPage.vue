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
		<div v-if="generating" :class="$style.generating" data-testid="doc-project-page-generating">
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('docPages.generating') }}
			</N8nText>
			<N8nLoading :rows="5" />
		</div>

		<div
			v-else-if="isEmpty && !writeManually"
			:class="$style.empty"
			data-testid="doc-project-page-empty"
		>
			<span :class="$style.emptyIcon">
				<N8nIcon icon="notebook-pen" size="large" />
			</span>
			<div :class="$style.emptyText">
				<N8nHeading tag="h2" size="medium" bold>
					{{ i18n.baseText('docPages.projectPage.empty.heading') }}
				</N8nHeading>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('docPages.projectPage.empty.description') }}
				</N8nText>
			</div>
			<div :class="$style.emptyActions">
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

		<template v-else>
			<div v-if="canEdit" :class="$style.toolbar">
				<N8nText
					v-if="saveStatus !== 'idle'"
					size="small"
					color="text-light"
					data-testid="doc-project-page-save-status"
				>
					{{
						saveStatus === 'saving'
							? i18n.baseText('docPages.saving')
							: i18n.baseText('docPages.saved')
					}}
				</N8nText>
				<N8nButton
					v-if="canSummarize"
					variant="ghost"
					size="small"
					data-testid="doc-project-page-resummarize"
					@click="summarize"
				>
					<N8nIcon icon="sparkles" size="small" />
					{{ i18n.baseText('docPages.projectPage.summarize') }}
				</N8nButton>
			</div>
			<DocPageEditor
				:key="`${page.id}-${editorVersion}`"
				:content="page.content"
				:markdown="page.markdown"
				:editable="canEdit"
				:project-id="page.projectId"
				:create-child-page="createChildPage"
				@update:content="onContentUpdate"
			/>
		</template>
	</section>
</template>

<style lang="scss" module>
.page {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.toolbar {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	gap: var(--spacing--2xs);
	opacity: 0.6;
	transition: opacity var(--duration--snappy) var(--easing--ease-out);

	.page:hover &,
	&:focus-within {
		opacity: 1;
	}
}

.generating {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.empty {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--sm);
	padding: var(--spacing--md);
	border: var(--border-width) dashed var(--border-color);
	border-radius: var(--radius--lg);
}

.emptyIcon {
	display: grid;
	place-items: center;
	width: var(--height--2xl);
	height: var(--height--2xl);
	border-radius: var(--radius--md);
	background: color-mix(in srgb, var(--color--purple-500) 14%, transparent);
	color: var(--color--purple-600);
}

.emptyText {
	display: flex;
	flex: 1 1 16rem;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.emptyActions {
	display: flex;
	gap: var(--spacing--2xs);
}

@media (prefers-reduced-motion: reduce) {
	.toolbar {
		transition: none;
	}
}
</style>
