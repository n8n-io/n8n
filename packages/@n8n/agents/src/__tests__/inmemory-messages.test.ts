import { InMemoryMemory } from '../runtime/memory-store';
import type { AgentDbMessage, AgentMessage, Message } from '../types/sdk/message';

function makeMsg(role: 'user' | 'assistant', text: string): AgentDbMessage {
	return {
		id: crypto.randomUUID(),
		createdAt: new Date(),
		role,
		content: [{ type: 'text', text }],
	};
}

function textOf(msg: AgentMessage): string {
	const m = msg as Message;
	return (m.content[0] as { text: string }).text;
}

describe('InMemoryMemory — message seq + sinceSeq', () => {
	it('assigns monotonic seq on save and exposes it on read', async () => {
		const mem = new InMemoryMemory();
		await mem.saveMessages({
			threadId: 't-1',
			resourceId: 'u-1',
			messages: [makeMsg('user', 'one'), makeMsg('assistant', 'two')],
		});
		await mem.saveMessages({
			threadId: 't-1',
			resourceId: 'u-1',
			messages: [makeMsg('user', 'three')],
		});

		const all = await mem.getMessages('t-1');
		const seqs = all.map((m) => m.seq!);
		expect(seqs).toEqual([seqs[0], seqs[0] + 1, seqs[0] + 2]);
	});

	it('preserves seq across upsert (re-saving the same id does not advance)', async () => {
		const mem = new InMemoryMemory();
		const original = makeMsg('user', 'original');
		await mem.saveMessages({ threadId: 't-1', resourceId: 'u-1', messages: [original] });
		const [first] = await mem.getMessages('t-1');
		const originalSeq = first.seq!;

		const edited: AgentDbMessage = {
			id: original.id,
			createdAt: original.createdAt,
			role: 'user',
			content: [{ type: 'text', text: 'edited' }],
		};
		await mem.saveMessages({ threadId: 't-1', resourceId: 'u-1', messages: [edited] });

		const [after] = await mem.getMessages('t-1');
		expect(after.seq).toBe(originalSeq);
		expect(textOf(after)).toBe('edited');
	});

	it('filters by sinceSeq', async () => {
		const mem = new InMemoryMemory();
		await mem.saveMessages({
			threadId: 't-1',
			resourceId: 'u-1',
			messages: [makeMsg('user', 'a'), makeMsg('assistant', 'b'), makeMsg('user', 'c')],
		});

		const all = await mem.getMessages('t-1');
		const seqs = all.map((m) => m.seq!);

		const tail = await mem.getMessages('t-1', { sinceSeq: seqs[0] });
		expect(tail.map(textOf)).toEqual(['b', 'c']);

		const empty = await mem.getMessages('t-1', { sinceSeq: seqs[2] });
		expect(empty).toEqual([]);
	});

	it('seq is global across threads, not per-thread', async () => {
		const mem = new InMemoryMemory();
		await mem.saveMessages({
			threadId: 't-a',
			resourceId: 'u-1',
			messages: [makeMsg('user', 'a-1')],
		});
		await mem.saveMessages({
			threadId: 't-b',
			resourceId: 'u-1',
			messages: [makeMsg('user', 'b-1')],
		});
		await mem.saveMessages({
			threadId: 't-a',
			resourceId: 'u-1',
			messages: [makeMsg('user', 'a-2')],
		});

		const a = await mem.getMessages('t-a');
		const b = await mem.getMessages('t-b');
		expect(a[0].seq).toBeLessThan(b[0].seq!);
		expect(b[0].seq).toBeLessThan(a[1].seq!);
	});
});
