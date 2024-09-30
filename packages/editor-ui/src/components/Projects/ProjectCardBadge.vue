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
const badgeText = computed(() => {
	if (
		projectState.value === ProjectState.Owned ||
		projectState.value === ProjectState.SharedOwned
	) {
		return i18n.baseText('generic.ownedByMe');
	} else {
		const { name, email } = splitName(props.resource.homeProject?.name ?? '');
		return name ?? email ?? '';
	}
});
const badgeIcon = computed(() => {
	switch (projectState.value) {
		case ProjectState.SharedPersonal:
		case ProjectState.SharedOwned:
			return 'user-friends';
		case ProjectState.Team:
		case ProjectState.SharedTeam:
			return 'archive';
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
				},
			});
		case ProjectState.SharedPersonal:
			return i18n.baseText('projects.badge.tooltip.sharedPersonal', {
				interpolate: {
					resourceTypeLabel: props.resourceTypeLabel,
					name: badgeText.value,
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
				},
			});
		default:
			return '';
	}
});
</script>
<template>
	<N8nTooltip :disabled="!badgeTooltip" placement="top">
		<N8nBadge v-if="badgeText" class="mr-xs" theme="tertiary" bold data-test-id="card-badge">
			<span v-n8n-truncate:20>{{ badgeText }}</span>
			<N8nIcon v-if="badgeIcon" :icon="badgeIcon" size="small" class="ml-5xs" />
		</N8nBadge>
		<template #content>
			{{ badgeTooltip }}
		</template>
	</N8nTooltip>
</template>

<style lang="scss" module></style>
