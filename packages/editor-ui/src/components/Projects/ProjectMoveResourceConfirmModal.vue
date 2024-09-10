<script lang="ts" setup>
import { ref, computed, h } from 'vue';
import type { ICredentialsResponse, IWorkflowDb } from '@/Interface';
import { useI18n } from '@/composables/useI18n';
import { useUIStore } from '@/stores/ui.store';
import { useProjectsStore } from '@/stores/projects.store';
import Modal from '@/components/Modal.vue';
import { N8nCheckbox, N8nText } from 'n8n-design-system';
import { useToast } from '@/composables/useToast';
import { useTelemetry } from '@/composables/useTelemetry';
import { VIEWS } from '@/constants';
import ProjectMoveSuccessToastMessage from '@/components/Projects/ProjectMoveSuccessToastMessage.vue';
import { ResourceType } from '@/utils/projects.utils';

const props = defineProps<{
	modalName: string;
	data: {
		resource: IWorkflowDb | ICredentialsResponse;
		resourceType: ResourceType;
		resourceTypeLabel: string;
		projectId: string;
		projectName: string;
	};
}>();

const i18n = useI18n();
const toast = useToast();
const uiStore = useUIStore();
const projectsStore = useProjectsStore();
const telemetry = useTelemetry();

const checks = ref([false, false]);
const allChecked = computed(() => checks.value.every(Boolean));

const moveResourceLabel = computed(() =>
	props.data.resourceType === ResourceType.Workflow
		? i18n.baseText('projects.move.workflow.confirm.modal.label')
		: i18n.baseText('projects.move.credential.confirm.modal.label'),
);

const closeModal = () => {
	uiStore.closeModal(props.modalName);
};

const confirm = async () => {
	try {
		await projectsStore.moveResourceToProject(
			props.data.resourceType,
			props.data.resource.id,
			props.data.projectId,
		);
		closeModal();
		telemetry.track(`User successfully moved ${props.data.resourceType}`, {
			[`${props.data.resourceType}_id`]: props.data.resource.id,
			project_from_type: projectsStore.currentProject?.type ?? projectsStore.personalProject?.type,
		});
		toast.showToast({
			title: i18n.baseText('projects.move.resource.success.title', {
				interpolate: {
					resourceTypeLabel: props.data.resourceTypeLabel,
				},
			}),
			message: h(ProjectMoveSuccessToastMessage, {
				routeName:
					props.data.resourceType === ResourceType.Workflow
						? VIEWS.PROJECTS_WORKFLOWS
						: VIEWS.PROJECTS_CREDENTIALS,
				resource: props.data.resource,
				resourceTypeLabel: props.data.resourceTypeLabel,
				projectId: props.data.projectId,
				projectName: props.data.projectName,
			}),
			type: 'success',
		});
	} catch (error) {
		toast.showError(
			error.message,
			i18n.baseText('projects.move.resource.error.title', {
				interpolate: {
					resourceTypeLabel: props.data.resourceTypeLabel,
					resourceName: props.data.resource.name,
				},
			}),
		);
	}
};
</script>
<template>
	<Modal width="500px" :name="props.modalName" data-test-id="project-move-resource-confirm-modal">
		<template #header>
			<N8nHeading tag="h2" size="xlarge" class="mb-m">
				{{ i18n.baseText('projects.move.resource.confirm.modal.title') }}
			</N8nHeading>
		</template>
		<template #content>
			<N8nCheckbox v-model="checks[0]" :label="moveResourceLabel" />
			<N8nCheckbox v-model="checks[1]">
				<N8nText>
					<i18n-t keypath="projects.move.resource.confirm.modal.label">
						<template #resourceTypeLabel>{{ props.data.resourceTypeLabel }}</template>
						<template #numberOfUsers>{{
							i18n.baseText('projects.move.resource.confirm.modal.numberOfUsers', {
								interpolate: {
									numberOfUsers: props.data.resource.sharedWithProjects?.length ?? 0,
								},
								adjustToNumber: props.data.resource.sharedWithProjects?.length,
							})
						}}</template>
					</i18n-t>
				</N8nText>
			</N8nCheckbox>
		</template>
		<template #footer>
			<div :class="$style.buttons">
				<N8nButton type="secondary" text class="mr-2xs" @click="closeModal">
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton :disabled="!allChecked" type="primary" @click="confirm">
					{{ i18n.baseText('projects.move.resource.confirm.modal.button.confirm') }}
				</N8nButton>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.buttons {
	display: flex;
	justify-content: flex-end;
}
</style>
