<script lang="ts" setup>
import { computed } from 'vue';
import { truncate } from 'n8n-design-system';
import type { ICredentialsResponse, IWorkflowDb } from '@/Interface';
import { ResourceType, splitName } from '@/utils/projects.utils';
import type { ProjectListItem } from '@/types/projects.types';
import { ProjectTypes } from '@/types/projects.types';
import { useI18n } from '@/composables/useI18n';

const props = defineProps<{
	routeName: string;
	resource: IWorkflowDb | ICredentialsResponse;
	resourceType: ResourceType;
	resourceTypeLabel: string;
	targetProject: ProjectListItem;
	isShareCredentialsChecked: boolean;
	areAllUsedCredentialsShareable: boolean;
}>();

const i18n = useI18n();

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
				<span v-if="props.isShareCredentialsChecked && props.areAllUsedCredentialsShareable">{{
					i18n.baseText('projects.move.resource.success.message.workflow.withAllCredentials')
				}}</span>
				<span v-else-if="props.isShareCredentialsChecked">{{
					i18n.baseText('projects.move.resource.success.message.workflow.withSomeCredentials')
				}}</span>
				<span v-else>{{ i18n.baseText('projects.move.resource.success.message.workflow') }}</span>
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
