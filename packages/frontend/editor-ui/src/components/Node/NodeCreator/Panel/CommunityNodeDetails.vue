<script setup lang="ts">
import { computed, ref } from 'vue';
import { useViewStacks } from '../composables/useViewStacks';
import { useUsersStore } from '@/stores/users.store';
import { useCommunityNodesStore } from '@/stores/communityNodes.store';
import { useToast } from '@/composables/useToast';
import { i18n } from '@/plugins/i18n';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';
import { useCredentialsStore } from '@/stores/credentials.store';

import { getNodeIconSource } from '@/utils/nodeIcon';

import { prepareCommunityNodeDetailsViewStack, removePreviewToken } from '../utils';

import { N8nText } from '@n8n/design-system';

const { activeViewStack, pushViewStack, popViewStack, getAllNodeCreateElements } = useViewStacks();

const { communityNodeDetails } = activeViewStack;

const loading = ref(false);

const communityNodesStore = useCommunityNodesStore();
const nodeCreatorStore = useNodeCreatorStore();
const toast = useToast();

const isOwner = computed(() => useUsersStore().isInstanceOwner);

const updateViewStack = (key: string) => {
	const installedNodeKey = removePreviewToken(key);
	const installedNode = getAllNodeCreateElements().find((node) => node.key === installedNodeKey);

	if (installedNode) {
		const nodeActions = nodeCreatorStore.actions?.[installedNode.key] || [];

		popViewStack();

		const viewStack = prepareCommunityNodeDetailsViewStack(
			installedNode,
			getNodeIconSource(installedNode.properties),
			activeViewStack.rootView,
			nodeActions,
		);

		pushViewStack(viewStack, {
			transitionDirection: 'none',
		});
	} else {
		const viewStack = { ...activeViewStack };
		viewStack.communityNodeDetails!.installed = true;

		pushViewStack(activeViewStack, { resetStacks: true });
	}
};

const updateStoresAndViewStack = async (key: string) => {
	await useNodeTypesStore().getNodeTypes();
	await useCredentialsStore().fetchCredentialTypes(true);
	updateViewStack(key);
	nodeCreatorStore.removeNodeFromMergedNodes(key);
};

const getNpmVersion = async (key: string) => {
	const communityNodeAttributes = await useNodeTypesStore().getCommunityNodeAttributes(key);

	if (communityNodeAttributes) {
		return communityNodeAttributes.npmVersion;
	}

	return undefined;
};

const onInstall = async () => {
	if (isOwner.value && activeViewStack.communityNodeDetails && !communityNodeDetails?.installed) {
		const { key, packageName } = activeViewStack.communityNodeDetails;

		try {
			loading.value = true;

			await communityNodesStore.installPackage(packageName, true, await getNpmVersion(key));
			await updateStoresAndViewStack(key);

			toast.showMessage({
				title: i18n.baseText('settings.communityNodes.messages.install.success'),
				type: 'success',
			});
		} catch (error) {
			toast.showError(error, i18n.baseText('settings.communityNodes.messages.install.error'));
		} finally {
			loading.value = false;
		}
	}
};
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<div :class="$style.title">
				<NodeIcon
					v-if="communityNodeDetails?.nodeIcon"
					:class="$style.nodeIcon"
					:icon-source="communityNodeDetails.nodeIcon"
					:circle="false"
					:show-tooltip="false"
				/>
				<span>{{ communityNodeDetails?.title }}</span>
			</div>
			<div>
				<div v-if="communityNodeDetails?.installed" :class="$style.installed">
					<FontAwesomeIcon :class="$style.installedIcon" icon="cube" />
					<N8nText color="text-light" size="small" bold>
						{{ i18n.baseText('communityNodeDetails.installed') }}
					</N8nText>
				</div>
				<N8nButton
					v-else-if="isOwner"
					:loading="loading"
					:disabled="loading"
					label="Install Node"
					size="small"
					@click="onInstall"
					data-test-id="install-community-node-button"
				/>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	width: 100%;
	padding: var(--spacing-s);
	display: flex;
	flex-direction: column;
	padding-bottom: var(--spacing-xs);
}
.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
}
.title {
	display: flex;
	align-items: center;
	color: var(--color-text);
	font-size: var(--font-size-xl);
	font-weight: var(--font-weight-bold);
}
.nodeIcon {
	--node-icon-size: 36px;
	margin-right: var(--spacing-s);
}

.installedIcon {
	margin-right: var(--spacing-3xs);
	color: var(--color-text-base);
	font-size: var(--font-size-2xs);
}

.installed {
	display: flex;
	align-items: center;
	margin-right: var(--spacing-xs);
}
</style>
