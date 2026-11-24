<script setup lang="ts">
import { ALLOWED_AGENT_FILE_EXTENSIONS } from '@n8n/api-types';
import type {
	KnowledgeCollectionAgentDto,
	KnowledgeCollectionDto,
	KnowledgeCollectionFileDto,
} from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { N8nBreadcrumbs, N8nContextMenu, N8nHeading, N8nText } from '@n8n/design-system';
import type { ContextMenuNode, PathItem } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { computed, ref, useTemplateRef, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { VIEWS } from '@/app/constants';
import AgentChipButton from '@/features/agents/components/AgentChipButton.vue';
import AgentChipRow from '@/features/agents/components/AgentChipRow.vue';
import AgentPanel from '@/features/agents/components/AgentPanel.vue';
import { useAgentProjectBreadcrumb } from '@/features/agents/composables/useAgentProjectBreadcrumb';
import ProjectIcon from '@/features/collaboration/projects/components/ProjectIcon.vue';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useCollectionsStore } from '@/features/settings/context/collections.store';

const COLLECTIONS_CRUMB = 'collections';

const props = defineProps<{
	projectId: string;
	collectionId: string;
}>();

const i18n = useI18n();
const router = useRouter();
const toast = useToast();
const collectionsStore = useCollectionsStore();
const projectsStore = useProjectsStore();
const settingsStore = useSettingsStore();
const documentTitle = useDocumentTitle();

const files = ref<KnowledgeCollectionFileDto[]>([]);
const agents = ref<KnowledgeCollectionAgentDto[]>([]);
const collection = ref<KnowledgeCollectionDto | null>(null);
const uploading = ref(false);
const fileInput = useTemplateRef<HTMLInputElement>('fileInput');

const { projectName, projectIcon } = useAgentProjectBreadcrumb(computed(() => props.projectId));

const projectRoute = computed(() => ({
	name: VIEWS.PROJECTS_WORKFLOWS,
	params: { projectId: props.projectId },
}));
const collectionsRoute = { name: VIEWS.SETTINGS_CONTEXT_COLLECTIONS };

const breadcrumbItems = computed<PathItem[]>(() => [
	{
		id: props.projectId,
		label: projectName.value ?? i18n.baseText('agents.builder.header.projectFallback'),
		href: router.resolve(projectRoute.value).href,
	},
	{
		id: COLLECTIONS_CRUMB,
		label: i18n.baseText('settings.context.collections.title'),
		href: router.resolve(collectionsRoute).href,
	},
	...(collection.value ? [{ id: collection.value.id, label: collection.value.name }] : []),
]);

const fileMenuItems = computed<ContextMenuNode[]>(() => [
	{
		type: 'item',
		id: 'remove',
		label: i18n.baseText('settings.context.collections.files.remove'),
		icon: { type: 'icon', value: 'trash-2' },
	},
]);

function onBreadcrumbSelect(item: PathItem) {
	if (item.id === props.projectId) {
		void router.push(projectRoute.value);
	} else if (item.id === COLLECTIONS_CRUMB) {
		void router.push(collectionsRoute);
	}
}

function projectNameOf(projectId: string) {
	if (projectsStore.personalProject?.id === projectId) {
		return i18n.baseText('projects.menu.personal');
	}
	return projectsStore.myProjects.find((project) => project.id === projectId)?.name;
}

// The route can change to a different collection while a request is in flight.
const isCurrent = (projectId: string, collectionId: string) =>
	projectId === props.projectId && collectionId === props.collectionId;

watch(
	() => [props.projectId, props.collectionId],
	async ([projectId, collectionId]) => {
		collection.value = null;
		try {
			const [loadedCollection, fileList, agentList] = await Promise.all([
				collectionsStore.getCollection(projectId, collectionId),
				collectionsStore.listCollectionFiles(projectId, collectionId),
				collectionsStore.listCollectionAgents(projectId, collectionId),
			]);
			if (!isCurrent(projectId, collectionId)) {
				return;
			}
			files.value = fileList.data;
			agents.value = agentList;
			collection.value = loadedCollection;
			documentTitle.set(loadedCollection.name);
		} catch (error) {
			toast.showError(error, i18n.baseText('settings.context.collections.error.loadOne'));
		}
	},
	{ immediate: true },
);

async function onFilesSelected(event: Event) {
	const input = event.target;
	if (!(input instanceof HTMLInputElement)) {
		return;
	}
	const selectedFiles = Array.from(input.files ?? []);
	input.value = '';
	if (selectedFiles.length === 0) {
		return;
	}

	// The server sees one file for each request, so it cannot check the count of the selection.
	const maxFiles = settingsStore.moduleSettings.knowledge?.limits.maxFilesPerUpload;
	if (maxFiles !== undefined && selectedFiles.length > maxFiles) {
		toast.showError(
			new Error(
				i18n.baseText('agents.builder.files.uploadTooManyFiles.message', {
					interpolate: { max: String(maxFiles) },
				}),
			),
			i18n.baseText('agents.builder.files.uploadTooManyFiles.title'),
		);
		return;
	}

	const { projectId, collectionId } = props;
	uploading.value = true;
	// One request for each file: the server rejects the whole batch when one file fails.
	for (const file of selectedFiles) {
		try {
			const uploaded = await collectionsStore.uploadCollectionFiles(projectId, collectionId, [
				file,
			]);
			if (isCurrent(projectId, collectionId)) {
				files.value = [...files.value, ...uploaded];
			}
		} catch (error) {
			toast.showError(
				error,
				i18n.baseText('settings.context.collections.files.uploadError', {
					interpolate: { name: file.name },
				}),
			);
		}
	}
	uploading.value = false;
}

async function removeFile(fileId: string) {
	try {
		const { projectId, collectionId } = props;
		await collectionsStore.deleteCollectionFile(projectId, collectionId, fileId);
		if (isCurrent(projectId, collectionId)) {
			files.value = files.value.filter((file) => file.id !== fileId);
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.builder.files.deleteError'));
	}
}
</script>

<template>
	<div :class="$style.view" data-test-id="collection-view">
		<div :class="$style.topBar">
			<N8nBreadcrumbs :items="breadcrumbItems" theme="medium" @item-selected="onBreadcrumbSelect">
				<template #prepend>
					<ProjectIcon :icon="projectIcon" size="mini" />
				</template>
			</N8nBreadcrumbs>
		</div>

		<div :class="$style.body">
			<div v-if="collection" :class="$style.column">
				<div :class="$style.heading">
					<N8nHeading tag="h1" size="xlarge">{{ collection.name }}</N8nHeading>
					<N8nText
						v-if="collection.description"
						color="text-light"
						data-test-id="collection-description"
					>
						{{ collection.description }}
					</N8nText>
				</div>

				<AgentPanel
					:header="i18n.baseText('settings.context.collections.contents.title')"
					:description="i18n.baseText('settings.context.collections.contents.description')"
				>
					<AgentChipRow
						:label="i18n.baseText('settings.context.collections.files.label')"
						:item-count="files.length"
						:add-label="i18n.baseText('agents.builder.files.upload')"
						:disabled="uploading"
						@add="fileInput?.click()"
					>
						<N8nContextMenu
							v-for="file in files"
							:key="file.id"
							:items="fileMenuItems"
							@select="removeFile(file.id)"
						>
							<template #trigger>
								<AgentChipButton
									icon="file"
									:class="$style.filePill"
									data-test-id="collection-file-pill"
								>
									{{ file.fileName }}
								</AgentChipButton>
							</template>
						</N8nContextMenu>
					</AgentChipRow>
					<input
						ref="fileInput"
						type="file"
						multiple
						hidden
						:accept="ALLOWED_AGENT_FILE_EXTENSIONS.join(',')"
						data-test-id="collection-files-upload-input"
						@change="onFilesSelected"
					/>
				</AgentPanel>

				<AgentPanel
					:header="i18n.baseText('settings.context.collections.usedBy.title')"
					:description="i18n.baseText('settings.context.collections.usedBy.description')"
				>
					<div v-if="agents.length > 0" :class="$style.pills">
						<AgentChipButton
							v-for="agent in agents"
							:key="agent.id"
							icon="bot"
							:clickable="false"
							data-test-id="collection-agent-pill"
						>
							{{ agent.name }}
							<N8nText v-if="projectNameOf(agent.projectId)" size="small" color="text-light">
								{{ projectNameOf(agent.projectId) }}
							</N8nText>
						</AgentChipButton>
					</div>
					<N8nText v-else size="small" color="text-light" data-test-id="collection-used-by-empty">
						{{ i18n.baseText('settings.context.collections.usedBy.empty') }}
					</N8nText>
				</AgentPanel>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.view {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
	overflow: hidden;
}

.topBar {
	display: flex;
	align-items: center;
	padding: var(--spacing--xs) var(--spacing--md);
	background-color: var(--background--surface);
	border-bottom: var(--border);
	flex-shrink: 0;
	min-height: var(--height--4xl);

	:global(.n8n-breadcrumbs > ul > li:first-child) {
		display: none;
	}
}

.body {
	flex: 1 1 auto;
	min-height: 0;
	overflow-y: auto;
	padding: var(--spacing--xl) var(--spacing--md);
}

.column {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	width: 100%;
	max-width: 50rem;
	margin-inline: auto;
}

.heading {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.filePill {
	max-width: 100%;
}

.pills {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--3xs);
}
</style>
