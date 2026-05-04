<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import semver from 'semver';
import type { CommunityPackageRowData } from '../communityNodes.types';
import { NPM_PACKAGE_DOCS_BASE_URL } from '@/app/constants';
import { useI18n } from '@n8n/i18n';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useUIStore } from '@/app/stores/ui.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useInstallNode } from '../composables/useInstallNode';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { COMMUNITY_PACKAGE_MANAGE_ACTIONS } from '../communityNodes.constants';
import type { UserAction } from '@n8n/design-system';
import type { IUser } from 'n8n-workflow';
import {
	N8nActionToggle,
	N8nBadge,
	N8nButton,
	N8nCard,
	N8nExternalLink,
	N8nIcon,
	N8nLoading,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';

const props = withDefaults(
	defineProps<{
		row?: CommunityPackageRowData | null;
		loading?: boolean;
	}>(),
	{ row: null, loading: false },
);

const emit = defineEmits<{ installed: [] }>();

const i18n = useI18n();
const { openCommunityPackageUpdateConfirmModal, openCommunityPackageUninstallConfirmModal } =
	useUIStore();
const settingsStore = useSettingsStore();
const nodeTypesStore = useNodeTypesStore();
const telemetry = useTelemetry();
const { installNode, loading: installLoading } = useInstallNode();

const installedLocally = ref(false);
const isInstalled = computed(() => (props.row?.isInstalled ?? false) || installedLocally.value);

const packageActions: Array<UserAction<IUser>> = [
	{
		label: i18n.baseText('settings.communityNodes.uninstallAction.label'),
		value: COMMUNITY_PACKAGE_MANAGE_ACTIONS.UNINSTALL,
	},
];

function onAction(value: string) {
	if (value === COMMUNITY_PACKAGE_MANAGE_ACTIONS.UNINSTALL && props.row) {
		openCommunityPackageUninstallConfirmModal(props.row.packageName);
	}
}

const docsUrl = computed(() => `${NPM_PACKAGE_DOCS_BASE_URL}${props.row?.packageName ?? ''}`);

const formattedDownloads = computed(() => {
	const count = props.row?.numberOfDownloads ?? 0;
	if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
	if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
	return count.toString();
});
const nodeCountLabel = computed(() =>
	i18n.baseText('settings.communityNodes.packageNodes.label', {
		adjustToNumber: props.row?.nodeCount ?? 0,
		interpolate: { count: props.row?.nodeCount ?? 0 },
	}),
);
const downloadsLabel = computed(() =>
	i18n.baseText('settings.communityNodes.row.downloadsLabel', {
		interpolate: { count: formattedDownloads.value },
	}),
);
const verifiedLabel = computed(() => i18n.baseText('settings.communityNodes.verified.tooltip'));
const failedLoadingLabel = computed(() =>
	i18n.baseText('settings.communityNodes.failedToLoad.tooltip'),
);
const bylinePrefix = computed(() =>
	props.row?.authorName
		? i18n.baseText('settings.communityNodes.byline', {
				interpolate: { author: props.row.authorName },
			})
		: '',
);

async function onInstall() {
	if (!props.row?.installNodeName) return;

	telemetry.track('user clicked cnr install button', {
		package_name: props.row.packageName,
		source: 'cnr settings browse',
	});

	const result = await installNode({
		type: 'verified',
		packageName: props.row.packageName,
		nodeType: props.row.installNodeName,
		telemetry: { hasQuickConnect: false, source: 'cnr settings browse' },
	});

	if (result.success) {
		installedLocally.value = true;
		emit('installed');
	}
}

const latestVerifiedVersion = ref<string>();

const hasUpdate = computed(() => {
	if (!props.row?.isInstalled) return false;
	if (settingsStore.isUnverifiedPackagesEnabled && props.row.updateAvailable) return true;
	if (
		settingsStore.isCommunityNodesFeatureEnabled &&
		latestVerifiedVersion.value &&
		props.row.installedVersion &&
		semver.gt(latestVerifiedVersion.value, props.row.installedVersion)
	) {
		return true;
	}
	return false;
});

function getNodeTypeNameForUpdate(row: CommunityPackageRowData) {
	if (row.nodeDescription?.name) return row.nodeDescription.name;
	if (row.installNodeName) return row.installNodeName;

	return (
		nodeTypesStore.visibleNodeTypes.find(
			(node) => node.name === row.packageName || node.name.startsWith(`${row.packageName}.`),
		)?.name ?? ''
	);
}

watch(
	() => props.row?.packageName,
	async (name) => {
		installedLocally.value = false;
		latestVerifiedVersion.value = undefined;

		const row = props.row;
		if (!name || !row?.isInstalled) return;
		try {
			await nodeTypesStore.loadNodeTypesIfNotLoaded();
			const nodeTypeName = getNodeTypeNameForUpdate(row);
			const attributes = await nodeTypesStore.getCommunityNodeAttributes(nodeTypeName);
			if (props.row?.packageName !== name) return;
			if (attributes?.npmVersion) {
				latestVerifiedVersion.value = attributes.npmVersion;
			}
		} catch {
			// Swallow: failing to fetch the latest verified version just means we don't show
			// an "Update available" hint. The UI state remains correct.
		}
	},
	{ immediate: true },
);

function onUpdateClick() {
	if (!props.row) return;
	openCommunityPackageUpdateConfirmModal(props.row.packageName, 'instance settings');
}
</script>

<template>
	<N8nCard data-test-id="community-package-row">
		<template #prepend>
			<NodeIcon
				v-if="!loading && row?.nodeDescription"
				:node-type="row.nodeDescription"
				:show-tooltip="false"
			/>
			<div v-if="loading" :class="$style.skeletonIcon" />
		</template>
		<template #header>
			<div v-if="!loading" :class="$style.identity">
				<N8nExternalLink :href="docsUrl">
					<N8nText :bold="true" size="small">{{ row?.packageName }}</N8nText>
				</N8nExternalLink>
				<N8nTooltip v-if="row?.isVerified" placement="top" :show-after="500">
					<template #content>
						{{ verifiedLabel }}
					</template>
					<N8nIcon
						data-test-id="community-package-row__verified"
						icon="badge-check"
						size="small"
						:aria-label="verifiedLabel"
						:class="$style.verifiedIcon"
					/>
				</N8nTooltip>
			</div>
			<div v-if="!loading" :class="$style.stats">
				<span v-if="row?.nodeCount" :class="$style.stat" :aria-label="nodeCountLabel">
					<N8nIcon icon="box" size="xsmall" />
					<N8nText size="xsmall" color="text-light" :bold="true">{{ row.nodeCount }}</N8nText>
				</span>
				<span v-if="row?.numberOfDownloads" :class="$style.stat" :aria-label="downloadsLabel">
					<N8nIcon icon="hard-drive-download" size="xsmall" />
					<N8nText size="xsmall" color="text-light" :bold="true">{{ formattedDownloads }}</N8nText>
				</span>
			</div>
		</template>
		<div v-if="loading" :class="$style.skeleton">
			<N8nLoading variant="p" :rows="1" />
			<N8nLoading variant="p" :rows="1" />
		</div>
		<N8nText v-else size="xsmall" color="text-light" :class="$style.byline">
			{{ bylinePrefix }}<template v-if="row?.description"> · {{ row.description }}</template>
		</N8nText>
		<template #append>
			<div v-if="!loading" :class="$style.actions">
				<N8nTooltip v-if="isInstalled && row?.failedLoading" placement="top">
					<template #content>
						{{ failedLoadingLabel }}
					</template>
					<N8nIcon
						icon="triangle-alert"
						color="danger"
						size="large"
						:aria-label="failedLoadingLabel"
					/>
				</N8nTooltip>

				<template v-else-if="isInstalled && hasUpdate">
					<N8nBadge :class="[$style.persistentState, $style.persistentStateUpdate]" theme="warning">
						{{ i18n.baseText('settings.communityNodes.row.updateAvailable') }}
					</N8nBadge>
					<N8nButton
						data-test-id="community-package-row__update"
						size="small"
						variant="outline"
						:label="i18n.baseText('settings.communityNodes.row.update')"
						:class="$style.hoverCta"
						@click="onUpdateClick"
					/>
				</template>

				<N8nBadge v-else-if="isInstalled" theme="success" :class="$style.persistentState">
					<template v-if="row?.installedVersion">v{{ row.installedVersion }} </template
					>{{ i18n.baseText('settings.communityNodes.row.installed') }}
				</N8nBadge>

				<N8nButton
					v-else
					data-test-id="community-package-row__install"
					size="small"
					:label="
						installLoading
							? i18n.baseText('settings.communityNodes.row.installing')
							: i18n.baseText('settings.communityNodes.row.install')
					"
					:loading="installLoading"
					:disabled="!row?.installNodeName"
					:class="$style.hoverCta"
					@click="onInstall"
				/>

				<N8nActionToggle
					v-if="isInstalled"
					data-test-id="community-package-row__menu"
					:actions="packageActions"
					theme="dark"
					@action="onAction"
				/>
			</div>
		</template>
	</N8nCard>
</template>

<style lang="scss" module>
.identity {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.byline {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	flex-shrink: 0;
}

.stats {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	flex-shrink: 0;
}

.stat {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.verifiedIcon {
	display: inline-flex;
	flex-shrink: 0;
	color: var(--color--text);
}

.persistentState {
	flex-shrink: 0;
}

[data-test-id='community-package-row']:hover .persistentStateUpdate,
[data-test-id='community-package-row']:focus-within .persistentStateUpdate {
	display: none;
}

@media (hover: none) {
	.persistentStateUpdate {
		display: none;
	}
}

.skeleton {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	flex: 1;
}

.skeletonIcon {
	width: var(--spacing--xl);
	height: var(--spacing--xl);
	background-color: var(--color--foreground--tint-1);
	border-radius: var(--radius);
}

.hoverCta {
	opacity: 0;
	pointer-events: none;
	transition: opacity 0.15s ease;
}

[data-test-id='community-package-row']:hover .hoverCta,
[data-test-id='community-package-row']:focus-within .hoverCta {
	opacity: 1;
	pointer-events: auto;
}

@media (hover: none) {
	.hoverCta {
		opacity: 1;
		pointer-events: auto;
	}
}
</style>
