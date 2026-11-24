import type {
	CommunityNodeType,
	NodeTypeAvailabilityScope,
	PackagePolicyRestrictions,
} from '@n8n/api-types';
import { i18n } from '@n8n/i18n';
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
		/** `null` if the declared value is malformed. */
		requiredNodesApiVersion: string | null;
		supportedNodesApiVersion: string;
	};
}

/** True when the error rejects a package because of its node API version. */
export const isNodesApiVersionError = (
	error: unknown,
): error is IncompatibleNodesApiVersionErrorResponse => {
	const e = error as IncompatibleNodesApiVersionErrorResponse | undefined;
	return e?.httpStatusCode === 400 && 'requiredNodesApiVersion' in (e.meta ?? {});
};

/** The install toast message, or `undefined` when no policy blocks a node from the package. */
export function describeInstallPolicyNote(
	restrictions: PackagePolicyRestrictions | undefined,
	totalNodes: number,
): string | undefined {
	const blocked = restrictions?.nodeTypes ?? [];
	const onInstance = blocked.filter((node) => node.blockedOn === 'instance');
	const inProjects = blocked.filter((node) => node.blockedOn === 'projects');

	const sentences: string[] = [];
	if (onInstance.length > 0) {
		sentences.push(
			i18n.baseText('settings.communityNodes.messages.install.policyNote.instance', {
				adjustToNumber: onInstance.length,
				interpolate: { count: String(onInstance.length), total: String(totalNodes) },
			}),
		);
		if (onInstance.some((node) => node.optInAvailable)) {
			sentences.push(i18n.baseText('settings.communityNodes.messages.install.policyNote.optIn'));
		}
	}
	if (inProjects.length > 0) {
		sentences.push(
			i18n.baseText('settings.communityNodes.messages.install.policyNote.projects', {
				adjustToNumber: inProjects.length,
				interpolate: { count: String(inProjects.length) },
			}),
		);
	}

	return sentences.length > 0 ? sentences.join(' ') : undefined;
}

/** The install toast message for the node the user installed the package to use. */
export function describeSelectedNodeRestriction(
	displayName: string,
	scope: NodeTypeAvailabilityScope | undefined,
): string {
	return i18n.baseText(
		scope === 'project'
			? 'settings.communityNodes.messages.install.policyNote.selected.project'
			: 'settings.communityNodes.messages.install.policyNote.selected.instance',
		{ interpolate: { nodeType: displayName } },
	);
}
