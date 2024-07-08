import * as communityNodesApi from '@/api/communityNodes';
import { getAvailableCommunityPackageCount } from '@/api/settings';
import { defineStore } from 'pinia';
import { useRootStore } from './root.store';
import type { PublicInstalledPackage } from 'n8n-workflow';
import type { CommunityPackageMap } from '@/Interface';
import { STORES } from '@/constants';
import { computed, ref } from 'vue';

const LOADER_DELAY = 300;

export const useCommunityNodesStore = defineStore(STORES.COMMUNITY_NODES, () => {
	const availablePackageCount = ref(-1);
	const installedPackages = ref<CommunityPackageMap>({});

	// Stores

	const rootStore = useRootStore();

	// Computed

	const getInstalledPackages = computed(() => {
		return Object.values(installedPackages.value).sort((a, b) =>
			a.packageName.localeCompare(b.packageName),
		);
	});

	// Methods

	const fetchAvailableCommunityPackageCount = async (): Promise<void> => {
		if (availablePackageCount.value === -1) {
			availablePackageCount.value = await getAvailableCommunityPackageCount();
		}
	};

	const setInstalledPackages = (packages: PublicInstalledPackage[]) => {
		installedPackages.value = packages.reduce(
			(packageMap: CommunityPackageMap, pack: PublicInstalledPackage) => {
				packageMap[pack.packageName] = pack;
				return packageMap;
			},
			{},
		);
	};

	const fetchInstalledPackages = async (): Promise<void> => {
		const installedPackages = await communityNodesApi.getInstalledCommunityNodes(
			rootStore.restApiContext,
		);
		setInstalledPackages(installedPackages);
		const timeout = installedPackages.length > 0 ? 0 : LOADER_DELAY;
		setTimeout(() => {
			return;
		}, timeout);
	};

	const installPackage = async (packageName: string): Promise<void> => {
		try {
			await communityNodesApi.installNewPackage(rootStore.restApiContext, packageName);
			await fetchInstalledPackages();
		} catch (error) {
			throw error;
		}
	};

	const uninstallPackage = async (packageName: string): Promise<void> => {
		try {
			await communityNodesApi.uninstallPackage(rootStore.restApiContext, packageName);
			removePackageByName(packageName);
		} catch (error) {
			throw error;
		}
	};

	const removePackageByName = (name: string): void => {
		const { [name]: removedPackage, ...remainingPackages } = installedPackages.value;
		installedPackages.value = remainingPackages;
	};

	const updatePackageObject = (newPackage: PublicInstalledPackage) => {
		installedPackages.value[newPackage.packageName] = newPackage;
	};

	const updatePackage = async (packageName: string): Promise<void> => {
		try {
			const packageToUpdate = installedPackages.value[packageName];
			const updatedPackage = await communityNodesApi.updatePackage(
				rootStore.restApiContext,
				packageToUpdate.packageName,
			);
			updatePackageObject(updatedPackage);
		} catch (error) {
			throw error;
		}
	};

	return {
		installedPackages,
		getInstalledPackages,
		availablePackageCount,
		fetchAvailableCommunityPackageCount,
		fetchInstalledPackages,
		installPackage,
		uninstallPackage,
		updatePackage,
	};
});
