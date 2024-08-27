<script lang="ts">
import type {
	ICredentialsResponse,
	ICredentialsDecryptedResponse,
	IUserListAction,
} from '@/Interface';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import { useMessage } from '@/composables/useMessage';
import { mapStores } from 'pinia';
import { useUsersStore } from '@/stores/users.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUIStore } from '@/stores/ui.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useUsageStore } from '@/stores/usage.store';
import { EnterpriseEditionFeature } from '@/constants';
import ProjectSharing from '@/components/Projects/ProjectSharing.vue';
import { useProjectsStore } from '@/stores/projects.store';
import type { ProjectListItem, ProjectSharingData } from '@/types/projects.types';
import { ProjectTypes } from '@/types/projects.types';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import type { PermissionsRecord } from '@/permissions';
import type { EventBus } from 'n8n-design-system/utils';
import { useRolesStore } from '@/stores/roles.store';
import type { RoleMap } from '@/types/roles.types';
import { splitName } from '@/utils/projects.utils';

export default defineComponent({
	name: 'CredentialSharing',
	components: {
		ProjectSharing,
	},
	props: {
		credential: {
			type: Object as PropType<ICredentialsResponse | ICredentialsDecryptedResponse | null>,
			default: null,
		},
		credentialId: {
			type: String,
			required: true,
		},
		credentialData: {
			type: Object as PropType<ICredentialDataDecryptedObject>,
			required: true,
		},
		credentialPermissions: {
			type: Object as PropType<PermissionsRecord['credential']>,
			required: true,
		},
		modalBus: {
			type: Object as PropType<EventBus>,
			required: true,
		},
	},
	emits: ['update:modelValue'],
	setup() {
		return {
			...useMessage(),
		};
	},
	data() {
		return {
			sharedWithProjects: [...(this.credential?.sharedWithProjects ?? [])] as ProjectSharingData[],
		};
	},
	computed: {
		...mapStores(
			useCredentialsStore,
			useUsersStore,
			useUsageStore,
			useUIStore,
			useSettingsStore,
			useProjectsStore,
			useRolesStore,
		),
		usersListActions(): IUserListAction[] {
			return [
				{
					label: this.$locale.baseText('credentialEdit.credentialSharing.list.delete'),
					value: 'delete',
				},
			];
		},
		isSharingEnabled(): boolean {
			return this.settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Sharing];
		},
		credentialOwnerName(): string {
			const { firstName, lastName, email } = splitName(this.credential?.homeProject?.name ?? '');
			return firstName || lastName ? `${firstName}${lastName ? ' ' + lastName : ''}` : email ?? '';
		},
		credentialDataHomeProject(): ProjectSharingData | undefined {
			const credentialContainsProjectSharingData = (
				data: ICredentialDataDecryptedObject,
			): data is { homeProject: ProjectSharingData } => {
				return 'homeProject' in data;
			};

			return this.credentialData && credentialContainsProjectSharingData(this.credentialData)
				? this.credentialData.homeProject
				: undefined;
		},
		isCredentialSharedWithCurrentUser(): boolean {
			if (!Array.isArray(this.credentialData.sharedWithProjects)) return false;

			return this.credentialData.sharedWithProjects.some((sharee) => {
				return typeof sharee === 'object' && 'id' in sharee
					? sharee.id === this.usersStore.currentUser?.id
					: false;
			});
		},
		projects(): ProjectListItem[] {
			return this.projectsStore.projects.filter(
				(project) =>
					project.id !== this.credential?.homeProject?.id &&
					project.id !== this.credentialDataHomeProject?.id,
			);
		},
		homeProject(): ProjectSharingData | undefined {
			return this.credential?.homeProject ?? this.credentialDataHomeProject;
		},
		isHomeTeamProject(): boolean {
			return this.homeProject?.type === ProjectTypes.Team;
		},
		credentialRoleTranslations(): Record<string, string> {
			return {
				'credential:user': this.$locale.baseText('credentialEdit.credentialSharing.role.user'),
			};
		},
		credentialRoles(): RoleMap['credential'] {
			return this.rolesStore.processedCredentialRoles.map(({ role, scopes, licensed }) => ({
				role,
				name: this.credentialRoleTranslations[role],
				scopes,
				licensed,
			}));
		},
		sharingSelectPlaceholder() {
			return this.projectsStore.teamProjects.length
				? this.$locale.baseText('projects.sharing.select.placeholder.project')
				: this.$locale.baseText('projects.sharing.select.placeholder.user');
		},
	},
	watch: {
		sharedWithProjects: {
			handler(changedSharedWithProjects: ProjectSharingData[]) {
				this.$emit('update:modelValue', changedSharedWithProjects);
			},
			deep: true,
		},
	},
	async mounted() {
		await Promise.all([this.usersStore.fetchUsers(), this.projectsStore.getAllProjects()]);
	},
	methods: {
		goToUpgrade() {
			void this.uiStore.goToUpgrade('credential_sharing', 'upgrade-credentials-sharing');
		},
	},
});
</script>

<template>
	<div :class="$style.container">
		<div v-if="!isSharingEnabled">
			<N8nActionBox
				:heading="
					$locale.baseText(
						uiStore.contextBasedTranslationKeys.credentials.sharing.unavailable.title,
					)
				"
				:description="
					$locale.baseText(
						uiStore.contextBasedTranslationKeys.credentials.sharing.unavailable.description,
					)
				"
				:button-text="
					$locale.baseText(
						uiStore.contextBasedTranslationKeys.credentials.sharing.unavailable.button,
					)
				"
				@click:button="goToUpgrade"
			/>
		</div>
		<div v-else>
			<N8nInfoTip v-if="credentialPermissions.share" :bold="false" class="mb-s">
				{{ $locale.baseText('credentialEdit.credentialSharing.info.owner') }}
			</N8nInfoTip>
			<N8nInfoTip v-else-if="isHomeTeamProject" :bold="false" class="mb-s">
				{{ $locale.baseText('credentialEdit.credentialSharing.info.sharee.team') }}
			</N8nInfoTip>
			<N8nInfoTip v-else :bold="false" class="mb-s">
				{{
					$locale.baseText('credentialEdit.credentialSharing.info.sharee.personal', {
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
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	width: 100%;
	> * {
		margin-bottom: var(--spacing-l);
	}
}
</style>
