<script lang="ts" setup>
import { computed } from 'vue';
import { ProjectState, type ResourceType } from '@/utils/projects.utils';
import type { Project, ProjectIcon as BadgeIcon } from '@/types/projects.types';
import type { CredentialsResource, WorkflowResource } from '../layouts/ResourcesListLayout.vue';

type Props = {
	resource: WorkflowResource | CredentialsResource;
	resourceType: ResourceType;
	resourceTypeLabel: string;
	personalProject: Project | null;
	projectState: ProjectState;
	badgeText: string;
	badgeTooltip: string;
	homeProjectLink?: string | null;
	showBorder?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	showBorder: true,
	homeProjectLink: null,
});

const badgeIcon = computed<BadgeIcon>(() => {
	switch (props.projectState) {
		case ProjectState.Owned:
		case ProjectState.SharedOwned:
			return { type: 'icon', value: 'user' };
		case ProjectState.Team:
		case ProjectState.SharedTeam:
			return props.resource.homeProject?.icon ?? { type: 'icon', value: 'layer-group' };
		default:
			return { type: 'icon', value: 'user' };
	}
});
</script>
<template>
	<div :class="[$style.wrapper, { [$style.border]: props.showBorder }]">
		<div :class="$style['project-badge']" theme="tertiary" bold data-test-id="card-badge">
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
	</div>
</template>

<style lang="scss" module>
.wrapper {
	display: flex;
	align-items: center;

	&.border {
		border: var(--border-base);
		border-radius: var(--border-radius-base);
	}
}

.home-project,
.home-project :global(.n8n-text) {
	display: flex;
	align-items: center;
	gap: var(--spacing-3xs);
	color: var(--color-text-base);
}

.project-badge {
	font-size: var(--font-size-2xs);
}
</style>
