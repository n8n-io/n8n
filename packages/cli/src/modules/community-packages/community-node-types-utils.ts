import type { INodeTypeDescription } from 'n8n-workflow';

import { paginatedRequest } from './strapi-utils';

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

/**
 * Picks the version to install from a vetted entry and the checksum that belongs to it.
 * No requested version means the latest vetted one. `checksum` is undefined when the
 * requested version is not vetted.
 */
export function selectVettedVersion(
	vetted: Pick<StrapiCommunityNodeType, 'npmVersion' | 'checksum' | 'nodeVersions'>,
	requestedVersion: string | undefined,
): { version: string; checksum: string | undefined } {
	const version = requestedVersion ?? vetted.npmVersion;
	const checksum =
		version === vetted.npmVersion
			? vetted.checksum
			: vetted.nodeVersions?.find((v) => v.npmVersion === version)?.checksum;
	return { version, checksum };
}

const N8N_VETTED_NODE_TYPES_STAGING_URL = 'https://api-staging.n8n.io/api/community-nodes';
const N8N_VETTED_NODE_TYPES_PRODUCTION_URL = 'https://api.n8n.io/api/community-nodes';

export async function getCommunityNodeTypes(
	environment: 'staging' | 'production',
): Promise<StrapiCommunityNodeType[]> {
	const url =
		environment === 'production'
			? N8N_VETTED_NODE_TYPES_PRODUCTION_URL
			: N8N_VETTED_NODE_TYPES_STAGING_URL;

	return await paginatedRequest<StrapiCommunityNodeType>(url);
}
