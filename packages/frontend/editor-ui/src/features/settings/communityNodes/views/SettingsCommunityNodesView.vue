<script setup lang="ts">
import { computed, onBeforeMount, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import {
	N8nActionBox,
	N8nButton,
	N8nCheckbox,
	N8nHeading,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import type { BaseFilters, Resource } from '@/Interface';
import type { PublicInstalledPackage } from 'n8n-workflow';
import ResourcesListLayout from '@/app/components/layouts/ResourcesListLayout.vue';
import CommunityPackageRow from '../components/CommunityPackageRow.vue';
import {
	fromBrowsePackage,
	fromInstalledPackage,
	mergeVettedAndInstalled,
	type CommunityPackageRowData,
} from '../communityNodes.types';
import { COMMUNITY_PACKAGE_INSTALL_MODAL_KEY } from '../communityNodes.constants';
import { useCommunityNodesStore } from '../communityNodes.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUIStore } from '@/app/stores/ui.store';
import { usePushConnection } from '@/app/composables/usePushConnection';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { useExternalHooks } from '@/app/composables/useExternalHooks';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';

type Filters = BaseFilters & {
	type?: 'all' | 'official' | 'community';
	installedOnly?: boolean;
};

const isCommunityPackageRow = (resource: Resource): resource is CommunityPackageRowData =>
	resource.resourceType === 'communityPackage';

const router = useRouter();
const i18n = useI18n();
const telemetry = useTelemetry();
const toast = useToast();
const documentTitle = useDocumentTitle();
const externalHooks = useExternalHooks();
const pushConnection = usePushConnection({ router });
const pushStore = usePushConnectionStore();
const communityNodesStore = useCommunityNodesStore();
const nodeTypesStore = useNodeTypesStore();
const settingsStore = useSettingsStore();
const uiStore = useUIStore();

const loading = ref(false);

const filters = ref<Filters>({ search: '', homeProject: '' });

const subheaderText = computed(() =>
	settingsStore.isUnverifiedPackagesEnabled
		? i18n.baseText('settings.communityNodes.subheader.withNpm')
		: i18n.baseText('settings.communityNodes.subheader.verifiedOnly'),
);

const unifiedPackages = computed<CommunityPackageRowData[]>(() => {
	const installedByName = new Map<string, PublicInstalledPackage>(
		communityNodesStore.getInstalledPackages.map((p) => [p.packageName, p]),
	);
	const vetted = nodeTypesStore.vettedCommunityPackages;

	const rows: CommunityPackageRowData[] = vetted.map((pkg) => {
		const installed = installedByName.get(pkg.packageName);
		return installed
			? mergeVettedAndInstalled(pkg, installed, nodeTypesStore.getNodeType)
			: fromBrowsePackage(pkg);
	});

	for (const installed of communityNodesStore.getInstalledPackages) {
		if (!vetted.some((v) => v.packageName === installed.packageName)) {
			rows.push(fromInstalledPackage(installed, nodeTypesStore.getNodeType));
		}
	}

	return rows;
});

const onFilter = (resource: Resource, applied: BaseFilters, matches: boolean): boolean => {
	if (!isCommunityPackageRow(resource)) return false;

	if (applied.type === 'official') matches = matches && resource.isOfficialNode;
	if (applied.type === 'community') matches = matches && !resource.isOfficialNode;
	if (applied.installedOnly) matches = matches && resource.isInstalled;

	if (applied.search) {
		const q = applied.search.toLowerCase().trim();
		matches =
			matches &&
			(resource.packageName.toLowerCase().includes(q) ||
				resource.authorName.toLowerCase().includes(q) ||
				resource.description.toLowerCase().includes(q));
	}

	return matches;
};

const openInstallModal = () => {
	const telemetryPayload = {
		is_empty_state: communityNodesStore.getInstalledPackages.length === 0,
	};
	telemetry.track('user clicked cnr install button', telemetryPayload);
	void externalHooks.run('settingsCommunityNodesView.openInstallModal', telemetryPayload);
	uiStore.openModal(COMMUNITY_PACKAGE_INSTALL_MODAL_KEY);
};

const initialize = async () => {
	loading.value = true;
	try {
		await Promise.all([
			communityNodesStore.fetchInstalledPackages(),
			communityNodesStore.fetchAvailableCommunityPackageCount(),
			nodeTypesStore.fetchCommunityNodePreviews(),
		]);

		const installedPackages = communityNodesStore.getInstalledPackages;
		const packagesToUpdate = installedPackages.filter((p) => p.updateAvailable);
		telemetry.track('user viewed cnr settings page', {
			num_of_packages_installed: installedPackages.length,
			installed_packages: installedPackages.map((p) => ({
				package_name: p.packageName,
				package_version: p.installedVersion,
				package_nodes: p.installedNodes.map((n) => `${n.name}-v${n.latestVersion}`),
				is_update_available: p.updateAvailable !== undefined,
			})),
			packages_to_update: packagesToUpdate.map((p) => ({
				package_name: p.packageName,
				package_version_current: p.installedVersion,
				package_version_available: p.updateAvailable,
			})),
			number_of_updates_available: packagesToUpdate.length,
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.communityNodes.fetchError.title'), {
			message: i18n.baseText('settings.communityNodes.fetchError.message'),
		});
	} finally {
		loading.value = false;
	}
};

onBeforeMount(() => {
	pushConnection.initialize();
	pushStore.pushConnect();
});

onMounted(() => {
	documentTitle.set(i18n.baseText('settings.communityNodes'));
});

onBeforeUnmount(() => {
	pushStore.pushDisconnect();
	pushConnection.terminate();
});
</script>

<template>
	<ResourcesListLayout
		v-model:filters="filters"
		resource-key="communityNodes"
		:resources="unifiedPackages"
		:initialize="initialize"
		:additional-filters-handler="onFilter"
		:type-props="{ itemSize: 64 }"
		:loading="loading"
		:disabled="false"
	>
		<template #header>
			<div :class="$style.headingRow">
				<N8nHeading size="2xlarge">
					{{ i18n.baseText('settings.communityNodes') }}
				</N8nHeading>
				<N8nButton
					v-if="settingsStore.isUnverifiedPackagesEnabled"
					:label="i18n.baseText('settings.communityNodes.installFromNpm')"
					size="large"
					@click="openInstallModal"
				/>
			</div>
			<N8nText size="small" color="text-light">{{ subheaderText }}</N8nText>
		</template>

		<template #default="{ data }">
			<CommunityPackageRow :row="data" />
		</template>

		<template #filters="{ setKeyValue }">
			<div class="mb-s">
				<N8nInputLabel
					:label="i18n.baseText('settings.communityNodes.filters.type')"
					:bold="false"
					size="small"
					color="text-base"
					class="mb-3xs"
				/>
				<N8nSelect
					:model-value="filters.type ?? 'all'"
					size="medium"
					@update:model-value="setKeyValue('type', $event)"
				>
					<N8nOption
						value="all"
						:label="i18n.baseText('settings.communityNodes.filter.type.all')"
					/>
					<N8nOption
						value="official"
						:label="i18n.baseText('settings.communityNodes.filter.type.official')"
					/>
					<N8nOption
						value="community"
						:label="i18n.baseText('settings.communityNodes.filter.type.community')"
					/>
				</N8nSelect>
			</div>
			<div class="mb-s">
				<N8nCheckbox
					:label="i18n.baseText('settings.communityNodes.filters.installedOnly')"
					:model-value="filters.installedOnly ?? false"
					@update:model-value="setKeyValue('installedOnly', $event)"
				/>
			</div>
		</template>

		<template #empty>
			<N8nActionBox
				:heading="i18n.baseText('settings.communityNodes.empty.title')"
				:description="i18n.baseText('settings.communityNodes.empty.description')"
			/>
		</template>
	</ResourcesListLayout>
</template>

<style lang="scss" module>
.headingRow {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: var(--spacing--2xs);
}
</style>
