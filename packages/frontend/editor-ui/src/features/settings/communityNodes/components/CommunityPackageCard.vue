<script lang="ts" setup>
import { useUIStore } from '@/app/stores/ui.store';
import type { IUser, PublicInstalledPackage } from 'n8n-workflow';
import { COMMUNITY_PACKAGE_MANAGE_ACTIONS } from '../communityNodes.constants';
import { NPM_PACKAGE_DOCS_BASE_URL } from '@/app/constants';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@/app/stores/settings.store';
import type { UserAction } from '@n8n/design-system';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { computed, ref, watch } from 'vue';
import semver from 'semver';

import {
	N8nActionToggle,
	N8nButton,
	N8nExternalLink,
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

const docsUrl = computed(
	() => `${NPM_PACKAGE_DOCS_BASE_URL}${props.communityPackage?.packageName ?? ''}`,
);

const firstNodeType = computed(() => {
	if (!props.communityPackage?.installedNodes.length) return null;
	const firstNode = props.communityPackage.installedNodes[0];
	return nodeTypesStore.getNodeType(firstNode.type) ?? null;
});

const packageActions: Array<UserAction<IUser>> = [
	{
		label: i18n.baseText('settings.communityNodes.uninstallAction.label'),
		value: COMMUNITY_PACKAGE_MANAGE_ACTIONS.UNINSTALL,
	},
];

async function onAction(value: string) {
	if (!props.communityPackage) return;
	switch (value) {
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
	<div :class="$style.card" data-test-id="community-package-card">
		<div v-if="loading" :class="$style.skeleton">
			<N8nLoading variant="p" :rows="1" />
			<N8nLoading variant="p" :rows="1" />
		</div>
		<template v-else-if="communityPackage">
			<div :class="$style.cardTop">
				<NodeIcon
					v-if="firstNodeType"
					:class="$style.nodeIcon"
					:node-type="firstNodeType"
					:show-tooltip="false"
				/>
				<div :class="$style.nameBlock">
					<div :class="$style.titleRow">
						<N8nExternalLink :href="docsUrl" :class="$style.packageName">
							<N8nText :bold="true" size="medium">{{
								communityPackage.packageName
							}}</N8nText>
						</N8nExternalLink>
					</div>
					<N8nText v-if="communityPackage.authorName" size="small" color="text-light">
						{{
							i18n.baseText('settings.communityNodes.browse.card.by', {
								interpolate: { author: communityPackage.authorName },
							})
						}}
					</N8nText>
				</div>
			</div>

			<div :class="$style.cardBottom">
				<div :class="$style.stats">
					<div :class="$style.stat">
						<N8nIcon :class="$style.statIcon" icon="box" />
						<N8nText color="text-light" size="xsmall" :bold="true">
							{{
								i18n.baseText('settings.communityNodes.packageNodes.label', {
									adjustToNumber: communityPackage.installedNodes.length,
								})
							}}
						</N8nText>
					</div>
					<div :class="$style.stat">
						<N8nText color="text-light" size="xsmall" :bold="true">
							v{{ communityPackage.installedVersion }}
						</N8nText>
					</div>
				</div>
				<div :class="$style.actions">
					<N8nTooltip v-if="communityPackage.failedLoading === true" placement="top">
						<template #content>
							{{ i18n.baseText('settings.communityNodes.failedToLoad.tooltip') }}
						</template>
						<N8nIcon icon="triangle-alert" color="danger" size="large" />
					</N8nTooltip>
					<N8nTooltip
						v-else-if="hasUnverifiedPackagesUpdate || hasVerifiedPackageUpdate"
						placement="top"
					>
						<template #content>
							{{ i18n.baseText('settings.communityNodes.updateAvailable.tooltip') }}
						</template>
						<N8nButton variant="outline" label="Update" size="small" @click="onUpdateClick" />
					</N8nTooltip>
					<N8nTooltip v-else placement="top">
						<template #content>
							{{ i18n.baseText('settings.communityNodes.upToDate.tooltip') }}
						</template>
						<N8nIcon icon="circle-check" color="text-light" />
					</N8nTooltip>
					<N8nActionToggle :actions="packageActions" @action="onAction" />
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

.cardBottom {
	display: flex;
	align-items: center;
	justify-content: space-between;
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
}
</style>
