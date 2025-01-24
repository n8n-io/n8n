/* eslint-disable n8n-nodes-base/node-filename-against-convention */
/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type { Document } from '@langchain/core/documents';
import type { Embeddings } from '@langchain/core/embeddings';
import type { VectorStore } from '@langchain/core/vectorstores';
import { DynamicTool } from 'langchain/tools';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	INodeCredentialDescription,
	INodeProperties,
	INodeExecutionData,
	INodeTypeDescription,
	SupplyData,
	ISupplyDataFunctions,
	INodeType,
	ILoadOptionsFunctions,
	INodeListSearchResult,
	Icon,
	INodePropertyOptions,
	ThemeIconColor,
} from 'n8n-workflow';

import { getMetadataFiltersValues, logAiEvent } from '@utils/helpers';
import { logWrapper } from '@utils/logWrapper';
import type { N8nBinaryLoader } from '@utils/N8nBinaryLoader';
import { N8nJsonLoader } from '@utils/N8nJsonLoader';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

import { processDocument } from './processDocuments';

type NodeOperationMode = 'insert' | 'load' | 'retrieve' | 'update' | 'retrieve-as-tool';

const DEFAULT_OPERATION_MODES: NodeOperationMode[] = [
	'load',
	'insert',
	'retrieve',
	'retrieve-as-tool',
];

interface NodeMeta {
	displayName: string;
	name: string;
	description: string;
	docsUrl: string;
	icon: Icon;
	iconColor?: ThemeIconColor;
	credentials?: INodeCredentialDescription[];
	operationModes?: NodeOperationMode[];
}

export interface VectorStoreNodeConstructorArgs {
	meta: NodeMeta;
	methods?: {
		listSearch?: {
			[key: string]: (
				this: ILoadOptionsFunctions,
				filter?: string,
				paginationToken?: string,
			) => Promise<INodeListSearchResult>;
		};
	};

	sharedFields: INodeProperties[];
	insertFields?: INodeProperties[];
	loadFields?: INodeProperties[];
	retrieveFields?: INodeProperties[];
	updateFields?: INodeProperties[];
	populateVectorStore: (
		context: ISupplyDataFunctions,
		embeddings: Embeddings,
		documents: Array<Document<Record<string, unknown>>>,
		itemIndex: number,
	) => Promise<void>;
	getVectorStoreClient: (
		context: ISupplyDataFunctions,
		filter: Record<string, never> | undefined,
		embeddings: Embeddings,
		itemIndex: number,
	) => Promise<VectorStore>;
}

function transformDescriptionForOperationMode(
	fields: INodeProperties[],
	mode: NodeOperationMode | NodeOperationMode[],
) {
	return fields.map((field) => ({
		...field,
		displayOptions: { show: { mode: Array.isArray(mode) ? mode : [mode] } },
	}));
}

function isUpdateSupported(args: VectorStoreNodeConstructorArgs): boolean {
	return args.meta.operationModes?.includes('update') ?? false;
}

function getOperationModeOptions(args: VectorStoreNodeConstructorArgs): INodePropertyOptions[] {
	const enabledOperationModes = args.meta.operationModes ?? DEFAULT_OPERATION_MODES;

	const allOptions = [
		{
			name: 'Get Many',
			value: 'load',
			description: 'Get many ranked documents from vector store for query',
			action: 'Get ranked documents from vector store',
		},
		{
			name: 'Insert Documents',
			value: 'insert',
			description: 'Insert documents into vector store',
			action: 'Add documents to vector store',
		},
		{
			name: 'Retrieve Documents (As Vector Store for Chain/Tool)',
			value: 'retrieve',
			description: 'Retrieve documents from vector store to be used as vector store with AI nodes',
			action: 'Retrieve documents for Chain/Tool as Vector Store',
			outputConnectionType: NodeConnectionType.AiVectorStore,
		},
		{
			name: 'Retrieve Documents (As Tool for AI Agent)',
			value: 'retrieve-as-tool',
			description: 'Retrieve documents from vector store to be used as tool with AI nodes',
			action: 'Retrieve documents for AI Agent as Tool',
			outputConnectionType: NodeConnectionType.AiTool,
		},
		{
			name: 'Update Documents',
			value: 'update',
			description: 'Update documents in vector store by ID',
			action: 'Update vector store documents',
		},
	];

	return allOptions.filter(({ value }) =>
		enabledOperationModes.includes(value as NodeOperationMode),
	);
}

export const createVectorStoreNode = (args: VectorStoreNodeConstructorArgs) =>
	class VectorStoreNodeType implements INodeType {
		description: INodeTypeDescription = {
			displayName: args.meta.displayName,
			name: args.meta.name,
			description: args.meta.description,
			icon: args.meta.icon,
			iconColor: args.meta.iconColor,
			group: ['transform'],
			version: 1,
			defaults: {
				name: args.meta.displayName,
			},
			codex: {
				categories: ['AI'],
				subcategories: {
					AI: ['Vector Stores', 'Tools', 'Root Nodes'],
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
			credentials: args.meta.credentials,
			// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
			inputs: `={{
			((parameters) => {
				const mode = parameters?.mode;
				const inputs = [{ displayName: "Embedding", type: "${NodeConnectionType.AiEmbedding}", required: true, maxConnections: 1}]

				if (mode === 'retrieve-as-tool') {
					return inputs;
				}

				if (['insert', 'load', 'update'].includes(mode)) {
					inputs.push({ displayName: "", type: "${NodeConnectionType.Main}"})
				}

				if (['insert'].includes(mode)) {
					inputs.push({ displayName: "Document", type: "${NodeConnectionType.AiDocument}", required: true, maxConnections: 1})
				}
				return inputs
			})($parameter)
		}}`,
			outputs: `={{
			((parameters) => {
				const mode = parameters?.mode ?? 'retrieve';

				if (mode === 'retrieve-as-tool') {
					return [{ displayName: "Tool", type: "${NodeConnectionType.AiTool}"}]
				}

				if (mode === 'retrieve') {
					return [{ displayName: "Vector Store", type: "${NodeConnectionType.AiVectorStore}"}]
				}
				return [{ displayName: "", type: "${NodeConnectionType.Main}"}]
			})($parameter)
		}}`,
			properties: [
				{
					displayName: 'Operation Mode',
					name: 'mode',
					type: 'options',
					noDataExpression: true,
					default: 'retrieve',
					options: getOperationModeOptions(args),
				},
				{
					...getConnectionHintNoticeField([NodeConnectionType.AiRetriever]),
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

		async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
			const mode = this.getNodeParameter('mode', 0) as NodeOperationMode;

			const embeddings = (await this.getInputConnectionData(
				NodeConnectionType.AiEmbedding,
				0,
			)) as Embeddings;

			if (mode === 'load') {
				const items = this.getInputData(0);

				const resultData = [];
				for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
					const filter = getMetadataFiltersValues(this, itemIndex);
					const vectorStore = await args.getVectorStoreClient(
						this,
						// We'll pass filter to similaritySearchVectorWithScore instead of getVectorStoreClient
						undefined,
						embeddings,
						itemIndex,
					);
					const prompt = this.getNodeParameter('prompt', itemIndex) as string;
					const topK = this.getNodeParameter('topK', itemIndex, 4) as number;

					const embeddedPrompt = await embeddings.embedQuery(prompt);
					const docs = await vectorStore.similaritySearchVectorWithScore(
						embeddedPrompt,
						topK,
						filter,
					);

					const includeDocumentMetadata = this.getNodeParameter(
						'includeDocumentMetadata',
						itemIndex,
						true,
					) as boolean;

					const serializedDocs = docs.map(([doc, score]) => {
						const document = {
							pageContent: doc.pageContent,
							...(includeDocumentMetadata ? { metadata: doc.metadata } : {}),
						};

						return {
							json: { document, score },
							pairedItem: {
								item: itemIndex,
							},
						};
					});

					resultData.push(...serializedDocs);
					logAiEvent(this, 'ai-vector-store-searched', { query: prompt });
				}

				return [resultData];
			}

			if (mode === 'insert') {
				const items = this.getInputData();

				const documentInput = (await this.getInputConnectionData(
					NodeConnectionType.AiDocument,
					0,
				)) as N8nJsonLoader | N8nBinaryLoader | Array<Document<Record<string, unknown>>>;

				const resultData = [];
				for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
					if (this.getExecutionCancelSignal()?.aborted) {
						break;
					}
					const itemData = items[itemIndex];
					const { processedDocuments, serializedDocuments } = await processDocument(
						documentInput,
						itemData,
						itemIndex,
					);
					resultData.push(...serializedDocuments);

					await args.populateVectorStore(this, embeddings, processedDocuments, itemIndex);

					logAiEvent(this, 'ai-vector-store-populated');
				}

				return [resultData];
			}

			if (mode === 'update') {
				if (!isUpdateSupported(args)) {
					throw new NodeOperationError(
						this.getNode(),
						'Update operation is not implemented for this Vector Store',
					);
				}

				const items = this.getInputData();

				const loader = new N8nJsonLoader(this);

				const resultData = [];
				for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
					const itemData = items[itemIndex];

					const documentId = this.getNodeParameter('id', itemIndex, '', {
						extractValue: true,
					}) as string;

					const vectorStore = await args.getVectorStoreClient(
						this,
						undefined,
						embeddings,
						itemIndex,
					);

					const { processedDocuments, serializedDocuments } = await processDocument(
						loader,
						itemData,
						itemIndex,
					);

					if (processedDocuments?.length !== 1) {
						throw new NodeOperationError(this.getNode(), 'Single document per item expected');
					}

					resultData.push(...serializedDocuments);

					// Use ids option to upsert instead of insert
					await vectorStore.addDocuments(processedDocuments, {
						ids: [documentId],
					});

					logAiEvent(this, 'ai-vector-store-updated');
				}

				return [resultData];
			}

			throw new NodeOperationError(
				this.getNode(),
				'Only the "load", "update" and "insert" operation modes are supported with execute',
			);
		}

		async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
			const mode = this.getNodeParameter('mode', 0) as NodeOperationMode;
			const filter = getMetadataFiltersValues(this, itemIndex);
			const embeddings = (await this.getInputConnectionData(
				NodeConnectionType.AiEmbedding,
				0,
			)) as Embeddings;

			if (mode === 'retrieve') {
				const vectorStore = await args.getVectorStoreClient(this, filter, embeddings, itemIndex);
				return {
					response: logWrapper(vectorStore, this),
				};
			}

			if (mode === 'retrieve-as-tool') {
				const toolDescription = this.getNodeParameter('toolDescription', itemIndex) as string;
				const toolName = this.getNodeParameter('toolName', itemIndex) as string;
				const topK = this.getNodeParameter('topK', itemIndex, 4) as number;
				const includeDocumentMetadata = this.getNodeParameter(
					'includeDocumentMetadata',
					itemIndex,
					true,
				) as boolean;

				const vectorStoreTool = new DynamicTool({
					name: toolName,
					description: toolDescription,
					func: async (input) => {
						const vectorStore = await args.getVectorStoreClient(
							this,
							filter,
							embeddings,
							itemIndex,
						);
						const embeddedPrompt = await embeddings.embedQuery(input);
						const documents = await vectorStore.similaritySearchVectorWithScore(
							embeddedPrompt,
							topK,
							filter,
						);
						return documents
							.map((document) => {
								if (includeDocumentMetadata) {
									return { type: 'text', text: JSON.stringify(document[0]) };
								}
								return {
									type: 'text',
									text: JSON.stringify({ pageContent: document[0].pageContent }),
								};
							})
							.filter((document) => !!document);
					},
				});

				return {
					response: logWrapper(vectorStoreTool, this),
				};
			}

			throw new NodeOperationError(
				this.getNode(),
				'Only the "retrieve" and "retrieve-as-tool" operation mode is supported to supply data',
			);
		}
	};
