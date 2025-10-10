<script setup lang="ts">
import { computed, watch, onMounted, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { createEventBus } from '@n8n/utils/event-bus';
import EnterpriseEdition from '@/components/EnterpriseEdition.ee.vue';
import Modal from './Modal.vue';
import {
	EnterpriseEditionFeature,
	MODAL_CONFIRM,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
	WORKFLOW_SHARE_MODAL_KEY,
} from '@/constants';
import { getResourcePermissions } from '@n8n/permissions';
import { useMessage } from '@/composables/useMessage';
import { useToast } from '@/composables/useToast';
import { useSettingsStore } from '@/stores/settings.store';
import { useUIStore } from '@/stores/ui.store';
import { useUsersStore } from '@/stores/users.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useWorkflowsEEStore } from '@/stores/workflows.ee.store';
import type { ITelemetryTrackProperties } from 'n8n-workflow';
import type { BaseTextKey } from '@n8n/i18n';
import ProjectSharing from '@/features/projects/components/ProjectSharing.vue';
import { useProjectsStore } from '@/features/projects/projects.store';
import type { ProjectSharingData, Project } from '@/features/projects/projects.types';
import { ProjectTypes } from '@/features/projects/projects.types';
import { useRolesStore } from '@/stores/roles.store';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';
import { useI18n } from '@n8n/i18n';
import { telemetry } from '@/plugins/telemetry';
import { useWorkflowSaving } from '@/composables/useWorkflowSaving';
import { I18nT } from 'vue-i18n';

import { N8nButton, N8nInfoTip, N8nText } from '@n8n/design-system';
const props = defineProps<{
	data: {
		id: string;
	};
}>();

const { data } = props;

const workflowsStore = useWorkflowsStore();
const settingsStore = useSettingsStore();
const uiStore = useUIStore();
const usersStore = useUsersStore();
const workflowsEEStore = useWorkflowsEEStore();
const projectsStore = useProjectsStore();
const rolesStore = useRolesStore();

const toast = useToast();
const message = useMessage();
const pageRedirectionHelper = usePageRedirectionHelper();
const i18n = useI18n();
const router = useRouter();
const route = useRoute();
const workflowSaving = useWorkflowSaving({ router });

const workflow = ref(
	data.id === PLACEHOLDER_EMPTY_WORKFLOW_ID
		? workflowsStore.workflow
		: workflowsStore.workflowsById[data.id],
);
const loading = ref(true);
const isDirty = ref(false);
const modalBus = createEventBus();
const sharedWithProjects = ref([
	...(workflow.value.sharedWithProjects ?? []),
] as ProjectSharingData[]);
const teamProject = ref(null as Project | null);

const isSharingEnabled = computed(
	() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Sharing],
);

const isHomeTeamProject = computed(() => workflow.value.homeProject?.type === ProjectTypes.Team);

const modalTitle = computed(() => {
	if (isHomeTeamProject.value) {
		return i18n.baseText('workflows.shareModal.title.static', {
			interpolate: { projectName: workflow.value.homeProject?.name ?? '' },
		});
	}

	return i18n.baseText(
		isSharingEnabled.value
			? (uiStore.contextBasedTranslationKeys.workflows.sharing.title as BaseTextKey)
			: (uiStore.contextBasedTranslationKeys.workflows.sharing.unavailable.title as BaseTextKey),
		{
			interpolate: { name: workflow.value.name },
		},
	);
});

const workflowPermissions = computed(() => getResourcePermissions(workflow.value?.scopes).workflow);

const workflowOwnerName = computed(() =>
	workflowsEEStore.getWorkflowOwnerName(`${workflow.value.id}`),
);

const projects = computed(() =>
	projectsStore.personalProjects.filter((project) => project.id !== workflow.value.homeProject?.id),
);

const numberOfMembersInHomeTeamProject = computed(() => teamProject.value?.relations.length ?? 0);

const workflowRoleTranslations = computed(() => ({
	'workflow:editor': i18n.baseText('workflows.shareModal.role.editor'),
	'workflow:owner': '',
}));

const workflowRoles = computed(() =>
	rolesStore.processedWorkflowRoles.map(
		({ slug, scopes, displayName, licensed, description, systemRole, roleType }) => ({
			slug,
			displayName:
				slug in workflowRoleTranslations.value
					? workflowRoleTranslations.value[slug as keyof typeof workflowRoleTranslations.value]
					: displayName,
			scopes,
			licensed,
			description,
			systemRole,
			roleType,
		}),
	),
);

const trackTelemetry = (eventName: string, data: ITelemetryTrackProperties) => {
	telemetry.track(eventName, {
		workflow_id: workflow.value.id,
		...data,
	});
};

const onProjectAdded = (project: ProjectSharingData) => {
	trackTelemetry('User selected sharee to add', {
		project_id_sharer: workflow.value.homeProject?.id,
		project_id_sharee: project.id,
	});
};

const onProjectRemoved = (project: ProjectSharingData) => {
	trackTelemetry('User selected sharee to remove', {
		project_id_sharer: workflow.value.homeProject?.id,
		project_id_sharee: project.id,
	});
};

const onSave = async () => {
	if (loading.value) {
		return;
	}

	loading.value = true;

	const saveWorkflowPromise = async () => {
		if (workflow.value.id === PLACEHOLDER_EMPTY_WORKFLOW_ID) {
			const parentFolderId = route.query.folderId as string | undefined;
			const workflowId = await workflowSaving.saveAsNewWorkflow({ parentFolderId });
			if (!workflowId) {
				throw new Error(i18n.baseText('workflows.shareModal.onSave.error.title'));
			}
			return workflowId;
		} else {
			return workflow.value.id;
		}
	};

	try {
		const workflowId = await saveWorkflowPromise();
		await workflowsEEStore.saveWorkflowSharedWith({
			workflowId,
			sharedWithProjects: sharedWithProjects.value,
		});

		toast.showMessage({
			title: i18n.baseText('workflows.shareModal.onSave.success.title'),
		});
		isDirty.value = false;
	} catch (error) {
		toast.showError(error, i18n.baseText('workflows.shareModal.onSave.error.title'));
	} finally {
		modalBus.emit('close');
		loading.value = false;
	}
};

const onCloseModal = async () => {
	if (isDirty.value) {
		const shouldSave = await message.confirm(
			i18n.baseText('workflows.shareModal.saveBeforeClose.message'),
			i18n.baseText('workflows.shareModal.saveBeforeClose.title'),
			{
				type: 'warning',
				confirmButtonText: i18n.baseText('workflows.shareModal.saveBeforeClose.confirmButtonText'),
				cancelButtonText: i18n.baseText('workflows.shareModal.saveBeforeClose.cancelButtonText'),
			},
		);

		if (shouldSave === MODAL_CONFIRM) {
			return await onSave();
		}
	}

	return true;
};

const goToUpgrade = () => {
	void pageRedirectionHelper.goToUpgrade('workflow_sharing', 'upgrade-workflow-sharing');
};

const initialize = async () => {
	if (isSharingEnabled.value) {
		await Promise.all([usersStore.fetchUsers(), projectsStore.getAllProjects()]);

		if (workflow.value.id !== PLACEHOLDER_EMPTY_WORKFLOW_ID) {
			await workflowsStore.fetchWorkflow(workflow.value.id);
		}

		if (isHomeTeamProject.value && workflow.value.homeProject) {
			teamProject.value = await projectsStore.fetchProject(workflow.value.homeProject.id);
		}
	}

	loading.value = false;
};

onMounted(async () => {
	await initialize();
});

watch(
	sharedWithProjects,
	() => {
		isDirty.value = true;
	},
	{ deep: true },
);
</script>

<template>
	<Modal
		width="460px"
		max-height="75%"
		:title="modalTitle"
		:event-bus="modalBus"
		:name="WORKFLOW_SHARE_MODAL_KEY"
		:center="true"
		:before-close="onCloseModal"
	>
		<template #content>
			<div v-if="!isSharingEnabled" :class="$style.container">
				<N8nText>
					{{
						i18n.baseText(
							uiStore.contextBasedTranslationKeys.workflows.sharing.unavailable.description.modal,
						)
					}}
				</N8nText>
			</div>
			<div v-else :class="$style.container">
				<N8nInfoTip
					v-if="!workflowPermissions.share && !isHomeTeamProject"
					:bold="false"
					class="mb-s"
				>
					{{
						i18n.baseText('workflows.shareModal.info.sharee', {
							interpolate: { workflowOwnerName },
						})
					}}
				</N8nInfoTip>
				<EnterpriseEdition :features="[EnterpriseEditionFeature.Sharing]" :class="$style.content">
					<div>
						<ProjectSharing
							v-model="sharedWithProjects"
							:home-project="workflow.homeProject"
							:projects="projects"
							:roles="workflowRoles"
							:readonly="!workflowPermissions.share"
							:static="isHomeTeamProject || !workflowPermissions.share"
							:placeholder="i18n.baseText('workflows.shareModal.select.placeholder')"
							@project-added="onProjectAdded"
							@project-removed="onProjectRemoved"
						/>
						<N8nInfoTip v-if="isHomeTeamProject" :bold="false" class="mt-s">
							<I18nT keypath="workflows.shareModal.info.members" tag="span" scope="global">
								<template #projectName>
									{{ workflow.homeProject?.name }}
								</template>
								<template #members>
									<strong>
										{{
											i18n.baseText('workflows.shareModal.info.members.number', {
												interpolate: {
													number: String(numberOfMembersInHomeTeamProject),
												},
												adjustToNumber: numberOfMembersInHomeTeamProject,
											})
										}}
									</strong>
								</template>
							</I18nT>
						</N8nInfoTip>
					</div>
					<template #fallback>
						<N8nText>
							<I18nT
								:keypath="
									uiStore.contextBasedTranslationKeys.workflows.sharing.unavailable.description
										.tooltip
								"
								tag="span"
								scope="global"
							>
								<template #action />
							</I18nT>
						</N8nText>
					</template>
				</EnterpriseEdition>
			</div>
		</template>

		<template #footer>
			<div v-if="!isSharingEnabled" :class="$style.actionButtons">
				<N8nButton @click="goToUpgrade">
					{{
						i18n.baseText(uiStore.contextBasedTranslationKeys.workflows.sharing.unavailable.button)
					}}
				</N8nButton>
			</div>
			<EnterpriseEdition
				v-else
				:features="[EnterpriseEditionFeature.Sharing]"
				:class="$style.actionButtons"
			>
				<N8nText v-show="isDirty" color="text-light" size="small" class="mr-xs">
					{{ i18n.baseText('workflows.shareModal.changesHint') }}
				</N8nText>
				<N8nButton v-if="isHomeTeamProject" type="secondary" @click="modalBus.emit('close')">
					{{ i18n.baseText('generic.close') }}
				</N8nButton>
				<N8nButton
					v-else
					v-show="workflowPermissions.share"
					:loading="loading"
					:disabled="!isDirty"
					data-test-id="workflow-sharing-modal-save-button"
					@click="onSave"
				>
					{{ i18n.baseText('workflows.shareModal.save') }}
				</N8nButton>
			</EnterpriseEdition>
		</template>
	</Modal>
</template>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	height: 100%;
}

.container > * {
	overflow-wrap: break-word;
}

.content {
	display: flex;
	flex-direction: column;
	height: 100%;
	overflow-y: auto;
}

.usersList {
	height: 100%;
	overflow-y: auto;
}

.actionButtons {
	display: flex;
	justify-content: flex-end;
	align-items: center;
}

.roleSelect {
	max-width: 100px;
}

.roleSelectRemoveOption {
	border-top: 1px solid var(--color--foreground);
}
</style>
