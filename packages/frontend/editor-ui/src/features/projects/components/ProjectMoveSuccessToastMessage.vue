<script lang="ts" setup>
import { computed } from 'vue';
import { ResourceType, getTruncatedProjectName } from '../projects.utils';
import type { ProjectListItem } from '../projects.types';
import { ProjectTypes } from '../projects.types';
import { useI18n } from '@n8n/i18n';

import { N8nText } from '@n8n/design-system';
const props = defineProps<{
	routeName: string;
	resourceType: ResourceType;
	targetProject: ProjectListItem;
	isShareCredentialsChecked: boolean;
	areAllUsedCredentialsShareable: boolean;
}>();

const i18n = useI18n();

const isWorkflow = computed(() => props.resourceType === ResourceType.Workflow);
const isTargetProjectTeam = computed(() => props.targetProject.type === ProjectTypes.Team);
const targetProjectName = computed(() => {
	return getTruncatedProjectName(props.targetProject?.name);
});
</script>
<template>
	<div>
		<N8nText v-if="isWorkflow" tag="p" class="pt-xs">
			<span v-if="props.isShareCredentialsChecked && props.areAllUsedCredentialsShareable">{{
				i18n.baseText('projects.move.resource.success.message.workflow.withAllCredentials')
			}}</span>
			<span v-else-if="props.isShareCredentialsChecked">{{
				i18n.baseText('projects.move.resource.success.message.workflow.withSomeCredentials')
			}}</span>
			<span v-else>{{ i18n.baseText('projects.move.resource.success.message.workflow') }}</span>
		</N8nText>
		<p v-if="isTargetProjectTeam" class="pt-s">
			<RouterLink
				:to="{
					name: props.routeName,
					params: { projectId: props.targetProject.id },
				}"
			>
				{{
					i18n.baseText('projects.move.resource.success.link', {
						interpolate: { targetProjectName },
					})
				}}
			</RouterLink>
		</p>
	</div>
</template>
