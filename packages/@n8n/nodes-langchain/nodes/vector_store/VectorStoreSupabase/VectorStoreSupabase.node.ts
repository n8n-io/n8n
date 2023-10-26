import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	INodeType,
	INodeTypeDescription,
	SupplyData,
	INodeExecutionData,
} from 'n8n-workflow';
import { insertOperationDescription } from './insert/description';
import { loadOperationDescription } from './load/description';
import { retrieveOperationDescription } from './retrieve/description';
import { retrieveSupplyData } from './retrieve/supply';
import { loadExecute } from './load/execute';
import { insertExecute } from './insert/execute';

export class VectorStoreSupabase implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Supabase Vector Store',
		name: 'vectorStoreSupabase',
		icon: 'file:supabase.svg',
		group: ['transform'],
		version: 1,
		description: 'Work with your data in Supabase Vector Store',
		defaults: {
			name: 'Supabase Vector Store',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Vector Stores'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.vectorstoresupabaseload/',
					},
				],
			},
		},
		credentials: [
			{
				name: 'supabaseApi',
				required: true,
			},
		],
		inputs: `={{
			((parameters) => {
				const operation = parameters.operation;
				const inputs = [{ displayName: "Embedding", type: "${NodeConnectionType.AiEmbedding}", required: true, maxConnections: 1}]

				if (['insert', 'load'].includes(operation)) {
					inputs.push({ displayName: "", type: "${NodeConnectionType.Main}"})
				}

				if (operation === 'insert') {
					inputs.push({ displayName: "Document", type: "${NodeConnectionType.AiDocument}", required: true, maxConnections: 1})
				}
				return inputs
			})($parameter)
		}}`,
		outputs: `={{
			((parameters) => {
				const operation = parameters.operation;
				if (operation === 'retrieve') {
					return [{ displayName: "Vector Store", type: "${NodeConnectionType.AiVectorStore}"}]
				}
				return [{ displayName: "", type: "${NodeConnectionType.Main}"}]
			})($parameter)
		}}`,
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
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
				displayName: 'Table Name',
				name: 'tableName',
				type: 'string',
				default: '',
				required: true,
				description: 'Name of the table to load from',
			},
			{
				displayName: 'Query Name',
				name: 'queryName',
				type: 'string',
				default: 'match_documents',
				required: true,
				description: 'Name of the query to use for matching documents',
			},
			...insertOperationDescription,
			...loadOperationDescription,
			...retrieveOperationDescription,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const operation = this.getNodeParameter('operation', 0) as 'load' | 'insert' | 'retrieve';

		if (operation === 'load') {
			return loadExecute.call(this);
		}

		if (operation === 'insert') {
			return insertExecute.call(this);
		}

		throw new NodeOperationError(
			this.getNode(),
			'Only the "load" and "insert" operations are supported with execute',
		);
	}

	async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
		const operation = this.getNodeParameter('operation', 0) as 'load' | 'insert' | 'retrieve';

		if (operation === 'retrieve') {
			return retrieveSupplyData.call(this, itemIndex);
		}

		throw new NodeOperationError(
			this.getNode(),
			'Only the "retrieve" operation is supported to supply data',
		);
	}
}
