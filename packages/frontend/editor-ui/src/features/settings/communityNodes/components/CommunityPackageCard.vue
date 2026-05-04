<script lang="ts" setup>
import { useUIStore } from '@/app/stores/ui.store';
import type { IUser } from 'n8n-workflow';
import { COMMUNITY_PACKAGE_MANAGE_ACTIONS } from '../communityNodes.constants';
import { NPM_PACKAGE_DOCS_BASE_URL } from '@/app/constants';
import type { CommunityPackageCardData } from '../communityNodes.types';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useSettingsStore } from '@/app/stores/settings.store';
import type { UserAction } from '@n8n/design-system';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useInstallNode } from '../composables/useInstallNode';
import NodeIcon from '@/app/components/NodeIcon.vue';
import OfficialIcon from 'virtual:icons/mdi/verified';
import { computed, ref, watch } from 'vue';
import semver from 'semver';

import {
	N8nActionToggle,
	N8nBadge,
	N8nButton,
	N8nExternalLink,
	N8nIcon,
	N8nLoading,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';

const props = withDefaults(
	defineProps<{
		pkg?: CommunityPackageCardData | null;
		loading?: boolean;
	}>(),
	{ pkg: null, loading: false },
);

const emit = defineEmits<{ installed: [] }>();

const { openCommunityPackageUpdateConfirmModal, openCommunityPackageUninstallConfirmModal } =
	useUIStore();
const i18n = useI18n();
const telemetry = useTelemetry();
const settingsStore = useSettingsStore();
const nodeTypesStore = useNodeTypesStore();
const { installNode, loading: installLoading } = useInstallNode();

const docsUrl = computed(() => `${NPM_PACKAGE_DOCS_BASE_URL}${props.pkg?.packageName ?? ''}`);

const formattedDownloads = computed(() => {
	const count = props.pkg?.numberOfDownloads ?? 0;
	if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
	if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
	return count.toString();
});

// --- Install ---

const installedLocally = ref(false);
const isInstalled = computed(() => (props.pkg?.isInstalled ?? false) || installedLocally.value);

async function onInstall() {
	if (!props.pkg?.installNodeName) return;

	telemetry.track('user clicked cnr install button', {
		package_name: props.pkg.packageName,
		source: 'cnr settings browse',
	});

	const result = await installNode({
		type: 'verified',
		packageName: props.pkg.packageName,
		nodeType: props.pkg.installNodeName,
		telemetry: { hasQuickConnect: false, source: 'cnr settings browse' },
	});

	if (result.success) {
		installedLocally.value = true;
		emit('installed');
	}
}

// --- Update check ---

const latestVerifiedVersion = ref<string>();

const hasUpdate = computed(() => {
	if (!isInstalled.value) return false;

	if (settingsStore.isUnverifiedPackagesEnabled && props.pkg?.updateAvailable) return true;

	if (
		settingsStore.isCommunityNodesFeatureEnabled &&
		latestVerifiedVersion.value &&
		props.pkg?.installedVersion &&
		semver.gt(latestVerifiedVersion.value, props.pkg.installedVersion)
	) {
		return true;
	}

	return false;
});

function onUpdateClick() {
	if (!props.pkg) return;
	openCommunityPackageUpdateConfirmModal(props.pkg.packageName, 'instance settings');
}

watch(
	() => props.pkg?.packageName,
	async (name) => {
		if (!name || !props.pkg?.isInstalled) return;
		await nodeTypesStore.loadNodeTypesIfNotLoaded();
		const nodeType = nodeTypesStore.visibleNodeTypes.find((node) => node.name.includes(name));
		const attributes = await nodeTypesStore.getCommunityNodeAttributes(nodeType?.name ?? '');
		if (attributes?.npmVersion) {
			latestVerifiedVersion.value = attributes.npmVersion;
		}
	},
	{ immediate: true },
);

// --- Uninstall ---

const packageActions: Array<UserAction<IUser>> = [
	{
		label: i18n.baseText('settings.communityNodes.uninstallAction.label'),
		value: COMMUNITY_PACKAGE_MANAGE_ACTIONS.UNINSTALL,
	},
];

function onAction(value: string) {
	if (value === COMMUNITY_PACKAGE_MANAGE_ACTIONS.UNINSTALL && props.pkg) {
		openCommunityPackageUninstallConfirmModal(props.pkg.packageName);
	}
}
</script>

<template>
	<div :class="$style.card" data-test-id="community-package-card">
		<div v-if="loading" :class="$style.skeleton">
			<N8nLoading variant="p" :rows="1" />
			<N8nLoading variant="p" :rows="1" />
		</div>

		<template v-else-if="pkg">
			<div :class="$style.cardTop">
				<NodeIcon
					v-if="pkg.nodeDescription"
					:class="$style.nodeIcon"
					:node-type="pkg.nodeDescription"
					:show-tooltip="false"
				/>
				<div :class="$style.nameBlock">
					<div :class="$style.titleRow">
						<N8nExternalLink :href="docsUrl" :class="$style.packageName">
							<N8nText :bold="true" size="medium">{{ pkg.packageName }}</N8nText>
						</N8nExternalLink>
						<N8nTooltip v-if="pkg.isOfficialNode" placement="bottom" :show-after="500">
							<template #content>
								{{
									i18n.baseText('generic.officialNode.tooltip', {
										interpolate: { author: pkg.authorName },
									})
								}}
							</template>
							<OfficialIcon :class="$style.officialIcon" />
						</N8nTooltip>
					</div>
					<N8nText v-if="pkg.authorName" size="small" color="text-light">
						{{
							i18n.baseText('settings.communityNodes.browse.card.by', {
								interpolate: { author: pkg.authorName },
							})
						}}
					</N8nText>
				</div>
			</div>

			<N8nText v-if="pkg.description" size="small" color="text-light" :class="$style.description">
				{{ pkg.description }}
			</N8nText>

			<div :class="$style.cardBottom">
				<div :class="$style.stats">
					<div :class="$style.stat">
						<N8nIcon :class="$style.statIcon" icon="box" />
						<N8nText color="text-light" size="xsmall" :bold="true">
							{{
								i18n.baseText('settings.communityNodes.browse.card.nodes', {
									adjustToNumber: pkg.nodeCount,
								})
							}}
						</N8nText>
					</div>
					<div v-if="pkg.numberOfDownloads" :class="$style.stat">
						<N8nIcon :class="$style.statIcon" icon="hard-drive-download" />
						<N8nText color="text-light" size="xsmall" :bold="true">
							{{
								i18n.baseText('settings.communityNodes.browse.card.downloads', {
									interpolate: { count: formattedDownloads },
								})
							}}
						</N8nText>
					</div>
					<div v-if="pkg.installedVersion" :class="$style.stat">
						<N8nText color="text-light" size="xsmall" :bold="true">
							v{{ pkg.installedVersion }}
						</N8nText>
					</div>
				</div>

				<div :class="$style.actions">
					<template v-if="isInstalled">
						<N8nTooltip v-if="pkg.failedLoading" placement="top">
							<template #content>
								{{ i18n.baseText('settings.communityNodes.failedToLoad.tooltip') }}
							</template>
							<N8nIcon icon="triangle-alert" color="danger" size="large" />
						</N8nTooltip>
						<N8nTooltip v-else-if="hasUpdate" placement="top">
							<template #content>
								{{ i18n.baseText('settings.communityNodes.updateAvailable.tooltip') }}
							</template>
							<N8nButton variant="outline" label="Update" size="small" @click="onUpdateClick" />
						</N8nTooltip>
						<N8nBadge v-else theme="success">
							{{ i18n.baseText('settings.communityNodes.browse.card.installed') }}
						</N8nBadge>
						<N8nActionToggle :actions="packageActions" @action="onAction" />
					</template>
					<N8nButton
						v-else
						size="small"
						:label="
							installLoading
								? i18n.baseText('settings.communityNodes.browse.card.installing')
								: i18n.baseText('settings.communityNodes.browse.card.install')
						"
						:loading="installLoading"
						@click="onInstall"
					/>
				</div>
			</div>
		</template>
	</div>
</template>

<style lang="scss" module>
.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius--lg);
	background-color: var(--color--background--light-3);
	transition: border-color 0.2s ease;

	&:hover {
		border-color: var(--color--foreground--shade-1);
	}
}

.skeleton {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.cardTop {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
}

.nodeIcon {
	--node--icon--size: 36px;
	flex-shrink: 0;
}

.nameBlock {
	flex: 1;
	min-width: 0;
}

.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.packageName {
	padding: 0;
	overflow: hidden;

	> span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
}

.officialIcon {
	display: inline-flex;
	flex-shrink: 0;
	color: var(--color--text);
	width: 14px;
}

.description {
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
	flex: 1;
}

.cardBottom {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-top: auto;
}

.stats {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
}

.stat {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.statIcon {
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	width: 12px;
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	flex-shrink: 0;
}
</style>
