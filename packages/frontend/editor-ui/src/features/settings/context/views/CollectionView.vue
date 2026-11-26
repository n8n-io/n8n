<script setup lang="ts">
import {
	ALLOWED_AGENT_FILE_EXTENSIONS,
	KNOWLEDGE_COLLECTION_NAME_MAX_LENGTH,
} from '@n8n/api-types';
import type {
	KnowledgeCollectionAgentDto,
	KnowledgeCollectionDto,
	KnowledgeCollectionFileDto,
} from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nBreadcrumbs,
	N8nContextMenu,
	N8nDropdownMenu,
	N8nHeading,
	N8nIconButton,
	N8nInlineTextEdit,
	N8nText,
} from '@n8n/design-system';
import type { ContextMenuNode, DropdownMenuItemProps, PathItem } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ResponseError } from '@n8n/rest-api-client';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue';
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
import CollectionModal from '@/features/settings/context/components/CollectionModal.vue';
import DeleteCollectionDialog from '@/features/settings/context/components/DeleteCollectionDialog.vue';
import { useCollectionPermissions } from '@/features/settings/context/composables/useCollectionPermissions';

const COLLECTIONS_CRUMB = 'collections';

type CollectionAction = 'rename' | 'edit-description' | 'delete';

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
const { canChange } = useCollectionPermissions();

const files = ref<KnowledgeCollectionFileDto[]>([]);
const agents = ref<KnowledgeCollectionAgentDto[]>([]);
const collection = ref<KnowledgeCollectionDto | null>(null);
const uploading = ref(false);
const fileInput = useTemplateRef<HTMLInputElement>('fileInput');

// The name edits get the saved name, so a refused name stays in their text and the user can send it again.
const nameEdit = useTemplateRef<InstanceType<typeof N8nInlineTextEdit>>('nameEdit');
const crumbNameEdit = useTemplateRef<InstanceType<typeof N8nInlineTextEdit>>('crumbNameEdit');
const renaming = ref(false);
const renameError = ref('');
const modalOpen = ref(false);
/** The collection that the description dialog edits. It stays set while the dialog closes. */
const editingCollection = ref<KnowledgeCollectionDto | null>(null);
const deletingCollection = ref<KnowledgeCollectionDto | null>(null);

const canEdit = computed(() => collection.value !== null && canChange(collection.value));

const collectionActions = computed<Array<DropdownMenuItemProps<CollectionAction>>>(() => [
	{
		id: 'rename',
		label: i18n.baseText('generic.rename'),
		icon: { type: 'icon', value: 'pencil' },
		// The focus moves to the name edit. Back on the trigger, it would end the edit.
		suppressCloseAutoFocus: true,
	},
	{
		id: 'edit-description',
		label: i18n.baseText('settings.context.collections.actions.editDescription'),
		icon: { type: 'icon', value: 'square-pen' },
	},
	{
		id: 'delete',
		label: i18n.baseText('settings.context.collections.actions.delete'),
		icon: { type: 'icon', value: 'trash-2' },
		destructive: true,
		divided: true,
	},
]);

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
	// A user who can change the collection gets the name as an edit after the crumbs.
	...(collection.value && !canEdit.value
		? [{ id: collection.value.id, label: collection.value.name }]
		: []),
]);

const fileMenuItems = computed<ContextMenuNode[]>(() => [
	{
		type: 'item',
		id: 'remove',
		label: i18n.baseText('settings.context.collections.files.remove'),
		icon: { type: 'icon', value: 'trash-2' },
		variant: 'destructive',
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

let disposed = false;
onBeforeUnmount(() => {
	disposed = true;
});

// The route can change to a different collection, or the page can close, while a request runs.
const isCurrent = (projectId: string, collectionId: string) =>
	!disposed && projectId === props.projectId && collectionId === props.collectionId;

watch(
	() => [props.projectId, props.collectionId],
	async ([projectId, collectionId]) => {
		collection.value = null;
		modalOpen.value = false;
		editingCollection.value = null;
		deletingCollection.value = null;
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
		} catch (error) {
			toast.showError(error, i18n.baseText('settings.context.collections.error.loadOne'));
		}
	},
	{ immediate: true },
);

// Make sure the tab and the rename error follow the saved name, and only the name:
// a description save must not discard a refused name that the user can still fix.
watch(
	() => collection.value?.name,
	(name) => {
		renameError.value = '';
		if (name) {
			documentTitle.set(name);
		}
	},
);

async function onRename(name: string) {
	if (!collection.value) {
		return;
	}

	const { projectId, collectionId } = props;
	renaming.value = true;

	try {
		const updated = await collectionsStore.updateCollection(projectId, collectionId, { name });
		if (!isCurrent(projectId, collectionId)) {
			return;
		}

		// Take only the name, so a description save that ends first keeps its text.
		const latest = collection.value ?? updated;
		collection.value = { ...latest, name: updated.name };
	} catch (error) {
		const isNameTaken = error instanceof ResponseError && error.httpStatusCode === 409;
		// A page that changed or closed has no title to show the failure under, so it gets a toast.
		if (!isCurrent(projectId, collectionId)) {
			const errorKey = isNameTaken
				? 'settings.context.collections.rename.taken'
				: 'settings.context.collections.error.update';

			toast.showError(error, i18n.baseText(errorKey));
			return;
		}

		// The title keeps the typed name, so the user can fix it.
		if (isNameTaken) {
			renameError.value = i18n.baseText('settings.context.collections.rename.taken');
			return;
		}

		toast.showError(error, i18n.baseText('settings.context.collections.error.update'));
		nameEdit.value?.forceCancel();
		crumbNameEdit.value?.forceCancel();
		renameError.value = '';
	} finally {
		renaming.value = false;
	}
}

function onAction(action: CollectionAction) {
	const current = collection.value;
	if (!current) {
		return;
	}

	if (action === 'rename') {
		crumbNameEdit.value?.forceFocus();
	} else if (action === 'edit-description') {
		editingCollection.value = current;
		modalOpen.value = true;
	} else {
		deletingCollection.value = current;
	}
}

// The dialog stays mounted, so make sure a late save of another collection does not land here.
// Take only the description, so a rename that ends first keeps its name.
function onDescriptionSaved(saved: KnowledgeCollectionDto) {
	const current = collection.value;
	if (saved.id !== props.collectionId || !current) {
		return;
	}

	collection.value = { ...current, description: saved.description };
}

function closeDeleteDialog() {
	deletingCollection.value = null;
}

// Replace, so Back does not open the deleted collection.
async function onDeleted(deleted: KnowledgeCollectionDto) {
	closeDeleteDialog();
	if (!isCurrent(deleted.homeProject.id, deleted.id)) {
		return;
	}

	await router.replace(collectionsRoute);
}

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
			<N8nBreadcrumbs
				:items="breadcrumbItems"
				theme="medium"
				:highlight-last-item="!canEdit"
				@item-selected="onBreadcrumbSelect"
			>
				<template #prepend>
					<ProjectIcon :icon="projectIcon" size="mini" />
				</template>
				<template v-if="collection && canEdit" #append>
					<span :class="$style.crumbSeparator" aria-hidden="true">/</span>
					<N8nInlineTextEdit
						ref="crumbNameEdit"
						:model-value="collection.name"
						:disabled="renaming"
						:max-length="KNOWLEDGE_COLLECTION_NAME_MAX_LENGTH"
						:placeholder="i18n.baseText('settings.context.collections.modal.name.label')"
						:class="$style.crumbName"
						data-test-id="collection-name-crumb-edit"
						@update:model-value="onRename"
						@focusin="renameError = ''"
					/>
				</template>
			</N8nBreadcrumbs>
			<!-- A user who cannot change the collection has no menu. -->
			<N8nDropdownMenu
				v-if="canEdit"
				:items="collectionActions"
				:disabled="renaming"
				:modal="false"
				placement="bottom-end"
				data-test-id="collection-actions"
				@select="onAction"
			>
				<template #trigger>
					<N8nIconButton
						variant="ghost"
						icon="ellipsis-12"
						size="small"
						icon-size="small"
						:disabled="renaming"
						:aria-label="i18n.baseText('node.moreActions')"
					/>
				</template>
			</N8nDropdownMenu>
		</div>

		<div :class="$style.body">
			<div v-if="collection" :class="$style.column">
				<div :class="$style.heading">
					<!-- A user who cannot change the collection sees the name as plain text. -->
					<N8nHeading tag="h1" size="xlarge">
						<!-- A new edit clears the error: the user may put back the saved name, which sends nothing. -->
						<N8nInlineTextEdit
							v-if="canEdit"
							ref="nameEdit"
							:model-value="collection.name"
							:disabled="renaming"
							:max-length="KNOWLEDGE_COLLECTION_NAME_MAX_LENGTH"
							max-width="100%"
							:placeholder="i18n.baseText('settings.context.collections.modal.name.label')"
							:class="$style.titleEdit"
							data-test-id="collection-name-inline-edit"
							@update:model-value="onRename"
							@focusin="renameError = ''"
						/>
						<template v-else>{{ collection.name }}</template>
					</N8nHeading>
					<N8nText
						v-if="renameError"
						role="alert"
						tag="p"
						size="small"
						color="danger"
						data-test-id="collection-rename-error"
					>
						{{ renameError }}
					</N8nText>
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

		<CollectionModal
			v-model:open="modalOpen"
			:collection="editingCollection"
			description-only
			@saved="onDescriptionSaved"
		/>
		<DeleteCollectionDialog
			v-if="deletingCollection"
			:collection="deletingCollection"
			@close="closeDeleteDialog"
			@deleted="onDeleted"
		/>
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
	gap: var(--spacing--3xs);
	padding: var(--spacing--xs) var(--spacing--md);
	background-color: var(--background--surface);
	border-bottom: var(--border);
	flex-shrink: 0;
	min-height: var(--height--4xl);

	:global(.n8n-breadcrumbs > ul > li:first-child) {
		display: none;
	}
}

.crumbSeparator {
	color: var(--color--foreground);
	padding: var(--spacing--3xs) var(--spacing--4xs) var(--spacing--4xs);
	font-size: var(--font-size--xl);
	user-select: none;
}

.crumbName {
	font-size: var(--font-size--sm);
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

// Make sure the title does not move when the edit starts or ends.
// At this font size, the small offset of the preview puts it lower than the input.
.titleEdit :global([data-test-id='inline-edit-preview']) {
	transform: none;
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
