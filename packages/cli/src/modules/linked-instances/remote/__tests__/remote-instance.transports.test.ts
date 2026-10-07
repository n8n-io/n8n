import type { CustomFetch, HttpTransport } from '@n8n/backend-network';
import { UnexpectedError } from '@n8n/errors';
import { mock, type MockProxy } from 'vitest-mock-extended';

import { RemoteInstanceError } from '../remote-instance.errors';
import { ClientTransports, withSignal } from '../remote-instance.transports';

type Dispatcher = ReturnType<HttpTransport['getDispatcher']>;

const TARGET = 'https://cloud.example.com/mcp-server/http';

describe('withSignal', () => {
	const capture = () => {
		const seen: (RequestInit | undefined)[] = [];
		const baseFetch: CustomFetch = async (_input, init) => {
			seen.push(init);
			return new Response('ok');
		};
		return { seen, baseFetch };
	};

	it('adds the signal to a request that has no init', async () => {
		const { seen, baseFetch } = capture();
		const controller = new AbortController();

		await withSignal(baseFetch, controller.signal)(TARGET);

		expect(seen[0]?.signal).toBe(controller.signal);
	});

	it('keeps the other request options', async () => {
		const { seen, baseFetch } = capture();

		await withSignal(baseFetch, new AbortController().signal)(TARGET, {
			method: 'HEAD',
			redirect: 'manual',
		});

		expect(seen[0]).toMatchObject({ method: 'HEAD', redirect: 'manual' });
	});

	it.each(['the caller', 'the added signal'])(
		'aborts the request when %s aborts',
		async (source) => {
			const { seen, baseFetch } = capture();
			const caller = new AbortController();
			const added = new AbortController();
			await withSignal(baseFetch, added.signal)(TARGET, { signal: caller.signal });
			const signal = seen[0]?.signal;
			expect(signal?.aborted).toBe(false);

			(source === 'the caller' ? caller : added).abort();

			expect(signal?.aborted).toBe(true);
		},
	);
});

describe('ClientTransports', () => {
	let dispatchers: MockProxy<Dispatcher>[];
	let responses: Response[];
	let build: ReturnType<typeof vi.fn<(timeoutMs: number) => HttpTransport>>;

	beforeEach(() => {
		dispatchers = [];
		responses = [];
		build = vi.fn((_timeoutMs: number) => {
			const dispatcher = mock<Dispatcher>();
			dispatchers.push(dispatcher);
			return mock<HttpTransport>({
				asCustomFetch: () => async () => responses.shift() ?? new Response('ok'),
				getDispatcher: () => dispatcher,
			});
		});
	});

	it('builds one transport for each time limit and reuses it', () => {
		const transports = new ClientTransports(build);

		const first = transports.fetchFor(10_000);
		const again = transports.fetchFor(10_000);
		const other = transports.fetchFor(60_000);

		expect(again).toBe(first);
		expect(other).not.toBe(first);
		expect(build.mock.calls).toEqual([[10_000], [60_000]]);
	});

	it('builds again after a failed build', () => {
		build.mockImplementationOnce(() => {
			throw new Error('No transport');
		});
		const transports = new ClientTransports(build);

		expect(() => transports.fetchFor(10_000)).toThrow('No transport');
		expect(transports.fetchFor(10_000)).toEqual(expect.any(Function));
		expect(build).toHaveBeenCalledTimes(2);
	});

	it('reads the body before it returns the response', async () => {
		responses.push(new Response('{"a":1}', { status: 201, headers: { 'x-id': '7' } }));

		const response = await new ClientTransports(build).fetchFor(10_000)(TARGET);

		expect(response.status).toBe(201);
		expect(response.headers.get('x-id')).toBe('7');
		expect(await response.json()).toEqual({ a: 1 });
	});

	it('rejects a response body over 5 MiB', async () => {
		responses.push(new Response('y'.repeat(5 * 1024 * 1024 + 1)));

		const error = await new ClientTransports(build)
			.fetchFor(10_000)(TARGET)
			.catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(RemoteInstanceError);
		expect(error).toHaveProperty('reason', 'unreachable');
		expect(error).toHaveProperty('message', 'The linked instance sent a response over 5 MiB.');
	});

	it('accepts a response body of exactly 5 MiB', async () => {
		responses.push(new Response('y'.repeat(5 * 1024 * 1024)));

		const response = await new ClientTransports(build).fetchFor(10_000)(TARGET);

		expect((await response.arrayBuffer()).byteLength).toBe(5 * 1024 * 1024);
	});

	it('destroys each transport it built, once', async () => {
		const transports = new ClientTransports(build);
		transports.fetchFor(10_000);
		transports.fetchFor(60_000);

		await transports.dispose();
		await transports.dispose();

		expect(dispatchers).toHaveLength(2);
		for (const dispatcher of dispatchers) {
			expect(dispatcher.destroy).toHaveBeenCalledTimes(1);
		}
	});

	it('destroys the other transports when one fails to be destroyed', async () => {
		const transports = new ClientTransports(build);
		transports.fetchFor(10_000);
		transports.fetchFor(60_000);
		dispatchers[0].destroy.mockRejectedValue(new Error('Already destroyed'));

		await expect(transports.dispose()).resolves.toBeUndefined();
		expect(dispatchers[1].destroy).toHaveBeenCalledTimes(1);
	});

	it('refuses to build a transport after dispose', async () => {
		const transports = new ClientTransports(build);
		await transports.dispose();

		expect(() => transports.fetchFor(10_000)).toThrow(UnexpectedError);
		expect(() => transports.fetchFor(10_000)).toThrow(
			'The transports of a closed linked instance client are gone',
		);
		expect(build).not.toHaveBeenCalled();
	});
});
