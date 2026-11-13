<script setup lang="ts">
import { computed, ref, toRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { N8nCard, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@n8n/composables/useToast';
import { useFavoritesStore } from '@/app/stores/favorites.store';
import FolderCardSubtitle from '@/features/core/folders/components/FolderCardSubtitle.vue';
import FolderCardActions from '@/features/core/folders/components/FolderCardActions.vue';
import { FOLDER_LIST_ITEM_ACTIONS } from '@/features/core/folders/folders.constants';
import { moveFolder } from '@/features/core/folders/folders.api';
import type { ChangeLocationSearchResponseItem } from '@/features/core/folders/folders.types';
import { PROJECT_ROOT } from 'n8n-workflow';
import { invalidateProjectAgentsListCache } from '../composables/useProjectAgentsList';
import { moveAgent } from '../composables/useAgentApi';
import { PROJECT_AGENTS } from '../constants';
import { useAgentPermissions } from '../composables/useAgentPermissions';
import { useAgentFolderBreadcrumb } from '../composables/useAgentFolderBreadcrumb';
import { useCreateAgent } from '../composables/useCreateAgent';
import AgentFolderDialog, { type AgentFolderAction } from './AgentFolderDialog.vue';

const props = defineProps<{
	projectId: string;
	folderId: string | null;
	folders: ChangeLocationSearchResponseItem[];
	search: string;
	folderPermissions: { create: boolean; update: boolean; delete: boolean };
}>();
const emit = defineEmits<{ changed: [] }>();
const rootStore = useRootStore();
const favorites = useFavoritesStore();
const i18n = useI18n();
const toast = useToast();
const router = useRouter();
const route = useRoute();
const { canCreate, canUpdate, canDelete } = useAgentPermissions(() => props.projectId);
const { createAgent } = useCreateAgent();
const path = useAgentFolderBreadcrumb(toRef(props, 'projectId'), toRef(props, 'folderId'));
const action = ref<AgentFolderAction | null>(null);
const dragged = ref<{ type: 'agent' | 'folder'; id: string } | null>(null);

function navigate(id: string) {
	void router.push({
		name: PROJECT_AGENTS,
		params: { projectId: props.projectId },
		query: { ...route.query, folderId: id === PROJECT_ROOT ? undefined : id },
	});
}

const folderActions = computed(() => [
	{ value: FOLDER_LIST_ITEM_ACTIONS.OPEN, label: i18n.baseText('generic.open'), disabled: false },
	{
		value: FOLDER_LIST_ITEM_ACTIONS.CREATE,
		label: i18n.baseText('folders.actions.create'),
		disabled: !props.folderPermissions.create,
	},
	{
		value: FOLDER_LIST_ITEM_ACTIONS.CREATE_AGENT,
		label: i18n.baseText('agents.folders.createAgentInside'),
		disabled: !canCreate.value,
	},
	{
		value: FOLDER_LIST_ITEM_ACTIONS.RENAME,
		label: i18n.baseText('generic.rename'),
		disabled: !props.folderPermissions.update || !canUpdate.value,
	},
	{
		value: FOLDER_LIST_ITEM_ACTIONS.MOVE,
		label: i18n.baseText('folders.actions.moveToFolder'),
		disabled: !props.folderPermissions.update || !canUpdate.value,
	},
	{
		value: FOLDER_LIST_ITEM_ACTIONS.DELETE,
		label: i18n.baseText('generic.delete'),
		disabled: !props.folderPermissions.delete || (!canDelete.value && !canUpdate.value),
	},
]);

function onAction(value: string, folder: ChangeLocationSearchResponseItem) {
	const selectedAction = folderActions.value.find((item) => item.value === value);

	if (!selectedAction || selectedAction.disabled) {
		return;
	}

	if (value === 'open') {
		navigate(folder.id);

		return;
	}

	if (value === 'create_agent') {
		createAgent('dropdown', props.projectId, undefined, folder.id);

		return;
	}

	if (value === 'create') action.value = { mode: 'create', parentFolderId: folder.id };
	if (value === 'rename' || value === 'move' || value === 'delete') {
		action.value = {
			mode: value === 'move' ? 'moveFolder' : value,
			canRelocate: canUpdate.value,
			canDelete: canDelete.value,
			id: folder.id,
			name: folder.name,
			parentFolderId: folder.parentFolder?.id,
		};
	}
}

function changed() {
	invalidateProjectAgentsListCache(props.projectId);
	void favorites.fetchFavorites(true);
	emit('changed');
}

function startAgentDrag(id: string) {
	dragged.value = { type: 'agent', id };
}

async function drop(targetId: string) {
	const source = dragged.value;
	dragged.value = null;

	if (!source || source.id === targetId || !canUpdate.value) return;

	try {
		if (source.type === 'agent') {
			await moveAgent(
				rootStore.restApiContext,
				props.projectId,
				source.id,
				targetId === PROJECT_ROOT ? null : targetId,
			);
		} else if (props.folderPermissions.update) {
			await moveFolder(rootStore.restApiContext, props.projectId, source.id, targetId);
		}

		changed();
	} catch (cause) {
		toast.showError(cause, i18n.baseText('agents.folders.error'));
	}
}

defineExpose({
	breadcrumbs: path,
	isDragging: computed(() => dragged.value !== null),
	navigate,
	drop,
	startAgentDrag,
	endDrag: () => {
		dragged.value = null;
	},
});
</script>

<template>
	<section :class="$style.browser" data-testid="agent-folders">
		<N8nCard
			v-for="folder in folders"
			:key="folder.id"
			:class="$style.folder"
			:draggable="folderPermissions.update && canUpdate"
			data-testid="agent-folder-card"
			role="link"
			tabindex="0"
			@keydown.enter="navigate(folder.id)"
			@keydown.space.prevent="navigate(folder.id)"
			@click="navigate(folder.id)"
			@dragstart="dragged = { type: 'folder', id: folder.id }"
			@dragend="dragged = null"
			@dragover.prevent
			@drop.prevent.stop="drop(folder.id)"
		>
			<template #prepend>
				<N8nIcon icon="folder" size="xlarge" />
			</template>
			<template #header>
				<div :class="$style.name">
					<N8nText tag="h2" size="small" bold>{{ folder.name }}</N8nText>
				</div>
			</template>
			<template #footer>
				<FolderCardSubtitle
					:resource-count="folder.agentCount ?? 0"
					:resource-label="
						i18n.baseText('agents.folders.agentCount', {
							interpolate: { count: folder.agentCount ?? 0 },
						})
					"
					:sub-folder-count="folder.subFolderCount"
					:updated-at="folder.updatedAt"
					:created-at="folder.createdAt"
					test-id-prefix="agent-folder"
				/>
			</template>
			<N8nText v-if="search" size="small" color="text-light">{{ folder.path.join(' / ') }}</N8nText>
			<template #append>
				<FolderCardActions
					:folder="folder"
					:actions="folderActions"
					@action="onAction($event, folder)"
				/>
			</template>
		</N8nCard>
		<AgentFolderDialog
			:project-id="projectId"
			:action="action"
			@close="action = null"
			@saved="changed"
		/>
	</section>
</template>

<style module lang="scss">
.browser {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin-bottom: var(--spacing--2xs);
}

.folder {
	cursor: pointer;
}

.name {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	min-width: 0;
	overflow-wrap: anywhere;
	margin-bottom: var(--spacing--5xs);
}
</style>
