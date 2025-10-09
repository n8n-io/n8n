import { useCommunityNodesStore } from '@/stores/communityNodes.store';
import { useUsersStore } from '@/stores/users.store';
import { isCommunityPackageName } from 'n8n-workflow';
import {
	type ExtendedPublicInstalledPackage,
	fetchInstalledPackageInfo,
} from '@/utils/communityNodeUtils';
import { computed, type MaybeRefOrGetter, onMounted, ref, watch, toValue } from 'vue';

export function useInstalledCommunityPackage(nodeTypeName?: MaybeRefOrGetter<string | undefined>) {
	const communityNodesStore = useCommunityNodesStore();
	const usersStore = useUsersStore();

	const installedPackage = ref<ExtendedPublicInstalledPackage | undefined>(undefined);

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
		installedPackage.value = await fetchInstalledPackageInfo(packageName.value);
		return installedPackage.value;
	};

	// update when installed package changes if it's defined
	watch(
		() => communityNodesStore.installedPackages[packageName.value],
		async (changedPackage) => {
			if (!packageName.value || !changedPackage) return;
			await initInstalledPackage();
		},
		{ deep: true },
	);

	onMounted(async () => {
		if (!packageName.value || !isCommunityNode.value) return;

		await initInstalledPackage();
	});

	/**
	 * True when the node is a community node, the user has rights to update the package and the package is not an unverified update.
	 * Update dialogs and button should not be shown when this is false.
	 */
	const isUpdateCheckAvailable = computed(() => {
		return (
			isCommunityNode.value &&
			usersStore.isInstanceOwner &&
			!installedPackage.value?.unverifiedUpdate
		);
	});

	return {
		installedPackage,
		isUpdateCheckAvailable,
		isCommunityNode,
		initInstalledPackage,
	};
}
