import type { Logger } from '@n8n/backend-common';
import type { HttpRequestClient } from '@n8n/backend-network';
import type { EngineConfig } from '@n8n/config';
import { loadEngineTls, watchEngineTls, type EngineTls } from '@n8n/engine';
import { mock } from 'vitest-mock-extended';

import { EngineTlsMaterial } from '../engine-tls-material';

vi.mock('@n8n/engine', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/engine')>()),
	loadEngineTls: vi.fn(),
	watchEngineTls: vi.fn(),
}));

const tlsOf = (name: string): EngineTls => ({
	cert: Buffer.from(`${name} cert`),
	key: Buffer.from(`${name} key`),
	ca: Buffer.from('ca'),
});

describe('EngineTlsMaterial', () => {
	const logger = mock<Logger>();
	const watcher = { close: vi.fn() };
	let material: EngineTlsMaterial;

	const startWithTls = (tls: EngineTls | undefined) => {
		vi.mocked(loadEngineTls).mockReturnValue(tls);
		material = new EngineTlsMaterial(mock<EngineConfig>());
		material.watch(logger);
	};

	/** Calls the reload callback the material handed to the file watcher. */
	const reloadWith = (tls: EngineTls) => {
		const onReload = vi.mocked(watchEngineTls).mock.calls[0][2];
		onReload(tls);
	};

	beforeEach(() => {
		vi.mocked(watchEngineTls).mockReset().mockReturnValue(watcher);
		watcher.close.mockReset();
	});

	it('does not watch any file when TLS is off', () => {
		startWithTls(undefined);

		expect(watchEngineTls).not.toHaveBeenCalled();
	});

	it('builds one plain client that is never rebuilt when TLS is off', () => {
		startWithTls(undefined);
		const plain = mock<HttpRequestClient>();
		const build = vi.fn().mockReturnValue(plain);

		expect(material.reloadingClient(build)).toBe(plain);
		expect(build).toHaveBeenCalledExactlyOnceWith(undefined);
	});

	it('serves the reloaded material and notifies its listeners', () => {
		startWithTls(tlsOf('old'));
		const listener = vi.fn();
		material.onReload(listener);

		reloadWith(tlsOf('new'));

		expect(material.tls).toEqual(tlsOf('new'));
		expect(listener).toHaveBeenCalledExactlyOnceWith(tlsOf('new'));
	});

	it('stops notifying a listener once it is removed', () => {
		startWithTls(tlsOf('old'));
		const listener = vi.fn();
		const remove = material.onReload(listener);

		remove();
		reloadWith(tlsOf('new'));

		expect(listener).not.toHaveBeenCalled();
	});

	it('rebuilds a client with the reloaded material and closes the old one', async () => {
		startWithTls(tlsOf('old'));
		const clients: HttpRequestClient[] = [];
		const build = vi.fn(() => {
			const next = mock<HttpRequestClient>();
			clients.push(next);
			return next;
		});
		const client = material.reloadingClient(build);

		reloadWith(tlsOf('new'));
		await client.request({ url: '/after-reload' });

		expect(build.mock.calls).toEqual([[tlsOf('old')], [tlsOf('new')]]);
		expect(clients[0].close).toHaveBeenCalledOnce();
		expect(clients[1].request).toHaveBeenCalledExactlyOnceWith({ url: '/after-reload' });
	});

	it('closes the file watcher when it stops watching', () => {
		startWithTls(tlsOf('old'));

		material.stopWatching();

		expect(watcher.close).toHaveBeenCalledOnce();
	});
});
