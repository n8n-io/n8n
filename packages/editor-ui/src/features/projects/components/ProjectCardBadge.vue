<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from '@/composables/useI18n';
import { ProjectTypes, splitName } from '@/features/projects/projects.utils';
import type { ICredentialsResponse, IWorkflowDb } from '@/Interface';
import type { Project } from '@/features/projects/projects.types';

type Props = {
	resource: IWorkflowDb | ICredentialsResponse;
	personalProject: Project | null;
};

const props = defineProps<Props>();

const locale = useI18n();

const badgeText = computed(() => {
	if (
		(props.resource.homeProject &&
			props.personalProject &&
			props.resource.homeProject.id === props.personalProject.id) ||
		!props.resource.homeProject
	) {
		return locale.baseText('generic.ownedByMe');
	} else {
		const { firstName, lastName } = splitName(props.resource.homeProject?.name ?? '');
		return `${firstName}${lastName ? ' ' + lastName : ''}`;
	}
});

const badgeIcon = computed(() => {
	if (
		props.resource.sharedWithProjects?.length &&
		props.resource.homeProject?.type !== ProjectTypes.Team
	) {
		return 'user-friends';
	} else if (props.resource.homeProject?.type === ProjectTypes.Team) {
		return 'archive';
	} else {
		return '';
	}
});
</script>
<template>
	<n8n-badge v-if="badgeText" class="mr-xs" theme="tertiary" bold data-test-id="card-badge">
		{{ badgeText }}
		<n8n-icon v-if="badgeIcon" :icon="badgeIcon" size="small" class="ml-5xs" />
	</n8n-badge>
</template>

<style lang="scss" module></style>
