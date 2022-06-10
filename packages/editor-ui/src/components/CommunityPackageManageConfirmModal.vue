<template>
	<Modal
		width="540px"
		:name="COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY"
		:title="getModalContent.title"
		:eventBus="modalBus"
		:center="true"
		:showClose="!isLoading"
		:beforeClose="onModalClose"
	>
		<template slot="content">
			<n8n-text>{{ getModalContent.message }}</n8n-text>
			<div :class="$style.descriptionContainer" v-if="this.getCurrentModalAction === COMMUNITY_PACKAGE_MANAGE_ACTIONS.UPDATE">
				<div :class="$style.descriptionIcon">
					<n8n-icon icon="info-circle" size="xlarge" />
				</div>
				<div :class="$style.descriptionText">
					<n8n-text>{{ $locale.baseText("We recommend you deactivate workflows that use any of the package's nodes and reactivate them once the update is completed") }}</n8n-text>
				</div>
			</div>
		</template>
		<template slot="footer">
			<n8n-button
				:loading="isLoading"
				:disabled="isLoading"
				:label="isLoading ? getModalContent.buttonLoadingLabel : getModalContent.buttonLabel"
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
import { mapGetters } from 'vuex';
import { showMessage } from './mixins/showMessage';

export default mixins(showMessage).extend({
	name: 'CommunityPackageManageConfirmModal',
	components: {
		Modal,
	},
	data() {
		return {
			modalBus: new Vue(),
			COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY,
			COMMUNITY_PACKAGE_MANAGE_ACTIONS,
		};
	},
	computed: {
		...mapGetters('communityNodes', ['isLoading', `getCurrentModalAction`, `getCurrentModalPackage`]),
		getModalContent() {
			return this.getCurrentModalAction === COMMUNITY_PACKAGE_MANAGE_ACTIONS.UNINSTALL ?
				{
					title: this.$locale.baseText('settings.communityNodes.confirmModal.uninstall.title', {
						interpolate: {
							packageName: this.getCurrentModalPackage.packageName,
						},
					}),
					message: this.$locale.baseText('settings.communityNodes.confirmModal.uninstall.message'),
					buttonLabel: this.$locale.baseText('settings.communityNodes.confirmModal.uninstall.buttonLabel'),
					buttonLoadingLabel: this.$locale.baseText('settings.communityNodes.confirmModal.uninstall.buttonLoadingLabel'),
				} :
				{
					title: this.$locale.baseText('settings.communityNodes.confirmModal.update.title', {
						interpolate: {
							packageName: this.getCurrentModalPackage.packageName,
						},
					}),
					message: this.$locale.baseText('settings.communityNodes.confirmModal.update.message', {
						interpolate: {
							packageName: this.getCurrentModalPackage.packageName,
							version: this.getCurrentModalPackage.updateAvailable,
						},
					}),
					buttonLabel: this.$locale.baseText('settings.communityNodes.confirmModal.update.buttonLabel'),
					buttonLoadingLabel: this.$locale.baseText('settings.communityNodes.confirmModal.update.buttonLoadingLabel'),
				};
		},
	},
	methods: {
		onModalClose() {
			return !this.isLoading;
		},
		async onConfirmButtonClick() {
			try {
				if (this.getCurrentModalAction === COMMUNITY_PACKAGE_MANAGE_ACTIONS.UNINSTALL) {
					await this.$store.dispatch('communityNodes/uninstallPackage');
					this.$showMessage({
						title: this.$locale.baseText('settings.communityNodes.messages.uninstall.success.title'),
						message: this.$locale.baseText('settings.communityNodes.messages.uninstall.success.message', {
							interpolate: {
								packageName: this.getCurrentModalPackage.packageName,
							},
						}),
						type: 'success',
					});
				}else if (this.getCurrentModalAction === COMMUNITY_PACKAGE_MANAGE_ACTIONS.UPDATE) {
					await this.$store.dispatch('communityNodes/updatePackage');
					// TODO: Show message
				}
			} catch (error) {
				this.$showError(error, this.$locale.baseText('settings.communityNodes.messages.uninstall.error'));
			} finally {
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
