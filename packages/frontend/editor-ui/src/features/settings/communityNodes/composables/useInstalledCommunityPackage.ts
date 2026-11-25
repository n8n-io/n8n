import { useCommunityNodesStore } from '../communityNodes.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { isCommunityPackageName, type PublicInstalledPackage } from 'n8n-workflow';
import { isCommunityPackageUpdateAvailable } from '../communityNodes.utils';
import { computed, type MaybeRefOrGetter, onMounted, ref, watch, toValue } from 'vue';

export function useInstalledCommunityPackage(nodeTypeName?: MaybeRefOrGetter<string | undefined>) {
	const communityNodesStore = useCommunityNodesStore();
	const nodeTypesStore = useNodeTypesStore();
	const settingsStore = useSettingsStore();
	const usersStore = useUsersStore();

	const installedPackage = ref<PublicInstalledPackage>();

	const packageName = computed(() => toValue(nodeTypeName)?.split('.')[0] ?? '');
	const isCommunityNode = computed(() => {
		const nodeType = toValue(nodeTypeName);
		if (nodeType) {
			return isCommunityPackageName(nodeType);
		}
		return false;
	});

	const initInstalledPackage = async () => {
		if (!packageName.value || !isCommunityNode.value) return undefined;
		installedPackage.value = await communityNodesStore.getInstalledPackage(packageName.value);
		return installedPackage.value;
	};

	// Keep package data in sync when the store or selected node changes.
	watch(
		() => communityNodesStore.installedPackages[packageName.value],
		async (changedPackage) => {
			if (!packageName.value || !changedPackage) {
				installedPackage.value = undefined;
				return;
			}
			await initInstalledPackage();
		},
		{ deep: true },
	);

	onMounted(async () => {
		if (!packageName.value || !isCommunityNode.value) return;

		await initInstalledPackage();
	});

	/**
	 * True when the node is a community node and the user has rights to update the package.
	 * Update dialogs and button should not be shown when this is false.
	 */
	const canUpdatePackage = computed(() => {
		return isCommunityNode.value && usersStore.isAdminOrOwner;
	});

	const hasUpdateAvailable = computed(() => {
		const packageInfo = installedPackage.value;
		if (!packageInfo) return false;

		const communityNodeType = nodeTypesStore.communityNodeType(toValue(nodeTypeName) ?? '');

		return isCommunityPackageUpdateAvailable({
			installedVersion: packageInfo.installedVersion,
			updateAvailable: packageInfo.updateAvailable,
			latestVerifiedVersion: communityNodeType?.npmVersion,
			isCommunityNodesFeatureEnabled: settingsStore.isCommunityNodesFeatureEnabled,
			isUnverifiedPackagesEnabled: settingsStore.isUnverifiedPackagesEnabled,
			isManagedByEnv: settingsStore.settings.communityNodesManagedByEnv ?? false,
		});
	});

	return {
		installedPackage,
		canUpdatePackage,
		hasUpdateAvailable,
		isCommunityNode,
		initInstalledPackage,
	};
}
