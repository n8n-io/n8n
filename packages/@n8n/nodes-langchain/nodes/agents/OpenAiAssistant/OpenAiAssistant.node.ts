import { NodeConnectionType } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

export class OpenAiAssistant implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'OpenAI Assistant',
		name: 'openAiAssistant',
		icon: 'fa:robot',
		group: ['transform'],
		version: 1,
		description: 'Generates an action plan and executes it. Can use external tools.',
		subtitle: 'Open AI Assistant',
		defaults: {
			name: 'OpenAI Assistant',
			color: '#404040',
		},
		codex: {
			alias: ['LangChain'],
			categories: ['AI'],
			subcategories: {
				AI: ['Agents'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.openaiassistant/',
					},
				],
			},
		},
		inputs: [
			{
				type: NodeConnectionType.AiLanguageModel,
				filter: {
					nodes: ['@n8n/n8n-nodes-langchain.lmChatOpenAi'],
				},
			},
			{
				type: NodeConnectionType.AiTool,
			},
			{
				type: NodeConnectionType.AiOutputParser,
			},
		],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'openAiApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Assistant',
				name: 'assistantId',
				type: 'string',
				description: 'The assistant to use',
				default: '',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const assistantId = this.getNodeParameter('assistantId', 0, '') as string;
		console.log(
			'🚀 ~ file: OpenAiAssistant.node.ts:70 ~ OpenAiAssistant ~ execute ~ assistantId:',
			assistantId,
		);

		// throw new NodeOperationError(this.getNode(), `The agent type "${agentType}" is not supported`);
		return [[{ json: { test: 123 } }]];
	}
}
