<script setup lang="ts">
import type { AllRolesMap, PermissionsRecord } from '@n8n/permissions';
import ProjectSharing from '@/features/collaboration/projects/components/ProjectSharing.vue';
import { useI18n } from '@n8n/i18n';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { EnterpriseEditionFeature } from '@/app/constants';
import type { ICredentialsDecryptedResponse, ICredentialsResponse } from '../../credentials.types';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useRolesStore } from '@/app/stores/roles.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import type {
	ProjectListItem,
	ProjectSharingData,
} from '@/features/collaboration/projects/projects.types';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';
import { splitName } from '@/features/collaboration/projects/projects.utils';
import type { EventBus } from '@n8n/utils/event-bus';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { computed, onMounted, ref, watch } from 'vue';
import { getResourcePermissions } from '@n8n/permissions';

import { N8nActionBox, N8nInfoTip } from '@n8n/design-system';
type Props = {
	credentialId: string;
	credentialData: ICredentialDataDecryptedObject;
	credentialPermissions: PermissionsRecord['credential'];
	credential?: ICredentialsResponse | ICredentialsDecryptedResponse | null;
	modalBus: EventBus;
	isSharedGlobally?: boolean;
};

const props = withDefaults(defineProps<Props>(), { credential: null, isSharedGlobally: false });

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

const sharedWithProjects = ref([...(props.credential?.sharedWithProjects ?? [])]);

const isSharingEnabled = computed(
	() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Sharing],
);
const credentialOwnerName = computed(() => {
	const { name, email } = splitName(props.credential?.homeProject?.name ?? '');
	return name ?? email ?? '';
});

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

const projects = computed<ProjectListItem[]>(() => {
	return projectsStore.projects.filter(
		(project) =>
			project.id !== props.credential?.homeProject?.id &&
			project.id !== credentialDataHomeProject.value?.id,
	);
});

const homeProject = computed<ProjectSharingData | undefined>(
	() => props.credential?.homeProject ?? credentialDataHomeProject.value,
);
const isHomeTeamProject = computed(() => homeProject.value?.type === ProjectTypes.Team);
const credentialRoleTranslations = computed<Record<string, string>>(() => {
	return {
		'credential:user': i18n.baseText('credentialEdit.credentialSharing.role.user'),
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

onMounted(async () => {
	await projectsStore.getAllProjects();
});

function goToUpgrade() {
	void pageRedirectionHelper.goToUpgrade('credential_sharing', 'upgrade-credentials-sharing');
}
</script>

<template>
	<div :class="$style.container">
		<div v-if="!isSharingEnabled">
			<N8nActionBox
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
			<N8nInfoTip v-if="credentialPermissions.share" :bold="false" class="mb-s">
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
				:projects="projects"
				:roles="credentialRoles"
				:home-project="homeProject"
				:readonly="!credentialPermissions.share"
				:static="!credentialPermissions.share"
				:placeholder="sharingSelectPlaceholder"
				:can-share-globally="canShareGlobally"
				:is-shared-globally="isSharedGlobally"
				@update:share-with-all-users="emit('update:shareWithAllUsers', $event)"
			/>
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
</style>
