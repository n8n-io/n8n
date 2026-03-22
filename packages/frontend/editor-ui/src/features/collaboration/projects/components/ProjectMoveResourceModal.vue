<script lang="ts" setup>
import Modal from '@/app/components/Modal.vue';
import ProjectMoveResourceModalCredentialsList from './ProjectMoveResourceModalCredentialsList.vue';
import ProjectMoveSuccessToastMessage from './ProjectMoveSuccessToastMessage.vue';
import ProjectSharing from './ProjectSharing.vue';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { VIEWS } from '@/app/constants';
import type {
	ICredentialsResponse,
	IUsedCredential,
} from '@/features/credentials/credentials.types';
import type { IWorkflowDb } from '@/Interface';
import { getResourcePermissions } from '@n8n/permissions';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useProjectsStore } from '../projects.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { ProjectTypes } from '../projects.types';
import type { ProjectListItem, ProjectSharingData } from '../projects.types';
// ProjectListItem extends ProjectSharingData with `role` - the toast component types
// expect ProjectListItem but only uses fields from ProjectSharingData (name, type).
import {
	useAvailableProjectSearch,
	getTruncatedProjectName,
	MAX_NAME_LENGTH,
	ResourceType,
	splitName,
} from '../projects.utils';
import { useI18n } from '@n8n/i18n';
import type { EventBus } from '@n8n/utils/event-bus';
import { truncate } from '@n8n/utils/string/truncate';
import { computed, h, onMounted, ref } from 'vue';
import { I18nT } from 'vue-i18n';
import { useRouter } from 'vue-router';

import {
	N8nButton,
	N8nCallout,
	N8nCheckbox,
	N8nHeading,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
const props = defineProps<{
	modalName: string;
	data: {
		resource: IWorkflowDb | ICredentialsResponse;
		resourceType: Exclude<ResourceType, 'dataTable'>;
		resourceTypeLabel: string;
		eventBus?: EventBus;
	};
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const toast = useToast();
const router = useRouter();
const projectsStore = useProjectsStore();
const searchFn = useAvailableProjectSearch();
const workflowsListStore = useWorkflowsListStore();
const credentialsStore = useCredentialsStore();
const telemetry = useTelemetry();

const selectedProject = ref<ProjectSharingData | null>(null);
const shareUsedCredentials = ref(false);
const usedCredentials = ref<IUsedCredential[]>([]);
const allCredentials = ref<ICredentialsResponse[]>([]);
const loading = ref(false);
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

const projectFilterFn = (p: ProjectListItem): boolean =>
	!p.scopes || !!getResourcePermissions(p.scopes)[props.data.resourceType].create;

const isResourceInTeamProject = computed(() => isHomeProjectTeam(props.data.resource));
const isResourceWorkflow = computed(() => props.data.resourceType === ResourceType.Workflow);
const targetProjectName = computed(() => {
	return getTruncatedProjectName(selectedProject.value?.name);
});
const resourceName = computed(() => truncate(props.data.resource.name, MAX_NAME_LENGTH));
const isPersonalSpaceRestricted = computed(
	() =>
		props.data.resource.homeProject?.type === ProjectTypes.Personal &&
		props.data.resource.homeProject?.id === projectsStore.personalProject?.id,
);
const isTargetPersonalProject = computed(
	() => selectedProject.value?.id === projectsStore.personalProject?.id,
);

const isHomeProjectTeam = (resource: IWorkflowDb | ICredentialsResponse) =>
	resource.homeProject?.type === ProjectTypes.Team;

const processProjectName = (projectName: string) => {
	const { name, email } = splitName(projectName);
	return name ?? email;
};

const closeModal = () => {
	uiStore.closeModal(props.modalName);
};

const moveResource = async () => {
	if (!selectedProject.value || loading.value) return;

	loading.value = true;
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
				targetProject: selectedProject.value as ProjectListItem,
				isShareCredentialsChecked: shareUsedCredentials.value,
				areAllUsedCredentialsShareable:
					shareableCredentials.value.length === usedCredentials.value.length,
			}),
			onClick: (event: MouseEvent | undefined) => {
				if (event?.target instanceof HTMLAnchorElement && selectedProject.value) {
					event.preventDefault();
					void router.push({
						name: isResourceWorkflow.value ? VIEWS.PROJECTS_WORKFLOWS : VIEWS.PROJECTS_CREDENTIALS,
						params: { projectId: selectedProject.value.id },
					});
				}
			},
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
			error,
			i18n.baseText('projects.move.resource.error.title', {
				interpolate: {
					resourceTypeLabel: props.data.resourceTypeLabel,
					resourceName: resourceName.value,
				},
			}),
		);
	} finally {
		loading.value = false;
	}
};

onMounted(async () => {
	telemetry.track(`User clicked to move a ${props.data.resourceType}`, {
		[`${props.data.resourceType}_id`]: props.data.resource.id,
		project_from_type: projectsStore.currentProject?.type ?? projectsStore.personalProject?.type,
	});

	if (isResourceWorkflow.value) {
		const [workflow, credentials] = await Promise.all([
			workflowsListStore.fetchWorkflow(props.data.resource.id),
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
			<div>
				<ProjectSharing
					v-model="selectedProject"
					class="mr-2xs mb-xs"
					:search-fn="searchFn"
					:home-project="props.data.resource.homeProject"
					:filter-fn="projectFilterFn"
					:placeholder="i18n.baseText('projects.move.resource.modal.selectPlaceholder')"
					:empty-options-text="
						i18n.baseText('projects.move.resource.modal.message.noProjects', {
							interpolate: { resourceTypeLabel: props.data.resourceTypeLabel },
						})
					"
					data-test-id="project-move-resource-modal-select"
				/>
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
						v-if="shareableCredentials.length && !isTargetPersonalProject"
						v-model="shareUsedCredentials"
						:class="$style.textBlock"
						data-test-id="project-move-resource-modal-checkbox-all"
					>
						<template #label>
							<I18nT keypath="projects.move.resource.modal.message.usedCredentials" scope="global">
								<template #usedCredentials>
									<N8nTooltip placement="top">
										<span :class="$style.tooltipText">
											{{
												i18n.baseText(
													'projects.move.resource.modal.message.usedCredentials.number',
													{
														adjustToNumber: shareableCredentials.length,
														interpolate: { count: shareableCredentials.length },
													},
												)
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
						</template>
					</N8nCheckbox>
					<N8nCallout
						v-if="unShareableCredentials.length && !isTargetPersonalProject"
						theme="warning"
						:class="$style.textBlock"
					>
						<I18nT
							:keypath="
								isPersonalSpaceRestricted
									? 'projects.move.resource.modal.message.unAccessibleCredentials.personalSpaceNote'
									: 'projects.move.resource.modal.message.unAccessibleCredentials.note'
							"
							scope="global"
						>
							<template #credentials>
								<N8nTooltip placement="top">
									<span :class="$style.tooltipText">{{
										i18n.baseText(
											'projects.move.resource.modal.message.unAccessibleCredentials.count',
											{
												adjustToNumber: unShareableCredentials.length,
												interpolate: { count: unShareableCredentials.length },
											},
										)
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
					</N8nCallout>
				</N8nText>
			</div>
		</template>
		<template #footer>
			<div :class="$style.buttons">
				<N8nButton variant="ghost" class="mr-2xs" :disabled="loading" @click="closeModal">
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton
					variant="solid"
					:loading="loading"
					:disabled="!selectedProject || loading"
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
	margin-top: var(--spacing--sm);
}

.tooltipText {
	text-decoration: underline;
}
</style>
