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
