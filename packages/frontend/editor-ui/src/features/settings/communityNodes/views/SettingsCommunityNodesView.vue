<script setup lang="ts">
import { COMMUNITY_PACKAGE_INSTALL_MODAL_KEY } from '../communityNodes.constants';
import CommunityPackageCard from '../components/CommunityPackageCard.vue';
import CommunityNodesBrowser from '../components/CommunityNodesBrowser.vue';
import { useToast } from '@/app/composables/useToast';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import type { PublicInstalledPackage } from 'n8n-workflow';

import { useCommunityNodesStore } from '../communityNodes.store';
import { useUIStore } from '@/app/stores/ui.store';
import { onBeforeUnmount, ref, computed, onBeforeMount, onMounted } from 'vue';
import { useExternalHooks } from '@/app/composables/useExternalHooks';
import { useRouter } from 'vue-router';
import { usePushConnection } from '@/app/composables/usePushConnection';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

import { N8nActionBox, N8nButton, N8nHeading, N8nTabs } from '@n8n/design-system';
import type { TabOptions } from '@n8n/design-system';
import { fromInstalledPackage } from '../communityNodes.types';

type CommunityNodesTab = 'installed' | 'browse';

const loading = ref(false);
const loadingBrowse = ref(false);

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
const nodeTypesStore = useNodeTypesStore();

const selectedTab = ref<CommunityNodesTab>('installed');

const tabs = computed<Array<TabOptions<CommunityNodesTab>>>(() => [
	{
		label: i18n.baseText('settings.communityNodes.tabs.installed'),
		value: 'installed',
	},
	{
		label: i18n.baseText('settings.communityNodes.tabs.browse'),
		value: 'browse',
	},
]);

const hasInstalledPackages = computed(() => communityNodesStore.getInstalledPackages.length > 0);

const hasBrowsablePackages = computed(() => nodeTypesStore.vettedCommunityPackages.length > 0);

const showTabs = computed(() => settingsStore.isCommunityNodesFeatureEnabled);

const openInstallModal = () => {
	const telemetryPayload = {
		is_empty_state: !hasInstalledPackages.value,
	};
	telemetry.track('user clicked cnr install button', telemetryPayload);

	void externalHooks.run('settingsCommunityNodesView.openInstallModal', telemetryPayload);
	uiStore.openModal(COMMUNITY_PACKAGE_INSTALL_MODAL_KEY);
};

const switchToBrowse = () => {
	selectedTab.value = 'browse';
};

onBeforeMount(() => {
	pushConnection.initialize();
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

		if (installedPackages.length > 0) {
			selectedTab.value = 'installed';
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.communityNodes.fetchError.title'), {
			message: i18n.baseText('settings.communityNodes.fetchError.message'),
		});
	} finally {
		loading.value = false;
	}
	try {
		loadingBrowse.value = true;
		await Promise.all([
			communityNodesStore.fetchAvailableCommunityPackageCount(),
			nodeTypesStore.fetchCommunityNodePreviews(),
		]);
	} finally {
		loadingBrowse.value = false;
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
				v-if="settingsStore.isUnverifiedPackagesEnabled && selectedTab === 'installed' && !loading"
				:label="i18n.baseText('settings.communityNodes.installModal.installButton.label')"
				size="large"
				@click="openInstallModal"
			/>
		</div>

		<N8nTabs
			v-if="showTabs"
			:model-value="selectedTab"
			:options="tabs"
			@update:model-value="selectedTab = $event as CommunityNodesTab"
		/>

		<div v-if="selectedTab === 'installed'">
			<div v-if="loading" :class="$style.grid">
				<CommunityPackageCard v-for="n in 2" :key="'index-' + n" :loading="true" />
			</div>
			<div v-else-if="!hasInstalledPackages" :class="$style.actionBoxContainer">
				<N8nActionBox
					:heading="i18n.baseText('settings.communityNodes.installed.empty.title')"
					:description="i18n.baseText('settings.communityNodes.installed.empty.description')"
					:button-text="
						hasBrowsablePackages
							? i18n.baseText('settings.communityNodes.installed.empty.browseButton')
							: ''
					"
					@click:button="switchToBrowse"
				/>
			</div>
			<div v-else :class="$style.grid">
				<CommunityPackageCard
					v-for="communityPackage in communityNodesStore.getInstalledPackages"
					:key="communityPackage.packageName"
					:pkg="fromInstalledPackage(communityPackage, nodeTypesStore.getNodeType)"
				/>
			</div>
		</div>

		<div v-else-if="selectedTab === 'browse'">
			<CommunityNodesBrowser :loading="loadingBrowse" />
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

.actionBoxContainer {
	text-align: center;
}

.grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
	gap: var(--spacing--xs);
}
</style>
