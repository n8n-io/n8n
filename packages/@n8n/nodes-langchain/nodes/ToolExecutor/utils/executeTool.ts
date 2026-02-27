import type { Tool } from '@langchain/core/tools';
import { type IDataObject, type INodeExecutionData } from 'n8n-workflow';

import { convertObjectBySchema } from './convertToSchema';

export async function executeTool(tool: Tool, query: string | object): Promise<INodeExecutionData> {
	let convertedQuery: string | object = query;
	if ('schema' in tool && tool.schema) {
		convertedQuery = convertObjectBySchema(query, tool.schema);
	}

	const result = await tool.invoke(convertedQuery);

	// PartialExecutionToolExecutor: read sendMessage stored in metadata by createNodeAsTool
	const sendMessageRef = tool.metadata?.sendMessageRef as { value?: string } | undefined;
	const sendMessage = sendMessageRef?.value;

	return {
		json: result as IDataObject,
		...(sendMessage !== undefined ? { sendMessage } : {}),
	};
}
