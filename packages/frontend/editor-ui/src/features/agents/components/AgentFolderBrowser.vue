<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
	N8nActionToggle,
	N8nCard,
	N8nIcon,
	N8nPagination,
	N8nText,
	type PathItem,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@n8n/composables/useToast';
import { getResourcePermissions } from '@n8n/permissions';
import { useUsersStore } from '@n8n/stores/users.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useFavoritesStore } from '@/app/stores/favorites.store';
import { getFolderPath, getProjectFolders, moveFolder } from '@/features/core/folders/folders.api';
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
	search: string;
	sortBy: string;
	hideToolbar?: boolean;
}>();
const emit = defineEmits<{ changed: []; count: [value: number] }>();
const rootStore = useRootStore();
const projectsStore = useProjectsStore();
const usersStore = useUsersStore();
const favorites = useFavoritesStore();
const i18n = useI18n();
const toast = useToast();
const router = useRouter();
const route = useRoute();
const { canUpdate, canDelete } = useAgentPermissions(() => props.projectId);
const folders = ref<ChangeLocationSearchResponseItem[]>([]);
const path = ref<PathItem[]>([]);
const count = ref(0);
const page = ref(1);
const action = ref<AgentFolderAction | null>(null);
const dragged = ref<{ type: 'agent' | 'folder'; id: string } | null>(null);
const pageSize = 20;
let generation = 0;

const folderPermissions = computed(() => {
	const global = getResourcePermissions(usersStore.currentUser?.globalScopes).folder;
	const project = getResourcePermissions(
		projectsStore.myProjects.find((item) => item.id === props.projectId)?.scopes,
	).folder;

	return {
		create: global.create || project.create,
		update: global.update || project.update,
		delete: global.delete || project.delete,
		list: global.list || project.list,
	};
});
const breadcrumbs = computed<PathItem[]>(() => [
	{ id: PROJECT_ROOT, label: i18n.baseText('agents.folders.root') },
	...path.value,
]);

async function refresh() {
	const requestGeneration = ++generation;

	if (!folderPermissions.value.list) return;

	try {
		const response = await getProjectFolders(
			rootStore.restApiContext,
			props.projectId,
			{
				resourceType: 'agent',
				skip: (page.value - 1) * pageSize,
				take: pageSize,
				sortBy: props.sortBy,
			},
			props.search
				? { name: props.search, parentFolderId: props.folderId ?? PROJECT_ROOT }
				: { parentFolderId: props.folderId ?? PROJECT_ROOT },
			['id', 'name', 'parentFolder', 'agentCount', 'subFolderCount', 'path', 'updatedAt'],
		);

		if (requestGeneration !== generation) return;

		folders.value = response.data;
		count.value = response.count;
		emit('count', response.count);
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
		toast.showError(cause, i18n.baseText('agents.folders.error'));
	}
}

watch(
	() => [props.projectId, props.folderId, props.search, props.sortBy],
	() => {
		page.value = 1;
		void refresh();
	},
	{ immediate: true },
);
watch(page, () => {
	void refresh();
});

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
		...(folderPermissions.value.create
			? [{ value: 'create', label: i18n.baseText('agents.folders.create') }]
			: []),
		...(folderPermissions.value.update && canUpdate.value
			? [
					{ value: 'rename', label: i18n.baseText('agents.folders.rename') },
					{ value: 'moveFolder', label: i18n.baseText('agents.folders.move') },
				]
			: []),
		...(folderPermissions.value.delete && (canDelete.value || canUpdate.value)
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
		} else if (folderPermissions.value.update) {
			await moveFolder(rootStore.restApiContext, props.projectId, source.id, targetId);
		}

		changed();
	} catch (cause) {
		toast.showError(cause, i18n.baseText('agents.folders.error'));
	}
}

defineExpose({
	breadcrumbs,
	folderPermissions,
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
			:can-create="Boolean(folderPermissions.create)"
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
			<N8nText size="small" color="text-light">
				{{
					i18n.baseText('agents.folders.agentCount', {
						interpolate: { count: folder.agentCount ?? 0 },
					})
				}}
			</N8nText>
			<N8nText v-if="search" size="small" color="text-light">{{ folder.path.join(' / ') }}</N8nText>
			<template #append
				><N8nActionToggle
					:actions="actionsFor(folder)"
					@action="onAction($event, folder)"
					@click.stop
					@keydown.stop
			/></template>
		</N8nCard>
		<N8nPagination
			v-if="count > pageSize"
			v-model:page="page"
			:total="count"
			:items-per-page="pageSize"
			:show-sizes="false"
		/>
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
