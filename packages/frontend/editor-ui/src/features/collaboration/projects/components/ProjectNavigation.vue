<script lang="ts" setup>
import { useGlobalEntityCreation } from '@/app/composables/useGlobalEntityCreation';
import { VIEWS } from '@/app/constants';
import { sourceControlEventBus } from '@/features/integrations/sourceControl.ee/sourceControl.eventBus';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { N8nIcon, N8nMenuItem, N8nText } from '@n8n/design-system';
import type { IMenuItem } from '@n8n/design-system/types';
import { useI18n } from '@n8n/i18n';
import { computed, onBeforeMount, onBeforeUnmount, ref, watch } from 'vue';
import { useProjectsStore } from '../projects.store';
import type { ProjectListItem } from '../projects.types';
import { CHAT_VIEW } from '@/features/ai/chatHub/constants';
import { useFavoritesStore } from '@/app/stores/favorites.store';
import { useFavoriteNavItems } from '../composables/useFavoriteNavItems';
import { INSTANCE_AI_VIEW } from '@/features/ai/instanceAi/constants';

import { hasPermission } from '@/app/utils/rbac/permissions';

const PROJECTS_COLLAPSED_KEY = 'n8n:sidebar:projects-collapsed';

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

const {
	favoriteGroups,
	activeTabId,
	onFavoriteProjectClick,
	onFavoriteWorkflowClick,
	onUnpinFavorite,
} = useFavoriteNavItems();

const displayProjects = computed(() => globalEntityCreation.displayProjects.value);
const isFoldersFeatureEnabled = computed(() => settingsStore.isFoldersFeatureEnabled);
const isChatLinkAvailable = computed(
	() =>
		settingsStore.isChatFeatureEnabled &&
		hasPermission(['rbac'], { rbac: { scope: 'chatHub:message' } }),
);
const isInstanceAiNavVisible = computed(() => {
	if (!settingsStore.isModuleActive('instance-ai')) return false;
	const ms = settingsStore.moduleSettings['instance-ai'];
	return ms?.enabled !== false;
});
const hasMultipleVerifiedUsers = computed(
	() => usersStore.allUsers.filter((user) => !user.isPendingUser).length > 1,
);

const FAVORITES_COLLAPSED_KEY = computed(
	() => `n8n:sidebar:${usersStore.currentUser?.id ?? 'anonymous'}:favorites-collapsed`,
);

const favoritesCollapsed = ref(localStorage.getItem(FAVORITES_COLLAPSED_KEY.value) === 'true');
const projectsCollapsed = ref(localStorage.getItem(PROJECTS_COLLAPSED_KEY) === 'true');

watch(favoritesCollapsed, (val) =>
	localStorage.setItem(FAVORITES_COLLAPSED_KEY.value, String(val)),
);
watch(projectsCollapsed, (val) => localStorage.setItem(PROJECTS_COLLAPSED_KEY, String(val)));

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

const hasFavorites = computed(() => favoritesStore.favorites.length > 0);

const instanceAi = computed<IMenuItem>(() => ({
	id: 'instance-ai',
	icon: 'sparkles',
	label: locale.baseText('projects.menu.instanceAi'),
	route: { to: { name: INSTANCE_AI_VIEW } },
	preview: true,
}));

const chat = computed<IMenuItem>(() => ({
	id: 'chat',
	icon: 'message-circle',
	label: locale.baseText('projects.menu.chat'),
	position: 'bottom',
	route: { to: { name: CHAT_VIEW } },
	preview: true,
}));

async function onSourceControlPull() {
	// Update myProjects for the sidebar display
	await projectsStore.getMyProjects();
}

onBeforeMount(async () => {
	await usersStore.fetchUsers({ filter: { isPending: false }, take: 2 });
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
				v-if="isInstanceAiNavVisible"
				:item="instanceAi"
				:compact="props.collapsed"
				:active="activeTabId === 'instance-ai'"
				data-test-id="project-instance-ai-menu-item"
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
			<button
				v-if="!props.collapsed"
				:class="$style.sectionHeader"
				@click="favoritesCollapsed = !favoritesCollapsed"
			>
				<N8nText size="small" bold color="text-light">
					{{ locale.baseText('favorites.menu.title') }}
				</N8nText>
				<N8nIcon
					icon="chevron-down"
					size="medium"
					:class="[$style.chevron, favoritesCollapsed ? $style.chevronCollapsed : '']"
				/>
			</button>
			<div v-if="props.collapsed || !favoritesCollapsed" :class="$style.projectItems">
				<template v-for="(group, groupIndex) in favoriteGroups" :key="group.type">
					<div v-if="!props.collapsed && groupIndex > 0" :class="$style.groupSpacer" />
					<template v-for="entry in group.items" :key="entry.menuItem.id">
						<div
							:class="[$style.favoriteItem, props.collapsed && $style.collapsed]"
							@click="
								group.type === 'project'
									? onFavoriteProjectClick(entry.resourceId)
									: group.type === 'workflow'
										? onFavoriteWorkflowClick()
										: undefined
							"
						>
							<N8nMenuItem
								:item="entry.menuItem"
								:compact="props.collapsed"
								:active="activeTabId === entry.menuItem.id"
							/>
							<button
								v-if="!props.collapsed"
								:class="$style.unpinButton"
								:aria-label="locale.baseText('favorites.remove')"
								data-test-id="favorite-unpin-button"
								@click.stop.prevent="onUnpinFavorite(entry.resourceId, entry.resourceType)"
							>
								<N8nIcon icon="x" size="small" />
							</button>
						</div>
					</template>
				</template>
			</div>
		</template>
		<template v-if="projectsStore.isTeamProjectFeatureEnabled && displayProjects.length > 0">
			<button
				v-if="!props.collapsed"
				:class="$style.sectionHeader"
				@click="projectsCollapsed = !projectsCollapsed"
			>
				<N8nText size="small" bold color="text-light">
					{{ locale.baseText('projects.menu.title') }}
				</N8nText>
				<N8nIcon
					icon="chevron-down"
					size="medium"
					:class="[$style.chevron, projectsCollapsed ? $style.chevronCollapsed : '']"
				/>
			</button>
		</template>
		<div
			v-if="
				(projectsStore.isTeamProjectFeatureEnabled || isFoldersFeatureEnabled) &&
				(!projectsStore.isTeamProjectFeatureEnabled || !projectsCollapsed || props.collapsed)
			"
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

.sectionHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	width: calc(100% - var(--spacing--3xs) * 2);
	box-sizing: border-box;
	padding: var(--spacing--4xs) var(--spacing--3xs);
	margin: var(--spacing--4xs) var(--spacing--3xs) 0;
	background: none;
	border: none;
	border-radius: var(--spacing--4xs);
	cursor: pointer;
	color: inherit;

	&:hover {
		background-color: var(--color--background--light-1);
		color: var(--color--text--shade-1);

		.chevron {
			color: var(--color--text--shade-1);
		}
	}

	&:focus-visible {
		outline: 1px solid var(--color--secondary);
		outline-offset: -1px;
	}
}

.chevron {
	color: var(--color--text--tint-1);
	transition: transform 0.15s ease;
	flex-shrink: 0;
}

.chevronCollapsed {
	transform: rotate(-90deg);
}

/* Keep old .projectsLabel for any remaining usages */
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
	height: var(--spacing--5xs);
}

.favoriteItem {
	position: relative;

	&:hover .unpinButton,
	.unpinButton:focus-visible {
		opacity: 1;
		pointer-events: auto;
	}

	&:not(.collapsed):hover a[role='menuitem'] {
		background-color: var(--color--background--light-1);
		color: var(--color--text--shade-1);
		padding-right: var(--spacing--lg);
	}
}

.unpinButton {
	position: absolute;
	right: var(--spacing--4xs);
	top: 50%;
	transform: translateY(-50%);
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--5xs);
	background: none;
	border: none;
	color: var(--color--text--tint-2);
	cursor: pointer;
	opacity: 0;
	pointer-events: none;
	transition: opacity 0.15s ease;

	&:hover,
	&:focus-visible {
		color: var(--color--text);
	}
}
</style>
