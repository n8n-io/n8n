<script setup lang="ts">
import type { AllRolesMap, PermissionsRecord } from '@n8n/permissions';
import ProjectSharing from '@/features/collaboration/projects/components/ProjectSharing.vue';
import { useI18n } from '@n8n/i18n';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { EnterpriseEditionFeature } from '@/app/constants';
import type { ICredentialsDecryptedResponse, ICredentialsResponse } from '../../credentials.types';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useRolesStore } from '@n8n/stores/roles.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useUsersStore } from '@n8n/stores/users.store';
import type {
	ProjectListItem,
	ProjectSharingData,
} from '@/features/collaboration/projects/projects.types';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';
import {
	splitName,
	useRemoteProjectSearch,
} from '@/features/collaboration/projects/projects.utils';
import type { EventBus } from '@n8n/utils/event-bus';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { computed, onMounted, ref, watch } from 'vue';
import { getResourcePermissions } from '@n8n/permissions';
import { useEnvFeatureFlag } from '@/features/shared/envFeatureFlag/useEnvFeatureFlag';
import { useDependencies } from '@/app/composables/useDependencies';

import { N8nButton, N8nEmptyState, N8nInfoTip, N8nText } from '@n8n/design-system';
type Props = {
	credentialId: string;
	credentialData: ICredentialDataDecryptedObject;
	credentialPermissions: PermissionsRecord['credential'];
	credential?: ICredentialsResponse | ICredentialsDecryptedResponse | null;
	modalBus: EventBus;
	isSharedGlobally?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	credential: null,
	isSharedGlobally: false,
});

const emit = defineEmits<{
	'update:modelValue': [value: ProjectSharingData[]];
	'update:shareWithAllUsers': [value: boolean];
}>();

const i18n = useI18n();

const usersStore = useUsersStore();
const uiStore = useUIStore();
const settingsStore = useSettingsStore();
const projectsStore = useProjectsStore();
const rolesStore = useRolesStore();

const pageRedirectionHelper = usePageRedirectionHelper();

const { check: envFeatureFlag } = useEnvFeatureFlag();
const isCredSharingEnabled = computed(() => envFeatureFlag.value('CRED_SHARING'));

const sharedWithProjects = ref([...(props.credential?.sharedWithProjects ?? [])]);

const isSharingEnabled = computed(
	() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Sharing],
);
const credentialOwnerName = computed(() => {
	const { name, email } = splitName(props.credential?.homeProject?.name ?? '');
	return name ?? email ?? '';
});

const credentialOwnerFirstName = computed(() => credentialOwnerName.value.split(' ')[0]);

const credentialDataHomeProject = computed<ProjectSharingData | undefined>(() => {
	const credentialContainsProjectSharingData = (
		data: ICredentialDataDecryptedObject,
	): data is { homeProject: ProjectSharingData } => {
		return 'homeProject' in data;
	};

	return props.credentialData && credentialContainsProjectSharingData(props.credentialData)
		? props.credentialData.homeProject
		: undefined;
});

const searchFn = useRemoteProjectSearch();
const filterFn = (project: ProjectListItem) =>
	project.id !== props.credential?.homeProject?.id &&
	project.id !== credentialDataHomeProject.value?.id;

const homeProject = computed<ProjectSharingData | undefined>(
	() => props.credential?.homeProject ?? credentialDataHomeProject.value,
);
const isHomeTeamProject = computed(() => homeProject.value?.type === ProjectTypes.Team);
const isOwnedByViewer = computed(
	() =>
		homeProject.value?.type === ProjectTypes.Personal &&
		homeProject.value?.id === projectsStore.personalProject?.id,
);
const isPersonalSpaceRestricted = computed(
	() =>
		homeProject.value?.type === ProjectTypes.Personal &&
		homeProject.value?.id === projectsStore.personalProject?.id &&
		!props.credentialPermissions.share,
);
const credentialRoleTranslations = computed<Record<string, string>>(() => {
	return {
		'credential:user': isCredSharingEnabled.value
			? i18n.baseText('credentialEdit.credentialSharing.role.user.canUse')
			: i18n.baseText('credentialEdit.credentialSharing.role.user'),
	};
});

const credentialRoleDescriptions = computed<Record<string, string> | undefined>(() => {
	if (!isCredSharingEnabled.value) return undefined;
	return {
		'credential:user': i18n.baseText(
			'credentialEdit.credentialSharing.role.user.canUse.description',
		),
	};
});

const credentialRoles = computed<AllRolesMap['credential']>(() => {
	return rolesStore.processedCredentialRoles.map(
		({ slug, scopes, licensed, description, systemRole, roleType }) => ({
			slug,
			displayName: credentialRoleTranslations.value[slug],
			scopes,
			licensed,
			description,
			systemRole,
			roleType,
		}),
	);
});

const confirmRemoval = computed(() => {
	if (!isCredSharingEnabled.value) return undefined;
	return (project: ProjectSharingData) => {
		const { name } = splitName(project.name ?? '');
		return {
			title: i18n.baseText('credentialEdit.credentialSharing.unshare.confirm.title'),
			message: i18n.baseText('credentialEdit.credentialSharing.unshare.confirm.message', {
				interpolate: { name: name ?? project.name ?? '' },
			}),
			confirmButtonText: i18n.baseText(
				'credentialEdit.credentialSharing.unshare.confirm.confirmButtonText',
			),
			cancelButtonText: i18n.baseText(
				'credentialEdit.credentialSharing.unshare.confirm.cancelButtonText',
			),
		};
	};
});

const { fetchDependencies, getDependencies } = useDependencies();

onMounted(() => {
	if (isCredSharingEnabled.value && props.credentialPermissions.share) {
		void fetchDependencies([props.credentialId], 'credential');
	}
});

const usedInProjects = computed(() => {
	if (!isCredSharingEnabled.value || !props.credentialPermissions.share) return [];

	const deps = getDependencies(props.credentialId, 'credential');
	if (!deps) return [];

	const sharedProjectIds = new Set(sharedWithProjects.value.map((project) => project.id));
	const workflowNamesByProjectId = new Map<string, string[]>();

	for (const dependency of deps.dependencies) {
		if (dependency.type !== 'workflowParent' || !dependency.projectId) continue;
		if (dependency.projectId === homeProject.value?.id) continue;
		if (sharedProjectIds.has(dependency.projectId)) continue;

		const names = workflowNamesByProjectId.get(dependency.projectId) ?? [];
		names.push(dependency.name);
		workflowNamesByProjectId.set(dependency.projectId, names);
	}

	const result: Array<{ project: ProjectListItem; subtitle: string }> = [];

	for (const [projectId, workflowNames] of workflowNamesByProjectId) {
		const project = projectsStore.myProjects.find((p) => p.id === projectId);
		if (!project) continue;

		const subtitle =
			workflowNames.length === 1
				? i18n.baseText('credentialEdit.credentialSharing.usedIn', {
						interpolate: { workflowName: workflowNames[0] },
					})
				: i18n.baseText('credentialEdit.credentialSharing.usedIn.count', {
						interpolate: { count: `${workflowNames.length}` },
					});

		result.push({ project, subtitle });
	}

	return result;
});

const usedInAccessText = computed(() =>
	isOwnedByViewer.value
		? i18n.baseText('credentialEdit.credentialSharing.onlyYou')
		: i18n.baseText('credentialEdit.credentialSharing.onlyOwner', {
				interpolate: { name: credentialOwnerFirstName.value },
			}),
);

function usedInShareLabel(project: Pick<ProjectSharingData, 'name'>) {
	// A personal project is named "Name <email>"; the project row hides the email, so the label does too.
	const { name } = splitName(project.name ?? '');

	return name
		? i18n.baseText('credentialEdit.credentialSharing.shareWith', {
				interpolate: { project: name },
			})
		: i18n.baseText('credentialEdit.credentialSharing.share');
}

function shareUsedInProject(projectId: string) {
	const project = projectsStore.myProjects.find((p) => p.id === projectId);
	if (!project) return;
	sharedWithProjects.value = [...sharedWithProjects.value, project];
}

const sharingSelectPlaceholder = computed(() =>
	projectsStore.teamProjects.length
		? i18n.baseText('projects.sharing.select.placeholder.project')
		: i18n.baseText('projects.sharing.select.placeholder.user'),
);

const canShareGlobally = computed(() => {
	const permissions = getResourcePermissions(usersStore.currentUser?.globalScopes);
	return permissions.credential?.shareGlobally ?? false;
});

watch(
	sharedWithProjects,
	(changedSharedWithProjects) => {
		emit('update:modelValue', changedSharedWithProjects);
	},
	{ deep: true },
);

// Projects are now fetched on demand via searchFn in ProjectSharing

function goToUpgrade() {
	void pageRedirectionHelper.goToUpgrade('credential_sharing', 'upgrade-credentials-sharing');
}
</script>

<template>
	<div :class="$style.container">
		<div v-if="!isSharingEnabled">
			<N8nEmptyState
				:heading="
					i18n.baseText(uiStore.contextBasedTranslationKeys.credentials.sharing.unavailable.title)
				"
				:description="
					i18n.baseText(
						uiStore.contextBasedTranslationKeys.credentials.sharing.unavailable.description,
					)
				"
				:button-text="
					i18n.baseText(uiStore.contextBasedTranslationKeys.credentials.sharing.unavailable.button)
				"
				@click:button="goToUpgrade"
			/>
		</div>
		<div v-else>
			<N8nInfoTip
				v-if="credentialPermissions.share || isPersonalSpaceRestricted"
				:bold="false"
				class="mb-s"
			>
				{{ i18n.baseText('credentialEdit.credentialSharing.info.owner') }}
			</N8nInfoTip>
			<N8nInfoTip v-else-if="isHomeTeamProject" :bold="false" class="mb-s">
				{{ i18n.baseText('credentialEdit.credentialSharing.info.sharee.team') }}
			</N8nInfoTip>
			<N8nInfoTip v-else :bold="false" class="mb-s">
				{{
					i18n.baseText('credentialEdit.credentialSharing.info.sharee.personal', {
						interpolate: { credentialOwnerName },
					})
				}}
			</N8nInfoTip>
			<ProjectSharing
				v-model="sharedWithProjects"
				:search-fn="searchFn"
				:filter-fn="filterFn"
				:roles="credentialRoles"
				:role-descriptions="credentialRoleDescriptions"
				:confirm-removal="confirmRemoval"
				:sort-selected="isCredSharingEnabled"
				:unshared-projects="usedInProjects"
				:home-project="homeProject"
				:readonly="!credentialPermissions.share"
				:static="!credentialPermissions.share"
				:disabled-tooltip="
					isPersonalSpaceRestricted
						? i18n.baseText('credentialEdit.credentialSharing.info.personalSpaceRestricted')
						: undefined
				"
				:placeholder="sharingSelectPlaceholder"
				:show-suffix="true"
				:can-share-globally="canShareGlobally"
				:is-shared-globally="isSharedGlobally"
				:teleported="false"
				@update:share-with-all-users="emit('update:shareWithAllUsers', $event)"
			>
				<template #unshared-actions="{ project }">
					<div :class="$style.onlyYou">
						<N8nText :class="$style.accessText" color="text-light" :title="usedInAccessText">
							{{ usedInAccessText }}
						</N8nText>
						<N8nButton
							variant="outline"
							data-test-id="credential-used-in-project-share"
							@click="shareUsedInProject(project.id)"
						>
							{{ usedInShareLabel(project) }}
						</N8nButton>
					</div>
				</template>
			</ProjectSharing>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	width: 100%;
	> * {
		margin-bottom: var(--spacing--lg);
	}
}

.onlyYou {
	display: flex;
	align-items: center;
	flex-shrink: 0;
	gap: var(--spacing--2xs);
}

.accessText {
	max-width: 12rem;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
