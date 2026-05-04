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

export interface CommunityPackageRowData {
	[key: string]: unknown;
	id: string;
	name: string;
	resourceType: 'communityPackage';
	packageName: string;
	authorName: string;
	description: string;
	isOfficialNode: boolean;
	isVerified: boolean;
	numberOfDownloads: number;
	nodeCount: number;
	nodeDescription: INodeTypeDescription | null;
	installNodeName: string;
	isInstalled: boolean;
	installedVersion?: string;
	updateAvailable?: string;
	failedLoading?: boolean;
}

export function fromBrowsePackage(pkg: CommunityPackageSummary): CommunityPackageRowData {
	return {
		id: pkg.packageName,
		name: pkg.packageName,
		resourceType: 'communityPackage',
		packageName: pkg.packageName,
		authorName: pkg.authorName,
		description: pkg.description,
		isOfficialNode: pkg.isOfficialNode,
		isVerified: true,
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
): CommunityPackageRowData {
	const firstNodeType = pkg.installedNodes[0]?.type;
	return {
		id: pkg.packageName,
		name: pkg.packageName,
		resourceType: 'communityPackage',
		packageName: pkg.packageName,
		authorName: pkg.authorName ?? '',
		description: '',
		isOfficialNode: false,
		isVerified: false,
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

export function mergeVettedAndInstalled(
	pkg: CommunityPackageSummary,
	installed: PublicInstalledPackage,
	getNodeType: (name: string) => INodeTypeDescription | null,
): CommunityPackageRowData {
	const installNodeName = pkg.nodes[0]?.name ?? installed.installedNodes[0]?.name ?? '';
	const nodeDescription =
		pkg.nodes[0]?.nodeDescription ??
		(installed.installedNodes[0]?.type ? getNodeType(installed.installedNodes[0].type) : null);

	return {
		id: pkg.packageName,
		name: pkg.packageName,
		resourceType: 'communityPackage',
		packageName: pkg.packageName,
		authorName: pkg.authorName,
		description: pkg.description,
		isOfficialNode: pkg.isOfficialNode,
		isVerified: true,
		numberOfDownloads: pkg.numberOfDownloads,
		nodeCount: pkg.nodes.length || installed.installedNodes.length,
		nodeDescription,
		installNodeName,
		isInstalled: true,
		installedVersion: installed.installedVersion,
		updateAvailable: installed.updateAvailable,
		failedLoading: installed.failedLoading,
	};
}

declare module '@/Interface' {
	interface ModuleResources {
		communityPackage: CommunityPackageRowData & {
			id: string;
			name: string;
			resourceType: 'communityPackage';
		};
	}
}
