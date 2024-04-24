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
			<n8n-user-select
				v-if="credentialPermissions.share"
				class="mb-s"
				size="large"
				:users="usersList"
				:current-user-id="usersStore.currentUser.id"
				:placeholder="$locale.baseText('credentialEdit.credentialSharing.select.placeholder')"
				data-test-id="credential-sharing-modal-users-select"
				@update:model-value="onAddSharee"
			>
				<template #prefix>
					<n8n-icon icon="search" />
				</template>
			</n8n-user-select>
			<n8n-users-list
				:actions="usersListActions"
				:users="sharedWithList"
				:current-user-id="usersStore.currentUser.id"
				:readonly="!credentialPermissions.share"
				@delete="onRemoveSharee"
			/>
		</div>
	</div>
</template>

<script lang="ts">
import type { IUser, IUserListAction } from '@/Interface';
import { defineComponent } from 'vue';
import { useMessage } from '@/composables/useMessage';
import { mapStores } from 'pinia';
import { useUsersStore } from '@/stores/users.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUIStore } from '@/stores/ui.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useUsageStore } from '@/stores/usage.store';
import { EnterpriseEditionFeature, MODAL_CONFIRM, VIEWS } from '@/constants';

export default defineComponent({
	name: 'CredentialSharing',
	props: [
		'credential',
		'credentialId',
		'credentialData',
		'sharedWith',
		'credentialPermissions',
		'modalBus',
	],
	setup() {
		return {
			...useMessage(),
		};
	},
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
				const isAlreadySharedWithUser = (this.credentialData.sharedWith || []).find(
					(sharee: IUser) => sharee.id === user.id,
				);
				const isOwner = this.credentialData.ownedBy?.id === user.id;

				return !isAlreadySharedWithUser && !isOwner;
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
		isCredentialSharedWithCurrentUser(): boolean {
			return (this.credentialData.sharedWith || []).some((sharee: IUser) => {
				return sharee.id === this.usersStore.currentUser?.id;
			});
		},
	},
	mounted() {
		void this.loadUsers();
	},
	methods: {
		async onAddSharee(userId: string) {
			const sharee = { ...this.usersStore.getUserById(userId), isOwner: false };
			this.$emit('update:modelValue', (this.credentialData.sharedWith || []).concat(sharee));
		},
		async onRemoveSharee(userId: string) {
			const user = this.usersStore.getUserById(userId);

			if (user) {
				const confirm = await this.confirm(
					this.$locale.baseText('credentialEdit.credentialSharing.list.delete.confirm.message', {
						interpolate: { name: user.fullName || '' },
					}),
					this.$locale.baseText('credentialEdit.credentialSharing.list.delete.confirm.title'),
					{
						confirmButtonText: this.$locale.baseText(
							'credentialEdit.credentialSharing.list.delete.confirm.confirmButtonText',
						),
						cancelButtonText: this.$locale.baseText(
							'credentialEdit.credentialSharing.list.delete.confirm.cancelButtonText',
						),
					},
				);

				if (confirm === MODAL_CONFIRM) {
					this.$emit(
						'update:modelValue',
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
