<script setup lang="ts">
import { ProjectState, splitName, type ResourceType } from '@/utils/projects.utils';
import type { CredentialsResource, WorkflowResource } from '../layouts/ResourcesListLayout.vue';
import { ProjectTypes, type Project } from '@/types/projects.types';
import { useI18n } from '@/composables/useI18n';
import { useRouter } from 'vue-router';
import { computed, ref } from 'vue';
import { isWorkflowResource } from '@/utils/typeGuards';
import type { PathItem } from '@n8n/design-system/components/N8nBreadcrumbs/Breadcrumbs.vue';
import { useFoldersStore } from '@/stores/folders.store';
import { VIEWS } from '@/constants';

type Props = {
	resource: WorkflowResource | CredentialsResource;
	resourceType: ResourceType;
	resourceTypeLabel: string;
	personalProject: Project | null;
	hideBreadcrumbs?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	hideBreadcrumbs: false,
});

// Hide breadcrumbs for other people's personal spaces
const hideBreadcrumbsFor = [ProjectState.SharedPersonal, ProjectState.Personal];

const hiddenBreadcrumbsItemsAsync = ref<Promise<PathItem[]>>(new Promise(() => {}));

const i18n = useI18n();
const router = useRouter();

const foldersStore = useFoldersStore();

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

const shouldHideBreadcrumbs = computed(() => {
	return (
		props.hideBreadcrumbs ||
		!isWorkflowResource(props.resource) ||
		hideBreadcrumbsFor.includes(projectState.value)
	);
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
		:class="{
			[$style['card-info-badge']]: true,
			[$style['with-breadcrumbs']]: !shouldHideBreadcrumbs && cardBreadcrumbs.length,
		}"
		data-test-id="card-info-badge"
	>
		<N8nTooltip :disabled="!badgeTooltip || numberOfMembersInHomeTeamProject !== 0" placement="top">
			<div :class="$style['project-badge']">
				<ProjectCardBadge
					:resource="props.resource"
					:resource-type="props.resourceType"
					:resource-type-label="props.resourceTypeLabel"
					:project-state="projectState"
					:badge-text="badgeText"
					:badge-tooltip="badgeTooltip"
					:personal-project="props.personalProject"
					:home-project-link="homeProjectLink"
					:show-border="false"
				/>
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
				+{{ numberOfMembersInHomeTeamProject }}
			</div>
			<template #content>
				{{ badgeTooltip }}
			</template>
		</N8nTooltip>
	</div>
</template>
<style module lang="scss">
.card-info-badge {
	display: flex;
	align-items: center;
	border: var(--border-base);
	border-radius: var(--border-radius-base);

	&.with-breadcrumbs {
		.project-badge {
			padding-right: 0;
		}
	}
}

.project-badge {
	padding: var(--spacing-4xs) var(--spacing-3xs);
}

.count-badge {
	font-size: var(--font-size-2xs);
	padding: var(--spacing-4xs) var(--spacing-3xs);
	color: var(--color-text-base);
	border-left: var(--border-base);
}
</style>
