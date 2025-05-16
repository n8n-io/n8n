import type { INodeTypeDescription } from 'n8n-workflow';

export interface CommunityNodeAttributes {
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
}

export interface CommunityNodeData {
	id: number;
	attributes: CommunityNodeAttributes & {
		nodeDescription: INodeTypeDescription;
	};
}
