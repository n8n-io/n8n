// cspell:ignore langchain oracledb ONNX MINILM
import { Embeddings } from '@langchain/core/embeddings';
import { getConnectionHintNoticeField, logWrapper } from '@n8n/ai-utilities';
import { OracleEmbeddings } from '@oracle/langchain-oracledb';
import { configureOracleDB } from 'n8n-nodes-base/dist/nodes/Oracle/Sql/transport';
import type { OracleDBNodeCredentials } from 'n8n-nodes-base/nodes/Oracle/Sql/helpers/interfaces';
import {
	NodeConnectionTypes,
	type INodeProperties,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';
import type oracledb from 'oracledb';

import { searchModels } from './listModels';

// Local type augmentation to avoid lint noise about unknown return types;
// remove once upstream adds them.
declare module '@oracle/langchain-oracledb' {
	interface OracleEmbeddings {
		embedDocuments(documents: string[]): Promise<number[][]>;
		embedQuery(document: string): Promise<number[]>;
	}
}

export const generationFields: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'model',
		type: 'resourceLocator',
		default: { mode: 'list', value: 'ALL_MINILM_L12_V2' },
		required: true,
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a model...',
				typeOptions: {
					searchListMethod: 'searchModels',
					searchable: true,
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: 'ALL_MINILM_L12_V2',
			},
		],
		description: 'The model. Choose from the list, or specify an ID.',
	},
];

/**
 * Wraps the Oracle embeddings implementation so we can always borrow
 * a connection from n8n's pooled Oracle client right before each call.
 * This keeps connection lifecycle aligned with the existing pool manager.
 */
class PooledOracleEmbeddings extends Embeddings {
	constructor(
		private readonly getPool: () => Promise<oracledb.Pool>,
		private readonly pref: Record<string, unknown>,
	) {
		super({});
	}

	private async withConnection<T>(
		executor: (embeddings: OracleEmbeddings) => Promise<T>,
	): Promise<T> {
		const pool = await this.getPool();
		const connection = await pool.getConnection();
		try {
			const embeddings = new OracleEmbeddings(connection, this.pref);
			return await executor(embeddings);
		} finally {
			await connection.close();
		}
	}

	override async embedDocuments(documents: string[]): Promise<number[][]> {
		return await this.withConnection<number[][]>(
			async (embeddings) => await embeddings.embedDocuments(documents),
		);
	}

	override async embedQuery(query: string): Promise<number[]> {
		return await this.withConnection<number[]>(
			async (embeddings) => await embeddings.embedQuery(query),
		);
	}
}

export class EmbeddingsOracleDb implements INodeType {
	methods = {
		listSearch: {
			searchModels,
		},
	};
	description: INodeTypeDescription = {
		displayName: 'Embeddings Oracle Database',
		name: 'embeddingsOracleDb',
		icon: 'file:../../shared/icons/oracle.svg',
		group: ['transform'],
		version: 1,
		description: 'Use ONNX Embeddings',
		defaults: {
			name: 'Embeddings ONNX',
		},
		credentials: [
			{
				name: 'oracleDBApi',
				required: true,
			},
		],
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Embeddings'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.oracle.com/en/database/oracle/oracle-database/26/vecse/import-onnx-models-oracle-ai-database-end-end-example.html',
					},
				],
			},
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiEmbedding],
		outputNames: ['Embeddings'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiVectorStore]),
			...generationFields,
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		this.logger.debug('Supply data for ONNX embeddings Oracle');
		const modelName = this.getNodeParameter('model', itemIndex, '', {
			extractValue: true,
		}) as string;

		const credentials = await this.getCredentials('oracleDBApi');
		const pref = {
			provider: 'database',
			model: modelName,
		};
		const getPool = async () =>
			await configureOracleDB.call(this, credentials as OracleDBNodeCredentials);
		const embeddings = new PooledOracleEmbeddings(getPool, pref);

		return {
			response: logWrapper(embeddings, this),
		};
	}
}
