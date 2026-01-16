import type { IDataObject, INodeTypeDescription } from 'n8n-workflow';

import { metadataRequest, paginatedRequest } from './strapi-utils';

export type StrapiCommunityNodeType = {
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
	nodeVersions?: Array<{ npmVersion: string; checksum: string }>;
};

export type CommunityNodesMetadata = Pick<StrapiCommunityNodeType, 'name' | 'npmVersion'> & {
	id: number;
};

const N8N_VETTED_NODE_TYPES_STAGING_URL = 'https://api-staging.n8n.io/api/community-nodes';
const N8N_VETTED_NODE_TYPES_PRODUCTION_URL = 'https://api.n8n.io/api/community-nodes';

function getUrl(environment: 'staging' | 'production'): string {
	return environment === 'production'
		? N8N_VETTED_NODE_TYPES_PRODUCTION_URL
		: N8N_VETTED_NODE_TYPES_STAGING_URL;
}

export async function getCommunityNodeTypes(
	environment: 'staging' | 'production',
	qs?: IDataObject,
): Promise<StrapiCommunityNodeType[]> {
	const url = getUrl(environment);
	return await paginatedRequest<StrapiCommunityNodeType>(url, qs);
}

export async function getCommunityNodesMetadata(
	environment: 'staging' | 'production',
): Promise<CommunityNodesMetadata[]> {
	const url = getUrl(environment);
	return await metadataRequest<CommunityNodesMetadata>(url);
}
