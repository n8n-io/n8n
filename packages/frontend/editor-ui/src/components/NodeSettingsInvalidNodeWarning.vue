<script setup lang="ts">
import { useInstallNode } from '@/features/settings/communityNodes/composables/useInstallNode';
import { useTelemetry } from '@/composables/useTelemetry';
import { CUSTOM_NODES_DOCS_URL } from '@/constants';
import { COMMUNITY_PACKAGE_INSTALL_MODAL_KEY } from '@/features/settings/communityNodes/communityNodes.constants';
import type { INodeUi } from '@/Interface';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useUIStore } from '@/stores/ui.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { isCommunityPackageName } from 'n8n-workflow';
import { computed, watch } from 'vue';
import { I18nT } from 'vue-i18n';
import ContactAdministratorToInstall from '@/features/settings/communityNodes/components/ContactAdministratorToInstall.vue';
import { removePreviewToken } from './Node/NodeCreator/utils';

const { node, previewMode = false } = defineProps<{ node: INodeUi; previewMode?: boolean }>();

const i18n = useI18n();
const telemetry = useTelemetry();
const nodeTypesStore = useNodeTypesStore();
const uiStore = useUIStore();
const ndvStore = useNDVStore();
const nodeCreatorStore = useNodeCreatorStore();
const usersStore = useUsersStore();

const isCommunityNode = computed(() => isCommunityPackageName(node.type));
const isVerifiedCommunityNode = computed(
	() =>
		isCommunityPackageName(node.type) &&
		nodeTypesStore.communityNodeType(node.type)?.isOfficialNode,
);
const npmPackage = computed(() => removePreviewToken(node.type.split('.')[0]));
const isOwner = computed(() => usersStore.isInstanceOwner);

const { installNode, loading } = useInstallNode();

const isNodeDefined = computed(() => !!nodeTypesStore.nodeTypes[node.type]);

async function onViewDetailsClick() {
	telemetry.track('user clicked cnr docs link', {
		source: 'missing node modal source',
		package_name: node.type.split('.')[0],
		node_type: node.type,
	});
	if (isVerifiedCommunityNode.value) {
		await nodeCreatorStore.openNodeCreatorWithNode(node.name);
	} else if (npmPackage.value) {
		window.open(`https://www.npmjs.com/package/${npmPackage.value}`, '_blank');
	}
}

async function onInstallClick() {
	telemetry.track('user clicked cnr install button', {
		source: 'missing node modal source',
		package_name: npmPackage.value,
		node_type: node.type,
	});

	if (isVerifiedCommunityNode.value) {
		await installNode({
			type: 'verified',
			packageName: npmPackage.value,
			nodeType: node.type,
		});
	} else {
		uiStore.openModalWithData({
			name: COMMUNITY_PACKAGE_INSTALL_MODAL_KEY,
			data: {
				packageName: npmPackage.value,
				disableInput: true,
				hideSuggestion: true,
				nodeType: node.type,
			},
		});
	}
}

// close the modal when the node gets installed
watch(isNodeDefined, () => {
	if (isNodeDefined.value) {
		ndvStore.unsetActiveNodeName();
	}
});
</script>

<template>
	<div :class="$style.nodeIsNotValid">
		<p :class="$style.warningIcon">
			<N8nIcon icon="triangle-alert" />
		</p>
		<div class="mt-s mb-xs">
			<N8nText size="large" color="text-dark" bold>
				{{
					previewMode
						? i18n.baseText('nodeSettings.communityNodeUnknown.title.preview')
						: i18n.baseText('nodeSettings.communityNodeUnknown.title')
				}}
			</N8nText>
		</div>
		<div v-if="isCommunityNode && !previewMode" :class="$style.descriptionContainer">
			<I18nT keypath="nodeSettings.communityNodeUnknown.description" tag="span" scope="global">
				<template #action>
					<N8nText size="medium" bold>{{ npmPackage }}</N8nText>
				</template>
			</I18nT>
			<div v-if="isOwner" :class="$style.communityNodeActionsContainer">
				<N8nButton
					v-if="isOwner"
					icon="hard-drive-download"
					type="primary"
					data-test-id="install-community-node-button"
					:loading="loading"
					:disabled="loading"
					@click="onInstallClick"
				>
					{{ i18n.baseText('nodeSettings.communityNodeUnknown.installButton.label') }}
				</N8nButton>
				<N8nButton
					icon="external-link"
					type="secondary"
					@click="onViewDetailsClick"
					data-test-id="view-details-button"
				>
					{{ i18n.baseText('nodeSettings.communityNodeUnknown.viewDetailsButton.label') }}
				</N8nButton>
			</div>
			<ContactAdministratorToInstall v-else :box="false" />
		</div>
		<I18nT
			v-else-if="!previewMode"
			keypath="nodeSettings.nodeTypeUnknown.description"
			tag="span"
			scope="global"
		>
			<template #action>
				<a
					:href="CUSTOM_NODES_DOCS_URL"
					target="_blank"
					v-text="i18n.baseText('nodeSettings.nodeTypeUnknown.description.customNode')"
				/>
			</template>
		</I18nT>
	</div>
</template>

<style lang="scss" module>
.communityNodeActionsContainer {
	display: flex;
	gap: var(--spacing--2xs);
}

.nodeIsNotValid {
	height: 75%;
	padding: 10px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	text-align: center;
	line-height: var(--line-height--md);
}

.warningIcon {
	color: var(--color--text--tint-2);
	font-size: var(--font-size--2xl);
}

.descriptionContainer {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	align-items: center;
}
</style>
