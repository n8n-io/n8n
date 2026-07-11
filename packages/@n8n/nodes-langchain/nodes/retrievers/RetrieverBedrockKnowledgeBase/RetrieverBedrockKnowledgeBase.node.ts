import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type IExecuteFunctions,
	type INodeExecutionData,
	type SupplyData,
	nodeNameToToolName,
} from 'n8n-workflow';

import {
	BedrockAgentRuntimeClient,
	RetrieveCommand,
	AgenticRetrieveStreamCommand,
} from '@aws-sdk/client-bedrock-agent-runtime';

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { logWrapper, getConnectionHintNoticeField } from '@n8n/ai-utilities';
import { awsNodeAuthOptions, awsNodeCredentials } from 'n8n-nodes-base/dist/nodes/Aws/utils';
import { resolveAwsCredentials } from '@utils/aws/resolveAwsCredentials';

function getSourceUri(result: any): string {
	const location = result.location ?? {};
	if (location.s3Location) return location.s3Location.uri ?? '';
	if (location.webLocation) return location.webLocation.url ?? '';
	if (location.confluenceLocation) return location.confluenceLocation.url ?? '';
	if (location.salesforceLocation) return location.salesforceLocation.url ?? '';
	if (location.sharePointLocation) return location.sharePointLocation.url ?? '';
	if (location.customDocumentLocation) return location.customDocumentLocation.id ?? '';
	// Fallback for agentic results
	return result.metadata?._source_uri ?? '';
}

async function getTool(ctx: ISupplyDataFunctions | IExecuteFunctions): Promise<DynamicStructuredTool> {
	const knowledgeBaseId = ctx.getNodeParameter('knowledgeBaseId', 0) as string;
	const knowledgeBaseType = ctx.getNodeParameter('knowledgeBaseType', 0, 'MANAGED') as string;
	const topK = ctx.getNodeParameter('topK', 0, 5) as number;
	const useAgenticRetrieval = ctx.getNodeParameter('useAgenticRetrieval', 0, true) as boolean;
	const toolDescription = ctx.getNodeParameter(
		'toolDescription',
		0,
		'Search the knowledge base for relevant information to answer questions.',
	) as string;

	const { region, credentials } = await resolveAwsCredentials(ctx as ISupplyDataFunctions, 0);
	const client = new BedrockAgentRuntimeClient({ region, credentials });

	const tool = new DynamicStructuredTool({
		name: nodeNameToToolName(ctx.getNode()),
		description: toolDescription,
		schema: z.object({
			query: z.string().describe('The search query to find relevant documents'),
		}),
		func: async ({ query }: { query: string }) => {
			// Try agentic retrieval first
			if (useAgenticRetrieval) {
				try {
					const agenticCmd = new AgenticRetrieveStreamCommand({
						knowledgeBaseId,
						messages: [{ content: { text: query }, role: 'user' }],
						retrievers: [{
							configuration: {
								knowledgeBase: {
									knowledgeBaseId,
									retrievalOverrides: { maxNumberOfResults: topK },
								},
							},
						}],
						agenticRetrieveConfiguration: {
							foundationModelType: 'MANAGED',
							rerankingModelType: 'MANAGED',
						},
					} as any);

					const agenticResponse = await client.send(agenticCmd);
					const agenticResults: string[] = [];
					const stream = (agenticResponse as any).result?.stream;
					if (stream) {
						for await (const event of stream) {
							if (event.retrievalResult) {
								const text = event.retrievalResult.content?.text ?? '';
								const source = getSourceUri(event.retrievalResult);
								agenticResults.push(`${text}\nSource: ${source}`);
							}
						}
					}
					if (agenticResults.length > 0) {
						return agenticResults.join('\n\n---\n\n');
					}
				} catch {
					// Fall through to managed retrieve
				}
			}

			// Fallback to managed/vector retrieve
			const retrievalConfiguration =
				knowledgeBaseType === 'MANAGED'
					? { managedSearchConfiguration: { numberOfResults: topK } }
					: { vectorSearchConfiguration: { numberOfResults: topK } };

			const command = new RetrieveCommand({
				knowledgeBaseId,
				retrievalQuery: { text: query },
				retrievalConfiguration: retrievalConfiguration as any,
			});

			const response = await client.send(command);
			const results = (response.retrievalResults ?? []).map(
				(result: any) =>
					`${result.content?.text ?? ''}\nSource: ${getSourceUri(result)}`,
			);

			return results.join('\n\n---\n\n') || 'No relevant documents found.';
		},
	});

	return tool;
}

export class RetrieverBedrockKnowledgeBase implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Bedrock Knowledge Base',
		name: 'retrieverBedrockKnowledgeBase',
		icon: 'file:bedrock.svg',
		iconColor: 'black',
		group: ['transform'],
		version: 1,
		description: 'Search an Amazon Bedrock Knowledge Base (Managed or Vector). No embeddings needed — Bedrock handles retrieval internally.',
		defaults: {
			name: 'Bedrock Knowledge Base',
		},
		credentials: awsNodeCredentials,
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Tools'],
				Tools: ['Other Tools'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html',
					},
				],
			},
		},
		inputs: [],
		outputs: [NodeConnectionTypes.AiTool],
		outputNames: ['Tool'],
		properties: [
			awsNodeAuthOptions,
			getConnectionHintNoticeField([NodeConnectionTypes.AiAgent]),
			{
				displayName: 'Knowledge Base ID',
				name: 'knowledgeBaseId',
				type: 'string',
				default: '',
				required: true,
				description: 'The ID of the Amazon Bedrock Knowledge Base',
			},
			{
				displayName: 'Knowledge Base Type',
				name: 'knowledgeBaseType',
				type: 'options',
				options: [
					{
						name: 'Managed (Recommended)',
						value: 'MANAGED',
						description:
							'Bedrock handles embedding, storage, and retrieval automatically',
					},
					{
						name: 'Vector',
						value: 'VECTOR',
						description: 'Traditional vector search with external vector store',
					},
				],
				default: 'MANAGED',
				description: 'Type of knowledge base',
			},
			{
				displayName: 'Top K',
				name: 'topK',
				type: 'number',
				default: 5,
				description: 'Number of documents to retrieve',
			},
			{
				displayName: 'Use Agentic Retrieval',
				name: 'useAgenticRetrieval',
				type: 'boolean',
				default: true,
				description:
					'Enable intelligent query decomposition and managed reranking for complex questions. Disable to use simple managed search.',
			},
			{
				displayName: 'Tool Description',
				name: 'toolDescription',
				type: 'string',
				default:
					'Search the knowledge base for relevant information to answer questions.',
				description:
					'Description the AI Agent uses to decide when to call this tool',
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions): Promise<SupplyData> {
		return {
			response: logWrapper(await getTool(this), this),
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const tool = await getTool(this);
		const input = this.getInputData();
		const response: INodeExecutionData[] = [];
		for (let i = 0; i < input.length; i++) {
			const inputItem = input[i];
			const query = (inputItem.json.query as string) || (inputItem.json.chatInput as string) || '';
			const result = await tool.invoke({ query });
			response.push({
				json: { response: result },
				pairedItem: { item: i },
			});
		}
		return [response];
	}
}
