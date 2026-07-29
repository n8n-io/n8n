import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { toolsAgentExecute } from '../ToolsAgent/V1/execute';

/**
 * OpenAI Functions Agent (legacy) - redirects to Tools Agent
 *
 * The OpenAI Functions Agent uses the legacy @langchain/classic API which has
 * compatibility issues with langchain 1.0. The Tools Agent uses the modern
 * createToolCallingAgent API which works correctly.
 *
 * Since both agents provide similar functionality (calling tools/functions),
 * we redirect to the Tools Agent implementation for better compatibility.
 */
export async function openAiFunctionsAgentExecute(
	this: IExecuteFunctions,
	_nodeVersion: number,
): Promise<INodeExecutionData[][]> {
	return await toolsAgentExecute.call(this);
}
