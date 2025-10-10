<script lang="ts" setup>
import Modal from '@/components/Modal.vue';
import ProjectMoveResourceModalCredentialsList from './ProjectMoveResourceModalCredentialsList.vue';
import ProjectMoveSuccessToastMessage from './ProjectMoveSuccessToastMessage.vue';
import { useTelemetry } from '@/composables/useTelemetry';
import { useToast } from '@/composables/useToast';
import { VIEWS } from '@/constants';
import type { ICredentialsResponse, IUsedCredential, IWorkflowDb } from '@/Interface';
import { getResourcePermissions } from '@n8n/permissions';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useProjectsStore } from '../projects.store';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { ProjectTypes } from '../projects.types';
import {
	getTruncatedProjectName,
	MAX_NAME_LENGTH,
	ResourceType,
	splitName,
} from '../projects.utils';
import { useI18n } from '@n8n/i18n';
import type { EventBus } from '@n8n/utils/event-bus';
import { sortByProperty } from '@n8n/utils/sort/sortByProperty';
import { truncate } from '@n8n/utils/string/truncate';
import { computed, h, onMounted, ref } from 'vue';
import { I18nT } from 'vue-i18n';

import {
	N8nButton,
	N8nCheckbox,
	N8nHeading,
	N8nIcon,
	N8nOption,
	N8nSelect,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
const props = defineProps<{
	modalName: string;
	data: {
		resource: IWorkflowDb | ICredentialsResponse;
		resourceType: ResourceType;
		resourceTypeLabel: string;
		eventBus?: EventBus;
	};
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const toast = useToast();
const projectsStore = useProjectsStore();
const workflowsStore = useWorkflowsStore();
const credentialsStore = useCredentialsStore();
const telemetry = useTelemetry();

const filter = ref('');
const projectId = ref<string | null>(null);
const shareUsedCredentials = ref(false);
const usedCredentials = ref<IUsedCredential[]>([]);
const allCredentials = ref<ICredentialsResponse[]>([]);
const shareableCredentials = computed(() =>
	allCredentials.value.filter(
		(credential) =>
			getResourcePermissions(credential.scopes).credential.share &&
			usedCredentials.value.find((uc) => uc.id === credential.id),
	),
);
const unShareableCredentials = computed(() =>
	usedCredentials.value.reduce(
		(acc, uc) => {
			const credential = credentialsStore.getCredentialById(uc.id);
			const credentialPermissions = getResourcePermissions(credential?.scopes).credential;
			if (!credentialPermissions.share) {
				if (credentialPermissions.read) {
					acc.push(credential);
				} else {
					acc.push(uc);
				}
			}
			return acc;
		},
		[] as Array<IUsedCredential | ICredentialsResponse>,
	),
);
const homeProjectName = computed(
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
const isResourceWorkflow = computed(() => props.data.resourceType === ResourceType.Workflow);
const targetProjectName = computed(() => {
	return getTruncatedProjectName(selectedProject.value?.name);
});
const resourceName = computed(() => truncate(props.data.resource.name, MAX_NAME_LENGTH));

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
			undefined,
			shareUsedCredentials.value ? shareableCredentials.value.map((c) => c.id) : undefined,
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
					resourceName: resourceName.value,
					targetProjectName: targetProjectName.value,
				},
			}),
			message: h(ProjectMoveSuccessToastMessage, {
				routeName: isResourceWorkflow.value ? VIEWS.PROJECTS_WORKFLOWS : VIEWS.PROJECTS_CREDENTIALS,
				resourceType: props.data.resourceType,
				targetProject: selectedProject.value,
				isShareCredentialsChecked: shareUsedCredentials.value,
				areAllUsedCredentialsShareable:
					shareableCredentials.value.length === usedCredentials.value.length,
			}),
			type: 'success',
			duration: 8000,
		});
		if (props.data.eventBus) {
			props.data.eventBus.emit('resource-moved', {
				resourceId: props.data.resource.id,
				resourceType: props.data.resourceType,
				targetProjectId: selectedProject.value.id,
			});
		}
	} catch (error) {
		toast.showError(
			error.message,
			i18n.baseText('projects.move.resource.error.title', {
				interpolate: {
					resourceTypeLabel: props.data.resourceTypeLabel,
					resourceName: resourceName.value,
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

	await projectsStore.getAvailableProjects();

	if (isResourceWorkflow.value) {
		const [workflow, credentials] = await Promise.all([
			workflowsStore.fetchWorkflow(props.data.resource.id),
			credentialsStore.fetchAllCredentials(),
		]);

		usedCredentials.value = workflow?.usedCredentials ?? [];
		allCredentials.value = credentials ?? [];
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
				<I18nT keypath="projects.move.resource.modal.message" scope="global">
					<template #resourceName
						><strong>{{ resourceName }}</strong></template
					>
					<template v-if="isResourceInTeamProject" #inTeamProject>
						<I18nT keypath="projects.move.resource.modal.message.team" scope="global">
							<template #resourceHomeProjectName
								><strong>{{ homeProjectName }}</strong></template
							>
						</I18nT>
					</template>
					<template v-else #inPersonalProject>
						<I18nT keypath="projects.move.resource.modal.message.personal" scope="global">
							<template #resourceHomeProjectName
								><strong>{{ homeProjectName }}</strong></template
							>
						</I18nT>
					</template>
				</I18nT>
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
						:label="p.name ?? ''"
					></N8nOption>
				</N8nSelect>
				<N8nText>
					<I18nT keypath="projects.move.resource.modal.message.sharingNote" scope="global">
						<template #note
							><strong>{{
								i18n.baseText('projects.move.resource.modal.message.note')
							}}</strong></template
						>
						<template #resourceTypeLabel>{{ props.data.resourceTypeLabel }}</template>
					</I18nT>
					<span
						v-if="props.data.resource.sharedWithProjects?.length ?? 0 > 0"
						:class="$style.textBlock"
					>
						{{
							i18n.baseText('projects.move.resource.modal.message.sharingInfo', {
								adjustToNumber: props.data.resource.sharedWithProjects?.length,
								interpolate: {
									count: props.data.resource.sharedWithProjects?.length ?? 0,
								},
							})
						}}</span
					>
					<N8nCheckbox
						v-if="shareableCredentials.length"
						v-model="shareUsedCredentials"
						:class="$style.textBlock"
						data-test-id="project-move-resource-modal-checkbox-all"
					>
						<I18nT keypath="projects.move.resource.modal.message.usedCredentials" scope="global">
							<template #usedCredentials>
								<N8nTooltip placement="top">
									<span :class="$style.tooltipText">
										{{
											i18n.baseText('projects.move.resource.modal.message.usedCredentials.number', {
												adjustToNumber: shareableCredentials.length,
												interpolate: { count: shareableCredentials.length },
											})
										}}
									</span>
									<template #content>
										<ProjectMoveResourceModalCredentialsList
											:current-project-id="projectsStore.currentProjectId"
											:credentials="shareableCredentials"
										/>
									</template>
								</N8nTooltip>
							</template>
						</I18nT>
					</N8nCheckbox>
					<span v-if="unShareableCredentials.length" :class="$style.textBlock">
						<I18nT
							keypath="projects.move.resource.modal.message.unAccessibleCredentials.note"
							scope="global"
						>
							<template #credentials>
								<N8nTooltip placement="top">
									<span :class="$style.tooltipText">{{
										i18n.baseText('projects.move.resource.modal.message.unAccessibleCredentials')
									}}</span>
									<template #content>
										<ProjectMoveResourceModalCredentialsList
											:current-project-id="projectsStore.currentProjectId"
											:credentials="unShareableCredentials"
										/>
									</template>
								</N8nTooltip>
							</template>
						</I18nT>
					</span>
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
	margin-top: var(--spacing--sm);
}

.tooltipText {
	text-decoration: underline;
}
</style>
