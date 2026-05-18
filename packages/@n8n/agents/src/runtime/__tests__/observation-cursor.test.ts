import type { AgentDbMessage, AgentMessage, Message } from '../../types/sdk/message';
import { InMemoryMemory } from '../memory-store';
import { advanceCursor, getDeltaSinceCursor } from '../observation-cursor';

function makeMsg(role: 'user' | 'assistant', text: string, createdAt = new Date()): AgentDbMessage {
	return {
		id: crypto.randomUUID(),
		createdAt,
		role,
		content: [{ type: 'text', text }],
	};
}

function textOf(msg: AgentMessage): string {
	const m = msg as Message;
	return (m.content[0] as { text: string }).text;
}

describe('getDeltaSinceCursor', () => {
	it('returns the full thread history when no cursor exists', async () => {
		const store = new InMemoryMemory();
		const t = Date.now();
		await store.saveThread({ id: 't-1', resourceId: 'u-1' });
		await store.saveMessages({
			threadId: 't-1',
			resourceId: 'u-1',
			messages: [makeMsg('user', 'one', new Date(t)), makeMsg('assistant', 'two', new Date(t + 1))],
		});

		const { messages, cursor } = await getDeltaSinceCursor(store, 'thread', 't-1');
		expect(cursor).toBeNull();
		expect(messages.map(textOf)).toEqual(['one', 'two']);
	});

	it('returns only messages strictly after the cursor keyset', async () => {
		const store = new InMemoryMemory();
		const t = Date.now();
		await store.saveThread({ id: 't-1', resourceId: 'u-1' });
		await store.saveMessages({
			threadId: 't-1',
			resourceId: 'u-1',
			messages: [makeMsg('user', 'one', new Date(t)), makeMsg('assistant', 'two', new Date(t + 1))],
		});
		const [first] = await store.getMessages('t-1');
		await store.setCursor({
			scopeKind: 'thread',
			scopeId: 't-1',
			lastObservedMessageId: first.id,
			lastObservedAt: first.createdAt,
			updatedAt: new Date(),
		});
		await store.saveMessages({
			threadId: 't-1',
			resourceId: 'u-1',
			messages: [makeMsg('user', 'three', new Date(t + 2))],
		});

		const { messages, cursor } = await getDeltaSinceCursor(store, 'thread', 't-1');
		expect(cursor?.lastObservedMessageId).toBe(first.id);
		expect(messages.map(textOf)).toEqual(['two', 'three']);
	});

	it('returns an empty delta when the cursor is at the latest message', async () => {
		const store = new InMemoryMemory();
		await store.saveThread({ id: 't-1', resourceId: 'u-1' });
		await store.saveMessages({
			threadId: 't-1',
			resourceId: 'u-1',
			messages: [makeMsg('user', 'one')],
		});
		const [only] = await store.getMessages('t-1');
		await store.setCursor({
			scopeKind: 'thread',
			scopeId: 't-1',
			lastObservedMessageId: only.id,
			lastObservedAt: only.createdAt,
			updatedAt: new Date(),
		});

		const { messages } = await getDeltaSinceCursor(store, 'thread', 't-1');
		expect(messages).toEqual([]);
	});

	it('isolates cursors by scope', async () => {
		const store = new InMemoryMemory();
		const t = Date.now();
		await store.saveThread({ id: 't-A', resourceId: 'u-1' });
		await store.saveThread({ id: 't-B', resourceId: 'u-1' });
		await store.saveMessages({
			threadId: 't-A',
			resourceId: 'u-1',
			messages: [makeMsg('user', 'a-1', new Date(t)), makeMsg('user', 'a-2', new Date(t + 1))],
		});
		await store.saveMessages({
			threadId: 't-B',
			resourceId: 'u-1',
			messages: [makeMsg('user', 'b-1', new Date(t + 2))],
		});
		const aMessages = await store.getMessages('t-A');
		await store.setCursor({
			scopeKind: 'thread',
			scopeId: 't-A',
			lastObservedMessageId: aMessages[0].id,
			lastObservedAt: aMessages[0].createdAt,
			updatedAt: new Date(),
		});

		const aDelta = await getDeltaSinceCursor(store, 'thread', 't-A');
		expect(aDelta.messages.map(textOf)).toEqual(['a-2']);

		// Thread B has no cursor; should still return its full history.
		const bDelta = await getDeltaSinceCursor(store, 'thread', 't-B');
		expect(bDelta.cursor).toBeNull();
		expect(bDelta.messages.map(textOf)).toEqual(['b-1']);
	});
});

describe('advanceCursor', () => {
	it('writes a cursor row matching the message id and createdAt', async () => {
		const store = new InMemoryMemory();
		await store.saveThread({ id: 't-1', resourceId: 'u-1' });
		await store.saveMessages({
			threadId: 't-1',
			resourceId: 'u-1',
			messages: [makeMsg('user', 'one')],
		});
		const [only] = await store.getMessages('t-1');

		const written = await advanceCursor(store, 'thread', 't-1', only);
		expect(written.lastObservedMessageId).toBe(only.id);
		expect(written.lastObservedAt.getTime()).toBe(only.createdAt.getTime());

		const reread = await store.getCursor('thread', 't-1');
		expect(reread?.lastObservedMessageId).toBe(only.id);
		expect(reread?.lastObservedAt.getTime()).toBe(only.createdAt.getTime());
	});

	it('uses the provided `now` for updatedAt', async () => {
		const store = new InMemoryMemory();
		await store.saveThread({ id: 't-1', resourceId: 'u-1' });
		await store.saveMessages({
			threadId: 't-1',
			resourceId: 'u-1',
			messages: [makeMsg('user', 'one')],
		});
		const [only] = await store.getMessages('t-1');
		const now = new Date('2026-05-05T12:00:00Z');

		const cursor = await advanceCursor(store, 'thread', 't-1', only, now);
		expect(cursor.updatedAt.getTime()).toBe(now.getTime());
	});

	it('overwrites a prior cursor (advance is upsert, not append)', async () => {
		const store = new InMemoryMemory();
		const t = Date.now();
		await store.saveThread({ id: 't-1', resourceId: 'u-1' });
		await store.saveMessages({
			threadId: 't-1',
			resourceId: 'u-1',
			messages: [makeMsg('user', 'one', new Date(t)), makeMsg('user', 'two', new Date(t + 1))],
		});
		const [first, second] = await store.getMessages('t-1');

		await advanceCursor(store, 'thread', 't-1', first);
		await advanceCursor(store, 'thread', 't-1', second);

		const reread = await store.getCursor('thread', 't-1');
		expect(reread?.lastObservedMessageId).toBe(second.id);
	});
});
