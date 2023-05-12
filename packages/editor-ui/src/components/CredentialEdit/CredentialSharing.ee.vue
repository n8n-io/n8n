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
				:buttonText="
					$locale.baseText(
						uiStore.contextBasedTranslationKeys.credentials.sharing.unavailable.button,
					)
				"
				@click="goToUpgrade"
			/>
		</div>
		<div v-else-if="isDefaultUser">
			<n8n-action-box
				:heading="$locale.baseText('credentialEdit.credentialSharing.isDefaultUser.title')"
				:description="
					$locale.baseText('credentialEdit.credentialSharing.isDefaultUser.description')
				"
				:buttonText="$locale.baseText('credentialEdit.credentialSharing.isDefaultUser.button')"
				@click="goToUsersSettings"
			/>
		</div>
		<div v-else>
			<n8n-info-tip :bold="false" class="mb-s">
				<template v-if="credentialPermissions.isOwner">
					{{ $locale.baseText('credentialEdit.credentialSharing.info.owner') }}
				</template>
				<template v-else>
					{{
						$locale.baseText('credentialEdit.credentialSharing.info.sharee', {
							interpolate: { credentialOwnerName },
						})
					}}
				</template>
			</n8n-info-tip>
			<n8n-info-tip
				v-if="
					!credentialPermissions.isOwner &&
					!credentialPermissions.isSharee &&
					credentialPermissions.isInstanceOwner
				"
				class="mb-s"
				:bold="false"
			>
				{{ $locale.baseText('credentialEdit.credentialSharing.info.instanceOwner') }}
			</n8n-info-tip>
			<n8n-user-select
				v-if="credentialPermissions.updateSharing"
				class="mb-s"
				size="large"
				:users="usersList"
				:currentUserId="usersStore.currentUser.id"
				:placeholder="$locale.baseText('credentialEdit.credentialSharing.select.placeholder')"
				data-test-id="credential-sharing-modal-users-select"
				@input="onAddSharee"
			>
				<template #prefix>
					<n8n-icon icon="search" />
				</template>
			</n8n-user-select>
			<n8n-users-list
				:actions="usersListActions"
				:users="sharedWithList"
				:currentUserId="usersStore.currentUser.id"
				:readonly="!credentialPermissions.updateSharing"
				@delete="onRemoveSharee"
			/>
		</div>
	</div>
</template>

<script lang="ts">
import type { IUser, IUserListAction } from '@/Interface';
import mixins from 'vue-typed-mixins';
import { showMessage } from '@/mixins/showMessage';
import { mapStores } from 'pinia';
import { useUsersStore } from '@/stores/users.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUIStore } from '@/stores/ui.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useUsageStore } from '@/stores/usage.store';
import { EnterpriseEditionFeature, VIEWS } from '@/constants';

export default mixins(showMessage).extend({
	name: 'CredentialSharing',
	props: [
		'credential',
		'credentialId',
		'credentialData',
		'sharedWith',
		'credentialPermissions',
		'modalBus',
	],
	computed: {
		...mapStores(useCredentialsStore, useUsersStore, useUsageStore, useUIStore, useSettingsStore),
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
		usersList(): IUser[] {
			return this.usersStore.allUsers.filter((user: IUser) => {
				const isCurrentUser = user.id === this.usersStore.currentUser?.id;
				const isAlreadySharedWithUser = (this.credentialData.sharedWith || []).find(
					(sharee: IUser) => sharee.id === user.id,
				);

				return !isCurrentUser && !isAlreadySharedWithUser;
			});
		},
		sharedWithList(): IUser[] {
			return [
				{
					...(this.credential ? this.credential.ownedBy : this.usersStore.currentUser),
					isOwner: true,
				},
			].concat(this.credentialData.sharedWith || []);
		},
		credentialOwnerName(): string {
			return this.credentialsStore.getCredentialOwnerNameById(`${this.credentialId}`);
		},
	},
	methods: {
		async onAddSharee(userId: string) {
			const sharee = { ...this.usersStore.getUserById(userId), isOwner: false };
			this.$emit('change', (this.credentialData.sharedWith || []).concat(sharee));
		},
		async onRemoveSharee(userId: string) {
			const user = this.usersStore.getUserById(userId);

			if (user) {
				const confirm = await this.confirmMessage(
					this.$locale.baseText('credentialEdit.credentialSharing.list.delete.confirm.message', {
						interpolate: { name: user.fullName || '' },
					}),
					this.$locale.baseText('credentialEdit.credentialSharing.list.delete.confirm.title'),
					null,
					this.$locale.baseText(
						'credentialEdit.credentialSharing.list.delete.confirm.confirmButtonText',
					),
					this.$locale.baseText(
						'credentialEdit.credentialSharing.list.delete.confirm.cancelButtonText',
					),
				);

				if (confirm) {
					this.$emit(
						'change',
						this.credentialData.sharedWith.filter((sharee: IUser) => {
							return sharee.id !== user.id;
						}),
					);
				}
			}
		},
		async loadUsers() {
			await this.usersStore.fetchUsers();
		},
		goToUsersSettings() {
			void this.$router.push({ name: VIEWS.USERS_SETTINGS });
			this.modalBus.emit('close');
		},
		goToUpgrade() {
			this.uiStore.goToUpgrade('credential_sharing', 'upgrade-credentials-sharing');
		},
	},
	mounted() {
		void this.loadUsers();
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
