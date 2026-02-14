<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { sortByProperty } from '@n8n/utils/sort/sortByProperty';
import { EnterpriseEditionFeature } from '@/app/constants';
import { MOVE_FOLDER_MODAL_KEY } from '../folders.constants';
import { useFoldersStore } from '../folders.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { type EventBus, createEventBus } from '@n8n/utils/event-bus';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';
import type {
	ProjectListItem,
	ProjectSharingData,
} from '@/features/collaboration/projects/projects.types';
import type { ChangeLocationSearchResult } from '../folders.types';
import type {
	ICredentialsResponse,
	IUsedCredential,
} from '@/features/credentials/credentials.types';
import { getResourcePermissions } from '@n8n/permissions';
import EnterpriseEdition from '@/app/components/EnterpriseEdition.ee.vue';
import Modal from '@/app/components/Modal.vue';
import MoveToFolderDropdown from './MoveToFolderDropdown.vue';
import ProjectMoveResourceModalCredentialsList from '@/features/collaboration/projects/components/ProjectMoveResourceModalCredentialsList.vue';
import ProjectSharing from '@/features/collaboration/projects/components/ProjectSharing.vue';
import {
	ResourceType,
	getTruncatedProjectName,
	splitName,
} from '@/features/collaboration/projects/projects.utils';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useToast } from '@/app/composables/useToast';
import { I18nT } from 'vue-i18n';

import { N8nButton, N8nCallout, N8nCheckbox, N8nText, N8nTooltip } from '@n8n/design-system';
/**
 * This modal is used to move a resource (folder or workflow) to a different folder.
 */

type Props = {
	modalName: string;
	data: {
		resourceType: 'folder' | 'workflow';
		resource: {
			id: string;
			name: string;
			parentFolderId?: string;
			sharedWithProjects?: ProjectSharingData[];
			homeProjectId?: string;
		};
		workflowListEventBus: EventBus;
	};
};

export interface SimpleFolder {
	id: string;
	name: string;
	type: string;
}

const props = defineProps<Props>();

const i18n = useI18n();
const modalBus = createEventBus();

const foldersStore = useFoldersStore();
const projectsStore = useProjectsStore();
const uiStore = useUIStore();
const credentialsStore = useCredentialsStore();
const workflowsListStore = useWorkflowsListStore();
const workflowsStore = useWorkflowsStore();
const toast = useToast();

const selectedFolder = ref<ChangeLocationSearchResult | null>(null);
const selectedProject = ref<ProjectSharingData | null>(projectsStore.currentProject);
const loading = ref(false);
const isPersonalProject = computed(() => {
	return selectedProject.value?.type === ProjectTypes.Personal;
});
const isOwnPersonalProject = computed(() => {
	return (
		selectedProject.value?.type === ProjectTypes.Personal &&
		selectedProject.value?.id === projectsStore.personalProject?.id
	);
});
const isTransferringOwnership = computed(() => {
	return selectedProject.value && selectedProject.value?.id !== projectsStore.currentProject?.id;
});

const workflowCount = ref(0);
const subFolderCount = ref(0);

const shareUsedCredentials = ref(false);
const usedCredentials = ref<IUsedCredential[]>([]);
const allCredentials = ref<ICredentialsResponse[]>([]);
const shareableCredentials = computed(() =>
	allCredentials.value.filter(
		(credential) =>
			isTransferringOwnership.value &&
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

const availableProjects = computed<ProjectListItem[]>(() =>
	sortByProperty(
		'name',
		projectsStore.availableProjects.filter(
			(p) => !p.scopes || getResourcePermissions(p.scopes)[props.data.resourceType].create,
		),
	),
);

const resourceTypeLabel = computed(() => {
	return i18n.baseText(`generic.${props.data.resourceType}`).toLowerCase();
});

const title = computed(() => {
	return i18n.baseText('folders.move.modal.title', {
		interpolate: {
			folderName: props.data.resource.name,
			resourceTypeLabel: resourceTypeLabel.value,
		},
	});
});

const currentFolder = computed(() => {
	if (props.data.resourceType === 'workflow') {
		return;
	}
	return {
		id: props.data.resource.id,
		name: props.data.resource.name,
	};
});

const fetchCurrentFolderContents = async () => {
	if (!currentFolder.value || !projectsStore.currentProject) {
		return;
	}

	const { totalWorkflows, totalSubFolders } = await foldersStore.fetchFolderContent(
		projectsStore.currentProject.id,
		currentFolder.value.id,
	);

	workflowCount.value = totalWorkflows;
	subFolderCount.value = totalSubFolders;
};

watch(
	() => [selectedProject.value],
	() => {
		selectedFolder.value = null;
	},
);

watch(
	() => [currentFolder.value, selectedProject.value],
	() => {
		void fetchCurrentFolderContents();
	},
	{ immediate: true },
);

const onFolderSelected = (payload: ChangeLocationSearchResult) => {
	selectedFolder.value = payload;
};

const getPersonalProjectLabel = (projectName?: string | null) => {
	const { name } = splitName(projectName ?? '');
	const personalSpaceText = i18n.baseText('projects.sharing.personalSpace');
	return name ? `${name} (${personalSpaceText})` : personalSpaceText;
};

const targetProjectName = computed(() => {
	if (selectedProject.value?.type === ProjectTypes.Personal) {
		return getPersonalProjectLabel(selectedProject.value?.name);
	}

	return getTruncatedProjectName(selectedProject.value?.name);
});

const onSubmit = async () => {
	if (!selectedProject.value || loading.value) {
		return;
	}

	const newParent = selectedFolder.value
		? {
				id: selectedFolder.value.id,
				name: selectedFolder.value.name,
				type: selectedFolder.value.resource,
			}
		: {
				// When transferring resource to another user the folder selection is empty,
				// as we can't select a folder in another user's personal project.
				// Use project name as the fallback display name.
				id: selectedProject.value.id,
				name: targetProjectName.value,
				type: 'project',
			};

	loading.value = true;

	try {
		if (props.data.resourceType === 'folder') {
			if (selectedProject.value.id !== projectsStore.currentProject?.id) {
				// Transfer folder to another project
				const destinationParentFolderId =
					selectedFolder.value && selectedFolder.value.id !== selectedProject.value.id
						? selectedFolder.value.id
						: undefined;
				const shareCredentials = shareUsedCredentials.value
					? shareableCredentials.value.map((c) => c.id)
					: undefined;

				await foldersStore.moveFolderToProject(
					projectsStore.currentProject?.id ?? '',
					props.data.resource.id,
					selectedProject.value.id,
					destinationParentFolderId,
					shareCredentials,
				);

				props.data.workflowListEventBus.emit('folder-transferred', {
					source: {
						projectId: projectsStore.currentProject?.id,
						folder: {
							id: props.data.resource.id,
							name: props.data.resource.name,
						},
					},
					destination: {
						projectId: selectedProject.value.id,
						parentFolder: {
							id: destinationParentFolderId,
							name:
								selectedFolder.value && selectedFolder.value.id !== selectedProject.value.id
									? selectedFolder.value.name
									: targetProjectName.value,
						},
						canAccess: isFolderSelectable.value,
					},
				});
			} else {
				// Move folder within same project
				const newParentId = newParent.type === 'folder' ? newParent.id : '0';
				await foldersStore.moveFolder(
					projectsStore.currentProject?.id ?? '',
					props.data.resource.id,
					newParentId,
				);

				props.data.workflowListEventBus.emit('folder-moved', {
					newParent,
					folder: { id: props.data.resource.id, name: props.data.resource.name },
					options: { skipApiCall: true },
				});
			}
		} else {
			if (isTransferringOwnership.value) {
				// Transfer workflow to another project
				const destinationParentFolderId =
					selectedFolder.value && selectedFolder.value.id !== selectedProject.value.id
						? selectedFolder.value.id
						: undefined;
				const shareCredentials = shareUsedCredentials.value
					? shareableCredentials.value.map((c) => c.id)
					: undefined;

				await projectsStore.moveResourceToProject(
					'workflow',
					props.data.resource.id,
					selectedProject.value.id,
					destinationParentFolderId,
					shareCredentials,
				);

				props.data.workflowListEventBus.emit('workflow-transferred', {
					source: {
						projectId: projectsStore.currentProject?.id,
						workflow: {
							id: props.data.resource.id,
							name: props.data.resource.name,
						},
					},
					destination: {
						projectId: selectedProject.value.id,
						parentFolder: {
							id: destinationParentFolderId,
							name:
								selectedFolder.value && selectedFolder.value.id !== selectedProject.value.id
									? selectedFolder.value.name
									: targetProjectName.value,
						},
						canAccess: isFolderSelectable.value,
					},
				});
			} else {
				// Move workflow within same project
				const newParentFolderId = newParent.type === 'folder' ? newParent.id : '0';
				await workflowsStore.updateWorkflow(props.data.resource.id, {
					parentFolderId: newParentFolderId,
				});

				props.data.workflowListEventBus.emit('workflow-moved', {
					newParent,
					workflow: {
						id: props.data.resource.id,
						name: props.data.resource.name,
						oldParentId: props.data.resource.parentFolderId,
					},
					options: { skipApiCall: true },
				});
			}
		}

		uiStore.closeModal(MOVE_FOLDER_MODAL_KEY);
	} catch (error) {
		const errorTitleKey =
			props.data.resourceType === 'folder'
				? 'folders.move.error.title'
				: 'folders.move.workflow.error.title';
		toast.showError(error, i18n.baseText(errorTitleKey));
	} finally {
		loading.value = false;
	}
};

const descriptionMessage = computed(() => {
	let folderText = '';
	let workflowText = '';
	if (subFolderCount.value > 0) {
		folderText = i18n.baseText('folders.move.modal.folder.count', {
			interpolate: { count: subFolderCount.value },
		});
	}
	if (workflowCount.value > 0) {
		workflowText = i18n.baseText('folders.move.modal.workflow.count', {
			interpolate: { count: workflowCount.value },
		});
	}
	if (subFolderCount.value > 0 && workflowCount.value > 0) {
		folderText += ` ${i18n.baseText('folder.and.workflow.separator')} `;
	}

	return i18n.baseText('folders.move.modal.description', {
		interpolate: {
			folders: folderText ? ` ${folderText}` : '',
			workflows: workflowText ? ` ${workflowText}` : '',
		},
	});
});

const isResourceWorkflow = computed(() => props.data.resourceType === ResourceType.Workflow);

const isFolderSelectable = computed(() => {
	return isOwnPersonalProject.value || !isPersonalProject.value;
});

// If there is not current project (e.g. on the Overview page), default to the resource's home project
const currentResourceProjectId = computed(() => {
	return projectsStore.currentProject?.id ?? props.data.resource.homeProjectId;
});

onMounted(async () => {
	if (!projectsStore.isTeamProjectFeatureEnabled) {
		selectedProject.value = projectsStore.personalProject;
	}
	if (isResourceWorkflow.value) {
		const [workflow, credentials] = await Promise.all([
			workflowsListStore.fetchWorkflow(props.data.resource.id),
			credentialsStore.fetchAllCredentials(),
		]);

		usedCredentials.value = workflow?.usedCredentials ?? [];
		allCredentials.value = credentials;
	} else {
		if (projectsStore.currentProject?.id && currentFolder.value?.id) {
			const [used, credentials] = await Promise.all([
				await foldersStore.fetchFolderUsedCredentials(
					projectsStore.currentProject.id,
					currentFolder.value.id,
				),
				credentialsStore.fetchAllCredentials(),
			]);

			usedCredentials.value = used;
			allCredentials.value = credentials;
		}
	}
});
</script>

<template>
	<Modal
		:name="modalName"
		:title="title"
		width="500"
		:class="$style.container"
		:event-bus="modalBus"
	>
		<template #content>
			<p
				v-if="props.data.resourceType === 'folder' && (workflowCount > 0 || subFolderCount > 0)"
				:class="$style.description"
				data-test-id="move-modal-description"
			>
				{{ descriptionMessage }}
			</p>
			<EnterpriseEdition :features="[EnterpriseEditionFeature.Sharing]" :class="$style.content">
				<div :class="$style.block">
					<N8nText color="text-dark">
						{{ i18n.baseText('folders.move.modal.project.label') }}
					</N8nText>
					<ProjectSharing
						v-model="selectedProject"
						class="pt-2xs"
						:projects="availableProjects"
						:placeholder="i18n.baseText('folders.move.modal.project.placeholder')"
					/>
				</div>

				<div v-if="isTransferringOwnership" :class="$style.block">
					<N8nText>
						<I18nT keypath="projects.move.resource.modal.message.sharingNote" scope="global">
							<template #note
								><strong>{{
									i18n.baseText('projects.move.resource.modal.message.note')
								}}</strong></template
							>
							<template #resourceTypeLabel>{{ resourceTypeLabel }}</template>
						</I18nT>
						<div
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
							}}
						</div>
					</N8nText>
				</div>
			</EnterpriseEdition>
			<template v-if="selectedProject && isFolderSelectable">
				<div :class="$style.block">
					<N8nText color="text-dark">
						{{ i18n.baseText('folders.move.modal.folder.label') }}
					</N8nText>
					<MoveToFolderDropdown
						:selected-location="selectedFolder"
						:selected-project-id="selectedProject.id"
						:current-project-id="currentResourceProjectId"
						:current-folder-id="currentFolder?.id"
						:parent-folder-id="props.data.resource.parentFolderId"
						:exclude-only-parent="props.data.resourceType === 'workflow'"
						@location:selected="onFolderSelected"
					/>
				</div>
			</template>
			<N8nCheckbox
				v-if="shareableCredentials.length"
				v-model="shareUsedCredentials"
				:class="$style.textBlock"
				data-test-id="move-modal-share-credentials-checkbox"
			>
				<template #label>
					<I18nT
						:keypath="
							data.resourceType === 'workflow'
								? 'folders.move.modal.message.usedCredentials.workflow'
								: 'folders.move.modal.message.usedCredentials.folder'
						"
						scope="global"
					>
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
				</template>
			</N8nCheckbox>
			<N8nCallout
				v-if="shareableCredentials.length && !shareUsedCredentials"
				:class="$style.credentialsCallout"
				theme="warning"
				data-test-id="move-modal-used-credentials-warning"
			>
				{{ i18n.baseText('folders.move.modal.message.usedCredentials.warning') }}
			</N8nCallout>
			<div v-if="unShareableCredentials.length" :class="$style.textBlock">
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
			</div>
		</template>
		<template #footer="{ close }">
			<div :class="$style.footer">
				<N8nButton
					variant="subtle"
					:label="i18n.baseText('generic.cancel')"
					:disabled="loading"
					float="right"
					data-test-id="cancel-move-folder-button"
					@click="close"
				/>
				<N8nButton
					:disabled="(!selectedFolder && isFolderSelectable) || loading"
					:loading="loading"
					:label="
						i18n.baseText('folders.move.modal.confirm', {
							interpolate: {
								resourceTypeLabel: resourceTypeLabel,
							},
						})
					"
					float="right"
					data-test-id="confirm-move-folder-button"
					@click="onSubmit"
				/>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.container {
	h1 {
		max-width: 90%;
	}
}

.description {
	font-size: var(--font-size--sm);
	margin: var(--spacing--sm) 0;
}

.block {
	margin-bottom: var(--spacing--sm);
}

.footer {
	display: flex;
	gap: var(--spacing--2xs);
	justify-content: flex-end;
}

.tooltipText {
	text-decoration: underline;
}

.credentialsCallout {
	margin-top: var(--spacing--sm);
}
</style>
