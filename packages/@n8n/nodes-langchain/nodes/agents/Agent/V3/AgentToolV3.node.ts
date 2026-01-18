import { NodeConnectionTypes } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	INodeTypeBaseDescription,
	ISupplyDataFunctions,
	EngineResponse,
	EngineRequest,
} from 'n8n-workflow';

import { textInput, toolDescription } from '@utils/descriptions';

import { getInputs } from '../utils';
import { toolsAgentProperties } from '../agents/ToolsAgent/V3/description';
import type { RequestResponseMetadata } from '../agents/ToolsAgent/V3/execute';
import { toolsAgentExecute } from '../agents/ToolsAgent/V3/execute';

export class AgentToolV3 implements INodeType {
	description: INodeTypeDescription;
	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: [3],
			defaults: {
				name: 'AI Agent Tool',
				color: '#404040',
			},
			inputs: `={{
				((hasOutputParser, needsFallback) => {
					${getInputs.toString()};
					return getInputs(false, hasOutputParser, needsFallback)
				})($parameter.hasOutputParser === undefined || $parameter.hasOutputParser === true, $parameter.needsFallback !== undefined && $parameter.needsFallback === true)
			}}`,
			outputs: [NodeConnectionTypes.AiTool],
			properties: [
				toolDescription,
				{
					...textInput,
				},
				{
					displayName: 'Require Specific Output Format',
					name: 'hasOutputParser',
					type: 'boolean',
					default: false,
					noDataExpression: true,
				},
				{
					displayName: `Connect an <a data-action='openSelectiveNodeCreator' data-action-parameter-connectiontype='${NodeConnectionTypes.AiOutputParser}'>output parser</a> on the canvas to specify the output format you require`,
					name: 'notice',
					type: 'notice',
					default: '',
					displayOptions: {
						show: {
							hasOutputParser: [true],
						},
					},
				},
				{
					displayName: 'Enable Fallback Model',
					name: 'needsFallback',
					type: 'boolean',
					default: false,
					noDataExpression: true,
				},
				{
					displayName:
						'Connect an additional language model on the canvas to use it as a fallback if the main model fails',
					name: 'fallbackNotice',
					type: 'notice',
					default: '',
					displayOptions: {
						show: {
							needsFallback: [true],
						},
					},
				},
				toolsAgentProperties,
			],
		};
	}

	// Automatically wrapped as a tool
	async execute(
		this: IExecuteFunctions | ISupplyDataFunctions,
		response?: EngineResponse<RequestResponseMetadata>,
	): Promise<INodeExecutionData[][] | EngineRequest<RequestResponseMetadata>> {
		return await toolsAgentExecute.call(this, response);
	}
}
