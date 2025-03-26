<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useI18n } from '@/composables/useI18n';
import type { ResourceType } from '@/utils/projects.utils';
import { splitName } from '@/utils/projects.utils';
import type { Project, ProjectIcon as BadgeIcon } from '@/types/projects.types';
import { ProjectTypes } from '@/types/projects.types';
import type { CredentialsResource, WorkflowResource } from '../layouts/ResourcesListLayout.vue';
import type { PathItem } from '@n8n/design-system/components/N8nBreadcrumbs/Breadcrumbs.vue';
import { isWorkflowResource } from '@/utils/typeGuards';
import { VIEWS } from '@/constants';
import { useRouter } from 'vue-router';
import { useFoldersStore } from '@/stores/folders.store';

type Props = {
	resource: WorkflowResource | CredentialsResource;
	resourceType: ResourceType;
	resourceTypeLabel: string;
	personalProject: Project | null;
	hideBreadcrumbs?: boolean;
};

const enum ProjectState {
	SharedPersonal = 'shared-personal',
	SharedOwned = 'shared-owned',
	Owned = 'owned',
	Personal = 'personal',
	Team = 'team',
	SharedTeam = 'shared-team',
	Unknown = 'unknown',
}

// Hide breadcrumbs for other people's personal spaces
const hideBreadcrumbsFor = [ProjectState.SharedPersonal, ProjectState.Personal];

const props = withDefaults(defineProps<Props>(), {
	hideBreadcrumbs: false,
});

const i18n = useI18n();
const router = useRouter();

const foldersStore = useFoldersStore();

const hiddenBreadcrumbsItemsAsync = ref<Promise<PathItem[]>>(new Promise(() => {}));

const projectState = computed(() => {
	if (
		(props.resource.homeProject &&
			props.personalProject &&
			props.resource.homeProject.id === props.personalProject.id) ||
		!props.resource.homeProject
	) {
		if (props.resource.sharedWithProjects?.length) {
			return ProjectState.SharedOwned;
		}
		return ProjectState.Owned;
	} else if (props.resource.homeProject?.type !== ProjectTypes.Team) {
		if (props.resource.sharedWithProjects?.length) {
			return ProjectState.SharedPersonal;
		}
		return ProjectState.Personal;
	} else if (props.resource.homeProject?.type === ProjectTypes.Team) {
		if (props.resource.sharedWithProjects?.length) {
			return ProjectState.SharedTeam;
		}
		return ProjectState.Team;
	}
	return ProjectState.Unknown;
});

const numberOfMembersInHomeTeamProject = computed(
	() => props.resource.sharedWithProjects?.length ?? 0,
);

const badgeText = computed(() => {
	if (
		projectState.value === ProjectState.Owned ||
		projectState.value === ProjectState.SharedOwned
	) {
		return i18n.baseText('projects.menu.personal');
	} else {
		const { name, email } = splitName(props.resource.homeProject?.name ?? '');
		return name ?? email ?? '';
	}
});
const badgeIcon = computed<BadgeIcon>(() => {
	switch (projectState.value) {
		case ProjectState.Owned:
		case ProjectState.SharedOwned:
			return { type: 'icon', value: 'user' };
		case ProjectState.Team:
		case ProjectState.SharedTeam:
			return props.resource.homeProject?.icon ?? { type: 'icon', value: 'layer-group' };
		default:
			return { type: 'icon', value: 'layer-group' };
	}
});
const badgeTooltip = computed(() => {
	switch (projectState.value) {
		case ProjectState.SharedOwned:
			return i18n.baseText('projects.badge.tooltip.sharedOwned', {
				interpolate: {
					resourceTypeLabel: props.resourceTypeLabel,
					count: numberOfMembersInHomeTeamProject.value,
				},
			});
		case ProjectState.SharedPersonal:
			return i18n.baseText('projects.badge.tooltip.sharedPersonal', {
				interpolate: {
					resourceTypeLabel: props.resourceTypeLabel,
					name: badgeText.value,
					count: numberOfMembersInHomeTeamProject.value,
				},
			});
		case ProjectState.Personal:
			return i18n.baseText('projects.badge.tooltip.personal', {
				interpolate: {
					resourceTypeLabel: props.resourceTypeLabel,
					name: badgeText.value,
				},
			});
		case ProjectState.Team:
			return i18n.baseText('projects.badge.tooltip.team', {
				interpolate: {
					resourceTypeLabel: props.resourceTypeLabel,
					name: badgeText.value,
				},
			});
		case ProjectState.SharedTeam:
			return i18n.baseText('projects.badge.tooltip.sharedTeam', {
				interpolate: {
					resourceTypeLabel: props.resourceTypeLabel,
					name: badgeText.value,
					count: numberOfMembersInHomeTeamProject.value,
				},
			});
		default:
			return '';
	}
});

const shouldHideBreadcrumbs = computed(() => {
	return (
		props.hideBreadcrumbs ||
		!isWorkflowResource(props.resource) ||
		hideBreadcrumbsFor.includes(projectState.value)
	);
});

const cardBreadcrumbs = computed<PathItem[]>(() => {
	if (shouldHideBreadcrumbs.value) {
		return [];
	}
	const resource = props.resource as WorkflowResource;
	if (resource.parentFolder) {
		return [
			{
				id: resource.parentFolder.id,
				name: resource.parentFolder.name,
				label: resource.parentFolder.name,
				href: router.resolve({
					name: VIEWS.PROJECTS_FOLDERS,
					params: {
						projectId: resource.homeProject?.id,
						folderId: resource.parentFolder.id,
					},
				}).href,
			},
		];
	}
	return [];
});

const homeProjectLink = computed(() => {
	if (
		!isWorkflowResource(props.resource) ||
		hideBreadcrumbsFor.includes(projectState.value) ||
		!props.resource.homeProject
	) {
		return null;
	}
	return router.resolve({
		name: VIEWS.PROJECTS_WORKFLOWS,
		params: { projectId: props.resource.homeProject.id },
	}).href;
});

const onBreadcrumbItemClick = async (item: PathItem) => {
	if (item.href) {
		await router.push(item.href);
	}
};

const fetchHiddenBreadCrumbsItems = async () => {
	if (!isWorkflowResource(props.resource)) {
		return;
	}
	if (!props.resource.homeProject?.id || !props.resource.parentFolder) {
		hiddenBreadcrumbsItemsAsync.value = Promise.resolve([]);
	} else {
		hiddenBreadcrumbsItemsAsync.value = foldersStore.getHiddenBreadcrumbsItems(
			{ id: props.resource.homeProject.id, name: badgeText.value },
			props.resource.parentFolder.id,
		);
	}
};
</script>
<template>
	<div
		:class="{ [$style.wrapper]: true, [$style['with-breadcrumbs']]: cardBreadcrumbs.length > 0 }"
	>
		<N8nTooltip :disabled="!badgeTooltip || numberOfMembersInHomeTeamProject !== 0" placement="top">
			<div
				v-if="badgeText"
				:class="$style['project-badge']"
				theme="tertiary"
				bold
				data-test-id="card-badge"
			>
				<n8n-link
					v-if="homeProjectLink"
					:to="homeProjectLink"
					:class="$style['home-project']"
					theme="text"
					size="small"
				>
					<ProjectIcon :icon="badgeIcon" :border-less="true" size="mini" />
					<span v-n8n-truncate:20 :class="$style['badge-text']">{{ badgeText }}</span>
				</n8n-link>
				<div v-else :class="$style['home-project']">
					<ProjectIcon :icon="badgeIcon" :border-less="true" size="mini" />
					<span v-n8n-truncate:20 :class="$style['badge-text']">{{ badgeText }}</span>
				</div>
			</div>
			<template #content>
				{{ badgeTooltip }}
			</template>
		</N8nTooltip>

		<n8n-breadcrumbs
			v-if="!shouldHideBreadcrumbs && cardBreadcrumbs.length"
			:items="cardBreadcrumbs"
			:hidden-items="hiddenBreadcrumbsItemsAsync"
			:path-truncated="true"
			:highlight-last-item="false"
			hidden-items-trigger="hover"
			:show-border="false"
			theme="small"
			data-test-id="workflow-card-breadcrumbs"
			@item-selected="onBreadcrumbItemClick"
			@tooltip-opened="fetchHiddenBreadCrumbsItems"
		>
			<template #prepend></template>
		</n8n-breadcrumbs>
		<N8nTooltip :disabled="!badgeTooltip || numberOfMembersInHomeTeamProject === 0" placement="top">
			<div
				v-if="numberOfMembersInHomeTeamProject"
				:class="$style['count-badge']"
				theme="tertiary"
				bold
			>
				+ {{ numberOfMembersInHomeTeamProject }}
			</div>
			<template #content>
				{{ badgeTooltip }}
			</template>
		</N8nTooltip>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	display: flex;
	align-items: center;
	border: var(--border-base);
	border-radius: var(--border-radius-base);
}

.home-project,
.home-project :global(.n8n-text) {
	display: flex;
	align-items: center;
	gap: var(--spacing-4xs);
	color: var(--color-text-dark);
}

.project-badge,
.count-badge {
	font-size: var(--font-size-2xs);
	padding: var(--spacing-4xs) var(--spacing-3xs);
}

.count-badge {
	border-left: var(--border-base);
}

.with-breadcrumbs {
	.project-badge {
		padding-right: 0;
	}
	:global(.n8n-breadcrumbs) {
		padding-left: var(--spacing-5xs);
	}
}
</style>
