import type { PublicInstalledPackage } from 'n8n-workflow';

export interface CommunityPackageMap {
	[name: string]: PublicInstalledPackage;
}
