import { AgentMessageList } from '../runtime/message-list';
import { isLlmMessage } from '../sdk/message';
import type { AgentDbMessage, AgentMessage, Message } from '../types/sdk/message';

function makeUserMsg(text: string): AgentMessage {
	return { role: 'user', content: [{ type: 'text', text }] };
}

function makeDbMsg(text: string, createdAt: Date): AgentDbMessage {
	return {
		id: crypto.randomUUID(),
		createdAt,
		role: 'user',
		content: [{ type: 'text', text }],
	};
}

// ---------------------------------------------------------------------------
// Monotonic timestamp assignment
// ---------------------------------------------------------------------------

describe('AgentMessageList — monotonic timestamps', () => {
	it('assigns a Date createdAt to every message added via addInput', () => {
		const list = new AgentMessageList();
		list.addInput([makeUserMsg('hello')]);

		const [msg] = list.turnDelta();
		expect(msg.createdAt).toBeInstanceOf(Date);
	});

	it('assigns strictly increasing createdAt to a batch of input messages', () => {
		const list = new AgentMessageList();
		// Three messages added in the same synchronous call — all would share the
		// same Date.now() tick without monotonic enforcement.
		list.addInput([makeUserMsg('a'), makeUserMsg('b'), makeUserMsg('c')]);

		const [a, b, c] = list.turnDelta();

		expect(a.createdAt).toBeInstanceOf(Date);
		expect(b.createdAt).toBeInstanceOf(Date);
		expect(c.createdAt).toBeInstanceOf(Date);

		expect(b.createdAt.getTime()).toBeGreaterThan(a.createdAt.getTime());
		expect(c.createdAt.getTime()).toBeGreaterThan(b.createdAt.getTime());
	});

	it('assigns strictly increasing createdAt to response messages', () => {
		const list = new AgentMessageList();
		list.addResponse([makeUserMsg('r1'), makeUserMsg('r2'), makeUserMsg('r3')]);

		const [r1, r2, r3] = list.responseDelta();

		expect(r2.createdAt.getTime()).toBeGreaterThan(r1.createdAt.getTime());
		expect(r3.createdAt.getTime()).toBeGreaterThan(r2.createdAt.getTime());
	});

	it('assigns createdAt that is strictly greater than history timestamps', () => {
		const list = new AgentMessageList();

		// Simulate a DB-loaded message with a timestamp in the future relative to
		// wall clock — the new input message must still be later.
		const futureTs = new Date(Date.now() + 60_000);
		list.addHistory([makeDbMsg('old', futureTs)]);

		list.addInput([makeUserMsg('new')]);

		const [inputMsg] = list.turnDelta();
		expect(inputMsg.createdAt).toBeInstanceOf(Date);
		expect(inputMsg.createdAt.getTime()).toBeGreaterThan(futureTs.getTime());
	});
});

// ---------------------------------------------------------------------------
// History messages keep their DB-sourced createdAt
// ---------------------------------------------------------------------------

describe('AgentMessageList — chronological order', () => {
	it('reorders addHistory when the batch is not in createdAt order', () => {
		const list = new AgentMessageList();
		const t1 = new Date('2024-01-01T00:00:01.000Z');
		const t2 = new Date('2024-01-01T00:00:02.000Z');
		list.addHistory([makeDbMsg('second', t2), makeDbMsg('first', t1)]);

		const msgs = list.serialize().messages.filter(isLlmMessage) as Message[];
		expect(msgs).toHaveLength(2);
		expect(msgs[0].content[0]).toMatchObject({ type: 'text', text: 'first' });
		expect(msgs[1].content[0]).toMatchObject({ type: 'text', text: 'second' });
	});
});

// ---------------------------------------------------------------------------
// History messages keep their DB-sourced createdAt
// ---------------------------------------------------------------------------

describe('AgentMessageList — preserving DB timestamps', () => {
	it('preserves the exact createdAt of history messages loaded from the database', () => {
		const list = new AgentMessageList();
		const dbTimestamp = new Date('2020-01-01T00:00:00.000Z');

		list.addHistory([makeDbMsg('from db', dbTimestamp)]);

		const [hist] = list.serialize().messages;
		expect(hist.createdAt).toBeInstanceOf(Date);
		expect(hist.createdAt.getTime()).toBe(dbTimestamp.getTime());
	});
});

// ---------------------------------------------------------------------------
// Input / response messages use existing createdAt as a hint
// ---------------------------------------------------------------------------

describe('AgentMessageList — hint-based monotonicity for input/response', () => {
	it('keeps an input message createdAt when it is already later than lastCreatedAt', () => {
		const list = new AgentMessageList();
		const histTs = new Date('2024-01-01T00:00:01.000Z');
		list.addHistory([makeDbMsg('hist', histTs)]);

		// freshTs is well after histTs so no bump is needed
		const freshTs = new Date('2024-01-01T00:00:10.000Z');
		const msg = { ...makeUserMsg('new'), createdAt: freshTs };
		list.addInput([msg]);

		const [inputMsg] = list.turnDelta();
		expect(inputMsg.createdAt.getTime()).toBe(freshTs.getTime());
	});

	it('bumps an input message createdAt when it collides with or precedes the last timestamp', () => {
		const list = new AgentMessageList();
		const histTs = new Date('2024-01-01T00:00:05.000Z');
		list.addHistory([makeDbMsg('hist', histTs)]);

		// staleTs is before histTs — must be bumped to at least histTs + 1 ms
		const staleTs = new Date('2024-01-01T00:00:04.000Z');
		const msg = { ...makeUserMsg('stale'), createdAt: staleTs };
		list.addInput([msg]);

		const [inputMsg] = list.turnDelta();
		expect(inputMsg.createdAt.getTime()).toBeGreaterThan(histTs.getTime());
	});

	it('bumps an input message createdAt when it equals the last timestamp', () => {
		const list = new AgentMessageList();
		const ts = new Date('2024-06-01T12:00:00.000Z');
		list.addHistory([makeDbMsg('hist', ts)]);

		// sameTs equals histTs — must be bumped by at least 1 ms
		const msg = { ...makeUserMsg('same'), createdAt: new Date(ts) };
		list.addInput([msg]);

		const [inputMsg] = list.turnDelta();
		expect(inputMsg.createdAt.getTime()).toBeGreaterThan(ts.getTime());
	});
});

// ---------------------------------------------------------------------------
// Deserialization restores lastCreatedAt
// ---------------------------------------------------------------------------

describe('AgentMessageList — deserialize', () => {
	it('messages added after deserialize have createdAt later than any restored message', () => {
		const list = new AgentMessageList();

		// History message with a future timestamp (edge case: e.g. clock skew or
		// the previous turn's monotonic assignment ran ahead of wall clock).
		const futureTs = new Date(Date.now() + 60_000);
		list.addHistory([makeDbMsg('prev', futureTs)]);

		// Round-trip through serialization (simulates suspend / resume)
		const list2 = AgentMessageList.deserialize(list.serialize());
		list2.addInput([makeUserMsg('after resume')]);

		const [newMsg] = list2.turnDelta();
		expect(newMsg.createdAt).toBeInstanceOf(Date);
		expect(newMsg.createdAt.getTime()).toBeGreaterThan(futureTs.getTime());
	});
});
