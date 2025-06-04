import type { StructuredTool, Tool } from '@langchain/core/tools';
import { type IDataObject, type INodeExecutionData } from 'n8n-workflow';

import { convertObjectBySchema } from './convertToSchema';

export async function executeTool(
	tool: StructuredTool | Tool,
	query: string | object,
): Promise<INodeExecutionData> {
	let convertedQuery: string | object = query;
	if ('schema' in tool && tool.schema) {
		convertedQuery = convertObjectBySchema(query, tool.schema);
	}

	const result = await tool.invoke(convertedQuery);

	return {
		json: result as IDataObject,
	};
}
