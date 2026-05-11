import { describe as _describe, expect, it, afterEach } from 'vitest';

import { Agent, Memory } from '../../../index';
import { SqliteMemory } from '../../../storage/sqlite-memory';
import { describeIf, findLastTextContent, getModel, createSqliteMemory } from '../helpers';

const describe = describeIf('anthropic');

const cleanups: Array<() => void> = [];
afterEach(() => {
	cleanups.forEach((fn) => fn());
	cleanups.length = 0;
});

_describe('SqliteMemory saveThread upsert', () => {
	it('preserves existing title and metadata when not provided', async () => {
		const { memory, cleanup } = createSqliteMemory();
		cleanups.push(cleanup);

		await memory.saveThread({
			id: 'upsert-t1',
			resourceId: 'user-1',
			title: 'Original Title',
			metadata: { key: 'value' },
		});

		// Upsert without title or metadata (simulates saveMessagesToThread)
		await memory.saveThread({ id: 'upsert-t1', resourceId: 'user-1' });

		const thread = await memory.getThread('upsert-t1');
		expect(thread).not.toBeNull();
		expect(thread!.title).toBe('Original Title');
		expect(thread!.metadata).toEqual({ key: 'value' });
	});

	it('overwrites title and metadata when explicitly provided', async () => {
		const { memory, cleanup } = createSqliteMemory();
		cleanups.push(cleanup);

		await memory.saveThread({
			id: 'upsert-t2',
			resourceId: 'user-1',
			title: 'Old Title',
			metadata: { old: true },
		});

		await memory.saveThread({
			id: 'upsert-t2',
			resourceId: 'user-1',
			title: 'New Title',
			metadata: { new: true },
		});

		const thread = await memory.getThread('upsert-t2');
		expect(thread!.title).toBe('New Title');
		expect(thread!.metadata).toEqual({ new: true });
	});
});

describe('SQLite memory integration', () => {
	it('agent recalls info from previous turn with SqliteMemory', async () => {
		const { memory, cleanup } = createSqliteMemory();
		cleanups.push(cleanup);

		const mem = new Memory().storage(memory).lastMessages(10);
		const agent = new Agent('sqlite-test')
			.model(getModel('anthropic'))
			.instructions('You are a helpful assistant. Be concise.')
			.memory(mem);

		const threadId = `sqlite-${Date.now()}`;
		const options = { persistence: { threadId, resourceId: 'test-user' } };

		await agent.generate('My favorite number is 42. Just acknowledge.', options);
		const result = await agent.generate('What is my favorite number?', options);

		expect(findLastTextContent(result.messages)?.toLowerCase()).toContain('42');
	});

	it('data survives a fresh SqliteMemory instance', async () => {
		const { memory, cleanup, url } = createSqliteMemory();
		cleanups.push(cleanup);

		const mem1 = new Memory().storage(memory).lastMessages(10);
		const agent1 = new Agent('persist-test-1')
			.model(getModel('anthropic'))
			.instructions('You are a helpful assistant. Be concise.')
			.memory(mem1);

		const threadId = `persist-${Date.now()}`;
		const options = { persistence: { threadId, resourceId: 'test-user' } };
		await agent1.generate('My favorite animal is a dolphin. Just acknowledge.', options);

		// New SqliteMemory instance, same file
		const memory2 = new SqliteMemory({ url });
		const mem2 = new Memory().storage(memory2).lastMessages(10);
		const agent2 = new Agent('persist-test-2')
			.model(getModel('anthropic'))
			.instructions('You are a helpful assistant. Be concise.')
			.memory(mem2);

		const result = await agent2.generate('What is my favorite animal?', options);
		expect(findLastTextContent(result.messages)?.toLowerCase()).toContain('dolphin');
	});
});
