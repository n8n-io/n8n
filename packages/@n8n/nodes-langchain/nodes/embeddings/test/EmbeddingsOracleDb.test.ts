// cspell:ignore langchain oracledb ONNX
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type * as AiUtilitiesModule from '@n8n/ai-utilities';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';
import type oracledb from 'oracledb';
import { configureOracleDB } from 'n8n-nodes-base/dist/nodes/Oracle/Sql/transport';

import { EmbeddingsOracleDb } from '../EmbeddingsOracleDB/EmbeddingsOracleDb.node';

const { mockGetConnection, mockEmbedQuery, mockEmbedDocuments } = vi.hoisted(() => ({
	mockGetConnection: vi.fn(),
	mockEmbedQuery: vi.fn(),
	mockEmbedDocuments: vi.fn(),
}));

type MockConnection = oracledb.Connection & { close: jest.Mock };

vi.mock('@n8n/ai-utilities', async (importOriginal) => {
	const actual = await importOriginal<typeof AiUtilitiesModule>();
	const logWrapperMock: typeof actual.logWrapper = (instance) => instance;
	return {
		...actual,
		logWrapper: vi.fn(logWrapperMock),
	};
});

vi.mock('@oracle/langchain-oracledb', () => ({
	OracleEmbeddings: vi.fn().mockImplementation(function OracleEmbeddingsMock() {
		return {
			embedQuery: mockEmbedQuery,
			embedDocuments: mockEmbedDocuments,
		};
	}),
}));

vi.mock('n8n-nodes-base/dist/nodes/Oracle/Sql/transport', () => ({
	configureOracleDB: vi.fn(),
}));

const mockConfigureOracleDB = vi.mocked(configureOracleDB);

describe('EmbeddingsOracleDb', () => {
	let node: EmbeddingsOracleDb;
	let context: jest.Mocked<ISupplyDataFunctions>;
	let borrowedConnections: MockConnection[];

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
		borrowedConnections = [];
		mockConfigureOracleDB.mockResolvedValue({
			getConnection: mockGetConnection,
		} as unknown as oracledb.Pool);
		mockGetConnection.mockImplementation(async () => {
			const connection = {
				close: jest.fn().mockResolvedValue(undefined),
			} as unknown as MockConnection;
			borrowedConnections.push(connection);
			return connection;
		});
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
		mockConfigureOracleDB.mockReset();
		mockGetConnection.mockReset();
		mockEmbedQuery.mockReset();
		mockEmbedDocuments.mockReset();
	});

	it('borrows and releases a connection per embedding call', async () => {
		const supplyData = await node.supplyData.call(context, 0);
		const embeddingsResponse = supplyData.response as {
			embedQuery: typeof mockEmbedQuery;
			embedDocuments: typeof mockEmbedDocuments;
		};

		await embeddingsResponse.embedQuery('hello world');
		await embeddingsResponse.embedDocuments(['doc one', 'doc two']);

		expect(mockConfigureOracleDB).toHaveBeenCalledWith(
			expect.objectContaining({ user: 'user', password: 'pw' }),
		);
		expect(mockGetConnection).toHaveBeenCalledTimes(2);
		expect(mockEmbedQuery).toHaveBeenCalledWith('hello world');
		expect(mockEmbedDocuments).toHaveBeenCalledWith(['doc one', 'doc two']);
		expect(borrowedConnections).toHaveLength(2);
		expect(borrowedConnections[0]).not.toBe(borrowedConnections[1]);
		borrowedConnections.forEach((connection) => expect(connection.close).toHaveBeenCalledTimes(1));
	});

	it('still releases the connection when the embedding call throws', async () => {
		mockEmbedQuery.mockRejectedValueOnce(new Error('oracle failure'));

		const supplyData = await node.supplyData.call(context, 0);
		const embeddingsResponse = supplyData.response as {
			embedQuery: typeof mockEmbedQuery;
			embedDocuments: typeof mockEmbedDocuments;
		};

		await expect(embeddingsResponse.embedQuery('boom')).rejects.toThrow('oracle failure');
		expect(mockConfigureOracleDB).toHaveBeenCalledWith(
			expect.objectContaining({ user: 'user', password: 'pw' }),
		);
		expect(mockGetConnection).toHaveBeenCalledTimes(1);
		expect(borrowedConnections).toHaveLength(1);
		expect(borrowedConnections[0].close).toHaveBeenCalledTimes(1);
	});
});
