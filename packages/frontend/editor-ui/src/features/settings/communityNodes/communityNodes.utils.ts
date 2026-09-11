import { useCommunityNodesStore } from './communityNodes.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { type PublicInstalledPackage } from 'n8n-workflow';
import semver from 'semver';

export type ExtendedPublicInstalledPackage = PublicInstalledPackage & {
	unverifiedUpdate: boolean;
};

interface IncompatibleNodesApiVersionErrorResponse {
	httpStatusCode: number;
	meta: {
		/** API version the package requires, or `null` if the declared value is malformed. */
		requiredNodesApiVersion: number | null;
		supportedNodesApiVersion: number;
	};
}

/** True when the error rejects a package because of its node API version. */
export const isNodesApiVersionError = (
	error: unknown,
): error is IncompatibleNodesApiVersionErrorResponse => {
	const e = error as IncompatibleNodesApiVersionErrorResponse | undefined;
	return e?.httpStatusCode === 400 && 'requiredNodesApiVersion' in (e.meta ?? {});
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
