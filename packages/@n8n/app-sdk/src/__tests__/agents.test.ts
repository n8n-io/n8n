import { createClient, N8nAppError, type AgentSseEvent } from '../index.js';

const jsonResponse = (status: number, body: unknown) =>
	new Response(JSON.stringify(body), { status });

const sseResponse = (chunks: string[]) => {
	const encoder = new TextEncoder();
	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
			controller.close();
		},
	});
	return new Response(stream, {
		status: 200,
		headers: [['Content-Type', 'text/event-stream']],
	});
};

const dataLine = (event: AgentSseEvent) => `data: ${JSON.stringify(event)}\n\n`;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

class MemoryStorage {
	private readonly items = new Map<string, string>();

	getItem(key: string) {
		return this.items.get(key) ?? null;
	}

	setItem(key: string, value: string) {
		this.items.set(key, value);
	}
}

const collect = async <T>(iterable: AsyncIterable<T>) => {
	const items: T[] = [];
	for await (const item of iterable) items.push(item);
	return items;
};

describe('agents', () => {
	const fetchMock = vi.fn<typeof fetch>();
	let storage: MemoryStorage;

	beforeEach(() => {
		storage = new MemoryStorage();
		vi.stubGlobal('fetch', fetchMock);
		vi.stubGlobal('localStorage', storage);
		fetchMock.mockReset();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	const client = () => createClient({ baseUrl: '/apps/help/api/' });

	it('posts { message, sessionId } to <baseUrl>/agents/<key>/chat and yields the events in order', async () => {
		const events: AgentSseEvent[] = [
			{ type: 'start-step' },
			{ type: 'text-start', id: 't1' },
			{ type: 'text-delta', id: 't1', delta: 'Hel' },
			{ type: 'text-delta', id: 't1', delta: 'lo' },
			{ type: 'text-end', id: 't1' },
			{ type: 'finish-step' },
			{ type: 'done', sessionId: 's' },
		];
		const wire = `:ok\n\n${events.map(dataLine).join('')}:ping\n\n`;
		// Split in the middle of a JSON object to exercise the line buffer.
		const cut = wire.indexOf('"Hel"') + 2;
		fetchMock.mockResolvedValue(sseResponse([wire.slice(0, cut), wire.slice(cut)]));

		const received = await collect(client().agents.support.chat('hi', { sessionId: 's' }));

		expect(received).toEqual(events);
		expect(fetchMock).toHaveBeenCalledWith('/apps/help/api/agents/support/chat', {
			method: 'POST',
			headers: [['Content-Type', 'application/json']],
			body: '{"message":"hi","sessionId":"s"}',
			signal: undefined,
		});
	});

	it('does not send the request before the first read', () => {
		fetchMock.mockResolvedValue(sseResponse([]));

		client().agents.support.chat('hi');

		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('text() joins the text-delta deltas and ignores the other events', async () => {
		fetchMock.mockResolvedValue(
			sseResponse([
				dataLine({ type: 'reasoning-delta', id: 'r', delta: 'thinking' }),
				dataLine({ type: 'text-delta', id: 't', delta: 'Hello, ' }),
				dataLine({ type: 'tool-call', toolCallId: 'c', toolName: 'respond', input: {} }),
				dataLine({ type: 'text-delta', id: 't', delta: 'world' }),
				dataLine({ type: 'done' }),
			]),
		);

		await expect(client().agents.support.chat('hi').text()).resolves.toBe('Hello, world');
	});

	it('skips a data line that is not JSON', async () => {
		fetchMock.mockResolvedValue(sseResponse(['data: {not json\n\n', dataLine({ type: 'done' })]));

		await expect(collect(client().agents.support.chat('hi'))).resolves.toEqual([{ type: 'done' }]);
	});

	it('posts { sessionId, runId, toolCallId, resumeData } to <baseUrl>/agents/<key>/chat/resume', async () => {
		fetchMock.mockResolvedValue(sseResponse([dataLine({ type: 'done' })]));

		await client()
			.agents.support.resume(
				{ runId: 'run-1', toolCallId: 'call-1', resumeData: { approved: true } },
				{ sessionId: 's' },
			)
			.text();

		expect(fetchMock.mock.calls[0]).toEqual([
			'/apps/help/api/agents/support/chat/resume',
			expect.objectContaining({
				method: 'POST',
				body: '{"sessionId":"s","runId":"run-1","toolCallId":"call-1","resumeData":{"approved":true}}',
			}),
		]);
	});

	it('gets <baseUrl>/agents/<key>/messages?sessionId= and returns the history', async () => {
		const body = {
			messages: [{ id: 'm1', role: 'user', content: [{ type: 'text', text: 'hi' }] }],
			openSuspensions: [{ toolCallId: 'c', runId: 'r', suspendPayload: { type: 'approval' } }],
		};
		fetchMock.mockResolvedValue(jsonResponse(200, body));

		const result = await client().agents.support.messages('s/1');

		expect(fetchMock.mock.calls[0]).toEqual([
			'/apps/help/api/agents/support/messages?sessionId=s%2F1',
			expect.objectContaining({ method: 'GET', body: undefined }),
		]);
		expect(result).toEqual(body);
	});

	it('throws invalid_response when the history body has no message list', async () => {
		fetchMock.mockResolvedValue(jsonResponse(200, { messages: [] }));

		await expect(client().agents.support.messages('s')).rejects.toMatchObject({
			status: 200,
			code: 'invalid_response',
		});
	});

	it('mints a uuid session under n8n-app:<ns>:agent:<key>:session and reuses it', () => {
		const agent = client().agents.support;

		const first = agent.sessionId();

		expect(first).toMatch(UUID);
		expect(storage.getItem('n8n-app:help:agent:support:session')).toBe(first);
		expect(agent.sessionId()).toBe(first);
		expect(client().agents.support.sessionId()).toBe(first);
		expect(client().agents.sales.sessionId()).not.toBe(first);
	});

	it('sends the minted session when no sessionId option is given', async () => {
		fetchMock
			.mockResolvedValueOnce(sseResponse([dataLine({ type: 'done' })]))
			.mockResolvedValueOnce(jsonResponse(200, { messages: [], openSuspensions: [] }));
		const agent = client().agents.support;

		await agent.chat('hi').text();
		await agent.messages();

		const sessionId = agent.sessionId();
		expect(fetchMock.mock.calls[0][1]).toMatchObject({
			body: JSON.stringify({ message: 'hi', sessionId }),
		});
		expect(fetchMock.mock.calls[1][0]).toBe(
			`/apps/help/api/agents/support/messages?sessionId=${sessionId}`,
		);
	});

	it('keeps one in-memory session when localStorage throws', () => {
		vi.stubGlobal('localStorage', {
			getItem: () => {
				throw new DOMException('denied', 'SecurityError');
			},
			setItem: () => {
				throw new DOMException('denied', 'SecurityError');
			},
		});
		const { agents } = client();

		const first = agents.support.sessionId();

		expect(first).toMatch(UUID);
		expect(agents.support.sessionId()).toBe(first);
	});

	it('rethrows the abort error of the caller unchanged', async () => {
		const controller = new AbortController();
		const abortError = new DOMException('Aborted', 'AbortError');
		controller.abort();
		fetchMock.mockRejectedValue(abortError);

		await expect(
			client().agents.support.chat('hi', { signal: controller.signal }).text(),
		).rejects.toBe(abortError);
	});

	it('rejects the iteration when the stream fails after the first event', async () => {
		const streamError = new DOMException('Aborted', 'AbortError');
		const encoder = new TextEncoder();
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(encoder.encode(dataLine({ type: 'start-step' })));
			},
			pull(controller) {
				controller.error(streamError);
			},
		});
		fetchMock.mockResolvedValue(new Response(stream, { status: 200 }));
		const received: AgentSseEvent[] = [];

		const iteration = (async () => {
			for await (const event of client().agents.support.chat('hi')) received.push(event);
		})();

		await expect(iteration).rejects.toBe(streamError);
		expect(received).toEqual([{ type: 'start-step' }]);
	});

	it('throws N8nAppError with the server code on 403 permission_denied', async () => {
		fetchMock.mockResolvedValue(
			jsonResponse(403, { code: 'permission_denied', message: 'no chat permission' }),
		);

		const error = await client()
			.agents.support.chat('hi')
			.text()
			.catch((e: unknown) => e);

		expect(error).toBeInstanceOf(N8nAppError);
		expect(error).toMatchObject({
			status: 403,
			code: 'permission_denied',
			message: 'no chat permission',
		});
	});

	it('throws N8nAppError with the server code on 409 run_in_progress', async () => {
		fetchMock.mockResolvedValue(
			jsonResponse(409, { code: 'run_in_progress', message: 'answer the pending approval' }),
		);

		await expect(collect(client().agents.support.chat('hi'))).rejects.toMatchObject({
			status: 409,
			code: 'run_in_progress',
		});
	});
});
