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
		<template #content>
			<n8n-text>{{ getModalContent.message }}</n8n-text>
			<div
				:class="$style.descriptionContainer"
				v-if="mode === COMMUNITY_PACKAGE_MANAGE_ACTIONS.UPDATE"
			>
				<n8n-info-tip theme="info" type="note" :bold="false">
					<template>
						<span v-text="getModalContent.description"></span>
					</template>
				</n8n-info-tip>
			</div>
		</template>
		<template #footer>
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
import { defineComponent } from 'vue';
import Modal from '@/components/Modal.vue';
import { COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY, COMMUNITY_PACKAGE_MANAGE_ACTIONS } from '@/constants';
import { useToast } from '@/composables';
import { mapStores } from 'pinia';
import { useCommunityNodesStore } from '@/stores/communityNodes.store';
import { createEventBus } from 'n8n-design-system';

export default defineComponent({
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
	setup() {
		return {
			...useToast(),
		};
	},
	data() {
		return {
			loading: false,
			modalBus: createEventBus(),
			COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY,
			COMMUNITY_PACKAGE_MANAGE_ACTIONS,
		};
	},
	computed: {
		...mapStores(useCommunityNodesStore),
		activePackage() {
			return this.communityNodesStore.getInstalledPackageByName(this.activePackageName);
		},
		getModalContent() {
			if (this.mode === COMMUNITY_PACKAGE_MANAGE_ACTIONS.UNINSTALL) {
				return {
					title: this.$locale.baseText('settings.communityNodes.confirmModal.uninstall.title'),
					message: this.$locale.baseText('settings.communityNodes.confirmModal.uninstall.message', {
						interpolate: {
							packageName: this.activePackageName,
						},
					}),
					buttonLabel: this.$locale.baseText(
						'settings.communityNodes.confirmModal.uninstall.buttonLabel',
					),
					buttonLoadingLabel: this.$locale.baseText(
						'settings.communityNodes.confirmModal.uninstall.buttonLoadingLabel',
					),
				};
			}
			return {
				title: this.$locale.baseText('settings.communityNodes.confirmModal.update.title', {
					interpolate: {
						packageName: this.activePackageName,
					},
				}),
				description: this.$locale.baseText(
					'settings.communityNodes.confirmModal.update.description',
				),
				message: this.$locale.baseText('settings.communityNodes.confirmModal.update.message', {
					interpolate: {
						packageName: this.activePackageName,
						version: this.activePackage.updateAvailable,
					},
				}),
				buttonLabel: this.$locale.baseText(
					'settings.communityNodes.confirmModal.update.buttonLabel',
				),
				buttonLoadingLabel: this.$locale.baseText(
					'settings.communityNodes.confirmModal.update.buttonLoadingLabel',
				),
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
				this.$telemetry.track('user started cnr package deletion', {
					package_name: this.activePackage.packageName,
					package_node_names: this.activePackage.installedNodes.map((node) => node.name),
					package_version: this.activePackage.installedVersion,
					package_author: this.activePackage.authorName,
					package_author_email: this.activePackage.authorEmail,
				});
				this.loading = true;
				await this.communityNodesStore.uninstallPackage(this.activePackageName);
				this.showMessage({
					title: this.$locale.baseText('settings.communityNodes.messages.uninstall.success.title'),
					type: 'success',
				});
			} catch (error) {
				this.showError(
					error,
					this.$locale.baseText('settings.communityNodes.messages.uninstall.error'),
				);
			} finally {
				this.loading = false;
				this.modalBus.emit('close');
			}
		},
		async onUpdate() {
			try {
				this.$telemetry.track('user started cnr package update', {
					package_name: this.activePackage.packageName,
					package_node_names: this.activePackage.installedNodes.map((node) => node.name),
					package_version_current: this.activePackage.installedVersion,
					package_version_new: this.activePackage.updateAvailable,
					package_author: this.activePackage.authorName,
					package_author_email: this.activePackage.authorEmail,
				});
				this.loading = true;
				const updatedVersion = this.activePackage.updateAvailable;
				await this.communityNodesStore.updatePackage(this.activePackageName);
				this.showMessage({
					title: this.$locale.baseText('settings.communityNodes.messages.update.success.title'),
					message: this.$locale.baseText(
						'settings.communityNodes.messages.update.success.message',
						{
							interpolate: {
								packageName: this.activePackageName,
								version: updatedVersion,
							},
						},
					),
					type: 'success',
				});
			} catch (error) {
				this.showError(
					error,
					this.$locale.baseText('settings.communityNodes.messages.update.error.title'),
				);
			} finally {
				this.loading = false;
				this.modalBus.emit('close');
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
