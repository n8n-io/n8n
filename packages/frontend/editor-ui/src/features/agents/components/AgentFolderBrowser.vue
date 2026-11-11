<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { N8nActionToggle, N8nCard, N8nIcon, N8nText, type PathItem } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@n8n/composables/useToast';
import { useFavoritesStore } from '@/app/stores/favorites.store';
import FolderCardSubtitle from '@/features/core/folders/components/FolderCardSubtitle.vue';
import { getFolderPath, moveFolder } from '@/features/core/folders/folders.api';
import type { ChangeLocationSearchResponseItem } from '@/features/core/folders/folders.types';
import { PROJECT_ROOT } from 'n8n-workflow';
import { invalidateProjectAgentsListCache } from '../composables/useProjectAgentsList';
import { moveAgent } from '../composables/useAgentApi';
import { PROJECT_AGENTS } from '../constants';
import { useAgentPermissions } from '../composables/useAgentPermissions';
import AgentFolderDialog, { type AgentFolderAction } from './AgentFolderDialog.vue';
import AgentFolderToolbar from './AgentFolderToolbar.vue';

const props = defineProps<{
	projectId: string;
	folderId: string | null;
	folders: ChangeLocationSearchResponseItem[];
	search: string;
	folderPermissions: { create: boolean; update: boolean; delete: boolean };
	hideToolbar?: boolean;
}>();
const emit = defineEmits<{ changed: [] }>();
const rootStore = useRootStore();
const favorites = useFavoritesStore();
const i18n = useI18n();
const toast = useToast();
const router = useRouter();
const route = useRoute();
const { canUpdate, canDelete } = useAgentPermissions(() => props.projectId);
const path = ref<PathItem[]>([]);
const action = ref<AgentFolderAction | null>(null);
const dragged = ref<{ type: 'agent' | 'folder'; id: string } | null>(null);
let generation = 0;

const breadcrumbs = computed<PathItem[]>(() => [
	{ id: PROJECT_ROOT, label: i18n.baseText('agents.folders.root') },
	...path.value,
]);

async function refresh() {
	const requestGeneration = ++generation;
	path.value = [];

	try {
		const tree = props.folderId
			? await getFolderPath(rootStore.restApiContext, props.projectId, props.folderId)
			: [];
		const items: PathItem[] = [];
		let node = tree[0];

		while (node) {
			items.push({ id: node.id, label: node.name });
			node = node.children[0];
		}

		if (requestGeneration === generation) path.value = items;
	} catch (cause) {
		if (requestGeneration === generation) {
			toast.showError(cause, i18n.baseText('agents.folders.error'));
		}
	}
}

watch(
	() => [props.projectId, props.folderId],
	() => {
		void refresh();
	},
	{ immediate: true },
);

function createFolder() {
	action.value = { mode: 'create', parentFolderId: props.folderId };
}

function navigate(id: string) {
	void router.push({
		name: PROJECT_AGENTS,
		params: { projectId: props.projectId },
		query: { ...route.query, folderId: id === PROJECT_ROOT ? undefined : id },
	});
}

function actionsFor(folder: ChangeLocationSearchResponseItem) {
	return [
		{
			value: 'favorite',
			label: i18n.baseText(
				favorites.isFavorite(folder.id, 'folder') ? 'favorites.remove' : 'favorites.add',
			),
		},
		...(props.folderPermissions.create
			? [{ value: 'create', label: i18n.baseText('agents.folders.create') }]
			: []),
		...(props.folderPermissions.update && canUpdate.value
			? [
					{ value: 'rename', label: i18n.baseText('agents.folders.rename') },
					{ value: 'moveFolder', label: i18n.baseText('agents.folders.move') },
				]
			: []),
		...(props.folderPermissions.delete && (canDelete.value || canUpdate.value)
			? [{ value: 'delete', label: i18n.baseText('agents.folders.deleteTitle'), destructive: true }]
			: []),
	];
}

function onAction(value: string, folder: ChangeLocationSearchResponseItem) {
	if (value === 'favorite') {
		void favorites.toggleFavorite(folder.id, 'folder');

		return;
	}

	if (value === 'create') action.value = { mode: 'create', parentFolderId: folder.id };
	if (value === 'rename' || value === 'moveFolder' || value === 'delete') {
		action.value = {
			mode: value,
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
	void refresh();
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
	breadcrumbs,
	isDragging: computed(() => dragged.value !== null),
	navigate,
	drop,
	createFolder,
	startAgentDrag,
	endDrag: () => {
		dragged.value = null;
	},
	refresh,
});
</script>

<template>
	<section :class="$style.browser" data-testid="agent-folders">
		<AgentFolderToolbar
			v-if="!hideToolbar"
			:items="breadcrumbs"
			:folder-id="folderId"
			:can-create="folderPermissions.create"
			:drag-active="dragged !== null"
			@navigate="navigate"
			@drop="drop"
			@create="createFolder"
		/>
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
			<template #append
				><N8nActionToggle
					:actions="actionsFor(folder)"
					@action="onAction($event, folder)"
					@click.stop
					@keydown.stop
			/></template>
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
