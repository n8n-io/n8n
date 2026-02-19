<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { N8nButton, N8nText, N8nIcon, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useInstallNode } from '@/features/settings/communityNodes/composables/useInstallNode';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { removePreviewToken } from '@/features/shared/nodeCreator/nodeCreator.utils';
import NodeIcon from '@/app/components/NodeIcon.vue';
import Modal from '@/app/components/Modal.vue';
import ContactAdministratorToInstall from '@/features/settings/communityNodes/components/ContactAdministratorToInstall.vue';
import OfficialIcon from 'virtual:icons/mdi/verified';
import ShieldIcon from 'virtual:icons/fa-solid/shield-alt';
import type { AppEntry } from '../composables/useAppCredentials';
import type { SimplifiedNodeType } from '@/Interface';
import type { Icon, ThemeIconColor } from 'n8n-workflow';

const APP_INSTALL_MODAL_KEY = 'appInstallModal';

const props = defineProps<{
	appEntry: AppEntry | null;
	modalName?: string;
}>();

const emit = defineEmits<{
	close: [];
	installed: [credentialTypeName: string];
}>();

const i18n = useI18n();
const usersStore = useUsersStore();
const nodeTypesStore = useNodeTypesStore();
const { installNode, loading } = useInstallNode();

const isOwner = computed(() => usersStore.isInstanceOwner);

// Fetched data from API (like CommunityNodeInfo does)
const publisherName = ref<string | undefined>(undefined);
const downloads = ref<string | null>(null);
const isOfficial = ref(false);
const description = ref('');

// Link to npm package page for docs/info
const npmPackageUrl = computed(() => {
	if (!props.appEntry?.packageName) return undefined;
	return `https://www.npmjs.com/package/${props.appEntry.packageName}`;
});

const formatNumber = (number: number) => {
	if (!number) return null;
	return new Intl.NumberFormat('en-US').format(number);
};

// Reset data when switching between nodes
const resetData = () => {
	publisherName.value = undefined;
	downloads.value = null;
	isOfficial.value = false;
	description.value = '';
};

// Fetch community node attributes (like CommunityNodeInfo.vue does)
const fetchCommunityNodeData = async () => {
	if (!props.appEntry) return;

	// Reset first to avoid showing stale data
	resetData();

	const nodeKey = removePreviewToken(props.appEntry.app.name);

	// First try from the cached communityNodeInfo for immediate display
	let cachedInfo = props.appEntry.communityNodeInfo;

	// If not cached in entry, try getting from store directly (might have been populated after entry creation)
	if (!cachedInfo) {
		cachedInfo = nodeTypesStore.communityNodeType(nodeKey) ?? undefined;
	}

	if (cachedInfo) {
		publisherName.value = cachedInfo.companyName ?? cachedInfo.authorName;
		downloads.value = formatNumber(cachedInfo.numberOfDownloads);
		isOfficial.value = cachedInfo.isOfficialNode;
		description.value = cachedInfo.description ?? '';
	}

	// Then fetch from API for the most up-to-date data (like CommunityNodeInfo.vue does)
	const attributes = await nodeTypesStore.getCommunityNodeAttributes(nodeKey);

	if (attributes) {
		publisherName.value = attributes.companyName ?? attributes.authorName;
		downloads.value = formatNumber(attributes.numberOfDownloads);
		isOfficial.value = attributes.isOfficialNode;
		description.value = attributes.description ?? description.value;
	}
};

// Get node type for NodeIcon - same approach as NodeItem.vue
const nodeTypeForIcon = computed((): SimplifiedNodeType | null => {
	if (!props.appEntry) return null;

	const { app } = props.appEntry;

	// For installed nodes, get the full node type from store
	const nodeType = nodeTypesStore.getNodeType(app.name);
	if (nodeType) {
		return nodeType;
	}

	// For uninstalled community nodes, try to get from communityNodeType
	const cleanedName = removePreviewToken(app.name);
	const communityNode = nodeTypesStore.communityNodeType(cleanedName);
	if (communityNode?.nodeDescription) {
		return communityNode.nodeDescription;
	}

	// Fallback: create a minimal node type from app info for icon rendering
	// This handles cases where the communityNodeType lookup fails but we have icon data
	if (app.iconUrl || app.icon) {
		const fallback: SimplifiedNodeType = {
			name: app.name,
			displayName: app.displayName,
			iconUrl: app.iconUrl,
			icon: app.icon as Icon | undefined,
			iconColor: app.iconColor as ThemeIconColor | undefined,
			group: [],
			outputs: [],
			defaults: { name: app.displayName },
			description: '',
		};
		return fallback;
	}

	return null;
});

const handleInstall = async () => {
	if (!props.appEntry?.packageName || !isOwner.value) return;

	const result = await installNode({
		type: 'verified',
		packageName: props.appEntry.packageName,
		nodeType: props.appEntry.app.name,
	});

	if (result.success) {
		// After install, the node type name is without the preview token
		const installedNodeName = removePreviewToken(props.appEntry.app.name);
		const nodeType = nodeTypesStore.getNodeType(installedNodeName);
		const credentialTypeName = nodeType?.credentials?.[0]?.name;

		if (credentialTypeName) {
			emit('installed', credentialTypeName);
		} else {
			emit('close');
		}
	}
};

const handleClose = () => {
	// Prevent closing while installing
	if (loading.value) return;
	emit('close');
};

// Fetch data when appEntry changes
watch(
	() => props.appEntry,
	() => {
		if (props.appEntry) {
			void fetchCommunityNodeData();
		}
	},
	{ immediate: true },
);
</script>

<template>
	<Modal
		:name="modalName ?? APP_INSTALL_MODAL_KEY"
		:center="true"
		width="520px"
		:close-on-click-modal="!loading"
		:close-on-press-escape="!loading"
		data-test-id="app-install-modal"
		@close="handleClose"
	>
		<template #header>
			<div :class="$style.header">
				<NodeIcon
					v-if="nodeTypeForIcon"
					:class="$style.nodeIcon"
					:node-type="nodeTypeForIcon"
					:size="40"
					:circle="false"
					:show-tooltip="false"
				/>
				<span :class="$style.title">{{ appEntry?.app.displayName }}</span>
				<N8nTooltip v-if="isOfficial" placement="bottom" :show-after="500">
					<template #content>
						{{
							i18n.baseText('generic.officialNode.tooltip', {
								interpolate: {
									author: publisherName || appEntry?.app.displayName || '',
								},
							})
						}}
					</template>
					<OfficialIcon :class="$style.officialIcon" />
				</N8nTooltip>
			</div>
		</template>

		<template #content>
			<div :class="$style.content">
				<N8nText v-if="description" color="text-base" size="medium" :class="$style.description">
					{{ description }}
				</N8nText>

				<div :class="$style.separator" />

				<div :class="$style.info">
					<N8nTooltip placement="top">
						<template #content>{{
							isOfficial
								? i18n.baseText('communityNodeInfo.officialApproved')
								: i18n.baseText('communityNodeInfo.approved')
						}}</template>
						<div :class="$style.infoItem">
							<ShieldIcon :class="$style.infoIcon" />
							<N8nText color="text-light" size="small">
								{{ i18n.baseText('communityNodeInfo.approved.label') }}
							</N8nText>
						</div>
					</N8nTooltip>

					<div v-if="downloads" :class="$style.infoItem">
						<N8nIcon :class="$style.infoIcon" icon="hard-drive-download" />
						<N8nText color="text-light" size="small">
							{{ i18n.baseText('communityNodeInfo.downloads', { interpolate: { downloads } }) }}
						</N8nText>
					</div>

					<div v-if="publisherName" :class="$style.infoItem">
						<N8nIcon :class="$style.infoIcon" icon="user" />
						<N8nText color="text-light" size="small">
							{{
								i18n.baseText('communityNodeInfo.publishedBy', { interpolate: { publisherName } })
							}}
						</N8nText>
					</div>

					<a
						v-if="npmPackageUrl"
						:href="npmPackageUrl"
						target="_blank"
						rel="noopener noreferrer"
						:class="[$style.infoItem, $style.docsLink]"
					>
						<N8nIcon :class="$style.infoIcon" icon="external-link" />
						<N8nText color="text-light" size="small">
							{{ i18n.baseText('generic.docs') }}
						</N8nText>
					</a>
				</div>

				<ContactAdministratorToInstall v-if="!isOwner" />
			</div>
		</template>

		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					v-if="isOwner"
					:label="i18n.baseText('communityNodeDetails.install')"
					icon="download"
					:loading="loading"
					:class="$style.installButton"
					data-test-id="install-community-node-button"
					@click="handleInstall"
				/>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.header {
	display: flex;
	align-items: center;
}

.nodeIcon {
	--node--icon--size: 40px;
	margin-right: var(--spacing--sm);
}

.title {
	font-size: var(--font-size--xl);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
}

.officialIcon {
	display: inline-flex;
	flex-shrink: 0;
	margin-left: var(--spacing--3xs);
	color: var(--color--text--tint-1);
	width: 16px;
}

.content {
	display: flex;
	flex-direction: column;
}

.description {
	margin-top: var(--spacing--md);
	margin-bottom: var(--spacing--xl);
	line-height: 1.6;
}

.separator {
	height: var(--border-width);
	background: var(--color--foreground);
	margin-bottom: var(--spacing--lg);
}

.info {
	display: flex;
	align-items: center;
	justify-content: flex-start;
	gap: var(--spacing--md);
	flex-wrap: wrap;
}

.infoItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.infoIcon {
	color: var(--color--text--tint-1);
	font-size: var(--font-size--sm);
	width: 16px;
}

.docsLink {
	text-decoration: none;
	transition: color 0.2s ease;

	&:hover {
		color: var(--color--primary);

		.infoIcon {
			color: var(--color--primary);
		}
	}
}

.footer {
	display: flex;
	justify-content: flex-end;
}

.installButton {
	min-width: 100px;
}
</style>
