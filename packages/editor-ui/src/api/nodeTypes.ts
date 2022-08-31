import { makeRestApiRequest } from './helpers';
import type {
	INodeTranslationHeaders,
	IResourceLocatorReqParams,
	IResourceLocatorResponse,
	IRestApiContext,
} from '@/Interface';
import type {
	ILoadOptions,
	INodeCredentials,
	INodeParameters,
	INodePropertyOptions,
	INodeTypeDescription,
	INodeTypeNameVersion,
} from 'n8n-workflow';

export async function getNodeTypes(
	context: IRestApiContext,
	{ onlyLatest } = { onlyLatest: false },
) {
	return makeRestApiRequest(context, 'GET', '/node-types', { onlyLatest });
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
		nodeTypeAndVersion: INodeTypeNameVersion,
		path: string,
		methodName?: string,
		loadOptions?: ILoadOptions,
		currentNodeParameters: INodeParameters,
		credentials?: INodeCredentials,
	},
): Promise<INodePropertyOptions[]> {
	return makeRestApiRequest(context, 'GET', '/node-parameter-options', sendData);
}

export async function getResourceLocatorResults(
	context: IRestApiContext,
	sendData: IResourceLocatorReqParams,
): Promise<IResourceLocatorResponse> {
	// return makeRestApiRequest(context, 'GET', '/node-list-search', sendData);

	const response: IResourceLocatorResponse = {
		"results": [
			{
				name: "File 1",
				value: "file1",
				url: "http://example.com/preview/file1.txt",
			},
			{
				name: "Folder 1",
				value: "folder1",
			},
			{
				name: "File 2",
				value: "file2",
				url: "http://example.com/preview/file1.txt",
			},
			{
				name: "File 3",
				value: "file3",
				url: "http://example.com/preview/file1.txt",
			},
			{
				name: "File 4",
				value: "file4",
				url: "http://example.com/preview/file1.txt",
			},
			{
				name: "dklfsjdflksjdflksjdflkdsjflsdjkflksdjflksdjflksdjflkdsjflskdfjsdlkfjsdlkfj",
				value: "file5",
				url: "http://example.com/preview/file1.txt",
			},
			{
				name: "hellds jlkdsj fldksjf lkdsjf lkjsd lkdjslk fdsjf lksjd lkjsd lkjsdf lkdsj flksdj slkdj fdslk",
				value: "foldder1",
			},
			{
				name: "File 2",
				value: "filed2",
				url: "http://example.com/preview/file1.txt",
			},
			{
				name: "File 3",
				value: "file43",
				url: "http://example.com/preview/file1.txt",
			},
			{
				name: "File 4",
				value: "file34",
				url: "http://example.com/preview/file1.txt",
			},
		],
		paginationToken: "nextPage",
	};

	const secondPage: IResourceLocatorResponse = {
		"results": [
			{
				name: "second 1",
				value: "second1",
				url: "http://example.com/preview/second1.txt",
			},
			{
				name: "hello 1",
				value: "hello",
			},
			{
				name: "second 2",
				value: "second2",
				url: "http://example.com/preview/second1.txt",
			},
			{
				name: "second 3",
				value: "second3",
				url: "http://example.com/preview/second1.txt",
			},
		],
	};

	function sleeper(ms: number) {
		return new Promise(resolve => setTimeout(() => resolve(0), ms));
	}

	await sleeper(2000);

	if (sendData.paginationToken) {
		return await Promise.resolve(secondPage);
	}

	return await Promise.resolve(response);
}

