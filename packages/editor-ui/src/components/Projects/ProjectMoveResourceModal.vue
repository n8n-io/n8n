<script lang="ts" setup>
import { ref, computed, onMounted, h } from 'vue';
import type { ICredentialsResponse, IUsedCredential, IWorkflowDb } from '@/Interface';
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
import { useWorkflowsStore } from '@/stores/workflows.store';

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
const workflowsStore = useWorkflowsStore();
const telemetry = useTelemetry();

const filter = ref('');
const projectId = ref<string | null>(null);
const usedCredentials = ref<IUsedCredential[]>([]);
const shareUsedCredentials = ref(false);
const processedName = computed(
	() => processProjectName(props.data.resource.homeProject?.name ?? '') ?? '',
);
const availableProjects = computed(() =>
	sortByProperty(
		'name',
		projectsStore.availableProjects.filter(
			(p) =>
				p.name?.toLowerCase().includes(filter.value.toLowerCase()) &&
				p.id !== props.data.resource.homeProject?.id &&
				(!p.scopes || getResourcePermissions(p.scopes)[props.data.resourceType].create),
		),
	),
);
const selectedProject = computed(() =>
	availableProjects.value.find((p) => p.id === projectId.value),
);
const isResourceInTeamProject = computed(() => isHomeProjectTeam(props.data.resource));
const isResourceWorkflow = computed(() => props.data.resourceType === ResourceType.Workflow);

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
			shareUsedCredentials.value ? usedCredentials.value.map((c) => c.id) : undefined,
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
				routeName: isResourceWorkflow.value ? VIEWS.PROJECTS_WORKFLOWS : VIEWS.PROJECTS_CREDENTIALS,
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

onMounted(async () => {
	telemetry.track(`User clicked to move a ${props.data.resourceType}`, {
		[`${props.data.resourceType}_id`]: props.data.resource.id,
		project_from_type: projectsStore.currentProject?.type ?? projectsStore.personalProject?.type,
	});

	if (isResourceWorkflow.value) {
		const data = await workflowsStore.fetchWorkflow(props.data.resource.id);
		usedCredentials.value = data.usedCredentials ?? [];
	}
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
						v-for="p in availableProjects"
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
					<span
						v-if="props.data.resource.sharedWithProjects?.length ?? 0 > 0"
						:class="$style.textBlock"
					>
						{{
							i18n.baseText('projects.move.resource.modal.message.sharingInfo', {
								adjustToNumber: props.data.resource.sharedWithProjects?.length,
								interpolate: {
									numberOfProjects: props.data.resource.sharedWithProjects?.length ?? 0,
								},
							})
						}}</span
					>
					<N8nCheckbox
						v-if="usedCredentials.length"
						v-model="shareUsedCredentials"
						:class="$style.textBlock"
						data-test-id="project-move-resource-modal-checkbox-all"
					>
						<i18n-t keypath="projects.move.resource.modal.message.usedCredentials">
							<template #usedCredentials>
								<N8nTooltip placement="top">
									<span :class="$style.tooltipText">
										{{
											i18n.baseText('projects.move.resource.modal.message.usedCredentials.number', {
												adjustToNumber: usedCredentials.length,
												interpolate: { number: usedCredentials.length },
											})
										}}
									</span>
									<template #content>
										<ul :class="$style.credentialsList">
											<li v-for="credential in usedCredentials" :key="credential.id">
												<router-link
													target="_blank"
													:to="{
														name: projectsStore.currentProjectId
															? VIEWS.PROJECTS_CREDENTIALS
															: VIEWS.CREDENTIALS,
														params: { credentialId: credential.id },
													}"
												>
													{{ credential.name }}
												</router-link>
											</li>
										</ul>
									</template>
								</N8nTooltip>
							</template>
						</i18n-t>
					</N8nCheckbox>
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
				<N8nButton
					:disabled="!projectId"
					type="primary"
					data-test-id="project-move-resource-modal-button"
					@click="moveResource"
				>
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

.textBlock {
	display: block;
	margin-top: var(--spacing-s);
}

.tooltipText {
	text-decoration: underline;
}

.credentialsList {
	list-style-type: none;
	padding: 0;
	margin: 0;

	li {
		padding: 0 0 var(--spacing-3xs);

		&:last-child {
			padding-bottom: 0;
		}
	}
}
</style>
