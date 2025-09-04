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
	const installedPackages = ref<CommunityPackageMap>(new Map());

	// Stores

	const rootStore = useRootStore();

	// Computed

	const getInstalledPackages = computed(() => {
		return Array.from(installedPackages.value.values()).sort((a, b) =>
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
		installedPackages.value = new Map(packages.map((pack) => [pack.id, pack]));
	};

	const fetchInstalledPackages = async (): Promise<void> => {
		const newInstalledPackages = await communityNodesApi.getInstalledCommunityNodes(
			rootStore.restApiContext,
		);
		setInstalledPackages(newInstalledPackages);

		const timeout = newInstalledPackages.length > 0 ? 0 : LOADER_DELAY;

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

	const removePackage = (id: string): void => {
		installedPackages.value.delete(id);
	};

	const uninstallPackage = async (id: string): Promise<void> => {
		const pack = installedPackages.value.get(id);
		if (!pack) return;

		await communityNodesApi.uninstallPackage(
			rootStore.restApiContext,
			pack.packageName,
			pack.installedVersion,
		);
		removePackage(id);
	};

	const updatePackageObject = (newPackage: PublicInstalledPackage) => {
		installedPackages.value.set(newPackage.id, newPackage);
	};

	const updatePackage = async (id: string, version: string, checksum?: string): Promise<void> => {
		const packageToUpdate = installedPackages.value.get(id);
		if (!packageToUpdate) return;

		const updatedPackage = await communityNodesApi.updatePackage(
			rootStore.restApiContext,
			packageToUpdate.packageName,
			version,
			checksum,
		);
		updatePackageObject(updatedPackage);
	};

	const getInstalledPackage = async (id: string) => {
		if (!getInstalledPackages.value.length) {
			await fetchInstalledPackages();
		}

		return installedPackages.value.get(id);
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
