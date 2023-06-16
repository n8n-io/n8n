import { makeRestApiRequest } from '@/utils/apiUtils';
import type {
	INodeTranslationHeaders,
	IResourceLocatorReqParams,
	IRestApiContext,
	ResourceMapperReqParams,
} from '@/Interface';
import type {
	IDataObject,
	ILoadOptions,
	INodeCredentials,
	INodeListSearchResult,
	INodeParameters,
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
	return makeRestApiRequest(context, 'GET', '/node-translation-headers');
}

export async function getNodesInformation(
	context: IRestApiContext,
	nodeInfos: INodeTypeNameVersion[],
): Promise<INodeTypeDescription[]> {
	return makeRestApiRequest(context, 'POST', '/node-types', { nodeInfos });
}

export async function getNodeParameterOptions(
	context: IRestApiContext,
	sendData: {
		nodeTypeAndVersion: INodeTypeNameVersion;
		path: string;
		methodName?: string;
		loadOptions?: ILoadOptions;
		currentNodeParameters: INodeParameters;
		credentials?: INodeCredentials;
	},
): Promise<INodePropertyOptions[]> {
	return makeRestApiRequest(context, 'GET', '/node-parameter-options', sendData);
}

export async function getResourceLocatorResults(
	context: IRestApiContext,
	sendData: IResourceLocatorReqParams,
): Promise<INodeListSearchResult> {
	return makeRestApiRequest(
		context,
		'GET',
		'/nodes-list-search',
		sendData as unknown as IDataObject,
	);
}

export async function getResourceMapperFields(
	context: IRestApiContext,
	sendData: ResourceMapperReqParams,
): Promise<ResourceMapperFields> {
	return makeRestApiRequest(
		context,
		'GET',
		'/get-mapping-fields',
		sendData as unknown as IDataObject,
	);
}
