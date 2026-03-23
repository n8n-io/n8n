import { INSTANCE_ID_HEADER, INSTANCE_VERSION_HEADER } from '@n8n/constants';
import type { INodeParameters } from 'n8n-workflow';

import { get } from '../utils';

export interface VersionNode {
	name: string;
	displayName: string;
	icon: string;
	iconUrl?: string;
	defaults: INodeParameters;
	iconData: {
		type: string;
		icon?: string;
		fileBuffer?: string;
	};
	typeVersion?: number;
}

export interface Version {
	name: string;
	nodes: VersionNode[];
	createdAt: string;
	description: string;
	documentationUrl: string;
	hasBreakingChange: boolean;
	hasSecurityFix: boolean;
	hasSecurityIssue: boolean;
	securityIssueFixVersion: string;
}

export interface WhatsNewSection {
	title: string;
	calloutText: string;
	footer: string;
	items: WhatsNewArticle[];
	createdAt: string;
	updatedAt: string | null;
}

export interface WhatsNewArticle {
	id: number;
	createdAt: string;
	updatedAt: string | null;
	publishedAt: string;
	title: string;
	content: string;
}

export async function getNextVersions(
	endpoint: string,
	currentVersion: string,
	instanceId: string,
): Promise<Version[]> {
	const headers = { [INSTANCE_ID_HEADER as string]: instanceId };
	return await get(endpoint, currentVersion, {}, headers);
}

export async function getWhatsNewSection(
	endpoint: string,
	currentVersion: string,
	instanceId: string,
): Promise<WhatsNewSection> {
	const headers = {
		[INSTANCE_ID_HEADER as string]: instanceId,
		[INSTANCE_VERSION_HEADER as string]: currentVersion,
	};
	return await get(endpoint, '', {}, headers);
}
