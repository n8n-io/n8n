/* eslint-disable n8n-nodes-base/node-filename-against-convention */
/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type { VectorStore } from '@langchain/core/vectorstores';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import type {
	INodeCredentialDescription,
	INodeProperties,
	INodeExecutionData,
	IExecuteFunctions,
	INodeTypeDescription,
	SupplyData,
	INodeType,
	ILoadOptionsFunctions,
	INodeListSearchResult,
	Icon,
} from 'n8n-workflow';
import type { Embeddings } from '@langchain/core/embeddings';
import type { Document } from '@langchain/core/documents';
import { logWrapper } from '../../../utils/logWrapper';
import type { N8nJsonLoader } from '../../../utils/N8nJsonLoader';
import type { N8nBinaryLoader } from '../../../utils/N8nBinaryLoader';
import { getMetadataFiltersValues, logAiEvent } from '../../../utils/helpers';
import { getConnectionHintNoticeField } from '../../../utils/sharedFields';
import { processDocument } from './processDocuments';

interface NodeMeta {
	displayName: string;
	name: string;
	description: string;
	docsUrl: string;
	icon: Icon;
	credentials?: INodeCredentialDescription[];
}
interface VectorStoreNodeConstructorArgs {
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
	populateVectorStore: (
		context: IExecuteFunctions,
		embeddings: Embeddings,
		documents: Array<Document<Record<string, unknown>>>,
		itemIndex: number,
	) => Promise<void>;
	getVectorStoreClient: (
		context: IExecuteFunctions,
		filter: Record<string, never> | undefined,
		embeddings: Embeddings,
		itemIndex: number,
	) => Promise<VectorStore>;
}

function transformDescriptionForOperationMode(
	fields: INodeProperties[],
	mode: 'insert' | 'load' | 'retrieve',
) {
	return fields.map((field) => ({
		...field,
		displayOptions: { show: { mode: [mode] } },
	}));
}
export const createVectorStoreNode = (args: VectorStoreNodeConstructorArgs) =>
	class VectorStoreNodeType implements INodeType {
		description: INodeTypeDescription = {
			displayName: args.meta.displayName,
			name: args.meta.name,
			description: args.meta.description,
			icon: args.meta.icon,
			group: ['transform'],
			version: 1,
			defaults: {
				name: args.meta.displayName,
			},
			codex: {
				categories: ['AI'],
				subcategories: {
					AI: ['Vector Stores'],
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

				if (['insert', 'load'].includes(mode)) {
					inputs.push({ displayName: "", type: "${NodeConnectionType.Main}"})
				}

				if (mode === 'insert') {
					inputs.push({ displayName: "Document", type: "${NodeConnectionType.AiDocument}", required: true, maxConnections: 1})
				}
				return inputs
			})($parameter)
		}}`,
			outputs: `={{
			((parameters) => {
				const mode = parameters?.mode ?? 'retrieve';
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
					options: [
						{
							name: 'Get Many',
							value: 'load',
							description: 'Get many ranked documents from vector store for query',
							action: 'Get many ranked documents from vector store for query',
						},
						{
							name: 'Insert Documents',
							value: 'insert',
							description: 'Insert documents into vector store',
							action: 'Insert documents into vector store',
						},
						{
							name: 'Retrieve Documents (For Agent/Chain)',
							value: 'retrieve',
							description: 'Retrieve documents from vector store to be used with AI nodes',
							action: 'Retrieve documents from vector store to be used with AI nodes',
						},
					],
				},
				{
					...getConnectionHintNoticeField([NodeConnectionType.AiRetriever]),
					displayOptions: {
						show: {
							mode: ['retrieve'],
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
							mode: ['load'],
						},
					},
				},
				...transformDescriptionForOperationMode(args.loadFields ?? [], 'load'),
				...transformDescriptionForOperationMode(args.retrieveFields ?? [], 'retrieve'),
			],
		};

		methods = args.methods;

		async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
			const mode = this.getNodeParameter('mode', 0) as 'load' | 'insert' | 'retrieve';

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
						// We'll pass filter to similaritySearchVectorWithScore instaed of getVectorStoreClient
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

					const serializedDocs = docs.map(([doc, score]) => {
						const document = {
							metadata: doc.metadata,
							pageContent: doc.pageContent,
						};

						return {
							json: { document, score },
							pairedItem: {
								item: itemIndex,
							},
						};
					});

					resultData.push(...serializedDocs);
					void logAiEvent(this, 'n8n.ai.vector.store.searched', { query: prompt });
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
					const itemData = items[itemIndex];
					const { processedDocuments, serializedDocuments } = await processDocument(
						documentInput,
						itemData,
						itemIndex,
					);
					resultData.push(...serializedDocuments);

					try {
						await args.populateVectorStore(this, embeddings, processedDocuments, itemIndex);

						void logAiEvent(this, 'n8n.ai.vector.store.populated');
					} catch (error) {
						throw error;
					}
				}

				return [resultData];
			}

			throw new NodeOperationError(
				this.getNode(),
				'Only the "load" and "insert" operation modes are supported with execute',
			);
		}

		async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
			const mode = this.getNodeParameter('mode', 0) as 'load' | 'insert' | 'retrieve';
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

			throw new NodeOperationError(
				this.getNode(),
				'Only the "retrieve" operation mode is supported to supply data',
			);
		}
	};
