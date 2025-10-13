<script setup lang="ts">
import {
	COMMUNITY_PACKAGE_INSTALL_MODAL_KEY,
	COMMUNITY_NODES_INSTALLATION_DOCS_URL,
} from '@/constants';
import CommunityPackageCard from '@/components/CommunityPackageCard.vue';
import { useToast } from '@/composables/useToast';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import type { PublicInstalledPackage } from 'n8n-workflow';

import { useCommunityNodesStore } from '@/stores/communityNodes.store';
import { useUIStore } from '@/stores/ui.store';
import { onBeforeUnmount, ref, computed, onBeforeMount, onMounted } from 'vue';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useRouter } from 'vue-router';
import { usePushConnection } from '@/composables/usePushConnection';
import { usePushConnectionStore } from '@/stores/pushConnection.store';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/composables/useTelemetry';
import { useSettingsStore } from '@/stores/settings.store';

import { N8nActionBox, N8nButton, N8nHeading } from '@n8n/design-system';
const PACKAGE_COUNT_THRESHOLD = 31;

const loading = ref(false);

const router = useRouter();
const pushConnection = usePushConnection({ router });
const pushStore = usePushConnectionStore();
const externalHooks = useExternalHooks();
const i18n = useI18n();
const telemetry = useTelemetry();
const toast = useToast();
const documentTitle = useDocumentTitle();

const communityNodesStore = useCommunityNodesStore();
const uiStore = useUIStore();
const settingsStore = useSettingsStore();

const getEmptyStateTitle = computed(() => {
	if (!settingsStore.isUnverifiedPackagesEnabled) {
		return i18n.baseText('settings.communityNodes.empty.verified.only.title');
	}

	return i18n.baseText('settings.communityNodes.empty.title');
});

const getEmptyStateDescription = computed(() => {
	if (!settingsStore.isUnverifiedPackagesEnabled) {
		return i18n.baseText('settings.communityNodes.empty.verified.only.description');
	}

	const packageCount = communityNodesStore.availablePackageCount;

	return packageCount < PACKAGE_COUNT_THRESHOLD
		? i18n.baseText('settings.communityNodes.empty.description.no-packages', {
				interpolate: {
					docURL: COMMUNITY_NODES_INSTALLATION_DOCS_URL,
				},
			})
		: i18n.baseText('settings.communityNodes.empty.description', {
				interpolate: {
					docURL: COMMUNITY_NODES_INSTALLATION_DOCS_URL,
					count: (Math.floor(packageCount / 10) * 10).toString(),
				},
			});
});

const getEmptyStateButtonText = computed(() => {
	if (!settingsStore.isUnverifiedPackagesEnabled) return '';
	return i18n.baseText('settings.communityNodes.empty.installPackageLabel');
});

const actionBoxConfig = computed(() => {
	return {
		calloutText: '',
		calloutTheme: undefined,
		hideButton: false,
	};
});

const onClickEmptyStateButton = () => {
	openInstallModal();
};

const openInstallModal = () => {
	const telemetryPayload = {
		is_empty_state: communityNodesStore.getInstalledPackages.length === 0,
	};
	telemetry.track('user clicked cnr install button', telemetryPayload);

	void externalHooks.run('settingsCommunityNodesView.openInstallModal', telemetryPayload);
	uiStore.openModal(COMMUNITY_PACKAGE_INSTALL_MODAL_KEY);
};

onBeforeMount(() => {
	pushConnection.initialize();
	// The push connection is needed here to receive `reloadNodeType` and `removeNodeType` events when community nodes are installed, updated, or removed.
	pushStore.pushConnect();
});

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.communityNodes'));
	try {
		loading.value = true;
		await communityNodesStore.fetchInstalledPackages();

		const installedPackages: PublicInstalledPackage[] = communityNodesStore.getInstalledPackages;
		const packagesToUpdate: PublicInstalledPackage[] = installedPackages.filter(
			(p) => p.updateAvailable,
		);
		telemetry.track('user viewed cnr settings page', {
			num_of_packages_installed: installedPackages.length,
			installed_packages: installedPackages.map((p) => {
				return {
					package_name: p.packageName,
					package_version: p.installedVersion,
					package_nodes: p.installedNodes.map((node) => `${node.name}-v${node.latestVersion}`),
					is_update_available: p.updateAvailable !== undefined,
				};
			}),
			packages_to_update: packagesToUpdate.map((p) => {
				return {
					package_name: p.packageName,
					package_version_current: p.installedVersion,
					package_version_available: p.updateAvailable,
				};
			}),
			number_of_updates_available: packagesToUpdate.length,
		});
	} catch (error) {
		toast.showError(
			error,
			i18n.baseText('settings.communityNodes.fetchError.title'),
			i18n.baseText('settings.communityNodes.fetchError.message'),
		);
	} finally {
		loading.value = false;
	}
	try {
		await communityNodesStore.fetchAvailableCommunityPackageCount();
	} finally {
		loading.value = false;
	}
});

onBeforeUnmount(() => {
	pushStore.pushDisconnect();
	pushConnection.terminate();
});
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.headingContainer">
			<N8nHeading size="2xlarge">{{ i18n.baseText('settings.communityNodes') }}</N8nHeading>
			<N8nButton
				v-if="
					settingsStore.isUnverifiedPackagesEnabled &&
					communityNodesStore.getInstalledPackages.length > 0 &&
					!loading
				"
				:label="i18n.baseText('settings.communityNodes.installModal.installButton.label')"
				size="large"
				@click="openInstallModal"
			/>
		</div>
		<div v-if="loading" :class="$style.cardsContainer">
			<CommunityPackageCard
				v-for="n in 2"
				:key="'index-' + n"
				:loading="true"
			></CommunityPackageCard>
		</div>
		<div
			v-else-if="communityNodesStore.getInstalledPackages.length === 0"
			:class="$style.actionBoxContainer"
		>
			<N8nActionBox
				:heading="getEmptyStateTitle"
				:description="getEmptyStateDescription"
				:button-text="getEmptyStateButtonText"
				:button-disabled="!settingsStore.isUnverifiedPackagesEnabled"
				:callout-text="actionBoxConfig.calloutText"
				:callout-theme="actionBoxConfig.calloutTheme"
				@click:button="onClickEmptyStateButton"
			/>
		</div>
		<div v-else :class="$style.cardsContainer">
			<CommunityPackageCard
				v-for="communityPackage in communityNodesStore.getInstalledPackages"
				:key="communityPackage.packageName"
				:community-package="communityPackage"
			></CommunityPackageCard>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	height: 100%;
	padding-right: var(--spacing--2xs);
	> * {
		margin-bottom: var(--spacing--2xl);
	}
}

.headingContainer {
	display: flex;
	justify-content: space-between;
}

.loadingContainer {
	display: flex;
	gap: var(--spacing--xs);
}

.actionBoxContainer {
	text-align: center;
}

.cardsContainer {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}
</style>
