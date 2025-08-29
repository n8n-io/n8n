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
	if (installedPackage?.updateAvailable && communityNodeType) {
		const unverifiedUpdate = semver.gt(
			installedPackage.updateAvailable,
			communityNodeType.npmVersion,
		);
		return {
			...installedPackage,
			unverifiedUpdate,
		};
	}
	return { ...installedPackage, unverifiedUpdate: false };
}
