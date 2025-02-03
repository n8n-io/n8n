<script lang="ts" setup>
import { ref, computed, onMounted, h } from 'vue';
import type { ICredentialsResponse, IWorkflowDb } from '@/Interface';
import { useI18n } from '@/composables/useI18n';
import { useUIStore } from '@/stores/ui.store';
import { useProjectsStore } from '@/stores/projects.store';
import Modal from '@/components/Modal.vue';
import { VIEWS } from '@/constants';
import { ResourceType, splitName } from '@/utils/projects.utils';
import { useTelemetry } from '@/composables/useTelemetry';
import { ProjectTypes } from '@/types/projects.types';
import ProjectMoveSuccessToastMessage from '@/components/Projects/ProjectMoveSuccessToastMessage.vue';
import { useToast } from '@/composables/useToast';
import { getResourcePermissions } from '@/permissions';
import { sortByProperty } from '@/utils/sortUtils';

const props = defineProps<{
	modalName: string;
	data: {
		resource: IWorkflowDb | ICredentialsResponse;
		resourceType: ResourceType;
		resourceTypeLabel: string;
	};
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const toast = useToast();
const projectsStore = useProjectsStore();
const telemetry = useTelemetry();

const filter = ref('');
const projectId = ref<string | null>(null);
const processedName = computed(
	() => processProjectName(props.data.resource.homeProject?.name ?? '') ?? '',
);
const availableProjects = computed(() =>
	sortByProperty(
		'name',
		projectsStore.availableProjects.filter(
			(p) =>
				p.id !== props.data.resource.homeProject?.id &&
				(!p.scopes || getResourcePermissions(p.scopes)[props.data.resourceType].create),
		),
	),
);
const filteredProjects = computed(() =>
	availableProjects.value.filter((p) => p.name?.toLowerCase().includes(filter.value.toLowerCase())),
);
const selectedProject = computed(() =>
	availableProjects.value.find((p) => p.id === projectId.value),
);
const isResourceInTeamProject = computed(() => isHomeProjectTeam(props.data.resource));

const isHomeProjectTeam = (resource: IWorkflowDb | ICredentialsResponse) =>
	resource.homeProject?.type === ProjectTypes.Team;

const processProjectName = (projectName: string) => {
	const { name, email } = splitName(projectName);
	return name ?? email;
};

const updateProject = (value: string) => {
	projectId.value = value;
};

const closeModal = () => {
	uiStore.closeModal(props.modalName);
};

const setFilter = (query: string) => {
	filter.value = query;
};

const moveResource = async () => {
	if (!selectedProject.value) return;
	try {
		await projectsStore.moveResourceToProject(
			props.data.resourceType,
			props.data.resource.id,
			selectedProject.value.id,
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
				resourceType: props.data.resourceType,
				resourceTypeLabel: props.data.resourceTypeLabel,
				targetProject: selectedProject.value,
			}),
			type: 'success',
			duration: 8000,
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

onMounted(() => {
	telemetry.track(`User clicked to move a ${props.data.resourceType}`, {
		[`${props.data.resourceType}_id`]: props.data.resource.id,
		project_from_type: projectsStore.currentProject?.type ?? projectsStore.personalProject?.type,
	});
});
</script>
<template>
	<Modal width="500px" :name="props.modalName" data-test-id="project-move-resource-modal">
		<template #header>
			<N8nHeading tag="h2" size="xlarge" class="mb-m pr-s">
				{{
					i18n.baseText('projects.move.resource.modal.title', {
						interpolate: { resourceTypeLabel: props.data.resourceTypeLabel },
					})
				}}
			</N8nHeading>
			<N8nText>
				<i18n-t keypath="projects.move.resource.modal.message">
					<template #resourceName
						><strong>{{ props.data.resource.name }}</strong></template
					>
					<template v-if="isResourceInTeamProject" #inTeamProject>
						<i18n-t keypath="projects.move.resource.modal.message.team">
							<template #resourceHomeProjectName
								><strong>{{ processedName }}</strong></template
							>
						</i18n-t>
					</template>
					<template v-else #inPersonalProject>
						<i18n-t keypath="projects.move.resource.modal.message.personal">
							<template #resourceHomeProjectName
								><strong>{{ processedName }}</strong></template
							>
						</i18n-t>
					</template>
				</i18n-t>
			</N8nText>
		</template>
		<template #content>
			<div v-if="availableProjects.length">
				<N8nSelect
					class="mr-2xs mb-xs"
					:model-value="projectId"
					:filterable="true"
					:filter-method="setFilter"
					:placeholder="i18n.baseText('projects.move.resource.modal.selectPlaceholder')"
					data-test-id="project-move-resource-modal-select"
					@update:model-value="updateProject"
				>
					<template #prefix>
						<N8nIcon icon="search" />
					</template>
					<N8nOption
						v-for="p in filteredProjects"
						:key="p.id"
						:value="p.id"
						:label="p.name"
					></N8nOption>
				</N8nSelect>
				<N8nText>
					<i18n-t keypath="projects.move.resource.modal.message.sharingNote">
						<template #note
							><strong>{{
								i18n.baseText('projects.move.resource.modal.message.note')
							}}</strong></template
						>
						<template #resourceTypeLabel>{{ props.data.resourceTypeLabel }}</template>
					</i18n-t>
					<span v-if="props.data.resource.sharedWithProjects?.length ?? 0 > 0">
						<br />
						{{
							i18n.baseText('projects.move.resource.modal.message.sharingInfo', {
								adjustToNumber: props.data.resource.sharedWithProjects?.length,
								interpolate: {
									numberOfProjects: props.data.resource.sharedWithProjects?.length ?? 0,
								},
							})
						}}</span
					>
				</N8nText>
			</div>
			<N8nText v-else>{{
				i18n.baseText('projects.move.resource.modal.message.noProjects', {
					interpolate: { resourceTypeLabel: props.data.resourceTypeLabel },
				})
			}}</N8nText>
		</template>
		<template #footer>
			<div :class="$style.buttons">
				<N8nButton type="secondary" text class="mr-2xs" @click="closeModal">
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton :disabled="!projectId" type="primary" @click="moveResource">
					{{
						i18n.baseText('projects.move.resource.modal.button', {
							interpolate: { resourceTypeLabel: props.data.resourceTypeLabel },
						})
					}}
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
