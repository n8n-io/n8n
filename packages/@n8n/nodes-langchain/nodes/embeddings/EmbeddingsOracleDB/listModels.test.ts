import type { ILoadOptionsFunctions } from 'n8n-workflow';

const configureOracleDBMock = jest.fn();
jest.mock('n8n-nodes-base/dist/nodes/Oracle/Sql/transport', () => ({
	configureOracleDB: configureOracleDBMock,
}));

import { searchModels } from './listModels';

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
		configureOracleDBMock.mockResolvedValue(pool);
		pool.getConnection = jest.fn().mockResolvedValue(connection);
		connection.execute = jest.fn().mockResolvedValue({
			rows: [['MODEL_A'], ['MODEL_B']],
		});
		connection.close = jest.fn().mockResolvedValue(undefined);
		context.getCredentials.mockResolvedValue({ user: 'user', password: 'pw' });
	});

	it('returns models and always closes the connection', async () => {
		const result = await searchModels.call(context, '');

		expect(configureOracleDBMock).toHaveBeenCalledWith({ user: 'user', password: 'pw' });
		expect(pool.getConnection).toHaveBeenCalledTimes(1);
		expect(connection.execute).toHaveBeenCalledWith('select model_name from user_mining_models');
		expect(connection.close).toHaveBeenCalledTimes(1);
		expect(result).toEqual({
			results: [
				{ name: 'MODEL_A', value: 'MODEL_A' },
				{ name: 'MODEL_B', value: 'MODEL_B' },
			],
		});
	});

	it('closes the connection even when the query fails', async () => {
		connection.execute.mockRejectedValueOnce(new Error('bad query'));

		await expect(searchModels.call(context, '')).rejects.toThrow('bad query');
		expect(connection.close).toHaveBeenCalledTimes(1);
	});
});
