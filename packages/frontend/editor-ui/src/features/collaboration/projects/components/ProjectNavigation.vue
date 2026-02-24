<script lang="ts" setup>
import { useGlobalEntityCreation } from '@/app/composables/useGlobalEntityCreation';
import { VIEWS } from '@/app/constants';
import { sourceControlEventBus } from '@/features/integrations/sourceControl.ee/sourceControl.eventBus';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { N8nMenuItem, N8nText } from '@n8n/design-system';
import type { IMenuItem } from '@n8n/design-system/types';
import { useI18n } from '@n8n/i18n';
import { computed, onBeforeMount, onBeforeUnmount } from 'vue';
import { useProjectsStore } from '../projects.store';
import type { ProjectListItem } from '../projects.types';
import { CHAT_VIEW } from '@/features/ai/chatHub/constants';
import { useFavoritesStore } from '@/app/stores/favorites.store';
import { DATA_TABLE_DETAILS } from '@/features/core/dataTable/constants';
import FavoritesSidebarCompact from './FavoritesSidebarCompact.vue';

import { hasPermission } from '@/app/utils/rbac/permissions';

type Props = {
	collapsed: boolean;
	planName?: string;
};

const props = defineProps<Props>();

const locale = useI18n();
const globalEntityCreation = useGlobalEntityCreation();

const projectsStore = useProjectsStore();
const settingsStore = useSettingsStore();
const usersStore = useUsersStore();
const favoritesStore = useFavoritesStore();

const displayProjects = computed(() => globalEntityCreation.displayProjects.value);
const isFoldersFeatureEnabled = computed(() => settingsStore.isFoldersFeatureEnabled);
const isChatLinkAvailable = computed(
	() =>
		settingsStore.isChatFeatureEnabled &&
		hasPermission(['rbac'], { rbac: { scope: 'chatHub:message' } }),
);
const hasMultipleVerifiedUsers = computed(
	() => usersStore.allUsers.filter((user) => !user.isPendingUser).length > 1,
);

const home = computed<IMenuItem>(() => ({
	id: 'home',
	label: locale.baseText('projects.menu.overview'),
	icon: 'house',
	route: {
		to: { name: VIEWS.HOMEPAGE },
	},
}));

const shared = computed<IMenuItem>(() => ({
	id: 'shared',
	label: locale.baseText('projects.menu.shared'),
	icon: 'share',
	route: {
		to: { name: VIEWS.SHARED_WITH_ME },
	},
}));

const getProjectMenuItem = (project: ProjectListItem): IMenuItem => ({
	id: project.id,
	label: project.name ?? '',
	icon: project.icon as IMenuItem['icon'],
	route: {
		to: {
			name: VIEWS.PROJECTS_WORKFLOWS,
			params: { projectId: project.id },
		},
	},
});

const personalProject = computed<IMenuItem>(() => ({
	id: projectsStore.personalProject?.id ?? '',
	label: locale.baseText('projects.menu.personal'),
	icon: 'user',
	route: {
		to: {
			name: VIEWS.PROJECTS_WORKFLOWS,
			params: { projectId: projectsStore.personalProject?.id },
		},
	},
}));

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
				route: { to: { name: VIEWS.PROJECTS_WORKFLOWS, params: { projectId: f.resourceId } } },
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

type FavoriteGroup = {
	type: string;
	items: IMenuItem[];
	showIndividualIcons: boolean;
};

const favoriteGroups = computed<FavoriteGroup[]>(() => {
	const groups: FavoriteGroup[] = [];
	// Projects first, each with its own icon
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
	return groups;
});

const hasFavorites = computed(() => favoritesStore.favorites.length > 0);

const activeTabId = computed(() => {
	return (
		(Array.isArray(projectsStore.projectNavActiveId)
			? projectsStore.projectNavActiveId[0]
			: projectsStore.projectNavActiveId) ?? undefined
	);
});

const chat = computed<IMenuItem>(() => ({
	id: 'chat',
	icon: 'message-circle',
	label: locale.baseText('projects.menu.chat'),
	position: 'bottom',
	route: { to: { name: CHAT_VIEW } },
	beta: true,
}));

async function onSourceControlPull() {
	// Update myProjects for the sidebar display
	await projectsStore.getMyProjects();
}

onBeforeMount(async () => {
	await usersStore.fetchUsers({ filter: { isPending: false }, take: 2 });
	void favoritesStore.fetchFavorites();
	sourceControlEventBus.on('pull', onSourceControlPull);
});

onBeforeUnmount(() => {
	sourceControlEventBus.off('pull', onSourceControlPull);
});
</script>

<template>
	<div :class="$style.projects">
		<div :class="[$style.home, props.collapsed ? $style.collapsed : '']">
			<N8nMenuItem
				:item="home"
				:compact="props.collapsed"
				:active="activeTabId === 'home'"
				data-test-id="project-home-menu-item"
			/>
			<N8nMenuItem
				v-if="projectsStore.isTeamProjectFeatureEnabled || isFoldersFeatureEnabled"
				:item="personalProject"
				:compact="props.collapsed"
				:active="activeTabId === personalProject.id"
				data-test-id="project-personal-menu-item"
			/>
			<N8nMenuItem
				v-if="
					(projectsStore.isTeamProjectFeatureEnabled || isFoldersFeatureEnabled) &&
					hasMultipleVerifiedUsers
				"
				:item="shared"
				:compact="props.collapsed"
				:active="activeTabId === 'shared'"
				data-test-id="project-shared-menu-item"
			/>
			<N8nMenuItem
				v-if="isChatLinkAvailable"
				:item="chat"
				:compact="props.collapsed"
				:active="activeTabId === 'chat'"
				data-test-id="project-chat-menu-item"
			/>
		</div>
		<template v-if="hasFavorites">
			<N8nText
				v-if="!props.collapsed"
				:class="$style.projectsLabel"
				size="small"
				bold
				role="heading"
				color="text-light"
			>
				{{ locale.baseText('favorites.menu.title') }}
			</N8nText>
			<div :class="$style.projectItems">
				<!-- Expanded: flat list, icon hidden (but space preserved) on non-first items per group -->
				<template v-if="!props.collapsed">
					<template v-for="(group, groupIndex) in favoriteGroups" :key="group.type">
						<div v-if="groupIndex > 0" :class="$style.groupSpacer" />
						<N8nMenuItem
							v-for="(item, itemIndex) in group.items"
							:key="item.id"
							:item="
								!group.showIndividualIcons && itemIndex > 0
									? { ...item, icon: { type: 'icon', value: '' } as IMenuItem['icon'] }
									: item
							"
							:compact="false"
							:active="activeTabId === item.id"
						/>
					</template>
				</template>
				<!-- Collapsed: single star trigger with hover popover -->
				<template v-else>
					<FavoritesSidebarCompact />
				</template>
			</div>
		</template>
		<N8nText
			v-if="
				!props.collapsed && projectsStore.isTeamProjectFeatureEnabled && displayProjects.length > 0
			"
			:class="[$style.projectsLabel]"
			size="small"
			bold
			role="heading"
			color="text-light"
		>
			{{ locale.baseText('projects.menu.title') }}
		</N8nText>
		<div
			v-if="projectsStore.isTeamProjectFeatureEnabled || isFoldersFeatureEnabled"
			:class="$style.projectItems"
		>
			<N8nMenuItem
				v-for="project in displayProjects"
				:key="project.id"
				:class="{
					[$style.collapsed]: props.collapsed,
				}"
				:item="getProjectMenuItem(project)"
				:compact="props.collapsed"
				:active="activeTabId === project.id"
				data-test-id="project-menu-item"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.projects {
	width: 100%;
	align-items: start;
	gap: var(--spacing--3xs);
	&:hover {
		.plusBtn {
			display: block;
		}
	}
}

.projectItems {
	padding: var(--spacing--2xs) var(--spacing--3xs);
}

.upgradeLink {
	color: var(--color--primary);
	cursor: pointer;
}

.projectsLabel {
	display: flex;
	justify-content: space-between;
	text-overflow: ellipsis;
	overflow: hidden;
	box-sizing: border-box;
	padding: 0 var(--spacing--xs);
	margin-top: var(--spacing--2xs);

	&.collapsed {
		padding: 0;
		margin-left: 0;
		justify-content: center;
	}
}

.plusBtn {
	margin: 0;
	padding: 0;
	color: var(--color--text--tint-1);
	display: none;
}

.addFirstProjectBtn {
	font-size: var(--font-size--xs);
	margin: 0 var(--spacing--xs);
	width: calc(100% - var(--spacing--xs) * 2);

	&.collapsed {
		display: none;
	}
}

.home {
	padding: 0 var(--spacing--3xs) var(--spacing--2xs);

	&.collapsed {
		border-bottom: var(--border);
	}
}

.groupSpacer {
	height: var(--spacing--4xs);
}
</style>
