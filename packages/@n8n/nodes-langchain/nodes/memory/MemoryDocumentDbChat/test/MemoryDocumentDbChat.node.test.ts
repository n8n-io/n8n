import { AIMessage, HumanMessage } from '@langchain/core/messages';
import type { Collection } from 'mongodb';

import { DocumentDbChatMessageHistory } from '../MemoryDocumentDbChat.node';

describe('DocumentDbChatMessageHistory', () => {
	const toArray = vi.fn();
	const sort = vi.fn(() => ({ toArray }));
	const collection = {
		createIndex: vi.fn(),
		find: vi.fn(() => ({ sort })),
		insertOne: vi.fn(),
		deleteMany: vi.fn(),
	} as unknown as Collection<{
		sessionId: string;
		message: { type: string; data: Record<string, unknown> };
		createdAt: Date;
	}>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('creates an index for session message lookups', async () => {
		const history = new DocumentDbChatMessageHistory(collection, 'session-1');

		await history.ensureIndex();

		expect(collection.createIndex).toHaveBeenCalledWith({ sessionId: 1, createdAt: 1 });
	});

	it('stores messages for the current session', async () => {
		const history = new DocumentDbChatMessageHistory(collection, 'session-1');

		await history.addMessage(new HumanMessage('Hello'));

		expect(collection.insertOne).toHaveBeenCalledWith({
			sessionId: 'session-1',
			message: expect.objectContaining({ type: 'human' }),
			createdAt: expect.any(Date),
		});
	});

	it('loads messages in insertion order', async () => {
		toArray.mockResolvedValue([
			{
				message: { type: 'human', data: { content: 'Hello', additional_kwargs: {} } },
			},
			{
				message: { type: 'ai', data: { content: 'Hi', additional_kwargs: {} } },
			},
		]);
		const history = new DocumentDbChatMessageHistory(collection, 'session-1');

		const messages = await history.getMessages();

		expect(collection.find).toHaveBeenCalledWith({ sessionId: 'session-1' });
		expect(sort).toHaveBeenCalledWith({ createdAt: 1, _id: 1 });
		expect(messages[0]).toBeInstanceOf(HumanMessage);
		expect(messages[1]).toBeInstanceOf(AIMessage);
	});

	it('clears only the current session', async () => {
		const history = new DocumentDbChatMessageHistory(collection, 'session-1');

		await history.clear();

		expect(collection.deleteMany).toHaveBeenCalledWith({ sessionId: 'session-1' });
	});
});
