<script lang="ts" setup>
import type { ICredentialsResponse, IWorkflowDb } from '@/Interface';

const props = defineProps<{
	routeName: string;
	resource: IWorkflowDb | ICredentialsResponse;
	resourceTypeLabel: string;
	projectId: string;
	projectName: string;
}>();
</script>
<template>
	<i18n-t keypath="projects.move.resource.success.message">
		<template #resourceTypeLabel>{{ props.resourceTypeLabel }}</template>
		<template #resourceName>{{ props.resource.name }}</template>
		<template #targetProjectName>{{ props.projectName }}</template>
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
