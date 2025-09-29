import { promptTypeOptions, textFromPreviousNode, textInput } from '@utils/descriptions';
import { NodeConnectionTypes } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	INodeTypeBaseDescription,
	EngineResponse,
	EngineRequest,
} from 'n8n-workflow';

import { toolsAgentProperties } from '../agents/ToolsAgent/V3/description';
import type { RequestResponseMetadata } from '../agents/ToolsAgent/V3/execute';
import { toolsAgentExecute } from '../agents/ToolsAgent/V3/execute';
import { getInputs } from '../utils';

export class AgentV3 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: [3],
			defaults: {
				name: 'AI Agent',
				color: '#404040',
			},
			inputs: `={{
				((hasOutputParser, needsFallback) => {
					${getInputs.toString()};
					return getInputs(true, hasOutputParser, needsFallback);
				})($parameter.hasOutputParser === undefined || $parameter.hasOutputParser === true, $parameter.needsFallback !== undefined && $parameter.needsFallback === true)
			}}`,
			outputs: [NodeConnectionTypes.Main],
			properties: [
				{
					displayName:
						'Tip: Get a feel for agents with our quick <a href="https://docs.n8n.io/advanced-ai/intro-tutorial/" target="_blank">tutorial</a> or see an <a href="/workflows/templates/1954" target="_blank">example</a> of how this node works',
					name: 'aiAgentStarterCallout',
					type: 'callout',
					default: '',
				},
				promptTypeOptions,
				{
					...textFromPreviousNode,
					displayOptions: {
						show: {
							promptType: ['auto'],
						},
					},
				},
				{
					...textInput,
					displayOptions: {
						show: {
							promptType: ['define'],
						},
					},
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
			hints: [
				{
					message:
						'You are using streaming responses. Make sure to set the response mode to "Streaming Response" on the connected trigger node.',
					type: 'warning',
					location: 'outputPane',
					whenToDisplay: 'afterExecution',
					displayCondition: '={{ $parameter["enableStreaming"] === true }}',
				},
			],
		};
	}

	async execute(
		this: IExecuteFunctions,
		response?: EngineResponse<RequestResponseMetadata>,
	): Promise<INodeExecutionData[][] | EngineRequest<RequestResponseMetadata>> {
		return await toolsAgentExecute.call(this, response);
	}
}
