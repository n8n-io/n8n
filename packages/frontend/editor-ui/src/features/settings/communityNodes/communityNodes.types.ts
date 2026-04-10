import type { CommunityNodeType } from '@n8n/api-types';
import type { PublicInstalledPackage } from 'n8n-workflow';

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
