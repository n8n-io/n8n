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
import { COMMUNITY_NODE_TYPE_PREVIEW_TOKEN } from 'n8n-workflow';

const {
	activeViewStack,
	pushViewStack,
	popViewStack,
	getAllNodeCreateElements,
	pushCommunityNodeDetailsViewStack,
} = useViewStacks();

const { communityNodeDetails } = activeViewStack;

const loading = ref(false);

const verifiedVersion = ref<string | undefined>(undefined);

const communityNodesStore = useCommunityNodesStore();
const nodeCreatorStore = useNodeCreatorStore();
const toast = useToast();

const isOwner = computed(() => useUsersStore().isInstanceOwner);

const onInstallClick = async () => {
	if (isOwner.value && activeViewStack.communityNodeDetails && !communityNodeDetails?.installed) {
		const { key, packageName } = activeViewStack.communityNodeDetails;

		try {
			loading.value = true;
			await communityNodesStore.installPackage(packageName, true, verifiedVersion.value);

			await useNodeTypesStore().getNodeTypes();

			await useCredentialsStore().fetchCredentialTypes(true);

			const installedNodeItem = getAllNodeCreateElements().find(
				(node) => node.key === key.replace(COMMUNITY_NODE_TYPE_PREVIEW_TOKEN, ''),
			);

			if (installedNodeItem) {
				const nodeActions = nodeCreatorStore.actions?.[installedNodeItem.key] || [];

				popViewStack();

				pushCommunityNodeDetailsViewStack(
					installedNodeItem,
					getNodeIconSource(installedNodeItem.properties),
					nodeActions,
					{
						transitionDirection: 'none',
					},
				);
			} else {
				const viewStack = { ...activeViewStack };
				viewStack.communityNodeDetails!.installed = true;

				pushViewStack(activeViewStack, { resetStacks: true });
			}

			nodeCreatorStore.removeNodeFromMergedNodes(key);

			loading.value = false;

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
					<n8n-icon :class="$style.installedIcon" icon="cube" />
					<n8n-text color="text-light" size="small" bold> Installed </n8n-text>
				</div>
				<N8nButton
					v-else-if="isOwner"
					:loading="loading"
					:disabled="loading"
					label="Install Node"
					size="small"
					@click="onInstallClick"
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
