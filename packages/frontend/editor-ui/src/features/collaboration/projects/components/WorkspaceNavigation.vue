<script lang="ts" setup>
/**
 * PROTOTYPE (workspaces): the sidebar shows the personal workspace and the
 * workspaces the user joined, with their projects nested under them.
 */
import { VIEWS } from '@/app/constants';
import { N8nIcon, N8nIconButton, N8nMenuItem, N8nText, N8nTooltip } from '@n8n/design-system';
import type { IMenuItem } from '@n8n/design-system';
import type { WorkspaceListItem } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useProjectsStore } from '../projects.store';
import {
	DEFAULT_PROJECT_ICON,
	DEFAULT_WORKSPACE_ICON,
	WORKSPACE_PROJECTS_VIEW,
	WORKSPACES_VIEW,
} from '../projects.constants';
import type { ProjectListItem } from '../projects.types';
import { ProjectTypes } from '../projects.types';
import { useWorkspacesStore } from '../workspaces.store';

const props = defineProps<{ collapsed: boolean; activeId?: string | string[] | null }>();

const SECTION_COLLAPSED_KEY = 'n8n:sidebar:workspaces-collapsed';
const CLOSED_WORKSPACES_KEY = 'n8n:sidebar:workspaces-closed';

const locale = useI18n();
const route = useRoute();
const router = useRouter();
const projectsStore = useProjectsStore();
const workspacesStore = useWorkspacesStore();

const sectionCollapsed = ref(localStorage.getItem(SECTION_COLLAPSED_KEY) === 'true');
const closedIds = ref<string[]>(readClosedIds());

function readClosedIds(): string[] {
	try {
		const parsed: unknown = JSON.parse(localStorage.getItem(CLOSED_WORKSPACES_KEY) ?? '[]');
		return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
	} catch {
		return [];
	}
}

watch(sectionCollapsed, (value) => localStorage.setItem(SECTION_COLLAPSED_KEY, String(value)));
watch(closedIds, (value) => localStorage.setItem(CLOSED_WORKSPACES_KEY, JSON.stringify(value)), {
	deep: true,
});

const sidebarWorkspaces = computed(() => [
	...(workspacesStore.personalWorkspace ? [workspacesStore.personalWorkspace] : []),
	...workspacesStore.joinedWorkspaces,
]);

const isOpen = (id: string) => !closedIds.value.includes(id);
const toggle = (id: string) => {
	closedIds.value = isOpen(id)
		? [...closedIds.value, id]
		: closedIds.value.filter((closedId) => closedId !== id);
};

/** Users who only belong to one of its projects cannot open the workspace itself. */
const canOpen = (workspace: WorkspaceListItem) =>
	projectsStore.myProjects.some((p) => p.id === workspace.id);

const workspaceMenuItem = (workspace: WorkspaceListItem): IMenuItem => {
	const isPersonal = workspace.type === ProjectTypes.PersonalWorkspace;
	return {
		id: `workspace-${workspace.id}`,
		label: isPersonal ? locale.baseText('projects.menu.personal') : workspace.name,
		icon: isPersonal ? 'user' : ((workspace.icon ?? DEFAULT_WORKSPACE_ICON) as IMenuItem['icon']),
		route: canOpen(workspace)
			? { to: { name: WORKSPACE_PROJECTS_VIEW, params: { projectId: workspace.id } } }
			: undefined,
	};
};

const projectMenuItem = (project: ProjectListItem): IMenuItem => ({
	id: project.id,
	label:
		project.type === ProjectTypes.Personal
			? locale.baseText('workspaces.menu.personalProject')
			: (project.name ?? ''),
	icon:
		project.type === ProjectTypes.Personal
			? 'house'
			: ((project.icon ?? DEFAULT_PROJECT_ICON) as IMenuItem['icon']),
	route: { to: { name: VIEWS.PROJECTS_WORKFLOWS, params: { projectId: project.id } } },
});

const browseItem = computed<IMenuItem>(() => ({
	id: 'browse-workspaces',
	label: locale.baseText('workspaces.menu.browse'),
	icon: 'telescope',
	route: { to: { name: WORKSPACES_VIEW } },
}));

onMounted(async () => {
	if (!workspacesStore.loaded) await workspacesStore.fetchWorkspaces();
});
</script>

<template>
	<div :class="$style.workspaces" data-test-id="workspace-navigation">
		<div v-if="!props.collapsed" :class="$style.sectionHeader">
			<button :class="$style.sectionToggle" @click="sectionCollapsed = !sectionCollapsed">
				<N8nText size="small" bold color="text-light">
					{{ locale.baseText('workspaces.menu.title') }}
				</N8nText>
				<N8nIcon
					icon="chevron-down"
					size="medium"
					:class="[$style.chevron, sectionCollapsed ? $style.chevronCollapsed : '']"
				/>
			</button>
			<N8nTooltip :content="locale.baseText('workspaces.menu.browse')" placement="right">
				<N8nIconButton
					variant="ghost"
					size="xsmall"
					icon="plus"
					:class="[$style.browseButton, route.name === WORKSPACES_VIEW && $style.browseActive]"
					:aria-label="locale.baseText('workspaces.menu.browse')"
					data-test-id="browse-workspaces-button"
					@click="router.push({ name: WORKSPACES_VIEW })"
				/>
			</N8nTooltip>
		</div>
		<div v-if="props.collapsed || !sectionCollapsed" :class="$style.items">
			<template v-for="workspace in sidebarWorkspaces" :key="workspace.id">
				<div :class="$style.workspaceRow">
					<N8nMenuItem
						:item="workspaceMenuItem(workspace)"
						:compact="props.collapsed"
						:active="props.activeId === workspace.id && route.name === WORKSPACE_PROJECTS_VIEW"
						:class="$style.workspaceItem"
						data-test-id="workspace-menu-item"
						@click="!canOpen(workspace) && toggle(workspace.id)"
					/>
					<button
						v-if="!props.collapsed && workspacesStore.projectsIn(workspace.id).length > 0"
						:class="$style.toggle"
						:aria-label="locale.baseText('workspaces.menu.toggle')"
						@click.stop="toggle(workspace.id)"
					>
						<N8nIcon :icon="isOpen(workspace.id) ? 'chevron-down' : 'chevron-right'" size="small" />
					</button>
				</div>
				<div v-if="!props.collapsed && isOpen(workspace.id)" :class="$style.children">
					<N8nMenuItem
						v-for="project in workspacesStore.projectsIn(workspace.id)"
						:key="project.id"
						:item="projectMenuItem(project)"
						:active="props.activeId === project.id && route.name !== WORKSPACE_PROJECTS_VIEW"
						data-test-id="workspace-project-menu-item"
					/>
				</div>
			</template>
			<!-- The header + button is hidden when the sidebar is collapsed -->
			<N8nMenuItem
				v-if="props.collapsed"
				:item="browseItem"
				:compact="props.collapsed"
				:active="route.name === WORKSPACES_VIEW"
				data-test-id="browse-workspaces-menu-item"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.workspaces {
	width: 100%;
}

.sectionHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	width: 100%;
	padding: var(--spacing--2xs) var(--spacing--xs) var(--spacing--4xs);
}

.sectionToggle {
	display: flex;
	flex: 1;
	align-items: center;
	justify-content: space-between;
	min-width: 0;
	padding: 0;
	background: none;
	border: none;
	cursor: pointer;
}

.browseButton {
	color: var(--color--text--tint-1);
}

.browseActive {
	color: var(--color--primary);
}

.chevron {
	color: var(--color--text--tint-1);
	transition: transform 0.15s ease;
}

.chevronCollapsed {
	transform: rotate(-90deg);
}

.items {
	padding: var(--spacing--2xs) var(--spacing--3xs);
}

.workspaceRow {
	position: relative;
	display: flex;
	align-items: center;
}

.workspaceItem {
	flex: 1;
	min-width: 0;
}

.toggle {
	position: absolute;
	right: var(--spacing--3xs);
	display: flex;
	align-items: center;
	padding: var(--spacing--4xs);
	background: none;
	border: none;
	border-radius: var(--radius);
	color: var(--color--text--tint-1);
	cursor: pointer;

	&:hover {
		background-color: var(--color--background--light-1);
		color: var(--color--text--shade-1);
	}
}

.children {
	margin-left: var(--spacing--sm);
	padding-left: var(--spacing--3xs);
	border-left: var(--border-width) var(--border-style) var(--color--foreground);
}
</style>
