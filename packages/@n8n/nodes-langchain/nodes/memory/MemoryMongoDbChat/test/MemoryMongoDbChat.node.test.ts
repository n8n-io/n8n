import type { ISupplyDataFunctions } from 'n8n-workflow';

const mockMongoClient = {
	connect: jest.fn(),
	db: jest.fn(() => ({ collection: jest.fn(() => ({})) })),
	close: jest.fn(),
};

jest.mock('mongodb', () => ({ MongoClient: jest.fn(() => mockMongoClient) }));
jest.mock('@langchain/mongodb', () => ({ MongoDBChatMessageHistory: jest.fn() }));
jest.mock('@langchain/classic/memory', () => ({ BufferWindowMemory: jest.fn() }));
jest.mock('@utils/sharedFields', () => ({ getConnectionHintNoticeField: jest.fn(() => ({})) }));
jest.mock('@utils/logWrapper', () => ({ logWrapper: jest.fn((memory) => memory) }));

import { MongoClient } from 'mongodb';

import { MemoryMongoDbChat } from '../MemoryMongoDbChat.node';

type MongoDbChatCredentials = {
	configurationType: string;
	connectionString: string;
	database: string;
	host: string;
	user: string;
	port: number;
	password: string;
	tls: boolean;
};

function createContext(credentials: MongoDbChatCredentials, databaseName: string) {
	return {
		getCredentials: jest.fn().mockResolvedValue(credentials),
		getNode: jest.fn(() => ({ name: 'MongoDB Chat Memory' })),
		getNodeParameter: jest.fn((name: string, _itemIndex: number, defaultValue?: unknown) => {
			if (name === 'collectionName') return 'messages';
			if (name === 'databaseName') return databaseName;
			if (name === 'sessionIdType') return 'custom';
			if (name === 'sessionKey') return 'session';
			return defaultValue;
		}),
	} as unknown as ISupplyDataFunctions;
}

describe('MemoryMongoDbChat', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('trims host and database values', async () => {
		const context = createContext(
			{
				configurationType: 'values',
				connectionString: '',
				database: '  credential-db  ',
				host: '  localhost  ',
				user: 'user',
				port: 27017,
				password: 'password',
				tls: false,
			},
			'   ',
		);

		await new MemoryMongoDbChat().supplyData.call(context, 0);

		expect(MongoClient).toHaveBeenCalledWith(
			'mongodb://user:password@localhost:27017/?appname=n8n',
		);
		expect(mockMongoClient.db).toHaveBeenCalledWith('credential-db');
	});

	it('trims the connection string and node database value', async () => {
		const context = createContext(
			{
				configurationType: 'connectionString',
				connectionString: '  mongodb://localhost:27017  ',
				database: 'credential-db',
				host: '',
				user: '',
				port: 27017,
				password: '',
				tls: false,
			},
			'  node-db  ',
		);

		await new MemoryMongoDbChat().supplyData.call(context, 0);

		expect(MongoClient).toHaveBeenCalledWith('mongodb://localhost:27017');
		expect(mockMongoClient.db).toHaveBeenCalledWith('node-db');
	});
});
