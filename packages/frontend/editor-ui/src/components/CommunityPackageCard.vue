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
	openCommunityPackageUpdateConfirmModal(props.communityPackage.packageName);
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
			<n8n-loading :class="$style.loader" variant="p" :rows="1" />
			<n8n-loading :class="$style.loader" variant="p" :rows="1" />
		</div>
		<div v-else-if="communityPackage" :class="$style.packageCard">
			<div :class="$style.cardInfoContainer">
				<div :class="$style.cardTitle">
					<n8n-text :bold="true" size="large">{{ communityPackage.packageName }}</n8n-text>
				</div>
				<div :class="$style.cardSubtitle">
					<n8n-text :bold="true" size="small" color="text-light">
						{{
							i18n.baseText('settings.communityNodes.packageNodes.label', {
								adjustToNumber: communityPackage.installedNodes.length,
							})
						}}:&nbsp;
					</n8n-text>
					<n8n-text size="small" color="text-light">
						<span v-for="(node, index) in communityPackage.installedNodes" :key="node.name">
							{{ node.name
							}}<span v-if="index != communityPackage.installedNodes.length - 1">,</span>
						</span>
					</n8n-text>
				</div>
			</div>
			<div :class="$style.cardControlsContainer">
				<n8n-text :bold="true" size="large" color="text-light">
					v{{ communityPackage.installedVersion }}
				</n8n-text>
				<n8n-tooltip v-if="communityPackage.failedLoading === true" placement="top">
					<template #content>
						<div>
							{{ i18n.baseText('settings.communityNodes.failedToLoad.tooltip') }}
						</div>
					</template>
					<n8n-icon icon="triangle-alert" color="danger" size="large" />
				</n8n-tooltip>
				<n8n-tooltip
					v-else-if="hasUnverifiedPackagesUpdate || hasVerifiedPackageUpdate"
					placement="top"
				>
					<template #content>
						<div>
							{{ i18n.baseText('settings.communityNodes.updateAvailable.tooltip') }}
						</div>
					</template>
					<n8n-button outline label="Update" @click="onUpdateClick" />
				</n8n-tooltip>
				<n8n-tooltip v-else placement="top">
					<template #content>
						<div>
							{{ i18n.baseText('settings.communityNodes.upToDate.tooltip') }}
						</div>
					</template>
					<n8n-icon icon="circle-check" color="text-light" size="large" />
				</n8n-tooltip>
				<div :class="$style.cardActions">
					<n8n-action-toggle :actions="packageActions" @action="onAction"></n8n-action-toggle>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.cardContainer {
	display: flex;
	padding: var(--spacing-s);
	border: var(--border-width-base) var(--border-style-base) var(--color-info-tint-1);
	border-radius: var(--border-radius-large);
	background-color: var(--color-background-xlight);
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
	padding-right: var(--spacing-m);
}

.cardControlsContainer {
	display: flex;
	align-items: center;
	gap: var(--spacing-3xs);
}

.cardActions {
	padding-left: var(--spacing-3xs);
}
</style>
