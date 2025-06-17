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

export interface WhatsNewArticle {
	id: number;
	title: string;
	createdAt: string;
	updatedAt: string | null;
	publishedAt: string;
	content: string;
	calloutTitle: string;
	calloutContent: string;
}

export interface StrapiResponse<T> {
	data: T[];
	meta: {
		pagination: {
			page: number;
			pageSize: number;
			pageCount: number;
			total: number;
		};
	};
}

export interface StrapiN8nVersion {
	id: number;
	attributes: {
		name: string;
		encodedName: string;
		major: number;
		minor: number;
		patch: number;
		isStable: boolean;
		showReleaseNotification: boolean;
		hasCoreChanges: boolean;
		isAvailableOnCloud: boolean;
		hasNewNodes: boolean | null;
		hasNodeEnhancements: boolean | null;
		hasSecurityIssue: boolean | null;
		hasSecurityFix: boolean | null;
		hasBreakingChange: boolean | null;
		hasBugFixes: boolean | null;
		securityIssueFixVersion: string;
		documentationUrl: string;
		nodes: string;
		isEarlyAccess: boolean | null;
		createdAt: string;
		updatedAt: string | null;
	};
}

export interface StrapiWhatsNewArticle {
	id: number;
	attributes: {
		title: string;
		content: string;
		calloutTitle: string;
		calloutText: string;
		createdAt: string;
		updatedAt: string | null;
		publishedAt: string;
		n8nVersion: {
			data: StrapiN8nVersion | null;
		};
	};
}

export async function getNextVersions(
	endpoint: string,
	currentVersion: string,
	instanceId: string,
): Promise<Version[]> {
	const headers = { [INSTANCE_ID_HEADER as string]: instanceId };
	return await get(endpoint, currentVersion, {}, headers);
}

export async function getWhatsNewArticles(
	endpoint: string,
	currentVersion: string,
	instanceId: string,
): Promise<WhatsNewArticle[]> {
	const headers = {
		[INSTANCE_ID_HEADER as string]: instanceId,
		[INSTANCE_VERSION_HEADER as string]: currentVersion,
	};
	const response: StrapiResponse<StrapiWhatsNewArticle> = await get(
		endpoint,
		'?populate=*',
		{},
		headers,
	);

	return response.data.map((article) => ({
		id: article.id,
		title: article.attributes.title,
		content: article.attributes.content,
		calloutTitle: article.attributes.calloutTitle,
		calloutContent: article.attributes.calloutText,
		createdAt: article.attributes.createdAt,
		updatedAt: article.attributes.updatedAt,
		publishedAt: article.attributes.publishedAt,
	}));
}
