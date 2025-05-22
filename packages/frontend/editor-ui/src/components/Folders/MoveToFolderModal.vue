<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from '@/composables/useI18n';
import { EnterpriseEditionFeature, MOVE_FOLDER_MODAL_KEY } from '@/constants';
import { useFoldersStore } from '@/stores/folders.store';
import { useProjectsStore } from '@/stores/projects.store';
import { useUIStore } from '@/stores/ui.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import { type EventBus, createEventBus } from '@n8n/utils/event-bus';
import {
	ProjectTypes,
	type ProjectListItem,
	type ProjectSharingData,
} from '@/types/projects.types';
import type {
	ChangeLocationSearchResult,
	ICredentialsResponse,
	IUsedCredential,
} from '@/Interface';
import { getResourcePermissions } from '@/permissions';
import MoveToFolderDropdown from './MoveToFolderDropdown.vue';
import { ResourceType } from '@/utils/projects.utils';
import { useWorkflowsStore } from '@/stores/workflows.store';

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
const moveToFolderDropdown = ref<InstanceType<typeof MoveToFolderDropdown>>();

const foldersStore = useFoldersStore();
const projectsStore = useProjectsStore();
const uiStore = useUIStore();
const credentialsStore = useCredentialsStore();
const workflowsStore = useWorkflowsStore();

const selectedFolder = ref<ChangeLocationSearchResult | null>(null);
const selectedProject = ref<ProjectSharingData | null>(projectsStore.currentProject ?? null);
const isPersonalProject = computed(() => {
	return selectedProject.value?.type === ProjectTypes.Personal;
});
const isOwnPersonalProject = computed(() => {
	return (
		selectedProject.value?.type === ProjectTypes.Personal &&
		selectedProject.value.id === projectsStore.personalProject?.id
	);
});

const workflowCount = ref(0);
const subFolderCount = ref(0);

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

const projects = computed<ProjectListItem[]>(() => {
	return projectsStore.projects;
});

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

const onSubmit = () => {
	if (props.data.resourceType === 'folder') {
		if (selectedProject.value && selectedProject.value?.id !== projectsStore.currentProject?.id) {
			props.data.workflowListEventBus.emit('folder-transferred', {
				folder: { id: props.data.resource.id, name: props.data.resource.name },
				projectId: projectsStore.currentProject?.id,
				destinationProjectId: selectedProject.value.id,
				newParent: selectedFolder.value,
				shareCredentials: shareUsedCredentials.value
					? shareableCredentials.value.map((c) => c.id)
					: undefined,
			});
		} else {
			props.data.workflowListEventBus.emit('folder-moved', {
				newParent: selectedFolder.value,
				folder: { id: props.data.resource.id, name: props.data.resource.name },
			});
		}
	} else {
		if (selectedProject.value && selectedProject.value?.id !== projectsStore.currentProject?.id) {
			props.data.workflowListEventBus.emit('workflow-transferred', {
				projectId: selectedProject.value.id,
				newParent: selectedFolder.value,
				workflow: {
					id: props.data.resource.id,
					name: props.data.resource.name,
					oldParentId: props.data.resource.parentFolderId,
				},
				shareCredentials: shareUsedCredentials.value
					? shareableCredentials.value.map((c) => c.id)
					: undefined,
			});
		} else {
			props.data.workflowListEventBus.emit('workflow-moved', {
				newParent: selectedFolder.value,
				workflow: {
					id: props.data.resource.id,
					name: props.data.resource.name,
					oldParentId: props.data.resource.parentFolderId,
				},
			});
		}
	}
	uiStore.closeModal(MOVE_FOLDER_MODAL_KEY);
};

modalBus.on('opened', () => {
	moveToFolderDropdown.value?.focusOnInput();
});

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
			folders: folderText,
			workflows: workflowText,
		},
	});
});

// const projectIcon = computed<ItemProjectIcon>(() => {
// 	const defaultIcon: ItemProjectIcon = { type: 'icon', value: 'layer-group' };
// 	if (currentProject.value?.type === ProjectTypes.Personal) {
// 		return { type: 'icon', value: 'user' };
// 	} else if (currentProject.value?.type === ProjectTypes.Team) {
// 		return currentProject.value.icon ?? defaultIcon;
// 	}
// 	return defaultIcon;
// });

const isResourceWorkflow = computed(() => props.data.resourceType === ResourceType.Workflow);

const isFolderSelectable = computed(() => {
	return isOwnPersonalProject.value || !isPersonalProject.value;
});

onMounted(async () => {
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
				data-test-id="move-folder-description"
			>
				{{ descriptionMessage }}
			</p>
			<enterprise-edition :features="[EnterpriseEditionFeature.Sharing]" :class="$style.content">
				<div :class="$style.block">
					<n8n-text color="text-dark">
						{{ i18n.baseText('folders.move.modal.project.label') }}
					</n8n-text>
					<ProjectSharing
						v-model="selectedProject"
						class="pt-2xs"
						:projects="projects"
						:placeholder="i18n.baseText('folders.move.modal.project.placeholder')"
					/>
				</div>
			</enterprise-edition>
			<template v-if="selectedProject && isFolderSelectable">
				<div :class="$style.block">
					<n8n-text color="text-dark">
						{{ i18n.baseText('folders.move.modal.folder.label') }}
					</n8n-text>
					<MoveToFolderDropdown
						ref="moveToFolderDropdown"
						:selected-location="selectedFolder"
						:current-folder-id="currentFolder?.id"
						:current-project-id="selectedProject.id"
						:parent-folder-id="props.data.resource.parentFolderId"
						:exclude-only-parent="props.data.resourceType === 'workflow'"
						@location:selected="onFolderSelected"
					/>
				</div>
			</template>
			<div :class="$style.block">
				<N8nText>
					<i18n-t keypath="projects.move.resource.modal.message.sharingNote">
						<template #note
							><strong>{{
								i18n.baseText('projects.move.resource.modal.message.note')
							}}</strong></template
						>
						<template #resourceTypeLabel>{{ resourceTypeLabel }}</template>
					</i18n-t>
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
						}}
					</span>
				</N8nText>
			</div>
			<N8nCheckbox
				v-if="shareableCredentials.length"
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
				</i18n-t>
			</N8nCheckbox>
			<span v-if="unShareableCredentials.length" :class="$style.textBlock">
				<i18n-t keypath="projects.move.resource.modal.message.unAccessibleCredentials.note">
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
				</i18n-t>
			</span>
		</template>
		<template #footer="{ close }">
			<div :class="$style.footer">
				<n8n-button
					type="secondary"
					:label="i18n.baseText('generic.cancel')"
					float="right"
					data-test-id="cancel-move-folder-button"
					@click="close"
				/>
				<n8n-button
					:disabled="!selectedFolder && isFolderSelectable"
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
	font-size: var(--font-size-s);
	margin: var(--spacing-s) 0;
}

.block {
	margin-bottom: var(--spacing-s);
}

.footer {
	display: flex;
	gap: var(--spacing-2xs);
	justify-content: flex-end;
}
</style>
