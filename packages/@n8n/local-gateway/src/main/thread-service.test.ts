const { mockFetch, fakeSources } = vi.hoisted(() => ({
	mockFetch: vi.fn(),
	fakeSources: [] as FakeEventSource[],
}));

vi.mock('@n8n/computer-use/logger', () => ({
	logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('eventsource', () => ({
	// eslint-disable-next-line @typescript-eslint/naming-convention -- mocks the EventSource export
	EventSource: class {
		onopen: ((event: unknown) => void) | null = null;
		onmessage: ((event: { data: string; lastEventId?: string }) => void) | null = null;
		onerror: ((event: { code?: number }) => void) | null = null;
		close = vi.fn();
		constructor(
			readonly url: string,
			readonly init: {
				fetch: (url: string, init?: { headers?: Record<string, string> }) => Promise<unknown>;
			},
		) {
			fakeSources.push(this);
		}
	},
}));

import { logger } from '@n8n/computer-use/logger';

import type { InstanceApi } from './instance-api';
import type { OAuthFlow } from './oauth/oauth-flow';
import { makeOAuth } from './test-fixtures';
import { ThreadService } from './thread-service';

/** Shape of the mocked EventSource instances collected in `fakeSources`. */
interface FakeEventSource {
	url: string;
	init: { fetch: (url: string, init?: { headers?: Record<string, string> }) => Promise<unknown> };
	onopen: ((event: unknown) => void) | null;
	onmessage: ((event: { data: string; lastEventId?: string }) => void) | null;
	onerror: ((event: { code?: number }) => void) | null;
	close: ReturnType<typeof vi.fn>;
}

function makeService(
	opts: { oauthFlow?: OAuthFlow; getThreadMessages?: ReturnType<typeof vi.fn> } = {},
) {
	const emit = vi.fn();
	const getThreadMessages = opts.getThreadMessages ?? vi.fn();
	const service = new ThreadService({
		oauthFlow: opts.oauthFlow ?? makeOAuth(),
		instanceApi: { getThreadMessages } as unknown as InstanceApi,
		emit,
	});
	return { service, emit, getThreadMessages };
}

describe('ThreadService', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', mockFetch);
		mockFetch.mockReset();
		fakeSources.length = 0;
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	describe('listen', () => {
		it('connects to the thread events endpoint with the encoded thread id', () => {
			makeService().service.listen('t/1');

			expect(fakeSources).toHaveLength(1);
			expect(fakeSources[0].url).toBe('https://n.example/rest/instance-ai/events/t%2F1');
		});

		it('seeds the replay cursor when a lastEventId is given', () => {
			makeService().service.listen('t1', 42);

			expect(fakeSources[0].url).toBe(
				'https://n.example/rest/instance-ai/events/t1?lastEventId=42',
			);
		});

		it('injects a fresh bearer token into each connection attempt', async () => {
			makeService().service.listen('t1');
			mockFetch.mockResolvedValue({ ok: true });

			await fakeSources[0].init.fetch('https://n.example/rest/instance-ai/events/t1', {
				headers: { accept: 'text/event-stream' },
			});

			const [, init] = mockFetch.mock.calls[0] as [string, { headers: Record<string, string> }];
			expect(init.headers.authorization).toBe('Bearer tok');
			// Headers set by the SSE client (e.g. Last-Event-ID) are preserved.
			expect(init.headers.accept).toBe('text/event-stream');
		});

		it('is idempotent — a second listen for the same thread opens no new connection', () => {
			const { service } = makeService();
			service.listen('t1');
			service.listen('t1', 99);

			expect(fakeSources).toHaveLength(1);
		});

		it('does not connect when signed out', () => {
			makeService({ oauthFlow: makeOAuth({ instanceUrl: null }) }).service.listen('t1');

			expect(fakeSources).toHaveLength(0);
		});
	});

	describe('event forwarding', () => {
		it('parses event frames and emits them with the thread id', () => {
			const { service, emit } = makeService();
			service.listen('t1');

			const event = { type: 'text-delta', runId: 'r1', agentId: 'a1', payload: { text: 'hi' } };
			fakeSources[0].onmessage?.({ data: JSON.stringify(event), lastEventId: '3' });

			expect(emit).toHaveBeenCalledWith('t1', event);
		});

		it('drops malformed JSON without closing the stream', () => {
			const { service, emit } = makeService();
			service.listen('t1');

			fakeSources[0].onmessage?.({ data: 'not json' });

			expect(emit).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalled();
			expect(fakeSources[0].close).not.toHaveBeenCalled();
		});

		it('drops events without a type discriminator', () => {
			const { service, emit } = makeService();
			service.listen('t1');

			fakeSources[0].onmessage?.({ data: '{"foo":1}' });

			expect(emit).not.toHaveBeenCalled();
		});
	});

	describe('reconnect', () => {
		it('reconnects after a backoff delay, resuming from the last seen event id', () => {
			const { service } = makeService();
			service.listen('t1');
			fakeSources[0].onmessage?.({ data: '{"type":"status"}', lastEventId: '7' });

			fakeSources[0].onerror?.({ code: 500 });
			expect(fakeSources[0].close).toHaveBeenCalled();
			vi.advanceTimersByTime(1000);

			expect(fakeSources).toHaveLength(2);
			expect(fakeSources[1].url).toBe('https://n.example/rest/instance-ai/events/t1?lastEventId=7');
		});

		it('backs off exponentially and resets the delay once reopened', () => {
			const { service } = makeService();
			service.listen('t1');

			fakeSources[0].onerror?.({});
			vi.advanceTimersByTime(1000);
			fakeSources[1].onerror?.({});
			// Second retry waits 2s, not 1s.
			vi.advanceTimersByTime(1000);
			expect(fakeSources).toHaveLength(2);
			vi.advanceTimersByTime(1000);
			expect(fakeSources).toHaveLength(3);

			// A successful open resets the backoff to 1s.
			fakeSources[2].onopen?.({});
			fakeSources[2].onerror?.({});
			vi.advanceTimersByTime(1000);
			expect(fakeSources).toHaveLength(4);
		});
	});

	describe('unlisten', () => {
		it('closes the connection', () => {
			const { service } = makeService();
			service.listen('t1');

			service.unlisten('t1');

			expect(fakeSources[0].close).toHaveBeenCalled();
		});

		it('cancels a pending reconnect', () => {
			const { service } = makeService();
			service.listen('t1');
			fakeSources[0].onerror?.({});

			service.unlisten('t1');
			vi.advanceTimersByTime(60_000);

			expect(fakeSources).toHaveLength(1);
		});

		it('allows re-listening with a fresh connection afterwards', () => {
			const { service } = makeService();
			service.listen('t1');
			service.unlisten('t1');

			service.listen('t1');

			expect(fakeSources).toHaveLength(2);
		});
	});

	describe('getMessages', () => {
		const snapshot = { threadId: 't1', messages: [{ id: 'm1' }], nextEventId: 7 };

		it('fetches once and serves subsequent calls from the cache', async () => {
			const getThreadMessages = vi.fn().mockResolvedValue(snapshot);
			const { service } = makeService({ getThreadMessages });

			const first = await service.getMessages('t1');
			const second = await service.getMessages('t1');

			expect(first).toEqual(snapshot);
			expect(second).toBe(first);
			expect(getThreadMessages).toHaveBeenCalledTimes(1);
		});

		it('shares one request between concurrent calls', async () => {
			const getThreadMessages = vi.fn().mockResolvedValue(snapshot);
			const { service } = makeService({ getThreadMessages });

			const [first, second] = await Promise.all([
				service.getMessages('t1'),
				service.getMessages('t1'),
			]);

			expect(first).toBe(second);
			expect(getThreadMessages).toHaveBeenCalledTimes(1);
		});

		it('bypasses the cache on refresh', async () => {
			const getThreadMessages = vi.fn().mockResolvedValue(snapshot);
			const { service } = makeService({ getThreadMessages });

			await service.getMessages('t1');
			await service.getMessages('t1', { refresh: true });

			expect(getThreadMessages).toHaveBeenCalledTimes(2);
		});

		it('does not cache a failed fetch', async () => {
			const getThreadMessages = vi
				.fn()
				.mockRejectedValueOnce(new Error('boom'))
				.mockResolvedValueOnce(snapshot);
			const { service } = makeService({ getThreadMessages });

			await expect(service.getMessages('t1')).rejects.toThrow('boom');
			await expect(service.getMessages('t1')).resolves.toEqual(snapshot);
		});
	});

	describe('reset', () => {
		it('closes all connections and drops the message cache', async () => {
			const getThreadMessages = vi
				.fn()
				.mockResolvedValue({ threadId: 't1', messages: [], nextEventId: 0 });
			const { service } = makeService({ getThreadMessages });
			service.listen('t1');
			service.listen('t2');
			await service.getMessages('t1');

			service.reset();

			expect(fakeSources[0].close).toHaveBeenCalled();
			expect(fakeSources[1].close).toHaveBeenCalled();
			await service.getMessages('t1');
			expect(getThreadMessages).toHaveBeenCalledTimes(2);
		});
	});
});
