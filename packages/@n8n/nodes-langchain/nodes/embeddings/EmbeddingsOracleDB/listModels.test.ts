import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { configureOracleDB } from 'n8n-nodes-base/dist/nodes/Oracle/Sql/transport';
import type oracledb from 'oracledb';

vi.mock('n8n-nodes-base/dist/nodes/Oracle/Sql/transport', () => ({
	configureOracleDB: vi.fn(),
}));

const mockConfigureOracleDB = vi.mocked(configureOracleDB);

import { searchModels } from './listModels';

const normalizeSql = (sql: string) => sql.replace(/\s+/g, ' ').trim();

describe('EmbeddingsOracleDB listModels', () => {
	const connection = {
		execute: jest.fn(),
		close: jest.fn(),
	};

	const pool = {
		getConnection: jest.fn(),
	};

	const context = {
		getCredentials: jest.fn(),
		logger: {
			debug: jest.fn(),
			error: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
		},
	} as unknown as jest.Mocked<ILoadOptionsFunctions>;

	beforeEach(() => {
		jest.clearAllMocks();
		mockConfigureOracleDB.mockResolvedValue(pool as unknown as oracledb.Pool);
		pool.getConnection = jest.fn().mockResolvedValue(connection);
		connection.execute = jest.fn().mockResolvedValue({
			rows: [['MODEL_A'], ['MODEL_B']],
		});
		connection.close = jest.fn().mockResolvedValue(undefined);
		context.getCredentials.mockResolvedValue({ user: 'user', password: 'pw' });
	});

	it('returns models and always closes the connection', async () => {
		const result = await searchModels.call(context, '');

		expect(mockConfigureOracleDB).toHaveBeenCalledWith({ user: 'user', password: 'pw' });
		expect(pool.getConnection).toHaveBeenCalledTimes(1);
		const [sql, binds] = connection.execute.mock.calls[0] as [string, Record<string, string>];
		expect(normalizeSql(sql)).toBe('SELECT model_name FROM user_mining_models ORDER BY model_name');
		expect(binds).toEqual({});
		expect(connection.close).toHaveBeenCalledTimes(1);
		expect(result).toEqual({
			results: [
				{ name: 'MODEL_A', value: 'MODEL_A' },
				{ name: 'MODEL_B', value: 'MODEL_B' },
			],
		});
	});

	it('filters models in the query using bind params', async () => {
		connection.execute.mockResolvedValueOnce({
			rows: [['MODEL_A']],
		});

		const result = await searchModels.call(context, 'model_%\\a');

		const [sql, binds] = connection.execute.mock.calls[0] as [string, Record<string, string>];
		expect(normalizeSql(sql)).toBe(
			'SELECT model_name FROM user_mining_models WHERE INSTR(UPPER(model_name), :modelNameFilter) > 0 ORDER BY model_name',
		);
		expect(binds).toEqual({ modelNameFilter: 'MODEL_%\\A' });
		expect(connection.close).toHaveBeenCalledTimes(1);
		expect(result).toEqual({
			results: [{ name: 'MODEL_A', value: 'MODEL_A' }],
		});
	});

	it('closes the connection even when the query fails', async () => {
		connection.execute.mockRejectedValueOnce(new Error('bad query'));

		await expect(searchModels.call(context, '')).rejects.toThrow('bad query');
		expect(connection.close).toHaveBeenCalledTimes(1);
	});
});
