import type {
	ActionResultRequestDto,
	CommunityNodeType,
	OptionsRequestDto,
	ResourceLocatorRequestDto,
	ResourceMapperFieldsRequestDto,
} from '@n8n/api-types';
import type { INodeTranslationHeaders } from '@n8n/i18n';
import axios from 'axios';
import type {
	INodeListSearchResult,
	INodePropertyOptions,
	INodeTypeDescription,
	INodeTypeNameVersion,
	NodeParameterValueType,
	ResourceMapperFields,
} from 'n8n-workflow';
import { sleep } from 'n8n-workflow';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export type NodeManifest = {
	name: string;
	displayName: string;
	icon?: string;
	iconColor?: string;
	iconUrl?: string | { light: string; dark: string };
	badgeIconUrl?: string | { light: string; dark: string };
	group: string[];
	description: string;
	version: number | number[];
	defaultVersion: number;
	inputs: Array<string | object>;
	outputs: Array<string | object>;
	codex?: {
		categories?: string[];
		subcategories?: Record<string, string[]>;
		alias?: string[];
	};
	hidden?: boolean;
	usableAsTool?: boolean;
};

export type NodeTypesInitResponse = {
	manifests: NodeManifest[];
	preloadedDefinitions: Record<string, INodeTypeDescription>;
};

async function fetchNodeTypesJsonWithRetry(url: string, retries = 5, delay = 500) {
	for (let attempt = 0; attempt < retries; attempt++) {
		const response = await axios.get(url, { withCredentials: true });

		if (typeof response.data === 'object' && response.data !== null) {
			return response.data;
		}

		await sleep(delay * attempt);
	}

	throw new Error('Could not fetch node types');
}

export async function getNodeTypes(baseUrl: string) {
	return await fetchNodeTypesJsonWithRetry(baseUrl + 'types/nodes.json');
}

export async function fetchCommunityNodeTypes(
	context: IRestApiContext,
): Promise<CommunityNodeType[]> {
	return await makeRestApiRequest(context, 'GET', '/community-node-types');
}

export async function fetchCommunityNodeAttributes(
	context: IRestApiContext,
	type: string,
): Promise<CommunityNodeType | null> {
	return await makeRestApiRequest(
		context,
		'GET',
		`/community-node-types/${encodeURIComponent(type)}`,
	);
}

export async function getNodeTranslationHeaders(
	context: IRestApiContext,
): Promise<INodeTranslationHeaders | undefined> {
	return await makeRestApiRequest(context, 'GET', '/node-translation-headers');
}

export async function getNodesInformation(
	context: IRestApiContext,
	nodeInfos: INodeTypeNameVersion[],
): Promise<INodeTypeDescription[]> {
	return await makeRestApiRequest(context, 'POST', '/node-types', { nodeInfos });
}

export async function getNodeParameterOptions(
	context: IRestApiContext,
	sendData: OptionsRequestDto,
): Promise<INodePropertyOptions[]> {
	return await makeRestApiRequest(context, 'POST', '/dynamic-node-parameters/options', sendData);
}

export async function getResourceLocatorResults(
	context: IRestApiContext,
	sendData: ResourceLocatorRequestDto,
): Promise<INodeListSearchResult> {
	return await makeRestApiRequest(
		context,
		'POST',
		'/dynamic-node-parameters/resource-locator-results',
		sendData,
	);
}

export async function getResourceMapperFields(
	context: IRestApiContext,
	sendData: ResourceMapperFieldsRequestDto,
): Promise<ResourceMapperFields> {
	return await makeRestApiRequest(
		context,
		'POST',
		'/dynamic-node-parameters/resource-mapper-fields',
		sendData,
	);
}

export async function getLocalResourceMapperFields(
	context: IRestApiContext,
	sendData: ResourceMapperFieldsRequestDto,
): Promise<ResourceMapperFields> {
	return await makeRestApiRequest(
		context,
		'POST',
		'/dynamic-node-parameters/local-resource-mapper-fields',
		sendData,
	);
}

export async function getNodeParameterActionResult(
	context: IRestApiContext,
	sendData: ActionResultRequestDto,
): Promise<NodeParameterValueType> {
	return await makeRestApiRequest(
		context,
		'POST',
		'/dynamic-node-parameters/action-result',
		sendData,
	);
}

/**
 * Get initial node data for tiered loading.
 * Returns lightweight manifests for all nodes + full definitions for preload set.
 */
export async function getNodeTypesInit(context: IRestApiContext): Promise<NodeTypesInitResponse> {
	return await makeRestApiRequest(context, 'GET', '/node-types/init');
}

/**
 * Get full definition for a single node type on-demand.
 * Used when opening NDV for a node not in the preload set.
 */
export async function getNodeDefinition(
	context: IRestApiContext,
	nodeType: string,
): Promise<INodeTypeDescription> {
	return await makeRestApiRequest(
		context,
		'GET',
		`/node-types/${encodeURIComponent(nodeType)}/definition`,
	);
}

/**
 * Get full definitions for multiple node types in batch.
 * Used for efficient batch fetching when loading a workflow.
 */
export async function getNodeDefinitions(
	context: IRestApiContext,
	nodeTypes: string[],
): Promise<Record<string, INodeTypeDescription>> {
	return await makeRestApiRequest(context, 'POST', '/node-types/definitions', { nodeTypes });
}
