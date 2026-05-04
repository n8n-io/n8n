import type { CommunityNodeType } from '@n8n/api-types';
import type { INodeTypeDescription, PublicInstalledPackage } from 'n8n-workflow';

export interface CommunityPackageMap {
	[name: string]: PublicInstalledPackage;
}

export interface CommunityPackageSummary {
	packageName: string;
	authorName: string;
	description: string;
	isOfficialNode: boolean;
	isInstalled: boolean;
	numberOfDownloads: number;
	npmVersion: string;
	nodes: CommunityNodeType[];
}

export interface CommunityPackageCardData {
	packageName: string;
	authorName: string;
	description: string;
	isOfficialNode: boolean;
	numberOfDownloads: number;
	nodeCount: number;
	nodeDescription: INodeTypeDescription | null;
	installNodeName: string;
	isInstalled: boolean;
	installedVersion?: string;
	updateAvailable?: string;
	failedLoading?: boolean;
}

export function fromBrowsePackage(pkg: CommunityPackageSummary): CommunityPackageCardData {
	return {
		packageName: pkg.packageName,
		authorName: pkg.authorName,
		description: pkg.description,
		isOfficialNode: pkg.isOfficialNode,
		numberOfDownloads: pkg.numberOfDownloads,
		nodeCount: pkg.nodes.length,
		nodeDescription: pkg.nodes[0]?.nodeDescription ?? null,
		installNodeName: pkg.nodes[0]?.name ?? '',
		isInstalled: pkg.isInstalled,
	};
}

export function fromInstalledPackage(
	pkg: PublicInstalledPackage,
	getNodeType: (name: string) => INodeTypeDescription | null,
): CommunityPackageCardData {
	const firstNodeType = pkg.installedNodes[0]?.type;
	return {
		packageName: pkg.packageName,
		authorName: pkg.authorName ?? '',
		description: '',
		isOfficialNode: false,
		numberOfDownloads: 0,
		nodeCount: pkg.installedNodes.length,
		nodeDescription: firstNodeType ? getNodeType(firstNodeType) : null,
		installNodeName: pkg.installedNodes[0]?.name ?? '',
		isInstalled: true,
		installedVersion: pkg.installedVersion,
		updateAvailable: pkg.updateAvailable,
		failedLoading: pkg.failedLoading,
	};
}
