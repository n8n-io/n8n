<script lang="ts" setup>
import { computed } from 'vue';
import type { ICredentialsResponse, IWorkflowDb } from '@/Interface';
import { ResourceType } from '@/utils/projects.utils';
import type { ProjectListItem } from '@/types/projects.types';
import { ProjectTypes } from '@/types/projects.types';

const props = defineProps<{
	routeName: string;
	resource: IWorkflowDb | ICredentialsResponse;
	resourceType: ResourceType;
	resourceTypeLabel: string;
	targetProject: ProjectListItem;
}>();

const isWorkflow = computed(() => props.resourceType === ResourceType.Workflow);
const isTargetProjectTeam = computed(() => props.targetProject.type === ProjectTypes.Team);
</script>
<template>
	<i18n-t keypath="projects.move.resource.success.message">
		<template #resourceTypeLabel>{{ props.resourceTypeLabel }}</template>
		<template #resourceName>{{ props.resource.name }}</template>
		<template #targetProjectName>{{ props.targetProject.name }}</template>
		<template v-if="isWorkflow" #workflow>
			<N8nText>
				<br />
				<i18n-t keypath="projects.move.resource.success.message.workflow">
					<template #targetProjectName>{{ props.targetProject.name }}</template>
				</i18n-t>
			</N8nText>
		</template>
		<template v-if="isTargetProjectTeam" #link>
			<router-link
				:to="{
					name: props.routeName,
					params: { projectId: props.targetProject.id },
				}"
			>
				<p class="pt-s">
					<i18n-t keypath="projects.move.resource.success.link">
						<template #targetProjectName>{{ props.targetProject.name }}</template>
					</i18n-t>
				</p>
			</router-link>
		</template>
	</i18n-t>
</template>
