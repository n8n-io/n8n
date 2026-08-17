import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';

import type { HypervisorWorker } from '@/scaling/hypervisor-message-router';

import { CacheHost, IpcCacheStore } from '../ipc.cache-manager';

mockInstance(Logger);

const emitToProcess = (message: unknown) =>
	(process.emit as (event: string, message: unknown) => boolean)('message', message);

describe('IpcCacheStore', () => {
	const DEFAULT_TTL = 1000;
	let store: IpcCacheStore;
	let originalSend: typeof process.send;

	beforeEach(() => {
		originalSend = process.send;
		process.send = vi.fn();
		store = new IpcCacheStore(DEFAULT_TTL);
	});

	afterEach(() => {
		store.dispose();
		process.send = originalSend;
	});

	it('sends a set request with the default ttl and resolves on the response', async () => {
		const pending = store.set('k', 'v');

		expect(process.send).toHaveBeenCalledWith({
			type: 'cache:request',
			requestId: 0,
			op: 'set',
			args: ['k', 'v', DEFAULT_TTL],
		});
		emitToProcess({ type: 'cache:response', requestId: 0, result: undefined });

		await expect(pending).resolves.toBeUndefined();
	});

	it('resolves get with the primary result', async () => {
		const pending = store.get('k');

		expect(process.send).toHaveBeenCalledWith({
			type: 'cache:request',
			requestId: 0,
			op: 'get',
			args: ['k'],
		});
		emitToProcess({ type: 'cache:response', requestId: 0, result: 'v' });

		await expect(pending).resolves.toBe('v');
	});

	it('resolves a miss when the primary does not answer within the timeout', async () => {
		vi.useFakeTimers();
		try {
			const pending = store.get('k');
			vi.advanceTimersByTime(5_000);
			await expect(pending).resolves.toBeUndefined();
		} finally {
			vi.useRealTimers();
		}
	});
});

describe('CacheHost', () => {
	const makeWorker = (id: number): HypervisorWorker => ({
		id,
		send: vi.fn(),
		process: { pid: 1000 + id },
	});
	const req = (requestId: number, op: string, args: unknown[]) => ({
		type: 'cache:request',
		requestId,
		op,
		args,
	});
	const lastResult = (worker: HypervisorWorker) => {
		const calls = vi.mocked(worker.send).mock.calls;
		return (calls[calls.length - 1][0] as { result: unknown }).result;
	};

	it('round-trips a value through its map', () => {
		const host = new CacheHost();
		const worker = makeWorker(1);

		host.onMessage(worker, req(1, 'set', ['k', 'v', undefined]));
		host.onMessage(worker, req(2, 'get', ['k']));

		expect(lastResult(worker)).toBe('v');
	});

	it('expires a key after its ttl', () => {
		vi.useFakeTimers();
		try {
			const host = new CacheHost();
			const worker = makeWorker(1);

			host.onMessage(worker, req(1, 'set', ['k', 'v', 1000]));
			vi.advanceTimersByTime(1001);
			host.onMessage(worker, req(2, 'get', ['k']));

			expect(lastResult(worker)).toBeUndefined();
		} finally {
			vi.useRealTimers();
		}
	});

	it('deletes and resets', () => {
		const host = new CacheHost();
		const worker = makeWorker(1);

		host.onMessage(worker, req(1, 'set', ['a', '1', undefined]));
		host.onMessage(worker, req(2, 'set', ['b', '2', undefined]));
		host.onMessage(worker, req(3, 'del', ['a']));
		host.onMessage(worker, req(4, 'get', ['a']));
		expect(lastResult(worker)).toBeUndefined();

		host.onMessage(worker, req(5, 'reset', []));
		host.onMessage(worker, req(6, 'get', ['b']));
		expect(lastResult(worker)).toBeUndefined();
	});
});
