<template>
	<Modal
		width="540px"
		:name="COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY"
		:title="getModalContent.title"
		:eventBus="modalBus"
		:center="true"
		:showClose="!loading"
		:beforeClose="onModalClose"
	>
		<template slot="content">
			<n8n-text>{{ getModalContent.message }}</n8n-text>
			<div :class="$style.descriptionContainer" v-if="this.mode === COMMUNITY_PACKAGE_MANAGE_ACTIONS.UPDATE">
				<div :class="$style.descriptionIcon">
					<n8n-icon icon="info-circle" size="xlarge" />
				</div>
				<div :class="$style.descriptionText">
					<n8n-text>{{ getModalContent.description }}</n8n-text>
				</div>
			</div>
		</template>
		<template slot="footer">
			<n8n-button
				:loading="loading"
				:disabled="loading"
				:label="loading ? getModalContent.buttonLoadingLabel : getModalContent.buttonLabel"
				size="large"
				float="right"
				@click="onConfirmButtonClick"
			/>
		</template>
	</Modal>
</template>

<script>
import Vue from 'vue';
import mixins from 'vue-typed-mixins';
import Modal from './Modal.vue';
import { COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY, COMMUNITY_PACKAGE_MANAGE_ACTIONS } from '../constants';
import { showMessage } from './mixins/showMessage';

export default mixins(showMessage).extend({
	name: 'CommunityPackageManageConfirmModal',
	components: {
		Modal,
	},
	props: {
		modalName: {
			type: String,
			required: true,
		},
		activePackageName: {
			type: String,
			required: true,
		},
		mode: {
			type: String,
		},
	},
	data() {
		return {
			loading: false,
			modalBus: new Vue(),
			COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY,
			COMMUNITY_PACKAGE_MANAGE_ACTIONS,
		};
	},
	computed: {
		activePackage() {
			return this.$store.getters['communityNodes/getInstalledPackageByName'](this.activePackageName);
		},
		getModalContent() {
			if (this.mode === COMMUNITY_PACKAGE_MANAGE_ACTIONS.UNINSTALL) {
				return {
					title: this.$locale.baseText('settings.communityNodes.confirmModal.uninstall.title', {
						interpolate: {
							packageName: this.activePackageName,
						},
					}),
					message: this.$locale.baseText('settings.communityNodes.confirmModal.uninstall.message'),
					buttonLabel: this.$locale.baseText('settings.communityNodes.confirmModal.uninstall.buttonLabel'),
					buttonLoadingLabel: this.$locale.baseText('settings.communityNodes.confirmModal.uninstall.buttonLoadingLabel'),
				};
			}
			return {
				title: this.$locale.baseText('settings.communityNodes.confirmModal.update.title', {
					interpolate: {
						packageName: this.activePackageName,
					},
				}),
				description: this.$locale.baseText('settings.communityNodes.confirmModal.update.description'),
				message: this.$locale.baseText('settings.communityNodes.confirmModal.update.message', {
					interpolate: {
						packageName: this.activePackageName,
						version: this.activePackage.updateAvailable,
					},
				}),
				buttonLabel: this.$locale.baseText('settings.communityNodes.confirmModal.update.buttonLabel'),
				buttonLoadingLabel: this.$locale.baseText('settings.communityNodes.confirmModal.update.buttonLoadingLabel'),
			};
		},
	},
	methods: {
		onModalClose() {
			return !this.loading;
		},
		async onConfirmButtonClick() {
			if (this.mode === COMMUNITY_PACKAGE_MANAGE_ACTIONS.UNINSTALL) {
				await this.onUninstall();
			} else if (this.mode === COMMUNITY_PACKAGE_MANAGE_ACTIONS.UPDATE) {
				await this.onUpdate();
			}
		},
		async onUninstall() {
			try {
				this.loading = true;
				await this.$store.dispatch('communityNodes/uninstallPackage', this.activePackageName);
				this.$showMessage({
					title: this.$locale.baseText('settings.communityNodes.messages.uninstall.success.title'),
					message: this.$locale.baseText('settings.communityNodes.messages.uninstall.success.message', {
						interpolate: {
							packageName: this.activePackageName,
						},
					}),
					type: 'success',
				});
			} catch (error) {
				this.$showError(error, this.$locale.baseText('settings.communityNodes.messages.uninstall.error'));
			} finally {
				this.loading = false;
				this.modalBus.$emit('close');
			}
		},
		async onUpdate() {
			try {
				this.loading = true;
				await this.$store.dispatch('communityNodes/updatePackage', this.activePackageName);
				this.$showMessage({
					title: this.$locale.baseText('settings.communityNodes.messages.update.success.title'),
					message: this.$locale.baseText('settings.communityNodes.messages.update.success.message', {
						interpolate: {
							packageName: this.activePackageName,
							version: this.activePackage.updateAvailable,
						},
					}),
					type: 'success',
				});
			} catch (error) {
				this.$showError(error, this.$locale.baseText('settings.communityNodes.messages.update.error.title'));
			} finally {
				this.loading = false;
				this.modalBus.$emit('close');
			}
		},
	},
});
</script>

<style module lang="scss">
	.descriptionContainer {
		display: flex;
		margin: var(--spacing-s) 0;
	}

	.descriptionIcon {
		align-self: center;
		color: var(--color-text-lighter);
	}

	.descriptionText {
		padding: 0 var(--spacing-xs);
	}
</style>
