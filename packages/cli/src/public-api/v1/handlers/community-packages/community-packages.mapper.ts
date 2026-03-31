import type { PublicInstalledNode, PublicInstalledPackage } from 'n8n-workflow';

export type PublicApiCommunityPackage = {
	packageName: string;
	installedVersion: string;
	authorName?: string;
	authorEmail?: string;
	installedNodes: PublicApiInstalledNode[];
	createdAt: string;
	updatedAt: string;
	updateAvailable?: string;
	failedLoading?: boolean;
};

type PublicApiInstalledNode = {
	name: string;
	type: string;
	latestVersion: number;
};

function mapInstalledNode(node: PublicInstalledNode): PublicApiInstalledNode {
	return {
		name: node.name,
		type: node.type,
		latestVersion: node.latestVersion,
	};
}

export function mapToCommunityPackage(pkg: PublicInstalledPackage): PublicApiCommunityPackage {
	const { installedNodes, createdAt, updatedAt, ...packageData } = pkg;
	return {
		...packageData,
		installedNodes: installedNodes.map(mapInstalledNode),
		createdAt: createdAt.toISOString(),
		updatedAt: updatedAt.toISOString(),
	};
}

export function mapToCommunityPackageList(
	packages: PublicInstalledPackage[],
): PublicApiCommunityPackage[] {
	return packages.map(mapToCommunityPackage);
}
