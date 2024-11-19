<script lang="ts" setup>
import { computed } from 'vue';
import { truncate } from 'n8n-design-system';
import type { ICredentialsResponse, IWorkflowDb } from '@/Interface';
import { ResourceType, splitName } from '@/utils/projects.utils';
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
const projectName = computed(() => {
	const { name, email } = splitName(props.targetProject?.name ?? '');
	return truncate(name ?? email ?? '', 25);
});
</script>
<template>
	<i18n-t keypath="projects.move.resource.success.message">
		<template #resourceTypeLabel>{{ props.resourceTypeLabel }}</template>
		<template #resourceName
			><strong>{{ props.resource.name }}</strong></template
		>
		<template #targetProjectName
			><strong>{{ projectName }}</strong></template
		>
		<template v-if="isWorkflow" #workflow>
			<N8nText tag="p" class="pt-xs">
				<i18n-t keypath="projects.move.resource.success.message.workflow">
					<template #targetProjectName
						><strong>{{ projectName }}</strong></template
					>
				</i18n-t>
			</N8nText>
		</template>
		<template v-if="isTargetProjectTeam" #link>
			<p class="pt-s">
				<router-link
					:to="{
						name: props.routeName,
						params: { projectId: props.targetProject.id },
					}"
				>
					<i18n-t keypath="projects.move.resource.success.link">
						<template #targetProjectName>{{ projectName }}</template>
					</i18n-t>
				</router-link>
			</p>
		</template>
	</i18n-t>
</template>
