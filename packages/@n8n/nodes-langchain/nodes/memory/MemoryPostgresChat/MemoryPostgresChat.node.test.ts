import type { ISupplyDataFunctions } from 'n8n-workflow';

import { escapeQualifiedSqlIdentifier } from '@utils/sqlIdentifier';

const postgresChatHistoryConstructor = vi.fn();

vi.mock('@langchain/community/stores/message/postgres', () => ({
	PostgresChatMessageHistory: class {
		constructor(args: unknown) {
			postgresChatHistoryConstructor(args);
		}
	},
}));

vi.mock('@langchain/classic/memory', () => ({
	BufferMemory: class {},
	BufferWindowMemory: class {},
}));

vi.mock('n8n-nodes-base/dist/nodes/Postgres/transport/index', () => ({
	configurePostgres: vi.fn().mockResolvedValue({ db: { $pool: {} } }),
}));

vi.mock('n8n-nodes-base/dist/nodes/Postgres/v2/methods/credentialTest', () => ({
	postgresConnectionTest: vi.fn(),
}));

vi.mock('@n8n/ai-utilities', () => ({
	logWrapper: (memory: unknown) => memory,
	getConnectionHintNoticeField: () => ({}),
}));

vi.mock('@utils/helpers', () => ({
	getSessionId: () => 'fixed-session',
}));

import { MemoryPostgresChat } from './MemoryPostgresChat.node';

describe('MemoryPostgresChat', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	function createContext(tableName: string): ISupplyDataFunctions {
		return {
			getCredentials: vi.fn().mockResolvedValue({}),
			getNodeParameter: vi.fn((name: string) => {
				if (name === 'tableName') return tableName;
				return undefined;
			}),
			getNode: () => ({ typeVersion: 1, name: 'Postgres Chat Memory' }),
		} as unknown as ISupplyDataFunctions;
	}

	it('passes a quoted table name to the chat history store', async () => {
		const node = new MemoryPostgresChat();
		const context = createContext('n8n_chat_histories');

		await node.supplyData.call(context, 0);

		expect(postgresChatHistoryConstructor).toHaveBeenCalledTimes(1);
		const args = postgresChatHistoryConstructor.mock.calls[0]?.[0] as { tableName: string };
		expect(args.tableName).toBe('"n8n_chat_histories"');
	});

	it('quotes each part of a schema-qualified table name', async () => {
		const node = new MemoryPostgresChat();
		const context = createContext('my_schema.histories');

		await node.supplyData.call(context, 0);

		const args = postgresChatHistoryConstructor.mock.calls[0]?.[0] as { tableName: string };
		expect(args.tableName).toBe(escapeQualifiedSqlIdentifier('my_schema.histories'));
		expect(args.tableName).toBe('"my_schema"."histories"');
	});

	it('falls back to the default when the table name resolves to empty', async () => {
		const node = new MemoryPostgresChat();
		// e.g. an expression like {{ $json.tableName }} when the request omits tableName
		const context = {
			getCredentials: vi.fn().mockResolvedValue({}),
			getNodeParameter: vi.fn().mockReturnValue(undefined),
			getNode: () => ({ typeVersion: 1, name: 'Postgres Chat Memory' }),
		} as unknown as ISupplyDataFunctions;

		await node.supplyData.call(context, 0);

		const args = postgresChatHistoryConstructor.mock.calls[0]?.[0] as { tableName: string };
		expect(args.tableName).toBe('"n8n_chat_histories"');
	});

	it('rejects a statement-breaking table name before it reaches the store', async () => {
		const node = new MemoryPostgresChat();
		const context = createContext('foo; DROP TABLE victim; --');

		await expect(node.supplyData.call(context, 0)).rejects.toThrow('Invalid table name');
		expect(postgresChatHistoryConstructor).not.toHaveBeenCalled();
	});
});
