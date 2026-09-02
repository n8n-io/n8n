<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { IMenuItem } from '@n8n/design-system/types';
import { N8nIcon, N8nMenuItem, N8nText, N8nTooltip } from '@n8n/design-system';
import { VIEWS } from '@/app/constants';
import { PROJECT_DATA_TABLES } from '@/features/core/dataTable/constants';
import { useProjectsStore } from '../projects.store';
import ProjectIcon from './ProjectIcon.vue';
import { type IconOrEmoji, isIconOrEmoji } from '@n8n/design-system/components/N8nIconPicker/types';

/**
 * PoC (Project Home & IA): project-context drill-down sidebar. Replaces the
 * instance-level project list while the user is inside a project, and drills
 * one level deeper into grouped project settings, following the layered
 * Settings IA design. Settings sections marked `demo` are not shipped
 * features; their pages are mocked.
 */

const props = defineProps<{ collapsed: boolean }>();

const route = useRoute();
const router = useRouter();
const projectsStore = useProjectsStore();

const projectId = computed(() =>
	Array.isArray(route.params.projectId) ? route.params.projectId[0] : route.params.projectId,
);

const project = computed(() => projectsStore.currentProject);

const projectIcon = computed<IconOrEmoji>(() =>
	isIconOrEmoji(project.value?.icon) ? project.value.icon : { type: 'icon', value: 'layers' },
);

const memberCount = computed(() => project.value?.relations?.length ?? 0);

const isSettingsLevel = computed(() => route.name === VIEWS.PROJECT_SETTINGS);

const activeSection = computed(() => (route.params.section as string) || 'info');

const projectMenuItems = computed<IMenuItem[]>(() => {
	const params = { projectId: projectId.value };
	return [
		{
			id: 'home',
			label: 'Home',
			icon: 'house',
			route: { to: { name: VIEWS.PROJECT_HOME, params } },
		},
		{
			id: 'workflows',
			label: 'Workflows',
			icon: 'zap',
			route: { to: { name: VIEWS.PROJECTS_WORKFLOWS, params } },
		},
		{
			id: 'credentials',
			label: 'Credentials',
			icon: 'key-round',
			route: { to: { name: VIEWS.PROJECTS_CREDENTIALS, params } },
		},
		{
			id: 'executions',
			label: 'Executions',
			icon: 'history',
			route: { to: { name: VIEWS.PROJECTS_EXECUTIONS, params } },
		},
		{
			id: 'data-tables',
			label: 'Data tables',
			icon: 'database',
			route: { to: { name: PROJECT_DATA_TABLES, params } },
		},
		{
			id: 'variables',
			label: 'Variables',
			icon: 'variable',
			route: { to: { name: VIEWS.PROJECTS_VARIABLES, params } },
		},
	];
});

const activeProjectItemId = computed(() => {
	switch (route.name) {
		case VIEWS.PROJECT_HOME:
			return 'home';
		case VIEWS.PROJECTS_WORKFLOWS:
		case VIEWS.PROJECTS_FOLDERS:
			return 'workflows';
		case VIEWS.PROJECTS_CREDENTIALS:
			return 'credentials';
		case VIEWS.PROJECTS_EXECUTIONS:
			return 'executions';
		case PROJECT_DATA_TABLES:
			return 'data-tables';
		case VIEWS.PROJECTS_VARIABLES:
			return 'variables';
		default:
			return '';
	}
});

interface SettingsGroup {
	label: string;
	items: Array<{ id: string; label: string; icon: IMenuItem['icon']; demo?: boolean }>;
}

const settingsGroups: SettingsGroup[] = [
	{
		label: 'General',
		items: [
			{ id: 'info', label: 'Project info', icon: 'layers' },
			{ id: 'members', label: 'Members', icon: 'users' },
		],
	},
	{
		label: 'Resources & integrations',
		items: [
			{ id: 'external-secrets', label: 'External secrets', icon: 'vault' },
			{ id: 'credential-resolvers', label: 'Credential resolvers', icon: 'key', demo: true },
			{ id: 'community-nodes', label: 'Community nodes', icon: 'package-open', demo: true },
		],
	},
	{
		label: 'Source control',
		items: [
			{ id: 'repository', label: 'Repository', icon: 'git-branch', demo: true },
			{ id: 'environments', label: 'Environments', icon: 'share', demo: true },
			{ id: 'workflow-review', label: 'Workflow review', icon: 'eye', demo: true },
		],
	},
	{
		label: 'Policies',
		items: [
			{ id: 'node-controls', label: 'Node controls', icon: 'ban', demo: true },
			{ id: 'workflow-rules', label: 'Workflow rules', icon: 'list-checks', demo: true },
			{ id: 'secrets-policy', label: 'External secrets policy', icon: 'shield', demo: true },
		],
	},
];

function goBack() {
	if (isSettingsLevel.value) {
		void router.push({ name: VIEWS.PROJECT_HOME, params: { projectId: projectId.value } });
	} else {
		void router.push({ name: VIEWS.HOMEPAGE });
	}
}

function openSection(section: string) {
	void router.push({
		name: VIEWS.PROJECT_SETTINGS,
		params: { projectId: projectId.value, section },
	});
}

function openSettings() {
	openSection('info');
}
</script>

<template>
	<div :class="$style.nav" data-test-id="project-side-nav">
		<button :class="$style.back" data-test-id="project-side-nav-back" @click="goBack">
			<N8nIcon icon="arrow-left" size="small" />
			<N8nText v-if="!props.collapsed" size="small" color="text-base">
				{{ isSettingsLevel ? `Back to ${project?.name ?? 'project'}` : 'Back to overview' }}
			</N8nText>
		</button>

		<div :class="$style.identity">
			<ProjectIcon :icon="projectIcon" :border-less="true" size="medium" />
			<div v-if="!props.collapsed" :class="$style.identityText">
				<N8nText bold :class="$style.identityName">
					{{ project?.name }}<template v-if="isSettingsLevel"> — Settings</template>
				</N8nText>
				<N8nText size="xsmall" color="text-light">
					<template v-if="isSettingsLevel">11 settings · 4 groups</template>
					<template v-else
						>{{ memberCount }} {{ memberCount === 1 ? 'member' : 'members' }}</template
					>
				</N8nText>
			</div>
		</div>

		<template v-if="!isSettingsLevel">
			<div :class="$style.items">
				<N8nMenuItem
					v-for="item in projectMenuItems"
					:key="item.id"
					:item="item"
					:compact="props.collapsed"
					:active="activeProjectItemId === item.id"
				/>
			</div>
			<div :class="$style.settingsEntry">
				<button :class="$style.settingsButton" @click="openSettings">
					<N8nIcon icon="settings" size="small" />
					<template v-if="!props.collapsed">
						<N8nText size="small" color="text-base">Project settings</N8nText>
						<N8nIcon icon="chevron-right" size="small" :class="$style.chevron" />
					</template>
				</button>
			</div>
		</template>

		<template v-else>
			<div v-for="group in settingsGroups" :key="group.label" :class="$style.group">
				<N8nText
					v-if="!props.collapsed"
					size="xsmall"
					bold
					color="text-light"
					:class="$style.groupLabel"
				>
					{{ group.label.toUpperCase() }}
				</N8nText>
				<button
					v-for="item in group.items"
					:key="item.id"
					:class="[$style.sectionItem, activeSection === item.id && $style.sectionActive]"
					@click="openSection(item.id)"
				>
					<N8nIcon :icon="item.icon ?? 'settings'" size="small" />
					<template v-if="!props.collapsed">
						<N8nText size="small" color="text-base" :class="$style.sectionLabel">
							{{ item.label }}
						</N8nText>
						<N8nTooltip
							v-if="item.demo"
							content="Demo data: this feature area is mocked in the PoC"
						>
							<span :class="$style.demoBadge">demo</span>
						</N8nTooltip>
					</template>
				</button>
			</div>
		</template>
	</div>
</template>

<style lang="scss" module>
.nav {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--2xs) var(--spacing--2xs) var(--spacing--sm);
	gap: var(--spacing--3xs);
}

.back {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	background: none;
	border: none;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	cursor: pointer;
	border-radius: var(--radius);
	color: var(--color--text--tint-1);

	&:hover {
		background: var(--color--background);
	}
}

.identity {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs);
	border-bottom: var(--border);
	margin-bottom: var(--spacing--3xs);
}

.identityText {
	min-width: 0;
}

.identityName {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.items {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.settingsEntry {
	margin-top: var(--spacing--3xs);
	border-top: var(--border);
	padding-top: var(--spacing--3xs);
}

.settingsButton {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	background: none;
	border: none;
	padding: var(--spacing--2xs);
	cursor: pointer;
	border-radius: var(--radius);

	&:hover {
		background: var(--color--background);
	}
}

.chevron {
	margin-left: auto;
	color: var(--color--text--tint-1);
}

.group {
	display: flex;
	flex-direction: column;
	gap: 2px;
	margin-top: var(--spacing--2xs);
}

.groupLabel {
	padding: 0 var(--spacing--2xs) var(--spacing--4xs);
	letter-spacing: 0.5px;
}

.sectionItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	background: none;
	border: none;
	padding: var(--spacing--2xs);
	cursor: pointer;
	border-radius: var(--radius);
	text-align: left;

	&:hover {
		background: var(--color--background);
	}
}

.sectionActive {
	background: var(--color--background);
}

.sectionLabel {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.demoBadge {
	border: 1px dashed var(--color--foreground);
	border-radius: var(--radius);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--3xs);
	line-height: 1.4;
	padding: 0 var(--spacing--4xs);
}
</style>
