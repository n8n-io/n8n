import {
	CHAT_MEMORY_HOST_MARGIN_MS,
	CHAT_MEMORY_IDLE_MS,
	ChatMemoryStore,
} from '../chat-memory.ts';

const MINUTE = 60 * 1000;

/** A store with a clock of the test, and short forms of the three calls. */
function storeOf(maxBytes = 1_000_000) {
	const clock = { now: 0 };
	const store = new ChatMemoryStore({ maxBytes, now: () => clock.now });
	const call = (op: string, args: Record<string, unknown>, workflow = 'wf1') => {
		const answer = store.run({ service: 'chatMemory', op, args }, workflow);
		if (!answer.ok) throw new Error(answer.error.message);
		return answer.result;
	};
	return {
		clock,
		store,
		open: (sessionKey: string, window = 5, workflow = 'wf1') =>
			call('open', { sessionKey, window }, workflow),
		load: (sessionKey: string, workflow = 'wf1') => call('load', { sessionKey }, workflow),
		save: (sessionKey: string, input: string, output: string, workflow = 'wf1') =>
			call('save', { sessionKey, input, output }, workflow),
	};
}

const exchange = (input: string, output: string) => [
	{ ai: false, text: input },
	{ ai: true, text: output },
];

describe('ChatMemoryStore', () => {
	it('keeps the exchanges of a session in the order of the saves', () => {
		const s = storeOf();
		expect(s.open('k')).toEqual({});
		expect(s.load('k')).toEqual({ messages: [] });
		s.save('k', 'one', 'first');
		s.save('k', 'two', 'second');
		expect(s.load('k')).toEqual({
			messages: [...exchange('one', 'first'), ...exchange('two', 'second')],
		});
	});

	it('gives the last exchanges of the window, and keeps all messages', () => {
		const s = storeOf();
		s.open('k', 1);
		s.save('k', 'one', 'first');
		s.save('k', 'two', 'second');
		expect(s.load('k')).toEqual({ messages: exchange('two', 'second') });
	});

	it('fixes the window when it makes the session', () => {
		const s = storeOf();
		s.open('k', 1);
		s.save('k', 'one', 'first');
		s.save('k', 'two', 'second');
		expect(s.open('k', 5)).toEqual({});
		expect(s.load('k')).toEqual({ messages: exchange('two', 'second') });
	});

	it('keys a session by the workflow and the session key', () => {
		const s = storeOf();
		s.open('k');
		s.open('k', 5, 'wf2');
		s.save('k', 'one', 'first');
		expect(s.load('k', 'wf2')).toEqual({ messages: [] });
		expect(s.store.sessionCount).toBe(2);
	});

	it('drops every session whose last open is more than one hour ago, at each open', () => {
		const s = storeOf();
		s.open('old');
		s.save('old', 'one', 'first');
		s.clock.now = CHAT_MEMORY_IDLE_MS;
		s.open('other');
		// Exactly one hour: v1 keeps the session (`last_accessed < oneHourAgo`).
		expect(s.load('old')).toEqual({ messages: exchange('one', 'first') });
		s.clock.now = CHAT_MEMORY_IDLE_MS + 1;
		s.open('other');
		expect(s.load('old')).toEqual({ messages: [] });
		expect(s.store.sessionCount).toBe(1);
		s.open('old');
		expect(s.load('old')).toEqual({ messages: [] });
	});

	it('keeps a session that an open touched in the last hour', () => {
		const s = storeOf();
		s.open('k');
		s.save('k', 'one', 'first');
		s.clock.now = 50 * MINUTE;
		s.open('k');
		s.clock.now = 100 * MINUTE;
		s.open('k');
		expect(s.load('k')).toEqual({ messages: exchange('one', 'first') });
	});

	it('does not count a load or a save as a use, as v1', () => {
		const s = storeOf();
		s.open('k');
		s.clock.now = 50 * MINUTE;
		s.save('k', 'one', 'first');
		s.load('k');
		s.clock.now = CHAT_MEMORY_IDLE_MS + 1;
		s.open('other');
		expect(s.load('k')).toEqual({ messages: [] });
	});

	it('shares one session between two runs that overlap', () => {
		const s = storeOf();
		// Each run opens once, reads at the start of its item and adds at the end.
		s.open('k');
		s.open('k');
		const firstRead = s.load('k');
		const secondRead = s.load('k');
		s.save('k', 'from run 2', 'answer 2');
		s.save('k', 'from run 1', 'answer 1');
		expect(firstRead).toEqual({ messages: [] });
		expect(secondRead).toEqual({ messages: [] });
		expect(s.load('k')).toEqual({
			messages: [...exchange('from run 2', 'answer 2'), ...exchange('from run 1', 'answer 1')],
		});
	});

	it('reads nothing and keeps nothing for a session that is not in the store', () => {
		const s = storeOf();
		expect(s.load('gone')).toEqual({ messages: [] });
		expect(s.save('gone', 'one', 'first')).toEqual({});
		expect(s.store.sessionCount).toBe(0);
		expect(s.store.bytes).toBe(0);
	});

	it('has no limit on the count of sessions below the byte limit', () => {
		const s = storeOf();
		for (let k = 0; k < 5000; k++) expect(s.open(`k${k}`)).toEqual({});
		expect(s.store.sessionCount).toBe(5000);
	});

	describe('at the byte limit', () => {
		/** A store that one session with one long exchange fills. */
		function full() {
			const s = storeOf(600);
			s.open('live');
			s.save('live', 'x'.repeat(300), 'y'.repeat(300));
			return s;
		}

		it('sends a new session to the host, and fails nothing', () => {
			const s = full();
			expect(s.open('new')).toEqual({ host: true });
			expect(s.store.sessionCount).toBe(1);
		});

		it('never drops or refuses a session that is in the store', () => {
			const s = full();
			expect(s.open('live')).toEqual({});
			s.save('live', 'more', 'z'.repeat(5000));
			expect(s.open('live')).toEqual({});
			const loaded = s.load('live');
			expect(loaded).toEqual({
				messages: [
					...exchange('x'.repeat(300), 'y'.repeat(300)),
					...exchange('more', 'z'.repeat(5000)),
				],
			});
			expect(s.store.bytes).toBeGreaterThan(600);
		});

		it('gives the bytes of a dropped session back', () => {
			const s = full();
			s.clock.now = CHAT_MEMORY_IDLE_MS + 1;
			expect(s.open('new')).toEqual({});
			expect(s.store.sessionCount).toBe(1);
		});

		it('keeps a session of the host in the host until the host has dropped it', () => {
			const s = full();
			expect(s.open('new')).toEqual({ host: true });
			// The store has room again, but the host has the messages of `new`.
			s.clock.now = CHAT_MEMORY_IDLE_MS + 1;
			expect(s.open('new')).toEqual({ host: true });
			expect(s.open('another')).toEqual({ host: true });
			expect(s.store.sessionCount).toBe(0);
			// One hour and the margin after the last open that went to the host.
			const last = s.clock.now;
			s.clock.now = last + CHAT_MEMORY_IDLE_MS + CHAT_MEMORY_HOST_MARGIN_MS;
			expect(s.open('new')).toEqual({ host: true });
			s.clock.now += CHAT_MEMORY_IDLE_MS + CHAT_MEMORY_HOST_MARGIN_MS + 1;
			expect(s.open('new')).toEqual({});
			expect(s.load('new')).toEqual({ messages: [] });
		});
	});

	it('refuses a call without a session key, a workflow or a known operation', () => {
		const store = new ChatMemoryStore({ maxBytes: 1000 });
		const call = (op: string, args: Record<string, unknown>, workflow = 'wf1') =>
			store.run({ service: 'chatMemory', op, args }, workflow);
		expect(call('open', {})).toEqual({
			ok: false,
			error: { message: 'Invalid chat memory call "open"' },
		});
		expect(call('clear', { sessionKey: 'k' })).toEqual({
			ok: false,
			error: { message: 'Invalid chat memory call "clear"' },
		});
		expect(call('open', { sessionKey: 'k' }, '')).toEqual({
			ok: false,
			error: { message: 'The call has no workflow' },
		});
	});
});
