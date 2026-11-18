<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue';
import { useRouter } from 'vue-router';
import type { DocCheckFinding } from '@n8n/api-types';
import { UnexpectedError } from '@n8n/errors';
import {
	N8nBadge,
	N8nBreadcrumbs,
	N8nButton,
	N8nCallout,
	N8nEmptyState,
	N8nHeading,
	N8nIcon,
	N8nInlineTextEdit,
	N8nLink,
	N8nLoading,
	N8nText,
} from '@n8n/design-system';
import type { PathItem } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { MODAL_CONFIRM, VIEWS } from '@/app/constants';
import { useMessage } from '@/app/composables/useMessage';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';
import { AGENT_BUILDER_VIEW } from '@/features/agents/constants';

import DocPageEditor from '../components/DocPageEditor.vue';
import DocProperties from '../components/DocProperties.vue';
import { DOC_AUTOSAVE_DEBOUNCE_MS, DOC_PAGE_VIEW, PROJECT_DOCS_VIEW } from '../constants';
import { useDocPagesStore } from '../docPages.store';

const props = defineProps<{
	projectId: string;
	pageId: string;
}>();

const i18n = useI18n();
const router = useRouter();
const toast = useToast();
const message = useMessage();
const documentTitle = useDocumentTitle();
const projectsStore = useProjectsStore();
const docPagesStore = useDocPagesStore();

const editorRef = useTemplateRef<InstanceType<typeof DocPageEditor>>('editor');

const page = computed(() => docPagesStore.currentPage);
const loading = ref(true);
const loadFailed = ref(false);
const generating = ref(false);
const markingCurrent = ref(false);
/** Bumped to remount the editor, so it loads new markdown after a generate. */
const editorVersion = ref(0);
/** Set when the user picks "write it yourself" on an empty page. */
const writeManually = ref(false);

const isRootPage = computed(() => page.value?.parentId === null);
const canEdit = computed(() => page.value?.canEdit === true);
const isEmpty = computed(
	() => page.value !== null && page.value.content === null && page.value.markdown === null,
);
const showEmptyState = computed(
	() => isEmpty.value && isRootPage.value && !writeManually.value && !generating.value,
);
const resourceLabel = computed(() =>
	page.value?.resourceType === 'agent'
		? i18n.baseText('docPages.resource.agent')
		: i18n.baseText('docPages.resource.workflow'),
);

// Autosave: keep the latest content and send it after a quiet period.
const saveStatus = ref<'idle' | 'saving' | 'saved'>('idle');
let pendingSave: { id: string; content: Record<string, unknown> } | null = null;
let saveTimer: ReturnType<typeof setTimeout> | undefined;

function onContentUpdate(content: Record<string, unknown>) {
	if (!page.value) return;
	pendingSave = { id: page.value.id, content };
	clearTimeout(saveTimer);
	saveTimer = setTimeout(() => {
		void flushSave();
	}, DOC_AUTOSAVE_DEBOUNCE_MS);
}

async function flushSave() {
	clearTimeout(saveTimer);
	if (!pendingSave) return;
	const { id, content } = pendingSave;
	pendingSave = null;
	saveStatus.value = 'saving';
	try {
		await docPagesStore.updatePage(id, { content });
		saveStatus.value = pendingSave ? 'saving' : 'saved';
	} catch (error) {
		saveStatus.value = 'idle';
		toast.showError(error, i18n.baseText('docPages.save.error'));
	}
}

function dropPendingSave() {
	clearTimeout(saveTimer);
	pendingSave = null;
}

async function loadPage(id: string) {
	loading.value = true;
	loadFailed.value = false;
	writeManually.value = false;
	closeCheckPanel();
	try {
		const loaded = await docPagesStore.loadPage(id);
		documentTitle.set(loaded.title);
	} catch (error) {
		loadFailed.value = true;
		toast.showError(error, i18n.baseText('docPages.load.error'));
	} finally {
		loading.value = false;
	}
}

watch(
	() => props.pageId,
	async (id) => {
		await flushSave();
		saveStatus.value = 'idle';
		await loadPage(id);
	},
	{ immediate: true },
);

onBeforeUnmount(() => {
	void flushSave();
});

const projectLabel = computed(() => {
	const project = projectsStore.myProjects.find((p) => p.id === props.projectId);
	if (project?.type === ProjectTypes.Personal) return i18n.baseText('projects.menu.personal');
	return project?.name ?? i18n.baseText('docPages.tab');
});

const breadcrumbItems = computed<PathItem[]>(() => [
	{
		id: 'project',
		label: projectLabel.value,
		href: router.resolve({ name: PROJECT_DOCS_VIEW, params: { projectId: props.projectId } }).href,
	},
	...(page.value?.breadcrumb ?? []).map((crumb) => ({
		id: crumb.id,
		label: crumb.title,
		href: router.resolve({
			name: DOC_PAGE_VIEW,
			params: { projectId: props.projectId, pageId: crumb.id },
		}).href,
	})),
]);

function onBreadcrumbSelect(item: PathItem) {
	if (item.href) void router.push(item.href);
}

async function onTitleSubmit(value: string) {
	const title = value.trim();
	if (!page.value || !title || title === page.value.title) return;
	try {
		const updated = await docPagesStore.updatePage(page.value.id, { title });
		documentTitle.set(updated.title);
	} catch (error) {
		toast.showError(error, i18n.baseText('docPages.title.error'));
	}
}

function openResource() {
	if (!page.value?.resourceId) return;
	if (page.value.resourceType === 'agent') {
		void router.push({
			name: AGENT_BUILDER_VIEW,
			params: { projectId: page.value.projectId, agentId: page.value.resourceId },
		});
	} else {
		void router.push({ name: VIEWS.WORKFLOW, params: { workflowId: page.value.resourceId } });
	}
}

async function createChildPage(title: string) {
	if (!page.value) throw new UnexpectedError('No doc page is loaded');
	const child = await docPagesStore.createChildPage(page.value.id, title);
	return { id: child.id, title: child.title };
}

async function generate() {
	if (!page.value) return;
	// The new page replaces the old one, so a late autosave must not overwrite it.
	dropPendingSave();
	closeCheckPanel();
	generating.value = true;
	try {
		await docPagesStore.generatePage(page.value.id);
		editorVersion.value++;
	} catch (error) {
		toast.showError(error, i18n.baseText('docPages.generate.error'));
	} finally {
		generating.value = false;
	}
}

async function onRegenerate() {
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
	await generate();
}

async function onMarkCurrent() {
	if (!page.value) return;
	markingCurrent.value = true;
	try {
		await docPagesStore.markPageCurrent(page.value.id);
	} catch (error) {
		toast.showError(error, i18n.baseText('docPages.markCurrent.error'));
	} finally {
		markingCurrent.value = false;
	}
}

// Check with AI
const checkOpen = ref(false);
const checking = ref(false);
const findings = ref<DocCheckFinding[]>([]);
const appliedFindings = ref(new Set<number>());

function closeCheckPanel() {
	checkOpen.value = false;
	findings.value = [];
	appliedFindings.value = new Set();
}

async function onCheck() {
	if (!page.value) return;
	const pageId = page.value.id;
	const markdown = editorRef.value?.getMarkdown() ?? page.value.markdown ?? '';
	closeCheckPanel();
	checkOpen.value = true;
	checking.value = true;
	try {
		const result = await docPagesStore.checkPage(pageId, markdown);
		if (page.value?.id === pageId) findings.value = result;
	} catch (error) {
		checkOpen.value = false;
		toast.showError(error, i18n.baseText('docPages.check.error'));
	} finally {
		checking.value = false;
	}
}

function onApply(finding: DocCheckFinding, index: number) {
	// The editor emits `update:content` on success, so autosave stores the change.
	if (editorRef.value?.applyFinding(finding)) {
		appliedFindings.value = new Set(appliedFindings.value).add(index);
		return;
	}
	toast.showMessage({
		type: 'error',
		title: i18n.baseText('docPages.apply.error', { interpolate: { heading: finding.heading } }),
	});
}
</script>

<template>
	<div :class="[$style.layout, checkOpen && $style.withPanel]" data-testid="doc-page-view">
		<main :class="$style.main">
			<N8nLoading v-if="loading" :rows="8" :class="$style.column" />
			<N8nEmptyState
				v-else-if="loadFailed || !page"
				:icon="{ type: 'icon', value: 'triangle-alert' }"
				:heading="i18n.baseText('docPages.load.error')"
				data-testid="doc-page-load-error"
			/>
			<div v-else :class="$style.column">
				<header :class="$style.header">
					<div :class="$style.topRow">
						<N8nBreadcrumbs
							:items="breadcrumbItems"
							:highlight-last-item="false"
							theme="small"
							@item-selected="onBreadcrumbSelect"
						/>
						<div :class="$style.actions">
							<N8nText
								v-if="saveStatus !== 'idle'"
								size="small"
								color="text-light"
								data-testid="doc-page-save-status"
							>
								{{
									saveStatus === 'saving'
										? i18n.baseText('docPages.saving')
										: i18n.baseText('docPages.saved')
								}}
							</N8nText>
							<template v-if="isRootPage && canEdit && !isEmpty">
								<N8nButton
									variant="ghost"
									size="small"
									:loading="checking"
									:disabled="generating"
									data-testid="doc-page-check"
									@click="onCheck"
								>
									<N8nIcon icon="sparkles" size="small" />
									{{ i18n.baseText('docPages.check') }}
								</N8nButton>
								<N8nButton
									variant="ghost"
									size="small"
									:loading="generating"
									:disabled="checking"
									data-testid="doc-page-regenerate"
									@click="onRegenerate"
								>
									<N8nIcon icon="refresh-cw" size="small" />
									{{ i18n.baseText('docPages.regenerate') }}
								</N8nButton>
							</template>
							<N8nButton
								v-if="page.resourceId"
								variant="outline"
								size="small"
								data-testid="doc-page-open-resource"
								@click="openResource"
							>
								<N8nIcon icon="external-link" size="small" />
								{{
									page.resourceType === 'agent'
										? i18n.baseText('docPages.open.agent')
										: i18n.baseText('docPages.open.workflow')
								}}
							</N8nButton>
						</div>
					</div>

					<div :class="$style.titleRow">
						<N8nInlineTextEdit
							:key="page.id"
							:class="$style.title"
							:model-value="page.title"
							:max-length="255"
							max-width="100%"
							:read-only="!canEdit"
							:disabled="!canEdit"
							:placeholder="i18n.baseText('docPages.title.placeholder')"
							data-testid="doc-page-title"
							@update:model-value="onTitleSubmit"
						/>
						<N8nBadge
							v-if="isRootPage && !page.isPublished"
							variant="outline"
							size="small"
							data-testid="doc-page-unpublished"
						>
							{{ i18n.baseText('docPages.unpublished') }}
						</N8nBadge>
					</div>
				</header>

				<DocProperties v-if="isRootPage && page.properties" :properties="page.properties" />

				<N8nCallout
					v-if="isRootPage && page.isStale"
					theme="warning"
					data-testid="doc-page-stale-banner"
				>
					{{
						i18n.baseText('docPages.stale.message', { interpolate: { resource: resourceLabel } })
					}}
					<template v-if="canEdit" #trailingContent>
						<div :class="$style.bannerActions">
							<N8nButton
								v-if="!isEmpty"
								variant="outline"
								size="small"
								:loading="checking"
								data-testid="doc-page-stale-check"
								@click="onCheck"
							>
								{{ i18n.baseText('docPages.check') }}
							</N8nButton>
							<N8nButton
								variant="ghost"
								size="small"
								:loading="markingCurrent"
								data-testid="doc-page-mark-current"
								@click="onMarkCurrent"
							>
								{{ i18n.baseText('docPages.stale.markCurrent') }}
							</N8nButton>
						</div>
					</template>
				</N8nCallout>

				<div v-if="generating" :class="$style.generating" data-testid="doc-page-generating">
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('docPages.generating') }}
					</N8nText>
					<N8nLoading :rows="8" />
				</div>
				<N8nEmptyState
					v-else-if="showEmptyState"
					:icon="{ type: 'icon', value: 'sparkles' }"
					:heading="i18n.baseText('docPages.empty.heading')"
					:description="
						canEdit
							? i18n.baseText('docPages.empty.description', {
									interpolate: { resource: resourceLabel },
								})
							: i18n.baseText('docPages.empty.readOnly')
					"
					:button-text="canEdit ? i18n.baseText('docPages.generate') : undefined"
					button-variant="solid"
					data-testid="doc-page-empty"
					@click:button="generate"
				>
					<template v-if="canEdit" #additionalContent>
						<N8nButton
							variant="ghost"
							size="small"
							data-testid="doc-page-write-manually"
							@click="writeManually = true"
						>
							{{ i18n.baseText('docPages.empty.writeManually') }}
						</N8nButton>
					</template>
				</N8nEmptyState>
				<DocPageEditor
					v-else
					ref="editor"
					:key="`${page.id}-${editorVersion}`"
					:content="page.content"
					:markdown="page.markdown"
					:editable="canEdit"
					:project-id="page.projectId"
					:create-child-page="createChildPage"
					@update:content="onContentUpdate"
				/>

				<section
					v-if="page.children.length > 0"
					:class="$style.children"
					data-testid="doc-page-children"
				>
					<N8nHeading tag="h2" size="small" bold color="text-light">
						{{ i18n.baseText('docPages.children.title') }}
					</N8nHeading>
					<ul :class="$style.childList">
						<li v-for="child in page.children" :key="child.id">
							<N8nLink
								:to="{
									name: DOC_PAGE_VIEW,
									params: { projectId: page.projectId, pageId: child.id },
								}"
								theme="text"
								:class="$style.childLink"
							>
								<N8nIcon icon="file-text" size="small" />
								{{ child.title }}
							</N8nLink>
						</li>
					</ul>
				</section>
			</div>
		</main>

		<aside
			v-if="checkOpen"
			:class="$style.panel"
			:aria-label="i18n.baseText('docPages.checkPanel.title')"
			data-testid="doc-page-check-panel"
		>
			<div :class="$style.panelHeader">
				<N8nHeading tag="h2" size="small" bold>
					{{ i18n.baseText('docPages.checkPanel.title') }}
				</N8nHeading>
				<N8nButton
					variant="ghost"
					size="small"
					icon-only
					:aria-label="i18n.baseText('docPages.checkPanel.close')"
					data-testid="doc-page-check-close"
					@click="closeCheckPanel"
				>
					<N8nIcon icon="x" size="small" />
				</N8nButton>
			</div>
			<div v-if="checking" :class="$style.panelBody">
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('docPages.checkPanel.checking') }}
				</N8nText>
				<N8nLoading :rows="4" />
			</div>
			<N8nText
				v-else-if="findings.length === 0"
				size="small"
				color="text-light"
				:class="$style.panelBody"
				data-testid="doc-page-check-empty"
			>
				{{
					i18n.baseText('docPages.checkPanel.empty', { interpolate: { resource: resourceLabel } })
				}}
			</N8nText>
			<ul v-else :class="[$style.panelBody, $style.findings]">
				<li
					v-for="(finding, index) in findings"
					:key="`${index}-${finding.heading}`"
					:class="$style.finding"
					data-testid="doc-page-finding"
				>
					<N8nText size="small" bold>{{ finding.heading }}</N8nText>
					<N8nText size="small" color="text-base">{{ finding.problem }}</N8nText>
					<div>
						<N8nBadge
							v-if="appliedFindings.has(index)"
							variant="success"
							size="small"
							leading-icon="check"
						>
							{{ i18n.baseText('docPages.checkPanel.applied') }}
						</N8nBadge>
						<N8nButton
							v-else
							variant="outline"
							size="small"
							data-testid="doc-page-finding-apply"
							@click="onApply(finding, index)"
						>
							{{ i18n.baseText('docPages.checkPanel.apply') }}
						</N8nButton>
					</div>
				</li>
			</ul>
		</aside>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/breakpoints';

.layout {
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	height: 100%;
	width: 100%;
	overflow: hidden;
}

.withPanel {
	grid-template-columns: minmax(0, 1fr) 22rem;

	@include breakpoints.breakpoint('sm-and-down') {
		grid-template-columns: minmax(0, 1fr);
	}
}

.main {
	overflow-y: auto;
	padding: var(--spacing--lg) var(--spacing--2xl) var(--spacing--3xl);

	@include breakpoints.breakpoint('sm-and-down') {
		padding: var(--spacing--sm);
	}
}

.column {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	// Keeps lines at a readable length. No design token covers this width.
	max-width: 48rem;
	margin: 0 auto;
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.topRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-wrap: wrap;
	gap: var(--spacing--xs);
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.title {
	font-size: var(--font-size--2xl);
	font-weight: var(--font-weight--bold);
	min-width: 0;
}

.bannerActions {
	display: flex;
	gap: var(--spacing--2xs);
}

.generating {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.children {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding-top: var(--spacing--md);
	border-top: var(--border);
}

.childList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.childLink {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.panel {
	display: flex;
	flex-direction: column;
	min-height: 0;
	border-left: var(--border);
	background-color: var(--background--surface);

	@include breakpoints.breakpoint('sm-and-down') {
		position: fixed;
		inset: 0;
		z-index: 1;
		border-left: none;
	}
}

.panelHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--sm) var(--spacing--md);
	border-bottom: var(--border);
}

.panelBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--md);
	overflow-y: auto;
}

.findings {
	margin: 0;
	list-style: none;
}

.finding {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding-bottom: var(--spacing--sm);
	border-bottom: var(--border);

	&:last-child {
		border-bottom: none;
	}
}
</style>
