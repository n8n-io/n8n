import * as communityNodesApi from '@/api/communityNodes';
import { getAvailableCommunityPackageCount } from '@/api/settings';
import { defineStore } from 'pinia';
import { useRootStore } from './n8nRoot.store';
import type { PublicInstalledPackage } from 'n8n-workflow';
import type { CommunityNodesState, CommunityPackageMap } from '@/Interface';
import { STORES } from '@/constants';
import { computed, ref } from 'vue';

const LOADER_DELAY = 300;

export const useCommunityNodesStore = defineStore(STORES.COMMUNITY_NODES, () => {
	const state = ref<CommunityNodesState>({ availablePackageCount: -1, installedPackages: {} });

	// ---------------------------------------------------------------------------
	// #region Computed
	// ---------------------------------------------------------------------------

	const getInstalledPackages = computed(() => {
		return Object.values(state.value.installedPackages).sort((a, b) =>
			a.packageName.localeCompare(b.packageName),
		);
	});

	// #endregion

	// ---------------------------------------------------------------------------
	// #region Methods
	// ---------------------------------------------------------------------------

	const fetchAvailableCommunityPackageCount = async (): Promise<void> => {
		if (state.value.availablePackageCount === -1) {
			state.value.availablePackageCount = await getAvailableCommunityPackageCount();
		}
	};

	const setInstalledPackages = (packages: PublicInstalledPackage[]) => {
		state.value.installedPackages = packages.reduce(
			(packageMap: CommunityPackageMap, pack: PublicInstalledPackage) => {
				packageMap[pack.packageName] = pack;
				return packageMap;
			},
			{},
		);
	};

	const fetchInstalledPackages = async (): Promise<void> => {
		const rootStore = useRootStore();
		const installedPackages = await communityNodesApi.getInstalledCommunityNodes(
			rootStore.getRestApiContext,
		);
		setInstalledPackages(installedPackages);
		const timeout = installedPackages.length > 0 ? 0 : LOADER_DELAY;
		setTimeout(() => {
			return;
		}, timeout);
	};

	const installPackage = async (packageName: string): Promise<void> => {
		try {
			const rootStore = useRootStore();
			await communityNodesApi.installNewPackage(rootStore.getRestApiContext, packageName);
			await fetchInstalledPackages();
		} catch (error) {
			throw error;
		}
	};

	const uninstallPackage = async (packageName: string): Promise<void> => {
		try {
			const rootStore = useRootStore();
			await communityNodesApi.uninstallPackage(rootStore.getRestApiContext, packageName);
			removePackageByName(packageName);
		} catch (error) {
			throw error;
		}
	};

	const removePackageByName = (name: string): void => {
		const { [name]: removedPackage, ...remainingPackages } = state.value.installedPackages;
		state.value.installedPackages = remainingPackages;
	};

	const updatePackageObject = (newPackage: PublicInstalledPackage) => {
		state.value.installedPackages[newPackage.packageName] = newPackage;
	};

	const updatePackage = async (packageName: string): Promise<void> => {
		try {
			const rootStore = useRootStore();
			const packageToUpdate: PublicInstalledPackage = getInstalledPackageByName.value(packageName);
			const updatedPackage: PublicInstalledPackage = await communityNodesApi.updatePackage(
				rootStore.getRestApiContext,
				packageToUpdate.packageName,
			);
			updatePackageObject(updatedPackage);
		} catch (error) {
			throw error;
		}
	};

	// #endregion

	const getInstalledPackageByName = computed(() => {
		return (name: string): PublicInstalledPackage => state.value.installedPackages[name];
	});

	const getAvailablePackageCount = computed(() => state.value.availablePackageCount);

	return {
		getInstalledPackageByName,
		getInstalledPackages,
		getAvailablePackageCount,
		fetchAvailableCommunityPackageCount,
		fetchInstalledPackages,
		installPackage,
		uninstallPackage,
		updatePackage,
	};
});
