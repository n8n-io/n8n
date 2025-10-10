<script setup lang="ts">
import { computed, ref } from 'vue';
import NodeIcon from '@/components/NodeIcon.vue';
import { useViewStacks } from '../composables/useViewStacks';
import { useUsersStore } from '@/stores/users.store';
import { useCommunityNodesStore } from '@/stores/communityNodes.store';
import { useToast } from '@/composables/useToast';
import { i18n } from '@n8n/i18n';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import OfficialIcon from 'virtual:icons/mdi/verified';

import { getNodeIconSource } from '@/utils/nodeIcon';

import { prepareCommunityNodeDetailsViewStack, removePreviewToken } from '../utils';

import { N8nButton, N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
const {
	activeViewStack,
	pushViewStack,
	popViewStack,
	getAllNodeCreateElements,
	updateCurrentViewStack,
} = useViewStacks();

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

		updateCurrentViewStack({ searchItems: nodeCreatorStore.mergedNodes });

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
	<div v-if="communityNodeDetails" :class="$style.container">
		<div :class="$style.header">
			<div :class="$style.title">
				<NodeIcon
					v-if="communityNodeDetails.nodeIcon"
					:class="$style.nodeIcon"
					:icon-source="communityNodeDetails.nodeIcon"
					:circle="false"
					:show-tooltip="false"
				/>
				<span>{{ communityNodeDetails.title }}</span>
				<N8nTooltip v-if="communityNodeDetails.official" placement="bottom" :show-after="500">
					<template #content>
						{{
							i18n.baseText('generic.officialNode.tooltip', {
								interpolate: {
									author: communityNodeDetails.companyName ?? communityNodeDetails.title,
								},
							})
						}}
					</template>
					<OfficialIcon :class="$style.officialIcon" />
				</N8nTooltip>
			</div>
			<div>
				<div v-if="communityNodeDetails.installed" :class="$style.installed">
					<N8nIcon v-if="!communityNodeDetails.official" :class="$style.installedIcon" icon="box" />
					<N8nText color="text-light" size="small" bold>
						{{ i18n.baseText('communityNodeDetails.installed') }}
					</N8nText>
				</div>

				<N8nButton
					v-if="isOwner && !communityNodeDetails.installed"
					:loading="loading"
					:disabled="loading"
					:label="i18n.baseText('communityNodeDetails.install')"
					size="small"
					data-test-id="install-community-node-button"
					@click="onInstall"
				/>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	width: 100%;
	padding: var(--spacing--sm);
	display: flex;
	flex-direction: column;
	padding-bottom: var(--spacing--xs);
}
.header {
	display: flex;
	gap: var(--spacing--2xs);
	align-items: center;
	justify-content: space-between;
}
.title {
	display: flex;
	align-items: center;
	color: var(--color-text);
	font-size: var(--font-size--xl);
	font-weight: var(--font-weight--bold);
}
.nodeIcon {
	--node-icon-size: 36px;
	margin-right: var(--spacing--sm);
}

.installedIcon {
	margin-right: var(--spacing--3xs);
	color: var(--color--text);
	font-size: var(--font-size--2xs);
}

.officialIcon {
	display: inline-flex;
	flex-shrink: 0;
	margin-left: var(--spacing--4xs);
	color: var(--color--text);
	width: 14px;
}

.installed {
	display: flex;
	align-items: center;
	margin-right: var(--spacing--xs);
}
</style>
