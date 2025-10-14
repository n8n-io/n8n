import { useCommunityNodesStore } from '@/stores/communityNodes.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { type PublicInstalledPackage } from 'n8n-workflow';
import semver from 'semver';

export type ExtendedPublicInstalledPackage = PublicInstalledPackage & {
	unverifiedUpdate: boolean;
};

export async function fetchInstalledPackageInfo(
	packageName: string,
): Promise<ExtendedPublicInstalledPackage | undefined> {
	const installedPackage: PublicInstalledPackage | undefined =
		await useCommunityNodesStore().getInstalledPackage(packageName);
	const communityNodeType = useNodeTypesStore().communityNodeType(packageName);
	if (!installedPackage) {
		return undefined;
	}
	const checkIsUnverifiedUpdate = () => {
		if (!installedPackage?.updateAvailable || !communityNodeType) return false;
		return semver.gt(installedPackage.updateAvailable, communityNodeType.npmVersion);
	};

	return { ...installedPackage, unverifiedUpdate: checkIsUnverifiedUpdate() };
}
