import type { Embeddings } from '@langchain/core/embeddings';
import type { VectorStore } from '@langchain/core/vectorstores';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeTypeDescription,
	SupplyData,
	ISupplyDataFunctions,
	INodeType,
	INodeProperties,
} from 'n8n-workflow';

// Import custom types
import {
	handleLoadOperation,
	handleInsertOperation,
	handleUpdateOperation,
	handleRetrieveOperation,
	handleRetrieveAsToolOperation,
	handleRetrieveAsToolExecuteOperation,
} from './operations';
import type { NodeOperationMode, VectorStoreNodeConstructorArgs } from './types';
// Import utility functions
import { transformDescriptionForOperationMode, getOperationModeOptions } from './utils';
import { getConnectionHintNoticeField } from '../../shared-fields';

const ragStarterCallout: INodeProperties = {
	displayName: 'Tip: Get a feel for vector stores in n8n with our',
	name: 'ragStarterCallout',
	type: 'callout',
	typeOptions: {
		calloutAction: {
			label: 'RAG starter template',
			type: 'openSampleWorkflowTemplate',
			templateId: 'rag-starter-template',
		},
	},
	default: '',
};

/**
 * Creates a vector store node with the given configuration
 * This factory function produces a complete node class that implements all vector store operations
 */
export const createVectorStoreNode = <T extends VectorStore = VectorStore>(
	args: VectorStoreNodeConstructorArgs<T>,
) =>
	class VectorStoreNodeType implements INodeType {
		description: INodeTypeDescription = {
			displayName: args.meta.displayName,
			name: args.meta.name,
			description: args.meta.description,
			...(args.hidden === true ? { hidden: true } : {}),
			icon: args.meta.icon,
			iconColor: args.meta.iconColor,
			group: ['transform'],
			// 1.2 has changes to VectorStoreInMemory node.
			// 1.3 drops `toolName` and uses node name as the tool name.
			version: [1, 1.1, 1.2, 1.3],
			defaults: {
				name: args.meta.displayName,
			},
			codex: {
				categories: args.meta.categories ?? ['AI'],
				subcategories: args.meta.subcategories ?? {
					AI: ['Vector Stores', 'Tools', 'Root Nodes'],
					'Vector Stores': ['Other Vector Stores'],
					Tools: ['Other Tools'],
				},
				resources: {
					primaryDocumentation: [
						{
							url: args.meta.docsUrl,
						},
					],
				},
			},
			builderHint: {
				searchHint:
					"Pick mode by where data flows: `insert` upserts documents into the store on the main flow; `load` runs a one-shot similarity search on the main flow; `retrieve-as-tool` is the canonical RAG mode — plug into an AI Agent's `subnodes.tools`; `retrieve` exposes the store as a subnode for another node's `subnodes.vectorStore`; `update` updates a single document by ID.",
				...args.meta.builderHint,
				extraTypeDefContent: [
					{
						displayOptions: { show: { mode: ['insert'] } },
						content: `Sits on the main flow — pipe the documents you want to embed into this node. Declare with \`vectorStore({...})\`. Required subnodes: \`embedding\` and \`documentLoader\`. If the goal is letting an LLM query the store, use \`mode: 'retrieve-as-tool'\` instead.
<patterns>
<pattern title="insert mode — upsert documents (generic, works for any vectorStore* node)">
// Substitute the type literal and provider-specific parameters (e.g. pineconeIndex,
// qdrantCollection, supabaseTableName) — see the rest of this file for the exact shape.
const store = vectorStore({
  type: '@n8n/n8n-nodes-langchain.vectorStoreXxx',
  config: {
    name: 'Knowledge Base',
    parameters: {
      mode: 'insert',
      // ...provider-specific parameters
    },
    subnodes: { embedding: embeddingsOpenAi, documentLoader: defaultDataLoader }
  }
});
</pattern>
</patterns>`,
					},
					{
						displayOptions: { show: { mode: ['retrieve-as-tool'] } },
						content: `Canonical RAG mode — declare with the \`tool({...})\` factory (NOT \`vectorStore\`) and plug into an AI Agent's \`subnodes.tools\`. Required subnodes: \`embedding\`. Set \`toolDescription\` so the agent knows when to call it.
<patterns>
<pattern title="retrieve-as-tool mode — RAG via AI Agent (generic, works for any vectorStore* node)">
// Substitute the type literal and provider-specific parameters — see the rest of this file
// for the exact shape (e.g. pineconeIndex, qdrantCollection, supabaseTableName).
const knowledgeBase = tool({
  type: '@n8n/n8n-nodes-langchain.vectorStoreXxx',
  config: {
    name: 'Knowledge Base',
    parameters: {
      mode: 'retrieve-as-tool',
      toolDescription: 'Search the product knowledge base',
      // ...provider-specific parameters
    },
    subnodes: { embedding: embeddingsOpenAi }
  }
});

const agent = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  config: {
    name: 'Support Agent',
    parameters: { promptType: 'define', text: expr('{{ $json.question }}') },
    subnodes: { model: openAiModel, tools: [knowledgeBase] }
  }
});
</pattern>
</patterns>`,
					},
					{
						displayOptions: { show: { mode: ['load'] } },
						content: `One-shot similarity search on the main flow using the \`prompt\` parameter. Declare with \`vectorStore({...})\`. Required subnodes: \`embedding\`. For LLM-driven querying (RAG), use \`mode: 'retrieve-as-tool'\` instead.
<patterns>
<pattern title="load mode — one-shot similarity search (generic)">
// Substitute the type literal and provider-specific parameters — see the rest of this file.
const lookup = vectorStore({
  type: '@n8n/n8n-nodes-langchain.vectorStoreXxx',
  config: {
    name: 'Knowledge Base',
    parameters: {
      mode: 'load',
      prompt: expr('{{ $json.query }}'),
      // ...provider-specific parameters
    },
    subnodes: { embedding: embeddingsOpenAi }
  }
});
</pattern>
</patterns>`,
					},
					{
						displayOptions: { show: { mode: ['retrieve'] } },
						content: `Exposes the store as an \`ai_vectorStore\` subnode for another node (e.g. \`toolVectorStore\`). Declare with \`vectorStore({...})\`. Required subnodes: \`embedding\`. For RAG with an AI Agent directly, prefer \`mode: 'retrieve-as-tool'\`.
<patterns>
<pattern title="retrieve mode — feed another node as a subnode (generic)">
// Substitute the type literal and provider-specific parameters — see the rest of this file.
const store = vectorStore({
  type: '@n8n/n8n-nodes-langchain.vectorStoreXxx',
  config: {
    name: 'Knowledge Base',
    parameters: { mode: 'retrieve' /* + provider-specific parameters */ },
    subnodes: { embedding: embeddingsOpenAi }
  }
});

const retrieverTool = tool({
  type: '@n8n/n8n-nodes-langchain.toolVectorStore',
  config: {
    name: 'KB Retriever',
    parameters: { description: 'Search the product knowledge base' },
    subnodes: { vectorStore: store, model: openAiModel }
  }
});
</pattern>
</patterns>`,
					},
					{
						displayOptions: { show: { mode: ['update'] } },
						content: `Updates a single document by \`id\`. Declare with \`vectorStore({...})\`. Required subnodes: \`embedding\`. Only available on stores whose \`operationModes\` enables it — most providers omit this mode.
<patterns>
<pattern title="update mode — update document by ID (generic)">
// Substitute the type literal and provider-specific parameters — see the rest of this file.
const store = vectorStore({
  type: '@n8n/n8n-nodes-langchain.vectorStoreXxx',
  config: {
    name: 'Knowledge Base',
    parameters: { mode: 'update', id: expr('{{ $json.docId }}') },
    subnodes: { embedding: embeddingsOpenAi }
  }
});
</pattern>
</patterns>`,
					},
				],
				inputs: {
					ai_embedding: { required: true },
					ai_document: {
						required: true,
						displayOptions: { show: { mode: ['insert'] } },
					},
					ai_reranker: {
						required: true,
						displayOptions: {
							show: { mode: ['load', 'retrieve', 'retrieve-as-tool'], useReranker: [true] },
						},
					},
				},
				outputs: {
					main: {
						displayOptions: { show: { mode: ['insert', 'load', 'update'] } },
					},
					ai_vectorStore: {
						required: true,
						displayOptions: { show: { mode: ['retrieve'] } },
					},
					ai_tool: {
						required: true,
						displayOptions: { show: { mode: ['retrieve-as-tool'] } },
					},
				},
			},
			credentials: args.meta.credentials,

			inputs: `={{
			((parameters) => {
				const mode = parameters?.mode;
				const useReranker = parameters?.useReranker;
				const inputs = [{ displayName: "Embedding", type: "${NodeConnectionTypes.AiEmbedding}", required: true, maxConnections: 1}]

				if (['load', 'retrieve', 'retrieve-as-tool'].includes(mode) && useReranker) {
					inputs.push({ displayName: "Reranker", type: "${NodeConnectionTypes.AiReranker}", required: true, maxConnections: 1})
				}

				if (mode === 'retrieve-as-tool') {
					return inputs;
				}

				if (['insert', 'load', 'update'].includes(mode)) {
					inputs.push({ displayName: "", type: "${NodeConnectionTypes.Main}"})
				}

				if (['insert'].includes(mode)) {
					inputs.push({ displayName: "Document", type: "${NodeConnectionTypes.AiDocument}", required: true, maxConnections: 1})
				}
				return inputs
			})($parameter)
		}}`,
			outputs: `={{
			((parameters) => {
				const mode = parameters?.mode ?? 'retrieve';

				if (mode === 'retrieve-as-tool') {
					return [{ displayName: "Tool", type: "${NodeConnectionTypes.AiTool}"}]
				}

				if (mode === 'retrieve') {
					return [{ displayName: "Vector Store", type: "${NodeConnectionTypes.AiVectorStore}"}]
				}
				return [{ displayName: "", type: "${NodeConnectionTypes.Main}"}]
			})($parameter)
		}}`,
			properties: [
				ragStarterCallout,
				{
					displayName: 'Operation Mode',
					name: 'mode',
					type: 'options',
					noDataExpression: true,
					default: 'retrieve',
					options: getOperationModeOptions(args),
				},
				{
					...getConnectionHintNoticeField([NodeConnectionTypes.AiRetriever]),
					displayOptions: {
						show: {
							mode: ['retrieve'],
						},
					},
				},
				{
					displayName: 'Name',
					name: 'toolName',
					type: 'string',
					default: '',
					required: true,
					description: 'Name of the vector store',
					placeholder: 'e.g. company_knowledge_base',
					validateType: 'string-alphanumeric',
					displayOptions: {
						show: {
							'@version': [{ _cnd: { lte: 1.2 } }],
							mode: ['retrieve-as-tool'],
						},
					},
				},
				{
					displayName: 'Description',
					name: 'toolDescription',
					type: 'string',
					default: '',
					required: true,
					typeOptions: { rows: 2 },
					description:
						'Explain to the LLM what this tool does, a good, specific description would allow LLMs to produce expected results much more often',
					placeholder: `e.g. ${args.meta.description}`,
					displayOptions: {
						show: {
							mode: ['retrieve-as-tool'],
						},
					},
				},
				...args.sharedFields,
				{
					displayName: 'Embedding Batch Size',
					name: 'embeddingBatchSize',
					type: 'number',
					default: 200,
					description: 'Number of documents to embed in a single batch',
					displayOptions: {
						show: {
							mode: ['insert'],
							'@version': [{ _cnd: { gte: 1.1 } }],
						},
					},
				},
				...transformDescriptionForOperationMode(args.insertFields ?? [], 'insert'),
				// Prompt and topK are always used for the load operation
				{
					displayName: 'Prompt',
					name: 'prompt',
					type: 'string',
					default: '',
					required: true,
					description:
						'Search prompt to retrieve matching documents from the vector store using similarity-based ranking',
					displayOptions: {
						show: {
							mode: ['load'],
						},
					},
				},
				{
					displayName: 'Limit',
					name: 'topK',
					type: 'number',
					default: 4,
					description: 'Number of top results to fetch from vector store',
					displayOptions: {
						show: {
							mode: ['load', 'retrieve-as-tool'],
						},
					},
				},
				{
					displayName: 'Include Metadata',
					name: 'includeDocumentMetadata',
					type: 'boolean',
					default: true,
					description: 'Whether or not to include document metadata',
					displayOptions: {
						show: {
							mode: ['load', 'retrieve-as-tool'],
						},
					},
				},
				{
					displayName: 'Rerank Results',
					name: 'useReranker',
					type: 'boolean',
					default: false,
					description: 'Whether or not to rerank results',
					displayOptions: {
						show: {
							mode: ['load', 'retrieve', 'retrieve-as-tool'],
						},
					},
				},
				// ID is always used for update operation
				{
					displayName: 'ID',
					name: 'id',
					type: 'string',
					default: '',
					required: true,
					description: 'ID of an embedding entry',
					displayOptions: {
						show: {
							mode: ['update'],
						},
					},
				},
				...transformDescriptionForOperationMode(args.loadFields ?? [], [
					'load',
					'retrieve-as-tool',
				]),
				...transformDescriptionForOperationMode(args.retrieveFields ?? [], 'retrieve'),
				...transformDescriptionForOperationMode(args.updateFields ?? [], 'update'),
			],
		};

		methods = args.methods;

		/**
		 * Method to execute the node in regular workflow mode
		 * Supports 'load', 'insert', and 'update' operation modes
		 */
		async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
			const mode = this.getNodeParameter('mode', 0) as NodeOperationMode;
			// Get the embeddings model connected to this node
			const embeddings = (await this.getInputConnectionData(
				NodeConnectionTypes.AiEmbedding,
				0,
			)) as Embeddings;

			// Handle each operation mode with dedicated modules
			if (mode === 'load') {
				const items = this.getInputData(0);
				const resultData = [];

				for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
					const docs = await handleLoadOperation(this, args, embeddings, itemIndex);
					resultData.push(...docs);
				}

				return [resultData];
			}

			if (mode === 'insert') {
				const resultData = await handleInsertOperation(this, args, embeddings);
				return [resultData];
			}

			if (mode === 'update') {
				const resultData = await handleUpdateOperation(this, args, embeddings);
				return [resultData];
			}

			if (mode === 'retrieve-as-tool') {
				const items = this.getInputData(0);
				const resultData = [];

				for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
					const docs = await handleRetrieveAsToolExecuteOperation(
						this,
						args,
						embeddings,
						itemIndex,
					);
					resultData.push(...docs);
				}

				return [resultData];
			}

			throw new NodeOperationError(
				this.getNode(),
				'Only the "load", "update", "insert", and "retrieve-as-tool" operation modes are supported with execute',
			);
		}

		/**
		 * Method to supply data to AI nodes
		 * Supports 'retrieve' and 'retrieve-as-tool' operation modes
		 */
		async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
			const mode = this.getNodeParameter('mode', 0) as NodeOperationMode;

			// Get the embeddings model connected to this node
			const embeddings = (await this.getInputConnectionData(
				NodeConnectionTypes.AiEmbedding,
				0,
			)) as Embeddings;

			// Handle each supply data operation mode with dedicated modules
			if (mode === 'retrieve') {
				return await handleRetrieveOperation(this, args, embeddings, itemIndex);
			}

			if (mode === 'retrieve-as-tool') {
				return await handleRetrieveAsToolOperation(this, args, embeddings, itemIndex);
			}

			throw new NodeOperationError(
				this.getNode(),
				'Only the "retrieve" and "retrieve-as-tool" operation mode is supported to supply data',
			);
		}
	};
