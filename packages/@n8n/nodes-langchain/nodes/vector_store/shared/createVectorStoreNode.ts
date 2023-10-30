/* eslint-disable n8n-nodes-base/node-filename-against-convention */
/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type { VectorStore } from 'langchain/vectorstores/base';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import type {
	INodeCredentialDescription,
	INodeProperties,
	INodeExecutionData,
	IExecuteFunctions,
	INodeTypeDescription,
	SupplyData,
	INodeType,
} from 'n8n-workflow';
import type { Embeddings } from 'langchain/embeddings/base';
import type { Document } from 'langchain/document';
import { logWrapper } from '../../../utils/logWrapper';
import type { N8nJsonLoader } from '../../../utils/N8nJsonLoader';
import type { N8nBinaryLoader } from '../../../utils/N8nBinaryLoader';
import { getMetadataFiltersValues } from '../../../utils/helpers';
import { processDocuments } from './processDocuments';

interface NodeMeta {
	displayName: string;
	name: string;
	description: string;
	docsUrl: string;
	icon: string;
	credentials?: INodeCredentialDescription[];
}
interface VectorStoreNodeConstructorArgs {
	meta: NodeMeta;
	sharedFields: INodeProperties[];
	insertFields?: INodeProperties[];
	loadFields?: INodeProperties[];
	retrieveFields?: INodeProperties[];
	populateVectorStore: (
		context: IExecuteFunctions,
		embeddings: Embeddings,
		documents: Array<Document<Record<string, unknown>>>,
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
				...args.sharedFields,
				...transformDescriptionForOperationMode(args.insertFields ?? [], 'insert'),
				// Query and topK are always used for the load operation
				{
					displayName: 'Query',
					name: 'query',
					type: 'string',
					default: '',
					required: true,
					description: 'Query to search for documents',
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
					const query = this.getNodeParameter('query', itemIndex) as string;
					const topK = this.getNodeParameter('topK', itemIndex, 4) as number;

					const embeddedQuery = await embeddings.embedQuery(query);
					const docs = await vectorStore.similaritySearchVectorWithScore(
						embeddedQuery,
						topK,
						filter,
					);

					const serializedDocs = docs.map(([doc, score]) => {
						const document = {
							metadata: doc.metadata,
							pageContent: doc.pageContent,
						};

						return { json: { document, score } };
					});
					resultData.push(...serializedDocs);
				}

				return this.prepareOutputData(resultData);
			}

			if (mode === 'insert') {
				const items = this.getInputData(0);

				const documentInput = (await this.getInputConnectionData(
					NodeConnectionType.AiDocument,
					0,
				)) as N8nJsonLoader | N8nBinaryLoader | Array<Document<Record<string, unknown>>>;

				const { processedDocuments, serializedDocuments } = await processDocuments(
					documentInput,
					items,
				);

				await args.populateVectorStore(this, embeddings, processedDocuments);

				return this.prepareOutputData(serializedDocuments);
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
