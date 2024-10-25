<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from '@/composables/useI18n';
import type { ResourceType } from '@/utils/projects.utils';
import { splitName } from '@/utils/projects.utils';
import type { ICredentialsResponse, IWorkflowDb } from '@/Interface';
import type { Project } from '@/types/projects.types';
import { ProjectTypes } from '@/types/projects.types';

type Props = {
	resource: IWorkflowDb | ICredentialsResponse;
	resourceType: ResourceType;
	resourceTypeLabel: string;
	personalProject: Project | null;
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

const props = defineProps<Props>();

const i18n = useI18n();

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
const badgeIcon = computed(() => {
	switch (projectState.value) {
		case ProjectState.Owned:
		case ProjectState.SharedOwned:
			return 'user';
		case ProjectState.Team:
		case ProjectState.SharedTeam:
			return 'layer-group';
		default:
			return '';
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
</script>
<template>
	<N8nTooltip :disabled="!badgeTooltip" placement="top">
		<div class="mr-xs">
			<N8nBadge
				v-if="badgeText"
				:class="$style.badge"
				theme="tertiary"
				bold
				data-test-id="card-badge"
			>
				<N8nIcon v-if="badgeIcon" :icon="badgeIcon" size="small" class="mr-3xs" />
				<span v-n8n-truncate:20>{{ badgeText }}</span>
			</N8nBadge>
			<N8nBadge
				v-if="numberOfMembersInHomeTeamProject"
				:class="[$style.badge, $style.countBadge]"
				theme="tertiary"
				bold
			>
				+ {{ numberOfMembersInHomeTeamProject }}
			</N8nBadge>
		</div>
		<template #content>
			{{ badgeTooltip }}
		</template>
	</N8nTooltip>
</template>

<style lang="scss" module>
.badge {
	padding: var(--spacing-4xs) var(--spacing-2xs);
	background-color: var(--color-background-xlight);
	border-color: var(--color-foreground-base);

	z-index: 1;
	position: relative;
	height: 23px;
	:global(.n8n-text) {
		color: var(--color-text-base);
	}
}

.countBadge {
	margin-left: -5px;
	z-index: 0;
	position: relative;
	height: 23px;
	:global(.n8n-text) {
		color: var(--color-text-light);
	}
}
</style>
