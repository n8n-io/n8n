import type { CommunityNodeType } from '@n8n/api-types';
import semver from 'semver';

export async function findVettedCommunityNodeAttributes(
	nodeTypes: string[],
	getCommunityNodeAttributes: (nodeType: string) => Promise<CommunityNodeType | null>,
) {
	for (const nodeType of nodeTypes) {
		const attributes = await getCommunityNodeAttributes(nodeType);
		if (attributes) return attributes;
	}

	return null;
}

interface CommunityPackageUpdateAvailability {
	installedVersion: string;
	updateAvailable?: string;
	latestVerifiedVersion?: string;
	isCommunityNodesFeatureEnabled: boolean;
	isUnverifiedPackagesEnabled: boolean;
	isManagedByEnv: boolean;
}

export function isCommunityPackageUpdateAvailable({
	installedVersion,
	updateAvailable,
	latestVerifiedVersion,
	isCommunityNodesFeatureEnabled,
	isUnverifiedPackagesEnabled,
	isManagedByEnv,
}: CommunityPackageUpdateAvailability) {
	if (isManagedByEnv) return false;
	if (isUnverifiedPackagesEnabled && updateAvailable) return true;

	return Boolean(
		isCommunityNodesFeatureEnabled &&
			latestVerifiedVersion &&
			semver.gt(latestVerifiedVersion, installedVersion),
	);
}

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
