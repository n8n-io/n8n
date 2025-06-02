<script setup lang="ts">
import Modal from '@/components/Modal.vue';
import { COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY, COMMUNITY_PACKAGE_MANAGE_ACTIONS } from '@/constants';
import { useToast } from '@/composables/useToast';
import { useCommunityNodesStore } from '@/stores/communityNodes.store';
import { createEventBus } from '@n8n/utils/event-bus';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/composables/useTelemetry';
import { computed, ref } from 'vue';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';

export type CommunityPackageManageMode = 'uninstall' | 'update' | 'view-documentation';

interface Props {
	modalName: string;
	activePackageName: string;
	mode: CommunityPackageManageMode;
}

const props = defineProps<Props>();

const communityNodesStore = useCommunityNodesStore();

const modalBus = createEventBus();

const toast = useToast();
const i18n = useI18n();
const telemetry = useTelemetry();

const loading = ref(false);

const activePackage = computed(
	() => communityNodesStore.installedPackages[props.activePackageName],
);

const getModalContent = computed(() => {
	if (props.mode === COMMUNITY_PACKAGE_MANAGE_ACTIONS.UNINSTALL) {
		return {
			title: i18n.baseText('settings.communityNodes.confirmModal.uninstall.title'),
			message: i18n.baseText('settings.communityNodes.confirmModal.uninstall.message', {
				interpolate: {
					packageName: props.activePackageName,
				},
			}),
			buttonLabel: i18n.baseText('settings.communityNodes.confirmModal.uninstall.buttonLabel'),
			buttonLoadingLabel: i18n.baseText(
				'settings.communityNodes.confirmModal.uninstall.buttonLoadingLabel',
			),
		};
	}
	return {
		title: i18n.baseText('settings.communityNodes.confirmModal.update.title', {
			interpolate: {
				packageName: props.activePackageName,
			},
		}),
		description: i18n.baseText('settings.communityNodes.confirmModal.update.description'),
		message: i18n.baseText('settings.communityNodes.confirmModal.update.message', {
			interpolate: {
				packageName: props.activePackageName,
				version: activePackage.value.updateAvailable ?? '',
			},
		}),
		buttonLabel: i18n.baseText('settings.communityNodes.confirmModal.update.buttonLabel'),
		buttonLoadingLabel: i18n.baseText(
			'settings.communityNodes.confirmModal.update.buttonLoadingLabel',
		),
	};
});

const onModalClose = () => {
	return !loading.value;
};

const onConfirmButtonClick = async () => {
	if (props.mode === COMMUNITY_PACKAGE_MANAGE_ACTIONS.UNINSTALL) {
		await onUninstall();
	} else if (props.mode === COMMUNITY_PACKAGE_MANAGE_ACTIONS.UPDATE) {
		await onUpdate();
	}
};

const onUninstall = async () => {
	try {
		telemetry.track('user started cnr package deletion', {
			package_name: activePackage.value.packageName,
			package_node_names: activePackage.value.installedNodes.map((node) => node.name),
			package_version: activePackage.value.installedVersion,
			package_author: activePackage.value.authorName,
			package_author_email: activePackage.value.authorEmail,
		});
		loading.value = true;
		await communityNodesStore.uninstallPackage(props.activePackageName);
		await useNodeTypesStore().getNodeTypes();
		toast.showMessage({
			title: i18n.baseText('settings.communityNodes.messages.uninstall.success.title'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.communityNodes.messages.uninstall.error'));
	} finally {
		loading.value = false;
		modalBus.emit('close');
	}
};

const onUpdate = async () => {
	try {
		telemetry.track('user started cnr package update', {
			package_name: activePackage.value.packageName,
			package_node_names: activePackage.value.installedNodes.map((node) => node.name),
			package_version_current: activePackage.value.installedVersion,
			package_version_new: activePackage.value.updateAvailable,
			package_author: activePackage.value.authorName,
			package_author_email: activePackage.value.authorEmail,
		});
		loading.value = true;
		const updatedVersion = activePackage.value.updateAvailable;
		await communityNodesStore.updatePackage(props.activePackageName);
		await useNodeTypesStore().getNodeTypes();
		toast.showMessage({
			title: i18n.baseText('settings.communityNodes.messages.update.success.title'),
			message: i18n.baseText('settings.communityNodes.messages.update.success.message', {
				interpolate: {
					packageName: props.activePackageName,
					version: updatedVersion ?? '',
				},
			}),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.communityNodes.messages.update.error.title'));
	} finally {
		loading.value = false;
		modalBus.emit('close');
	}
};
</script>

<template>
	<Modal
		width="540px"
		:name="COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY"
		:title="getModalContent.title"
		:event-bus="modalBus"
		:center="true"
		:show-close="!loading"
		:before-close="onModalClose"
	>
		<template #content>
			<n8n-text>{{ getModalContent.message }}</n8n-text>
			<div
				v-if="mode === COMMUNITY_PACKAGE_MANAGE_ACTIONS.UPDATE"
				:class="$style.descriptionContainer"
			>
				<n8n-info-tip theme="info" type="note" :bold="false">
					<span v-text="getModalContent.description"></span>
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
