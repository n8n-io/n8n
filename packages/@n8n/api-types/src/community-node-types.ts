import type { INodeTypeDescription } from 'n8n-workflow';

/** Temporary Gateway credits offer for a community node. Dates are ISO datetimes. */
export type GatewayCreditsPromotion = {
	text: string;
	startsAt?: string | null;
	endsAt?: string | null;
};

export type CommunityNodeType = {
	id: number;
	authorGithubUrl: string;
	authorName: string;
	checksum: string;
	description: string;
	displayName: string;
	name: string;
	numberOfStars: number;
	numberOfDownloads: number;
	packageName: string;
	createdAt: string;
	updatedAt: string;
	npmVersion: string;
	isOfficialNode: boolean;
	companyName?: string;
	nodeDescription: INodeTypeDescription;
	isInstalled: boolean;
	nodeVersions?: Array<{ npmVersion: string; checksum: string }>;
	gatewayCreditsPromotion?: GatewayCreditsPromotion | null;
};
