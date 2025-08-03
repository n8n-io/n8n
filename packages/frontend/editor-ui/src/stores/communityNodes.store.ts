import * as communityNodesApi from '@n8n/rest-api-client/api/communityNodes';
import { defineStore } from 'pinia';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { PublicInstalledPackage } from 'n8n-workflow';
import type { CommunityPackageMap } from '@/Interface';
import { STORES } from '@n8n/stores';
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
			availablePackageCount.value = await communityNodesApi.getAvailableCommunityPackageCount();
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

	const installPackage = async (
		packageName: string,
		verify?: boolean,
		version?: string,
	): Promise<void> => {
		await communityNodesApi.installNewPackage(
			rootStore.restApiContext,
			packageName,
			verify,
			version,
		);
		await fetchInstalledPackages();
	};

	const uninstallPackage = async (packageName: string): Promise<void> => {
		await communityNodesApi.uninstallPackage(rootStore.restApiContext, packageName);
		removePackageByName(packageName);
	};

	const removePackageByName = (name: string): void => {
		const { [name]: removedPackage, ...remainingPackages } = installedPackages.value;
		installedPackages.value = remainingPackages;
	};

	const updatePackageObject = (newPackage: PublicInstalledPackage) => {
		installedPackages.value[newPackage.packageName] = newPackage;
	};

	const updatePackage = async (
		packageName: string,
		version?: string,
		checksum?: string,
	): Promise<void> => {
		const packageToUpdate = installedPackages.value[packageName];
		const updatedPackage = await communityNodesApi.updatePackage(
			rootStore.restApiContext,
			packageToUpdate.packageName,
			version,
			checksum,
		);
		updatePackageObject(updatedPackage);
	};

	const getInstalledPackage = async (packageName: string) => {
		if (!getInstalledPackages.value.length) {
			await fetchInstalledPackages();
		}

		return getInstalledPackages.value.find((p) => p.packageName === packageName);
	};

	return {
		installedPackages,
		getInstalledPackage,
		getInstalledPackages,
		availablePackageCount,
		fetchAvailableCommunityPackageCount,
		fetchInstalledPackages,
		installPackage,
		uninstallPackage,
		updatePackage,
		setInstalledPackages,
	};
});
