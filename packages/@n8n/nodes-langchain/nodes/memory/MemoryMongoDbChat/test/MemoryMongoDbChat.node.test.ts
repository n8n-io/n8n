import type { ISupplyDataFunctions } from 'n8n-workflow';

const { mongoClient, mongoClientConstructor } = vi.hoisted(() => {
	const client = {
		connect: vi.fn(),
		db: vi.fn(() => ({ collection: vi.fn(() => ({})) })),
		close: vi.fn(),
	};

	return {
		mongoClient: client,
		mongoClientConstructor: vi.fn(function MongoClientMock() {
			return client;
		}),
	};
});

vi.mock('mongodb', () => ({ MongoClient: mongoClientConstructor }));
vi.mock('@langchain/mongodb', () => ({ MongoDBChatMessageHistory: vi.fn() }));
vi.mock('@langchain/classic/memory', () => ({ BufferWindowMemory: vi.fn() }));
vi.mock('@n8n/ai-utilities', () => ({
	getConnectionHintNoticeField: vi.fn(() => ({})),
	logWrapper: vi.fn((memory) => memory),
}));

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
		getCredentials: vi.fn().mockResolvedValue(credentials),
		getNode: vi.fn(() => ({ name: 'MongoDB Chat Memory' })),
		getNodeParameter: vi.fn((name: string, _itemIndex: number, defaultValue?: unknown) => {
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
		vi.clearAllMocks();
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

		expect(mongoClientConstructor).toHaveBeenCalledWith(
			'mongodb://user:password@localhost:27017/?appname=n8n',
			expect.any(Object),
		);
		expect(mongoClient.db).toHaveBeenCalledWith('credential-db');
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

		expect(mongoClientConstructor).toHaveBeenCalledWith(
			'mongodb://localhost:27017',
			expect.any(Object),
		);
		expect(mongoClient.db).toHaveBeenCalledWith('node-db');
	});
});
