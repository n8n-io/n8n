<script lang="ts" setup>
import { computed, onBeforeUnmount, ref } from 'vue';
import { N8nIcon, N8nMenuItem, N8nPopover, N8nText } from '@n8n/design-system';
import type { IMenuItem } from '@n8n/design-system/types';
import { useI18n } from '@n8n/i18n';
import { VIEWS } from '@/app/constants';
import { useFavoritesStore } from '@/app/stores/favorites.store';
import { useProjectsStore } from '../projects.store';
import type { Project } from '../projects.types';
import { DATA_TABLE_DETAILS } from '@/features/core/dataTable/constants';

const locale = useI18n();
const favoritesStore = useFavoritesStore();
const projectsStore = useProjectsStore();

const show = ref(false);
let closeTimer: ReturnType<typeof setTimeout> | null = null;

function onMouseEnter() {
	if (closeTimer !== null) {
		clearTimeout(closeTimer);
		closeTimer = null;
	}
	show.value = true;
}

function onMouseLeave() {
	closeTimer = setTimeout(() => {
		show.value = false;
	}, 150);
}

onBeforeUnmount(() => {
	if (closeTimer !== null) clearTimeout(closeTimer);
});

const favoriteWorkflowItems = computed<IMenuItem[]>(() =>
	favoritesStore.favorites
		.filter((f) => f.resourceType === 'workflow')
		.map((f) => ({
			id: `favorite-workflow-${f.resourceId}`,
			label: f.resourceName,
			icon: 'log-in' as IMenuItem['icon'],
			route: { to: { name: VIEWS.WORKFLOW, params: { name: f.resourceId } } },
		})),
);

const favoriteProjectItems = computed<IMenuItem[]>(() =>
	favoritesStore.favorites
		.filter((f) => f.resourceType === 'project')
		.map((f) => {
			const project = projectsStore.myProjects.find((p) => p.id === f.resourceId);
			return {
				id: `favorite-project-${f.resourceId}`,
				label: f.resourceName,
				icon: (project?.icon as IMenuItem['icon']) ?? ('layers' as IMenuItem['icon']),
				route: {
					to: { name: VIEWS.PROJECTS_WORKFLOWS, params: { projectId: f.resourceId } },
				},
			};
		}),
);

const favoriteDataTableItems = computed<IMenuItem[]>(() =>
	favoritesStore.favorites
		.filter((f) => f.resourceType === 'dataTable' && f.resourceProjectId)
		.map((f) => ({
			id: `favorite-datatable-${f.resourceId}`,
			label: f.resourceName,
			icon: 'table' as IMenuItem['icon'],
			route: {
				to: {
					name: DATA_TABLE_DETAILS,
					params: { projectId: f.resourceProjectId, id: f.resourceId },
				},
			},
		})),
);

const favoriteFolderItems = computed<IMenuItem[]>(() =>
	favoritesStore.favorites
		.filter((f) => f.resourceType === 'folder' && f.resourceProjectId)
		.map((f) => ({
			id: `favorite-folder-${f.resourceId}`,
			label: f.resourceName,
			icon: 'folder' as IMenuItem['icon'],
			route: {
				to: {
					name: VIEWS.PROJECTS_FOLDERS,
					params: { projectId: f.resourceProjectId, folderId: f.resourceId },
				},
			},
		})),
);

type FavoriteGroup = {
	type: string;
	items: IMenuItem[];
	showIndividualIcons: boolean;
};

const favoriteGroups = computed<FavoriteGroup[]>(() => {
	const groups: FavoriteGroup[] = [];
	if (favoriteProjectItems.value.length > 0) {
		groups.push({
			type: 'project',
			items: favoriteProjectItems.value,
			showIndividualIcons: true,
		});
	}
	if (favoriteWorkflowItems.value.length > 0) {
		groups.push({
			type: 'workflow',
			items: favoriteWorkflowItems.value,
			showIndividualIcons: false,
		});
	}
	if (favoriteDataTableItems.value.length > 0) {
		groups.push({
			type: 'dataTable',
			items: favoriteDataTableItems.value,
			showIndividualIcons: false,
		});
	}
	if (favoriteFolderItems.value.length > 0) {
		groups.push({
			type: 'folder',
			items: favoriteFolderItems.value,
			showIndividualIcons: false,
		});
	}
	return groups;
});

const activeTabId = computed(() => {
	const id = projectsStore.projectNavActiveId;
	return (Array.isArray(id) ? id[0] : id) ?? undefined;
});

const hasFavorites = computed(() => favoritesStore.favorites.length > 0);

function onFavoriteProjectClick(itemId: string) {
	const projectId = itemId.replace('favorite-project-', '');
	const project = projectsStore.myProjects.find((p) => p.id === projectId);
	if (project) {
		projectsStore.setCurrentProject(project as unknown as Project);
	}
}
</script>

<template>
	<N8nPopover
		v-if="hasFavorites"
		side="right"
		align="start"
		:side-offset="8"
		:open="show"
		width="220px"
		:suppress-auto-focus="true"
		@update:open="show = $event"
	>
		<template #trigger>
			<div :class="$style.trigger" @mouseenter="onMouseEnter" @mouseleave="onMouseLeave">
				<N8nIcon icon="star" size="medium" />
			</div>
		</template>
		<template #content>
			<div :class="$style.content" @mouseenter="onMouseEnter" @mouseleave="onMouseLeave">
				<N8nText :class="$style.title" size="small" bold color="text-light">
					{{ locale.baseText('favorites.menu.title') }}
				</N8nText>
				<template v-for="(group, groupIndex) in favoriteGroups" :key="group.type">
					<div v-if="groupIndex > 0" :class="$style.groupSpacer" />
					<template v-for="(item, itemIndex) in group.items" :key="item.id">
						<div v-if="group.type === 'project'" @click="onFavoriteProjectClick(item.id)">
							<N8nMenuItem :item="item" :compact="false" :active="activeTabId === item.id" />
						</div>
						<N8nMenuItem
							v-else
							:item="
								!group.showIndividualIcons && itemIndex > 0
									? { ...item, icon: { type: 'icon', value: '' } as unknown as IMenuItem['icon'] }
									: item
							"
							:compact="false"
							:active="activeTabId === item.id"
						/>
					</template>
				</template>
			</div>
		</template>
	</N8nPopover>
</template>

<style lang="scss" module>
.trigger {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--4xs);
	cursor: pointer;
	width: 100%;
	color: var(--color--text--tint-1);
}

.content {
	padding: var(--spacing--3xs);
}

.title {
	display: block;
	padding: 0 var(--spacing--xs);
	margin-bottom: var(--spacing--4xs);
}

.groupSpacer {
	height: var(--spacing--4xs);
}
</style>
