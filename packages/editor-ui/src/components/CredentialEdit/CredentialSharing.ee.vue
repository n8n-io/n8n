<template>
	<div :class="$style.container">
		<div v-if="!isSharingEnabled">
			<n8n-action-box
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
			<n8n-info-tip
				v-if="!credentialPermissions.share && !isHomeTeamProject"
				:bold="false"
				class="mb-s"
			>
				{{
					$locale.baseText('credentialEdit.credentialSharing.info.sharee', {
						interpolate: { credentialOwnerName },
					})
				}}
			</n8n-info-tip>
			<n8n-info-tip
				v-if="credentialPermissions.share && !isHomeTeamProject"
				:bold="false"
				class="mb-s"
			>
				{{ $locale.baseText('credentialEdit.credentialSharing.info.owner') }}
			</n8n-info-tip>
			<ProjectSharing
				v-model="sharedWithProjects"
				:projects="projects"
				:roles="credentialRoles"
				:home-project="homeProject"
				:readonly="!credentialPermissions.share"
				:static="isHomeTeamProject || !credentialPermissions.share"
				:placeholder="$locale.baseText('workflows.shareModal.select.placeholder')"
			/>
			<n8n-info-tip v-if="isHomeTeamProject" :bold="false" class="mt-s">
				<i18n-t keypath="credentials.shareModal.info.members" tag="span">
					<template #projectName>
						{{ homeProject?.name }}
					</template>
					<template #members>
						<strong>
							{{
								$locale.baseText('credentials.shareModal.info.members.number', {
									interpolate: {
										number: String(numberOfMembersInHomeTeamProject),
									},
									adjustToNumber: numberOfMembersInHomeTeamProject,
								})
							}}
						</strong>
					</template>
				</i18n-t>
			</n8n-info-tip>
		</div>
	</div>
</template>

<script lang="ts">
import type { ICredentialsResponse, IUser, IUserListAction } from '@/Interface';
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
import type { ProjectListItem, ProjectSharingData, Project } from '@/types/projects.types';
import { ProjectTypes } from '@/types/projects.types';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import type { PermissionsMap } from '@/permissions';
import type { CredentialScope } from '@n8n/permissions';
import type { EventBus } from 'n8n-design-system/utils';
import { useRolesStore } from '@/stores/roles.store';
import type { RoleMap } from '@/types/roles.types';

export default defineComponent({
	name: 'CredentialSharing',
	components: {
		ProjectSharing,
	},
	props: {
		credential: {
			type: Object as PropType<ICredentialsResponse | null>,
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
			type: Object as PropType<PermissionsMap<CredentialScope>>,
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
			teamProject: null as Project | null,
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
			return this.settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Sharing);
		},
		credentialOwnerName(): string {
			return this.credentialsStore.getCredentialOwnerNameById(`${this.credentialId}`);
		},
		isCredentialSharedWithCurrentUser(): boolean {
			return (this.credentialData.sharedWithProjects ?? []).some((sharee: IUser) => {
				return sharee.id === this.usersStore.currentUser?.id;
			});
		},
		projects(): ProjectListItem[] {
			return this.projectsStore.personalProjects.filter(
				(project) =>
					project.id !== this.credential?.homeProject?.id &&
					project.id !== this.credentialData?.homeProject?.id,
			);
		},
		homeProject(): ProjectSharingData | undefined {
			return (
				this.credential?.homeProject ?? (this.credentialData?.homeProject as ProjectSharingData)
			);
		},
		isHomeTeamProject(): boolean {
			return this.homeProject?.type === ProjectTypes.Team;
		},
		numberOfMembersInHomeTeamProject(): number {
			return this.teamProject?.relations.length ?? 0;
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

		if (this.homeProject && this.isHomeTeamProject) {
			this.teamProject = await this.projectsStore.fetchProject(this.homeProject.id);
		}
	},
	methods: {
		goToUpgrade() {
			void this.uiStore.goToUpgrade('credential_sharing', 'upgrade-credentials-sharing');
		},
	},
});
</script>

<style lang="scss" module>
.container {
	width: 100%;
	> * {
		margin-bottom: var(--spacing-l);
	}
}
</style>
