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
		<div v-else-if="isDefaultUser">
			<n8n-action-box
				:heading="$locale.baseText('credentialEdit.credentialSharing.isDefaultUser.title')"
				:description="
					$locale.baseText('credentialEdit.credentialSharing.isDefaultUser.description')
				"
				:button-text="$locale.baseText('credentialEdit.credentialSharing.isDefaultUser.button')"
				@click:button="goToUsersSettings"
			/>
		</div>
		<div v-else>
			<n8n-info-tip v-if="credentialPermissions.isOwner" :bold="false" class="mb-s">
				{{ $locale.baseText('credentialEdit.credentialSharing.info.owner') }}
			</n8n-info-tip>
			<n8n-info-tip v-if="!credentialPermissions.share" :bold="false" class="mb-s">
				{{
					$locale.baseText('credentialEdit.credentialSharing.info.sharee', {
						interpolate: { credentialOwnerName },
					})
				}}
			</n8n-info-tip>
			<n8n-info-tip
				v-if="
					credentialPermissions.read &&
					credentialPermissions.share &&
					!credentialPermissions.isOwner
				"
				class="mb-s"
				:bold="false"
			>
				<i18n-t keypath="credentialEdit.credentialSharing.info.reader">
					<template v-if="!isCredentialSharedWithCurrentUser" #notShared>
						{{ $locale.baseText('credentialEdit.credentialSharing.info.notShared') }}
					</template>
				</i18n-t>
			</n8n-info-tip>
			<ProjectSharing
				v-model="sharedWithProjects"
				:projects="projects"
				:readonly="!credentialPermissions.share"
			/>
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
import { EnterpriseEditionFeature, VIEWS } from '@/constants';
import ProjectSharing from '@/features/projects/components/ProjectSharing.vue';
import { useProjectsStore } from '@/features/projects/projects.store';
import type { ProjectListItem, ProjectSharingData } from '@/features/projects/projects.types';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import type { PermissionsMap } from '@/permissions';
import type { CredentialScope } from '@n8n/permissions';
import type { EventBus } from 'n8n-design-system/utils';

export default defineComponent({
	name: 'CredentialSharing',
	components: {
		ProjectSharing,
	},
	props: {
		credential: {
			type: Object as PropType<ICredentialsResponse>,
			required: true,
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
		),
		usersListActions(): IUserListAction[] {
			return [
				{
					label: this.$locale.baseText('credentialEdit.credentialSharing.list.delete'),
					value: 'delete',
				},
			];
		},
		isDefaultUser(): boolean {
			return this.usersStore.isDefaultUser;
		},
		isSharingEnabled(): boolean {
			return this.settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Sharing);
		},
		credentialOwnerName(): string {
			return this.credentialsStore.getCredentialOwnerNameById(`${this.credentialId}`);
		},
		isCredentialSharedWithCurrentUser(): boolean {
			return (this.credentialData.sharedWithProjects || []).some((sharee: IUser) => {
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
		goToUsersSettings() {
			void this.$router.push({ name: VIEWS.USERS_SETTINGS });
			this.modalBus.emit('close');
		},
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
