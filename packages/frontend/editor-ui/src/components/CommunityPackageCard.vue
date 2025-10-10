<script lang="ts" setup>
import { useUIStore } from '@/stores/ui.store';
import type { IUser, PublicInstalledPackage } from 'n8n-workflow';
import { NPM_PACKAGE_DOCS_BASE_URL, COMMUNITY_PACKAGE_MANAGE_ACTIONS } from '@/constants';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/composables/useTelemetry';
import { useSettingsStore } from '@/stores/settings.store';
import type { UserAction } from '@n8n/design-system';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { computed, ref, watch } from 'vue';
import semver from 'semver';

import {
	N8nActionToggle,
	N8nButton,
	N8nIcon,
	N8nLoading,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
interface Props {
	communityPackage?: PublicInstalledPackage | null;
	loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	communityPackage: null,
	loading: false,
});

const { openCommunityPackageUpdateConfirmModal, openCommunityPackageUninstallConfirmModal } =
	useUIStore();
const i18n = useI18n();
const telemetry = useTelemetry();

const settingsStore = useSettingsStore();
const nodeTypesStore = useNodeTypesStore();

const latestVerifiedVersion = ref<string>();
const currVersion = computed(() => props.communityPackage?.installedVersion || '');

const hasUnverifiedPackagesUpdate = computed(() => {
	return settingsStore.isUnverifiedPackagesEnabled && props.communityPackage?.updateAvailable;
});

const hasVerifiedPackageUpdate = computed(() => {
	const canUpdate =
		latestVerifiedVersion.value && semver.gt(latestVerifiedVersion.value || '', currVersion.value);

	return settingsStore.isCommunityNodesFeatureEnabled && canUpdate;
});

const packageActions: Array<UserAction<IUser>> = [
	{
		label: i18n.baseText('settings.communityNodes.viewDocsAction.label'),
		value: COMMUNITY_PACKAGE_MANAGE_ACTIONS.VIEW_DOCS,
		type: 'external-link',
	},
	{
		label: i18n.baseText('settings.communityNodes.uninstallAction.label'),
		value: COMMUNITY_PACKAGE_MANAGE_ACTIONS.UNINSTALL,
	},
];

async function onAction(value: string) {
	if (!props.communityPackage) return;
	switch (value) {
		case COMMUNITY_PACKAGE_MANAGE_ACTIONS.VIEW_DOCS:
			telemetry.track('user clicked to browse the cnr package documentation', {
				package_name: props.communityPackage.packageName,
				package_version: props.communityPackage.installedVersion,
			});
			window.open(`${NPM_PACKAGE_DOCS_BASE_URL}${props.communityPackage.packageName}`, '_blank');
			break;
		case COMMUNITY_PACKAGE_MANAGE_ACTIONS.UNINSTALL:
			openCommunityPackageUninstallConfirmModal(props.communityPackage.packageName);
			break;
		default:
			break;
	}
}

function onUpdateClick() {
	if (!props.communityPackage) return;
	openCommunityPackageUpdateConfirmModal(props.communityPackage.packageName, 'instance settings');
}

watch(
	() => props.communityPackage?.packageName,
	async (packageName) => {
		if (packageName) {
			await nodeTypesStore.loadNodeTypesIfNotLoaded();
			const nodeType = nodeTypesStore.visibleNodeTypes.find((node) =>
				node.name.includes(packageName),
			);

			const attributes = await nodeTypesStore.getCommunityNodeAttributes(nodeType?.name || '');
			if (attributes?.npmVersion) {
				latestVerifiedVersion.value = attributes.npmVersion;
			}
		}
	},
	{ immediate: true },
);
</script>

<template>
	<div :class="$style.cardContainer" data-test-id="community-package-card">
		<div v-if="loading" :class="$style.cardSkeleton">
			<N8nLoading :class="$style.loader" variant="p" :rows="1" />
			<N8nLoading :class="$style.loader" variant="p" :rows="1" />
		</div>
		<div v-else-if="communityPackage" :class="$style.packageCard">
			<div :class="$style.cardInfoContainer">
				<div :class="$style.cardTitle">
					<N8nText :bold="true" size="large">{{ communityPackage.packageName }}</N8nText>
				</div>
				<div :class="$style.cardSubtitle">
					<N8nText :bold="true" size="small" color="text-light">
						{{
							i18n.baseText('settings.communityNodes.packageNodes.label', {
								adjustToNumber: communityPackage.installedNodes.length,
							})
						}}:&nbsp;
					</N8nText>
					<N8nText size="small" color="text-light">
						<span v-for="(node, index) in communityPackage.installedNodes" :key="node.name">
							{{ node.name
							}}<span v-if="index != communityPackage.installedNodes.length - 1">,</span>
						</span>
					</N8nText>
				</div>
			</div>
			<div :class="$style.cardControlsContainer">
				<N8nText :bold="true" size="large" color="text-light">
					v{{ communityPackage.installedVersion }}
				</N8nText>
				<N8nTooltip v-if="communityPackage.failedLoading === true" placement="top">
					<template #content>
						<div>
							{{ i18n.baseText('settings.communityNodes.failedToLoad.tooltip') }}
						</div>
					</template>
					<N8nIcon icon="triangle-alert" color="danger" size="large" />
				</N8nTooltip>
				<N8nTooltip
					v-else-if="hasUnverifiedPackagesUpdate || hasVerifiedPackageUpdate"
					placement="top"
				>
					<template #content>
						<div>
							{{ i18n.baseText('settings.communityNodes.updateAvailable.tooltip') }}
						</div>
					</template>
					<N8nButton outline label="Update" @click="onUpdateClick" />
				</N8nTooltip>
				<N8nTooltip v-else placement="top">
					<template #content>
						<div>
							{{ i18n.baseText('settings.communityNodes.upToDate.tooltip') }}
						</div>
					</template>
					<N8nIcon icon="circle-check" color="text-light" size="large" />
				</N8nTooltip>
				<div :class="$style.cardActions">
					<N8nActionToggle :actions="packageActions" @action="onAction"></N8nActionToggle>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.cardContainer {
	display: flex;
	padding: var(--spacing--sm);
	border: var(--border-width) var(--border-style) var(--color-info-tint-1);
	border-radius: var(--radius--lg);
	background-color: var(--color--background--light-3);
}

.packageCard,
.cardSkeleton {
	display: flex;
	flex-basis: 100%;
	justify-content: space-between;
}

.packageCard {
	align-items: center;
}

.cardSkeleton {
	flex-direction: column;
}

.loader {
	width: 50%;
	transform: scaleY(-1);

	&:last-child {
		width: 70%;

		div {
			margin: 0;
		}
	}
}

.cardInfoContainer {
	display: flex;
	flex-wrap: wrap;
}

.cardTitle {
	flex-basis: 100%;

	span {
		line-height: 1;
	}
}

.cardSubtitle {
	margin-top: 2px;
	padding-right: var(--spacing--md);
}

.cardControlsContainer {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.cardActions {
	padding-left: var(--spacing--3xs);
}
</style>
