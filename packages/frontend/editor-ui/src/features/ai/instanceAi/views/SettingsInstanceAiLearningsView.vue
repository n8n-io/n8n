<script setup lang="ts">
import type { InstanceAiLearning } from '@n8n/api-types';
import {
	N8nBadge,
	N8nButton,
	N8nCheckbox,
	N8nEmptyState,
	N8nIcon,
	N8nInput,
	N8nLoading,
	N8nOption,
	N8nSelect,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSwitch,
	N8nTabs,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { storeToRefs } from 'pinia';
import { computed, onMounted, ref, watch } from 'vue';

import { MODAL_CONFIRM } from '@/app/constants';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useMessage } from '@/app/composables/useMessage';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import type { IWorkflowDb } from '@/Interface';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { ChangeLocationSearchResult } from '@/features/core/folders/folders.types';
import { useFoldersStore } from '@/features/core/folders/folders.store';

import { useInstanceAiLearningsStore } from '../instanceAiLearnings.store';

type PageTab = 'analyze' | 'learnings';
type TreeItem =
	| {
			type: 'folder';
			id: string;
			name: string;
			depth: number;
			workflowIds: string[];
	  }
	| {
			type: 'workflow';
			id: string;
			name: string;
			depth: number;
			published: boolean;
	  };

const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const documentTitle = useDocumentTitle();
const projectsStore = useProjectsStore();
const foldersStore = useFoldersStore();
const settingsStore = useSettingsStore();
const workflowsListStore = useWorkflowsListStore();
const learningsStore = useInstanceAiLearningsStore();
const { availableProjects } = storeToRefs(projectsStore);
const { learnings, activeRun, loading, analyzing } = storeToRefs(learningsStore);

const activeTab = ref<PageTab>('analyze');
const selectedProjectId = ref('');
const selectedWorkflowIds = ref<string[]>([]);
const publishedOnly = ref(true);
const resourceLoading = ref(false);
const workflows = ref<IWorkflowDb[]>([]);
const folders = ref<ChangeLocationSearchResult[]>([]);
const search = ref('');

const tabOptions = computed(() => [
	{ label: i18n.baseText('settings.n8nAgent.learnings.tabs.analyze'), value: 'analyze' },
	{
		label: i18n.baseText('settings.n8nAgent.learnings.tabs.learnings'),
		value: 'learnings',
		tag: String(learnings.value.length),
	},
]);

const visibleWorkflows = computed(() =>
	workflows.value.filter((workflow) => !publishedOnly.value || workflow.activeVersionId !== null),
);

const filteredLearnings = computed(() => {
	const query = search.value.trim().toLowerCase();
	if (!query) return learnings.value;
	return learnings.value.filter(
		(learning) =>
			learning.statement.toLowerCase().includes(query) ||
			learning.appliesWhen.toLowerCase().includes(query),
	);
});

const pendingLearnings = computed(() =>
	filteredLearnings.value.filter(({ reviewStatus }) => reviewStatus === 'pending'),
);
const reviewedLearnings = computed(() =>
	filteredLearnings.value.filter(({ reviewStatus }) => reviewStatus !== 'pending'),
);

const treeItems = computed<TreeItem[]>(() => {
	const items: TreeItem[] = [];
	const foldersByParent = new Map<string | null, ChangeLocationSearchResult[]>();
	for (const folder of folders.value) {
		const parentId = folder.parentFolder?.id ?? null;
		const siblings = foldersByParent.get(parentId) ?? [];
		siblings.push(folder);
		foldersByParent.set(parentId, siblings);
	}
	for (const siblings of foldersByParent.values()) {
		siblings.sort((a, b) => a.name.localeCompare(b.name));
	}

	const workflowsByFolder = new Map<string | null, IWorkflowDb[]>();
	for (const workflow of visibleWorkflows.value) {
		const folderId = workflow.parentFolder?.id ?? null;
		const siblings = workflowsByFolder.get(folderId) ?? [];
		siblings.push(workflow);
		workflowsByFolder.set(folderId, siblings);
	}
	for (const siblings of workflowsByFolder.values()) {
		siblings.sort((a, b) => a.name.localeCompare(b.name));
	}

	const appendWorkflows = (folderId: string | null, depth: number) => {
		for (const workflow of workflowsByFolder.get(folderId) ?? []) {
			items.push({
				type: 'workflow',
				id: workflow.id,
				name: workflow.name,
				depth,
				published: workflow.activeVersionId !== null,
			});
		}
	};

	const descendantWorkflowIds = (folderId: string): string[] => {
		const direct = (workflowsByFolder.get(folderId) ?? []).map(({ id }) => id);
		const nested = (foldersByParent.get(folderId) ?? []).flatMap(({ id }) =>
			descendantWorkflowIds(id),
		);
		return [...direct, ...nested];
	};

	const appendFolders = (parentId: string | null, depth: number) => {
		for (const folder of foldersByParent.get(parentId) ?? []) {
			items.push({
				type: 'folder',
				id: folder.id,
				name: folder.name,
				depth,
				workflowIds: descendantWorkflowIds(folder.id),
			});
			appendWorkflows(folder.id, depth + 1);
			appendFolders(folder.id, depth + 1);
		}
	};

	appendWorkflows(null, 0);
	appendFolders(null, 0);
	return items;
});

const selectedCount = computed(() => selectedWorkflowIds.value.length);
const activeRunStageLabel = computed(() => {
	if (activeRun.value?.stage === 'reduce') {
		return i18n.baseText('settings.n8nAgent.learnings.progress.stage.synthesize');
	}
	return i18n.baseText('settings.n8nAgent.learnings.progress.stage.analyze');
});
const allVisibleSelected = computed(
	() =>
		visibleWorkflows.value.length > 0 &&
		visibleWorkflows.value.every(({ id }) => selectedWorkflowIds.value.includes(id)),
);

watch(publishedOnly, () => {
	const visibleIds = new Set(visibleWorkflows.value.map(({ id }) => id));
	selectedWorkflowIds.value = selectedWorkflowIds.value.filter((id) => visibleIds.has(id));
});

watch(selectedProjectId, async (projectId) => {
	selectedWorkflowIds.value = [];
	if (!projectId) return;
	await loadProject(projectId);
});

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.n8nAgent.learnings.title'));
	await projectsStore.getAvailableProjects();
	selectedProjectId.value = availableProjects.value[0]?.id ?? '';
});

async function loadProject(projectId: string) {
	resourceLoading.value = true;
	try {
		const [folderResults, workflowResults] = await Promise.all([
			// Folders are an enterprise feature; without it the tree is a flat workflow list.
			settingsStore.isFoldersFeatureEnabled
				? foldersStore.fetchFoldersAvailableForMove(projectId)
				: Promise.resolve([]),
			workflowsListStore.searchWorkflows({
				projectId,
				isArchived: false,
				select: [
					'id',
					'name',
					'active',
					'activeVersionId',
					'isArchived',
					'createdAt',
					'updatedAt',
					'parentFolder',
				],
			}),
			learningsStore.fetchLearnings(projectId),
		]);
		folders.value = folderResults;
		workflows.value = workflowResults;
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.n8nAgent.learnings.error.load'));
	} finally {
		resourceLoading.value = false;
	}
}

function treeIndent(depth: number) {
	return { paddingInlineStart: `calc(var(--spacing--sm) + ${depth} * var(--spacing--lg))` };
}

function setWorkflowSelected(workflowId: string, selected: boolean) {
	const ids = new Set(selectedWorkflowIds.value);
	if (selected) ids.add(workflowId);
	else ids.delete(workflowId);
	selectedWorkflowIds.value = [...ids];
}

function setFolderSelected(item: Extract<TreeItem, { type: 'folder' }>, selected: boolean) {
	const ids = new Set(selectedWorkflowIds.value);
	for (const workflowId of item.workflowIds) {
		if (selected) ids.add(workflowId);
		else ids.delete(workflowId);
	}
	selectedWorkflowIds.value = [...ids];
}

function setAllSelected(selected: boolean) {
	selectedWorkflowIds.value = selected ? visibleWorkflows.value.map(({ id }) => id) : [];
}

function isFolderSelected(item: Extract<TreeItem, { type: 'folder' }>) {
	return (
		item.workflowIds.length > 0 &&
		item.workflowIds.every((id) => selectedWorkflowIds.value.includes(id))
	);
}

async function startAnalysis() {
	if (!selectedProjectId.value || selectedWorkflowIds.value.length === 0) return;
	try {
		await learningsStore.startRun(
			selectedProjectId.value,
			selectedWorkflowIds.value,
			publishedOnly.value,
		);
		if (activeRun.value?.status === 'error') {
			throw new Error(
				activeRun.value.error ?? i18n.baseText('settings.n8nAgent.learnings.error.analysisUnknown'),
			);
		}
		activeTab.value = 'learnings';
		toast.showMessage({
			title: i18n.baseText('settings.n8nAgent.learnings.toast.generated'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.n8nAgent.learnings.error.analysis'));
	}
}

async function reviewLearning(learning: InstanceAiLearning, reviewStatus: 'approved' | 'rejected') {
	if (!selectedProjectId.value) return;
	try {
		await learningsStore.updateLearning(selectedProjectId.value, learning.id, { reviewStatus });
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.n8nAgent.learnings.error.update'));
	}
}

async function toggleLearning(learning: InstanceAiLearning, enabled: boolean) {
	if (!selectedProjectId.value) return;
	try {
		await learningsStore.updateLearning(selectedProjectId.value, learning.id, { enabled });
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.n8nAgent.learnings.error.update'));
	}
}

async function removeLearning(learning: InstanceAiLearning) {
	if (!selectedProjectId.value) return;
	const response = await message.confirm(
		i18n.baseText('settings.n8nAgent.learnings.delete.description'),
		{
			title: i18n.baseText('settings.n8nAgent.learnings.delete.title'),
			confirmButtonText: i18n.baseText('settings.n8nAgent.learnings.delete.button'),
			cancelButtonText: i18n.baseText('generic.cancel'),
		},
	);
	if (response !== MODAL_CONFIRM) return;
	try {
		await learningsStore.deleteLearning(selectedProjectId.value, learning.id);
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.n8nAgent.learnings.error.delete'));
	}
}

function onTabChange(value: string) {
	if (value === 'analyze' || value === 'learnings') {
		activeTab.value = value;
	}
}

function learningKindLabel(learning: InstanceAiLearning) {
	if (learning.kind === 'environment_fact') {
		return i18n.baseText('settings.n8nAgent.learnings.kind.environmentFact');
	}
	if (learning.kind === 'hypothesis') {
		return i18n.baseText('settings.n8nAgent.learnings.kind.hypothesis');
	}
	return i18n.baseText('settings.n8nAgent.learnings.kind.preference');
}

function learningStatusLabel(learning: InstanceAiLearning) {
	return learning.reviewStatus === 'approved'
		? i18n.baseText('settings.n8nAgent.learnings.status.approved')
		: i18n.baseText('settings.n8nAgent.learnings.status.rejected');
}
</script>

<template>
	<N8nSettingsLayout full-width :class="$style.layout">
		<N8nSettingsPageHeader
			:title="i18n.baseText('settings.n8nAgent.learnings.title')"
			:description="i18n.baseText('settings.n8nAgent.learnings.description')"
			:show-docs-link="false"
		/>

		<N8nTabs :model-value="activeTab" :options="tabOptions" @update:model-value="onTabChange" />

		<div :class="$style.projectPicker">
			<N8nText tag="label" bold>
				{{ i18n.baseText('settings.n8nAgent.learnings.project.label') }}
			</N8nText>
			<N8nSelect v-model="selectedProjectId" filterable>
				<N8nOption
					v-for="project in availableProjects"
					:key="project.id"
					:value="project.id"
					:label="project.name ?? ''"
				/>
			</N8nSelect>
		</div>

		<section v-if="activeTab === 'analyze'" :class="$style.content">
			<div :class="$style.toolbar">
				<N8nCheckbox
					:model-value="publishedOnly"
					:label="i18n.baseText('settings.n8nAgent.learnings.publishedOnly')"
					@update:model-value="(value) => typeof value === 'boolean' && (publishedOnly = value)"
				/>
				<N8nText color="text-light">
					{{
						i18n.baseText('settings.n8nAgent.learnings.selectionCount', {
							interpolate: { count: selectedCount },
						})
					}}
				</N8nText>
			</div>

			<N8nLoading v-if="resourceLoading" :rows="5" />
			<div v-else-if="treeItems.length > 0" :class="$style.tree">
				<div :class="$style.treeHeader">
					<N8nCheckbox
						:model-value="allVisibleSelected"
						:label="i18n.baseText('settings.n8nAgent.learnings.selectAll')"
						@update:model-value="(value) => typeof value === 'boolean' && setAllSelected(value)"
					/>
				</div>
				<div
					v-for="item in treeItems"
					:key="`${item.type}-${item.id}`"
					:class="[$style.treeRow, item.type === 'folder' && $style.folder]"
					:style="treeIndent(item.depth)"
				>
					<N8nIcon :icon="item.type === 'folder' ? 'folder' : 'file'" />
					<N8nCheckbox
						v-if="item.type === 'folder'"
						:model-value="isFolderSelected(item)"
						:disabled="item.workflowIds.length === 0"
						:label="item.name"
						@update:model-value="
							(value) => typeof value === 'boolean' && setFolderSelected(item, value)
						"
					/>
					<N8nCheckbox
						v-else
						:model-value="selectedWorkflowIds.includes(item.id)"
						:label="item.name"
						@update:model-value="
							(value) => typeof value === 'boolean' && setWorkflowSelected(item.id, value)
						"
					/>
				</div>
			</div>
			<N8nEmptyState
				v-else
				:description="i18n.baseText('settings.n8nAgent.learnings.empty.workflows')"
			/>

			<div v-if="analyzing && activeRun" :class="$style.progress">
				<N8nText bold>
					{{
						i18n.baseText('settings.n8nAgent.learnings.progress', {
							interpolate: {
								completed: activeRun.completedWorkflows,
								total: activeRun.totalWorkflows,
								stage: activeRunStageLabel,
							},
						})
					}}
				</N8nText>
			</div>

			<N8nButton
				:disabled="selectedCount === 0 || analyzing"
				:loading="analyzing"
				@click="startAnalysis"
			>
				{{ i18n.baseText('settings.n8nAgent.learnings.analyze.button') }}
			</N8nButton>
		</section>

		<section v-else :class="$style.content">
			<N8nInput
				v-model="search"
				clearable
				:placeholder="i18n.baseText('settings.n8nAgent.learnings.search.placeholder')"
			>
				<template #prefix><N8nIcon icon="search" /></template>
			</N8nInput>

			<N8nLoading v-if="loading" :rows="4" />
			<template v-else-if="filteredLearnings.length > 0">
				<div v-if="pendingLearnings.length > 0" :class="$style.learningSection">
					<N8nText bold>
						{{ i18n.baseText('settings.n8nAgent.learnings.pending.title') }}
					</N8nText>
					<article v-for="learning in pendingLearnings" :key="learning.id" :class="$style.learning">
						<div :class="$style.learningMeta">
							<N8nBadge theme="tertiary">{{ learningKindLabel(learning) }}</N8nBadge>
							<N8nText size="small" color="text-light">
								{{
									i18n.baseText('settings.n8nAgent.learnings.support', {
										adjustToNumber: learning.evidence.supportingWorkflowCount,
										interpolate: {
											count: learning.evidence.supportingWorkflowCount,
										},
									})
								}}
							</N8nText>
						</div>
						<N8nText tag="p" bold>{{ learning.statement }}</N8nText>
						<div :class="$style.appliesWhen">
							<N8nText tag="span" size="small" bold color="text-light">
								{{ i18n.baseText('settings.n8nAgent.learnings.appliesWhen.label') }}
							</N8nText>
							<N8nText tag="p" size="small" color="text-light">
								{{ learning.appliesWhen }}
							</N8nText>
						</div>
						<div :class="$style.actions">
							<N8nButton variant="outline" @click="reviewLearning(learning, 'rejected')">
								{{ i18n.baseText('settings.n8nAgent.learnings.reject') }}
							</N8nButton>
							<N8nButton @click="reviewLearning(learning, 'approved')">
								{{ i18n.baseText('settings.n8nAgent.learnings.approve') }}
							</N8nButton>
						</div>
					</article>
				</div>

				<div v-if="reviewedLearnings.length > 0" :class="$style.learningSection">
					<N8nText bold>
						{{ i18n.baseText('settings.n8nAgent.learnings.reviewed.title') }}
					</N8nText>
					<article
						v-for="learning in reviewedLearnings"
						:key="learning.id"
						:class="$style.learning"
					>
						<div :class="$style.learningHeader">
							<div :class="$style.learningCopy">
								<div :class="$style.learningMeta">
									<N8nBadge :theme="learning.reviewStatus === 'approved' ? 'success' : 'default'">
										{{ learningStatusLabel(learning) }}
									</N8nBadge>
									<N8nText size="small" color="text-light">
										{{ learningKindLabel(learning) }}
									</N8nText>
								</div>
								<N8nText tag="p" bold>{{ learning.statement }}</N8nText>
								<N8nText tag="p" size="small" color="text-light">
									{{ learning.appliesWhen }}
								</N8nText>
							</div>
							<N8nSwitch
								v-if="learning.reviewStatus === 'approved'"
								:model-value="learning.enabled"
								@update:model-value="
									(value) => typeof value === 'boolean' && toggleLearning(learning, value)
								"
							/>
						</div>
						<div :class="$style.actions">
							<N8nButton variant="ghost" @click="removeLearning(learning)">
								{{ i18n.baseText('settings.n8nAgent.learnings.delete.button') }}
							</N8nButton>
						</div>
					</article>
				</div>
			</template>
			<N8nEmptyState
				v-else
				:description="i18n.baseText('settings.n8nAgent.learnings.empty.learnings')"
			/>
		</section>
	</N8nSettingsLayout>
</template>

<style module lang="scss">
.layout {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}

.content,
.learningSection,
.learningCopy {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.projectPicker {
	display: grid;
	grid-template-columns: minmax(var(--spacing--5xl), 1fr) 2fr;
	align-items: center;
	gap: var(--spacing--md);
}

.toolbar,
.learningHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.learningHeader {
	align-items: flex-start;
}

.tree {
	border: var(--border);
	border-radius: var(--border-radius-base);
	max-height: 50vh;
	overflow: auto;
}

.treeHeader,
.treeRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding-block: var(--spacing--2xs);
	padding-inline-end: var(--spacing--sm);
	border-bottom: var(--border);
}

.treeHeader {
	padding-inline-start: var(--spacing--sm);
}

.treeRow:last-child {
	border-bottom: 0;
}

.folder {
	background: var(--background--surface);
}

.progress,
.learning {
	border: var(--border);
	border-radius: var(--border-radius-base);
	padding: var(--spacing--md);
}

/* Without an explicit column, the statement and appliesWhen text collapse onto
   one line because N8nText renders inline. */
.learning {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.learningCopy {
	flex: 1;
	min-width: 0;
}

.learningMeta {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.appliesWhen {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	border-inline-start: var(--border);
	padding-inline-start: var(--spacing--xs);
}

.actions {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: var(--spacing--xs);
	margin-block-start: var(--spacing--2xs);
}
</style>
