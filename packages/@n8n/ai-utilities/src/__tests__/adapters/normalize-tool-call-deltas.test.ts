import { normalizeToolCallDeltas } from 'src/adapters/normalize-tool-call-deltas';
import type { NormalizedStreamChunk } from 'src/adapters/normalize-tool-call-deltas';
import type { StreamChunk } from 'src/types/output';

async function normalize(chunks: StreamChunk[]): Promise<NormalizedStreamChunk[]> {
	async function* stream() {
		yield* chunks;
	}
	const result: NormalizedStreamChunk[] = [];
	for await (const chunk of normalizeToolCallDeltas(stream())) result.push(chunk);
	return result;
}

/** Joins the argument deltas of each tool call id, in the order the ids first appear. */
function callsOf(chunks: NormalizedStreamChunk[]) {
	const calls = new Map<string, { name?: string; args: string }>();
	for (const chunk of chunks) {
		if (chunk.type !== 'tool-call-delta') continue;
		const call = calls.get(chunk.id) ?? { args: '' };
		call.name ??= chunk.name;
		call.args += chunk.argumentsDelta ?? '';
		calls.set(chunk.id, call);
	}
	return [...calls].map(([id, call]) => ({ id, ...call }));
}

describe('normalizeToolCallDeltas', () => {
	it('passes deltas with an id through', async () => {
		const chunks = await normalize([
			{ type: 'tool-call-delta', id: 'tc-1', name: 'search', argumentsDelta: '{"q":' },
			{ type: 'tool-call-delta', id: 'tc-2', name: 'weather', argumentsDelta: '{"city":' },
			{ type: 'tool-call-delta', id: 'tc-1', argumentsDelta: '"cats"}' },
			{ type: 'tool-call-delta', id: 'tc-2', argumentsDelta: '"Berlin"}' },
		]);

		expect(callsOf(chunks)).toEqual([
			{ id: 'tc-1', name: 'search', args: '{"q":"cats"}' },
			{ id: 'tc-2', name: 'weather', args: '{"city":"Berlin"}' },
		]);
	});

	it('gives a delta without an id the id of the call that got the last delta', async () => {
		const chunks = await normalize([
			{ type: 'tool-call-delta', id: 'tc-1', name: 'search', argumentsDelta: '' },
			{ type: 'tool-call-delta', argumentsDelta: '{"q":"cats"}' },
			{ type: 'tool-call-delta', id: 'tc-2', name: 'weather', argumentsDelta: '' },
			{ type: 'tool-call-delta', argumentsDelta: '{"city":"Berlin"}' },
		]);

		expect(callsOf(chunks)).toEqual([
			{ id: 'tc-1', name: 'search', args: '{"q":"cats"}' },
			{ id: 'tc-2', name: 'weather', args: '{"city":"Berlin"}' },
		]);
	});

	it('gives a call that starts without an id the id that follows with the same name', async () => {
		const chunks = await normalize([
			{ type: 'tool-call-delta', name: 'search', argumentsDelta: '{"q":' },
			{ type: 'tool-call-delta', id: 'tc-1', name: 'search', argumentsDelta: '"cats"}' },
		]);

		expect(callsOf(chunks)).toEqual([{ id: 'tc-1', name: 'search', args: '{"q":"cats"}' }]);
	});

	it('gives a call that starts without an id the id that follows without a name', async () => {
		const chunks = await normalize([
			{ type: 'tool-call-delta', name: 'search', argumentsDelta: '{"q":' },
			{ type: 'tool-call-delta', argumentsDelta: '"cats"' },
			{ type: 'tool-call-delta', id: 'tc-1', argumentsDelta: '}' },
		]);

		expect(callsOf(chunks)).toEqual([{ id: 'tc-1', name: 'search', args: '{"q":"cats"}' }]);
	});

	it('keeps a call that starts without an id apart from a new id with another name', async () => {
		const chunks = await normalize([
			{ type: 'tool-call-delta', name: 'search', argumentsDelta: '{"q":"cats"}' },
			{ type: 'tool-call-delta', id: 'tc-2', name: 'weather', argumentsDelta: '' },
			{ type: 'tool-call-delta', argumentsDelta: '{"city":"Berlin"}' },
		]);

		const [weather, anonymous] = callsOf(chunks);
		expect(weather).toEqual({ id: 'tc-2', name: 'weather', args: '{"city":"Berlin"}' });
		expect(anonymous).toEqual({ id: expect.any(String), name: 'search', args: '{"q":"cats"}' });
		expect(anonymous.id).not.toBe('tc-2');
	});

	it('releases a call that never gets an id before the finish', async () => {
		const chunks = await normalize([
			{ type: 'tool-call-delta', name: 'search', argumentsDelta: '{"q":"cats"}' },
			{ type: 'finish', finishReason: 'tool-calls' },
		]);

		expect(chunks.map(({ type }) => type)).toEqual(['tool-call-delta', 'finish']);
		expect(callsOf(chunks)).toEqual([
			{ id: expect.any(String), name: 'search', args: '{"q":"cats"}' },
		]);
	});

	it('releases a call that never gets an id before a complete tool call block', async () => {
		const chunks = await normalize([
			{ type: 'tool-call-delta', name: 'search', argumentsDelta: '{"q":' },
			{
				type: 'content',
				content: { type: 'tool-call', toolName: 'search', input: '{"q":"cats"}' },
			},
		]);

		expect(chunks.map(({ type }) => type)).toEqual(['tool-call-delta', 'content']);
	});

	it('releases a call that never gets an id at the end of the stream', async () => {
		const chunks = await normalize([
			{ type: 'tool-call-delta', name: 'search', argumentsDelta: '{"q":"cats"}' },
		]);

		expect(callsOf(chunks)).toEqual([
			{ id: expect.any(String), name: 'search', args: '{"q":"cats"}' },
		]);
	});

	it('passes other chunks through in order', async () => {
		const chunks = await normalize([
			{ type: 'text-delta', delta: 'Hi' },
			{ type: 'tool-call-delta', id: 'tc-1', name: 'search', argumentsDelta: '{}' },
			{ type: 'finish', finishReason: 'tool-calls' },
		]);

		expect(chunks.map(({ type }) => type)).toEqual(['text-delta', 'tool-call-delta', 'finish']);
	});
});
