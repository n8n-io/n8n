import { InMemoryMemory } from '../runtime/memory-store';
import type { AgentDbMessage, AgentMessage, Message } from '../types/sdk/message';

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

describe('InMemoryMemory — message keyset reads', () => {
	it('returns messages ordered by (createdAt, id) ascending', async () => {
		const mem = new InMemoryMemory();
		const t = Date.now();
		await mem.saveMessages({
			threadId: 't-1',
			resourceId: 'u-1',
			messages: [makeMsg('user', 'one', new Date(t)), makeMsg('assistant', 'two', new Date(t + 1))],
		});
		await mem.saveMessages({
			threadId: 't-1',
			resourceId: 'u-1',
			messages: [makeMsg('user', 'three', new Date(t + 2))],
		});

		const all = await mem.getMessages('t-1');
		expect(all.map(textOf)).toEqual(['one', 'two', 'three']);
	});

	it('upsert by id preserves identity (re-saving the same id does not duplicate)', async () => {
		const mem = new InMemoryMemory();
		const original = makeMsg('user', 'original');
		await mem.saveMessages({ threadId: 't-1', resourceId: 'u-1', messages: [original] });

		const edited: AgentDbMessage = {
			id: original.id,
			createdAt: original.createdAt,
			role: 'user',
			content: [{ type: 'text', text: 'edited' }],
		};
		await mem.saveMessages({ threadId: 't-1', resourceId: 'u-1', messages: [edited] });

		const all = await mem.getMessages('t-1');
		expect(all).toHaveLength(1);
		expect(textOf(all[0])).toBe('edited');
	});

	it('filters by since (createdAt, id) keyset', async () => {
		const mem = new InMemoryMemory();
		const t = Date.now();
		await mem.saveMessages({
			threadId: 't-1',
			resourceId: 'u-1',
			messages: [
				makeMsg('user', 'a', new Date(t)),
				makeMsg('assistant', 'b', new Date(t + 1)),
				makeMsg('user', 'c', new Date(t + 2)),
			],
		});

		const all = await mem.getMessages('t-1');

		const tail = await mem.getMessages('t-1', {
			since: { sinceCreatedAt: all[0].createdAt, sinceMessageId: all[0].id },
		});
		expect(tail.map(textOf)).toEqual(['b', 'c']);

		const empty = await mem.getMessages('t-1', {
			since: { sinceCreatedAt: all[2].createdAt, sinceMessageId: all[2].id },
		});
		expect(empty).toEqual([]);
	});

	it('keyset since includes rows sharing createdAt with the anchor when id is greater', async () => {
		const mem = new InMemoryMemory();
		const at = new Date();
		const m1 = makeMsg('user', 'a', at);
		const m2 = makeMsg('user', 'b', at);
		await mem.saveMessages({ threadId: 't-1', resourceId: 'u-1', messages: [m1, m2] });

		const [low, high] = [m1, m2].sort((a, b) => (a.id < b.id ? -1 : 1));
		const tail = await mem.getMessages('t-1', {
			since: { sinceCreatedAt: low.createdAt, sinceMessageId: low.id },
		});
		expect(tail).toHaveLength(1);
		expect(tail[0].id).toBe(high.id);
	});
});
