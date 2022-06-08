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
		};
	},
	computed: {
		...mapGetters('communityNodes', ['isLoading', `getCurrentModalAction`, `getCurrentModalPackageName`]),
		getModalContent() {
			return this.getCurrentModalAction === COMMUNITY_PACKAGE_MANAGE_ACTIONS.UNINSTALL ?
				{
					title: this.$locale.baseText('settings.communityNodes.confirmModal.uninstall.title', {
						interpolate: {
							packageName: this.getCurrentModalPackageName,
						},
					}),
					message: this.$locale.baseText('settings.communityNodes.confirmModal.uninstall.message'),
					buttonLabel: this.$locale.baseText('settings.communityNodes.confirmModal.uninstall.buttonLabel'),
					buttonLoadingLabel: this.$locale.baseText('settings.communityNodes.confirmModal.uninstall.buttonLoadingLabel'),
				} :
				{
					title: this.$locale.baseText('settings.communityNodes.confirmModal.update.title', {
						interpolate: {
							packageName: this.getCurrentModalPackageName,
						},
					}),
					message: this.$locale.baseText('settings.communityNodes.confirmModal.update.message'),
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
								packageName: this.getCurrentModalPackageName,
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

</style>
