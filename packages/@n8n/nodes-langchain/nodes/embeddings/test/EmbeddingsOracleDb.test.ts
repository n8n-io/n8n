// cspell:ignore langchain oracledb ONNX
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type * as AiUtilitiesModule from '@n8n/ai-utilities';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';
import type oracledb from 'oracledb';

import { EmbeddingsOracleDb } from '../EmbeddingsOracleDB/EmbeddingsOracleDb.node';

const mockClose = jest.fn();
const mockGetConnection = jest.fn();
const mockEmbedQuery = jest.fn();
const mockEmbedDocuments = jest.fn();

jest.mock('@n8n/ai-utilities', () => {
	const actual = jest.requireActual<typeof AiUtilitiesModule>('@n8n/ai-utilities');
	const logWrapperMock: typeof actual.logWrapper = (instance) => instance;
	return {
		...actual,
		logWrapper: jest.fn(logWrapperMock),
	};
});

jest.mock('@oracle/langchain-oracledb', () => ({
	OracleEmbeddings: jest.fn().mockImplementation(() => ({
		embedQuery: mockEmbedQuery,
		embedDocuments: mockEmbedDocuments,
	})),
}));

jest.mock('n8n-nodes-base/dist/nodes/Oracle/Sql/transport', () => ({
	configureOracleDB: jest.fn(async () => {
		await Promise.resolve();
		return { getConnection: mockGetConnection };
	}),
}));

describe('EmbeddingsOracleDb', () => {
	let node: EmbeddingsOracleDb;
	let context: jest.Mocked<ISupplyDataFunctions>;
	let connection: { close: jest.Mock };

	const baseNode: INode = {
		id: '1',
		name: 'Embeddings Oracle DB',
		type: '@n8n/n8n-nodes-langchain.embeddingsOracleDb',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};

	beforeEach(() => {
		node = new EmbeddingsOracleDb();
		connection = { close: mockClose } as unknown as oracledb.Connection & { close: jest.Mock };
		mockClose.mockResolvedValue(undefined);
		mockGetConnection.mockResolvedValue(connection);
		mockEmbedQuery.mockResolvedValue([1]);
		mockEmbedDocuments.mockResolvedValue([[1]]);

		context = createMockExecuteFunction<ISupplyDataFunctions>(
			{},
			baseNode,
		) as jest.Mocked<ISupplyDataFunctions>;

		context.getNodeParameter = jest.fn().mockImplementation((parameterName: string) => {
			if (parameterName === 'model') return 'ONNX_MODEL';
			return undefined;
		});

		context.getCredentials = jest.fn().mockResolvedValue({ user: 'user', password: 'pw' });
		context.logger = {
			debug: jest.fn(),
			error: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
		};
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('borrows and releases a connection per embedding call', async () => {
		const supplyData = await node.supplyData.call(context, 0);
		const embeddingsResponse = supplyData.response as {
			embedQuery: typeof mockEmbedQuery;
			embedDocuments: typeof mockEmbedDocuments;
		};

		await embeddingsResponse.embedQuery('hello world');
		await embeddingsResponse.embedDocuments(['doc one', 'doc two']);

		expect(mockGetConnection).toHaveBeenCalledTimes(2);
		expect(mockEmbedQuery).toHaveBeenCalledWith('hello world');
		expect(mockEmbedDocuments).toHaveBeenCalledWith(['doc one', 'doc two']);
		expect(mockClose).toHaveBeenCalledTimes(2);
	});

	it('still releases the connection when the embedding call throws', async () => {
		mockEmbedQuery.mockRejectedValueOnce(new Error('oracle failure'));

		const supplyData = await node.supplyData.call(context, 0);
		const embeddingsResponse = supplyData.response as {
			embedQuery: typeof mockEmbedQuery;
			embedDocuments: typeof mockEmbedDocuments;
		};

		await expect(embeddingsResponse.embedQuery('boom')).rejects.toThrow('oracle failure');
		expect(mockGetConnection).toHaveBeenCalledTimes(1);
		expect(mockClose).toHaveBeenCalledTimes(1);
	});
});
