<script lang="ts" setup>
import type { ICredentialsResponse, IWorkflowDb } from '@/Interface';
import { ResourceType } from '@/utils/projects.utils';

const props = defineProps<{
	routeName: string;
	resource: IWorkflowDb | ICredentialsResponse;
	resourceType: ResourceType;
	resourceTypeLabel: string;
	projectId: string;
	projectName: string;
}>();

const isWorkflow = props.resourceType === ResourceType.Workflow;
</script>
<template>
	<i18n-t keypath="projects.move.resource.success.message">
		<template #resourceTypeLabel>{{ props.resourceTypeLabel }}</template>
		<template #resourceName>{{ props.resource.name }}</template>
		<template #targetProjectName>{{ props.projectName }}</template>
		<template v-if="isWorkflow" #workflow>
			<N8nText>
				<br />
				<i18n-t keypath="projects.move.resource.success.message.workflow">
					<template #targetProjectName>{{ props.projectName }}</template>
				</i18n-t>
			</N8nText>
		</template>
		<template #link>
			<router-link
				:to="{
					name: props.routeName,
					params: { projectId: props.projectId },
				}"
			>
				<p class="pt-s">
					<i18n-t keypath="projects.move.resource.success.link">
						<template #targetProjectName>{{ props.projectName }}</template>
					</i18n-t>
				</p>
			</router-link>
		</template>
	</i18n-t>
</template>
