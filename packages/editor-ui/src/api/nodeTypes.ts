import { makeRestApiRequest } from '@/utils/apiUtils';
import type { DynamicNodeParameters, INodeTranslationHeaders, IRestApiContext } from '@/Interface';
import type {
	INodeListSearchResult,
	INodePropertyOptions,
	INodeTypeDescription,
	INodeTypeNameVersion,
} from 'n8n-workflow';
import axios from 'axios';
import type { ResourceMapperFields } from 'n8n-workflow/src/Interfaces';

export async function getNodeTypes(baseUrl: string) {
	const { data } = await axios.get(baseUrl + 'types/nodes.json', { withCredentials: true });
	return data;
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
	sendData: DynamicNodeParameters.OptionsRequest,
): Promise<INodePropertyOptions[]> {
	return await makeRestApiRequest(context, 'POST', '/dynamic-node-parameters/options', sendData);
}

export async function getResourceLocatorResults(
	context: IRestApiContext,
	sendData: DynamicNodeParameters.ResourceLocatorResultsRequest,
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
	sendData: DynamicNodeParameters.ResourceMapperFieldsRequest,
): Promise<ResourceMapperFields> {
	return await makeRestApiRequest(
		context,
		'POST',
		'/dynamic-node-parameters/resource-mapper-fields',
		sendData,
	);
}
