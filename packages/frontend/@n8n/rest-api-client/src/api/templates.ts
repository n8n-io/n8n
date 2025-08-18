import type { RawAxiosRequestHeaders } from 'axios';
import type { INode, INodeCredentialsDetails } from 'n8n-workflow';

import type { VersionNode } from './versions';
import type { WorkflowData } from './workflows';
import { get } from '../utils';

export interface IWorkflowTemplateNode
	extends Pick<
		INode,
		'name' | 'type' | 'position' | 'parameters' | 'typeVersion' | 'webhookId' | 'id' | 'disabled'
	> {
	// The credentials in a template workflow have a different type than in a regular workflow
	credentials?: IWorkflowTemplateNodeCredentials;
}

export interface IWorkflowTemplateNodeCredentials {
	[key: string]: string | INodeCredentialsDetails;
}

export interface IWorkflowTemplate {
	id: number;
	name: string;
	workflow: Pick<WorkflowData, 'connections' | 'settings' | 'pinData'> & {
		nodes: IWorkflowTemplateNode[];
	};
}

export interface ITemplatesNode extends VersionNode {
	id: number;
	categories?: ITemplatesCategory[];
}

export interface ITemplatesCollection {
	id: number;
	name: string;
	nodes: ITemplatesNode[];
	workflows: Array<{ id: number }>;
}

interface ITemplatesImage {
	id: number;
	url: string;
}

interface ITemplatesCollectionExtended extends ITemplatesCollection {
	description: string | null;
	image: ITemplatesImage[];
	categories: ITemplatesCategory[];
	createdAt: string;
}

export interface ITemplatesCollectionFull extends ITemplatesCollectionExtended {
	full: true;
}

export interface ITemplatesCollectionResponse extends ITemplatesCollectionExtended {
	workflows: ITemplatesWorkflow[];
}

/**
 * A template without the actual workflow definition
 */

export interface ITemplatesWorkflow {
	id: number;
	createdAt: string;
	name: string;
	nodes: ITemplatesNode[];
	totalViews: number;
	user: {
		username: string;
	};
}

export interface ITemplatesWorkflowInfo {
	nodeCount: number;
	nodeTypes: {
		[key: string]: {
			count: number;
		};
	};
}

export type TemplateSearchFacet = {
	field_name: string;
	sampled: boolean;
	stats: {
		total_values: number;
	};
	counts: Array<{
		count: number;
		highlighted: string;
		value: string;
	}>;
};

export interface ITemplatesWorkflowResponse extends ITemplatesWorkflow, IWorkflowTemplate {
	description: string | null;
	image: ITemplatesImage[];
	categories: ITemplatesCategory[];
	workflowInfo: ITemplatesWorkflowInfo;
}

/**
 * A template with also the full workflow definition
 */

export interface ITemplatesWorkflowFull extends ITemplatesWorkflowResponse {
	full: true;
}

export interface ITemplatesQuery {
	categories: string[];
	search: string;
	apps?: string[];
	nodes?: string[];
	sort?: string;
	combineWith?: string;
}

export interface ITemplatesCategory {
	id: number;
	name: string;
}

function stringifyArray(arr: string[]) {
	return arr.join(',');
}

export async function testHealthEndpoint(apiEndpoint: string) {
	return await get(apiEndpoint, '/health');
}

export async function getCategories(
	apiEndpoint: string,
	headers?: RawAxiosRequestHeaders,
): Promise<{ categories: ITemplatesCategory[] }> {
	return await get(apiEndpoint, '/templates/categories', undefined, headers);
}

export async function getCollections(
	apiEndpoint: string,
	query: ITemplatesQuery,
	headers?: RawAxiosRequestHeaders,
): Promise<{ collections: ITemplatesCollection[] }> {
	return await get(
		apiEndpoint,
		'/templates/collections',
		{ category: query.categories, search: query.search },
		headers,
	);
}

export async function getWorkflows(
	apiEndpoint: string,
	query: {
		page: number;
		limit: number;
		categories: string[];
		search: string;
		sort?: string;
		apps?: string[];
		nodes?: string[];
		combineWith?: string;
	},
	headers?: RawAxiosRequestHeaders,
): Promise<{
	totalWorkflows: number;
	workflows: ITemplatesWorkflow[];
	filters: TemplateSearchFacet[];
}> {
	const { apps, sort, combineWith, categories, nodes, ...restQuery } = query;
	const finalQuery = {
		...restQuery,
		category: stringifyArray(categories),
		...(apps && { apps: stringifyArray(apps) }),
		...(nodes && { nodes: stringifyArray(nodes) }),
		...(sort && { sort }),
		...(combineWith && { combineWith }),
	};

	return await get(apiEndpoint, '/templates/search', finalQuery, headers);
}

export async function getCollectionById(
	apiEndpoint: string,
	collectionId: string,
	headers?: RawAxiosRequestHeaders,
): Promise<{ collection: ITemplatesCollectionResponse }> {
	return await get(apiEndpoint, `/templates/collections/${collectionId}`, undefined, headers);
}

export async function getTemplateById(
	apiEndpoint: string,
	templateId: string,
	headers?: RawAxiosRequestHeaders,
): Promise<{ workflow: ITemplatesWorkflowResponse }> {
	return await get(apiEndpoint, `/templates/workflows/${templateId}`, undefined, headers);
}

export async function getWorkflowTemplate(
	apiEndpoint: string,
	templateId: string,
	headers?: RawAxiosRequestHeaders,
): Promise<IWorkflowTemplate> {
	return await get(apiEndpoint, `/workflows/templates/${templateId}`, undefined, headers);
}
