<script setup lang="ts">
import { useInstallNode } from '@/features/settings/communityNodes/composables/useInstallNode';
import { useNodeCreatorStore } from '@/features/shared/nodeCreator/nodeCreator.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { getNodeIconSource } from '@/utils/nodeIcon';
import { N8nButton, N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import { i18n } from '@n8n/i18n';
import OfficialIcon from 'virtual:icons/mdi/verified';
import { computed } from 'vue';
import { useViewStacks } from '@/features/shared/nodeCreator/composables/useViewStacks';
import {
	prepareCommunityNodeDetailsViewStack,
	removePreviewToken,
} from '@/features/shared/nodeCreator/nodeCreator.utils';
import NodeIcon from '@/components/NodeIcon.vue';

const {
	activeViewStack,
	pushViewStack,
	popViewStack,
	getAllNodeCreateElements,
	updateCurrentViewStack,
} = useViewStacks();

const { communityNodeDetails } = activeViewStack;

const nodeCreatorStore = useNodeCreatorStore();
const { installNode, loading } = useInstallNode();

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

const updateStoresAndViewStack = (key: string) => {
	updateViewStack(key);
	nodeCreatorStore.removeNodeFromMergedNodes(key);
};

const onInstall = async () => {
	if (isOwner.value && activeViewStack.communityNodeDetails && !communityNodeDetails?.installed) {
		const { key, packageName } = activeViewStack.communityNodeDetails;
		const result = await installNode({ type: 'verified', packageName, nodeType: key });
		if (result.success) {
			updateStoresAndViewStack(key);
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
	--node--icon--size: 36px;
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
