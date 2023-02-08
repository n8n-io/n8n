<template>
	<div :class="$style.container">
		<div>
			<n8n-heading size="2xlarge">{{ $locale.baseText('settings.users') }}</n8n-heading>
			<div :class="$style.buttonContainer" v-if="!usersStore.showUMSetupWarning">
				<n8n-button
					:label="$locale.baseText('settings.users.invite')"
					@click="onInvite"
					size="large"
				/>
			</div>
		</div>
		<div v-if="!settingsStore.isUserManagementEnabled" :class="$style.setupInfoContainer">
			<n8n-action-box
				:heading="
					$locale.baseText(uiStore.contextBasedTranslationKeys.users.settings.unavailable.title)
				"
				:description="
					$locale.baseText(
						uiStore.contextBasedTranslationKeys.users.settings.unavailable.description,
					)
				"
				:buttonText="
					$locale.baseText(uiStore.contextBasedTranslationKeys.users.settings.unavailable.button)
				"
				@click="goToUpgrade"
			/>
		</div>
		<div v-else-if="usersStore.showUMSetupWarning" :class="$style.setupInfoContainer">
			<n8n-action-box
				:heading="$locale.baseText('settings.users.setupToInviteUsers')"
				:buttonText="$locale.baseText('settings.users.setupMyAccount')"
				:description="`${
					isSharingEnabled ? '' : $locale.baseText('settings.users.setupToInviteUsersInfo')
				}`"
				@click="redirectToSetup"
			/>
		</div>
		<div :class="$style.usersContainer" v-else>
			<n8n-users-list
				:actions="usersListActions"
				:users="usersStore.allUsers"
				:currentUserId="usersStore.currentUserId"
				@delete="onDelete"
				@reinvite="onReinvite"
				@copyInviteLink="onCopyInviteLink"
			/>
		</div>
		<feature-coming-soon
			v-for="fakeDoorFeature in fakeDoorFeatures"
			:key="fakeDoorFeature.id"
			:featureId="fakeDoorFeature.id"
			class="pb-3xl"
			showTitle
		/>
	</div>
</template>

<script lang="ts">
import { EnterpriseEditionFeature, INVITE_USER_MODAL_KEY, VIEWS } from '@/constants';

import PageAlert from '../components/PageAlert.vue';
import FeatureComingSoon from '@/components/FeatureComingSoon.vue';
import { IFakeDoor, IUser, IUserListAction } from '@/Interface';
import mixins from 'vue-typed-mixins';
import { showMessage } from '@/mixins/showMessage';
import { copyPaste } from '@/mixins/copyPaste';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui';
import { useSettingsStore } from '@/stores/settings';
import { useUsersStore } from '@/stores/users';
import { BaseTextKey } from '@/plugins/i18n';
import { useUsageStore } from '@/stores/usage';

export default mixins(showMessage, copyPaste).extend({
	name: 'SettingsUsersView',
	components: {
		PageAlert,
		FeatureComingSoon,
	},
	async mounted() {
		if (!this.usersStore.showUMSetupWarning) {
			await this.usersStore.fetchUsers();
		}
	},
	computed: {
		...mapStores(useSettingsStore, useUIStore, useUsersStore, useUsageStore),
		isSharingEnabled() {
			return this.settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Sharing);
		},
		usersListActions(): IUserListAction[] {
			return [
				{
					label: this.$locale.baseText('settings.users.actions.copyInviteLink'),
					value: 'copyInviteLink',
					guard: (user) => !user.firstName && !!user.inviteAcceptUrl,
				},
				{
					label: this.$locale.baseText('settings.users.actions.reinvite'),
					value: 'reinvite',
					guard: (user) => !user.firstName && this.settingsStore.isSmtpSetup,
				},
				{
					label: this.$locale.baseText('settings.users.actions.delete'),
					value: 'delete',
				},
			];
		},
		fakeDoorFeatures(): IFakeDoor[] {
			return this.uiStore.getFakeDoorByLocation('settings/users');
		},
	},
	methods: {
		redirectToSetup() {
			this.$router.push({ name: VIEWS.SETUP });
		},
		onInvite() {
			this.uiStore.openModal(INVITE_USER_MODAL_KEY);
		},
		async onDelete(userId: string) {
			const user = this.usersStore.getUserById(userId) as IUser | null;
			if (user) {
				this.uiStore.openDeleteUserModal(userId);
			}
		},
		async onReinvite(userId: string) {
			const user = this.usersStore.getUserById(userId) as IUser | null;
			if (user) {
				try {
					await this.usersStore.reinviteUser({ id: user.id });

					this.$showToast({
						type: 'success',
						title: this.$locale.baseText('settings.users.inviteResent'),
						message: this.$locale.baseText('settings.users.emailSentTo', {
							interpolate: { email: user.email || '' },
						}),
					});
				} catch (e) {
					this.$showError(e, this.$locale.baseText('settings.users.userReinviteError'));
				}
			}
		},
		async onCopyInviteLink(userId: string) {
			const user = this.usersStore.getUserById(userId) as IUser | null;
			if (user?.inviteAcceptUrl) {
				this.copyToClipboard(user.inviteAcceptUrl);

				this.$showToast({
					type: 'success',
					title: this.$locale.baseText('settings.users.inviteUrlCreated'),
					message: this.$locale.baseText('settings.users.inviteUrlCreated.message'),
				});
			}
		},
		goToUpgrade() {
			const linkUrlTranslationKey = this.uiStore.contextBasedTranslationKeys
				.upgradeLinkUrl as BaseTextKey;
			let linkUrl = this.$locale.baseText(linkUrlTranslationKey);

			if (linkUrlTranslationKey.endsWith('.upgradeLinkUrl')) {
				linkUrl = `${this.usageStore.viewPlansUrl}&source=users`;
			} else if (linkUrlTranslationKey.endsWith('.desktop')) {
				linkUrl = `${linkUrl}&utm_campaign=upgrade-users`;
			}

			window.open(linkUrl, '_blank');
		},
	},
});
</script>

<style lang="scss" module>
.container {
	height: 100%;
	padding-right: var(--spacing-2xs);

	> * {
		margin-bottom: var(--spacing-2xl);
	}
}

.usersContainer {
	> * {
		margin-bottom: var(--spacing-2xs);
	}
}

.buttonContainer {
	display: inline-block;
	float: right;
	margin-bottom: var(--spacing-l);
}

.setupInfoContainer {
	max-width: 728px;
}

.alert {
	left: calc(50% + 100px);
}
</style>
