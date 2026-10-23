<script lang="ts" setup>
import { useUIStore } from '@/app/stores/ui.store';
import type { IUser, PublicInstalledNode, PublicInstalledPackage } from 'n8n-workflow';
import { COMMUNITY_PACKAGE_MANAGE_ACTIONS } from '../communityNodes.constants';
import { NPM_PACKAGE_DOCS_BASE_URL } from '@/app/constants';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useSettingsStore } from '@n8n/stores/settings.store';
import type { UserAction } from '@n8n/design-system';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { getNodeTypeRestriction } from '@n8n/frontend-module-type-availability-policies';
import { computed, ref, watch } from 'vue';
import {
	findVettedCommunityNodeAttributes,
	isCommunityPackageUpdateAvailable,
} from '../communityNodes.utils';

import {
	N8nActionToggle,
	N8nBadge,
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
const isManagedByEnv = computed(
	(): boolean => settingsStore.settings.communityNodesManagedByEnv ?? false,
);
const hasUpdateAvailable = computed(() => {
	if (!props.communityPackage) return false;

	return isCommunityPackageUpdateAvailable({
		installedVersion: props.communityPackage.installedVersion,
		updateAvailable: props.communityPackage.updateAvailable,
		latestVerifiedVersion: latestVerifiedVersion.value,
		isCommunityNodesFeatureEnabled: settingsStore.isCommunityNodesFeatureEnabled,
		isUnverifiedPackagesEnabled: settingsStore.isUnverifiedPackagesEnabled,
		isManagedByEnv: isManagedByEnv.value,
	});
});

// Packages are installed instance-wide, so only a hard instance block counts. A delegated
// type (`optInAvailable`) is not blocked, because any project can allow it.
const blockedNodes = computed<PublicInstalledNode[]>(() => {
	if (!props.communityPackage) return [];

	return props.communityPackage.installedNodes.filter((node) => {
		const restriction = getNodeTypeRestriction(node.type);
		return restriction?.scope === 'instance' && !restriction.optInAvailable;
	});
});

const packageActions = computed<Array<UserAction<IUser>>>(() => {
	const actions: Array<UserAction<IUser>> = [
		{
			label: i18n.baseText('settings.communityNodes.viewDocsAction.label'),
			value: COMMUNITY_PACKAGE_MANAGE_ACTIONS.VIEW_DOCS,
			type: 'external-link',
		},
	];
	if (!isManagedByEnv.value) {
		actions.push({
			label: i18n.baseText('settings.communityNodes.uninstallAction.label'),
			value: COMMUNITY_PACKAGE_MANAGE_ACTIONS.UNINSTALL,
		});
	}
	return actions;
});

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
	() => props.communityPackage?.installedNodes.map((node) => node.type) ?? [],
	async (nodeTypes) => {
		const attributes = await findVettedCommunityNodeAttributes(
			nodeTypes,
			nodeTypesStore.getCommunityNodeAttributes,
		);
		latestVerifiedVersion.value = attributes?.npmVersion;
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
					<N8nTooltip v-if="blockedNodes.length > 0" placement="top">
						<template #content>
							<div>
								<N8nText tag="p" size="small" :bold="true">
									{{ i18n.baseText('settings.communityNodes.restricted.tooltip.heading') }}
								</N8nText>
								<ul :class="$style.blockedNodesList">
									<li v-for="node in blockedNodes" :key="node.type">{{ node.name }}</li>
								</ul>
							</div>
						</template>
						<N8nBadge
							variant="filled"
							leading-icon="lock"
							data-test-id="community-package-restricted-badge"
						>
							{{ i18n.baseText('settings.communityNodes.restricted.badge.label') }}
						</N8nBadge>
					</N8nTooltip>
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
				<N8nTooltip v-else-if="hasUpdateAvailable" placement="top">
					<template #content>
						<div>
							{{ i18n.baseText('settings.communityNodes.updateAvailable.tooltip') }}
						</div>
					</template>
					<N8nButton variant="outline" label="Update" @click="onUpdateClick" />
				</N8nTooltip>
				<N8nTooltip v-else placement="top">
					<template #content>
						<div>
							{{ i18n.baseText('settings.communityNodes.upToDate.tooltip') }}
						</div>
					</template>
					<N8nIcon icon="circle-check" color="text-light" size="large" />
				</N8nTooltip>
				<div v-if="packageActions.length > 0" :class="$style.cardActions">
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
	border: var(--border-width) var(--border-style) var(--color--info--tint-1);
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
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-basis: 100%;

	span {
		line-height: 1;
	}
}

.blockedNodesList {
	margin: var(--spacing--4xs) 0 0;
	padding-left: var(--spacing--sm);
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
