import assert from 'node:assert/strict';
import { suite, test } from 'node:test';
import { MessageChannel, Worker } from 'node:worker_threads';
import { Port, attachFS } from '../../dist/backends/port/fs.js';
import { waitOnline } from '../../dist/backends/port/rpc.js';
import type { InMemoryStore, StoreFS } from '../../dist/index.js';
import { ErrnoError, InMemory, configure, configureSingle, fs, resolveMountConfig } from '../../dist/index.js';

// Tests a mis-configured `Port` using a MessageChannel

const timeoutChannel = new MessageChannel();
timeoutChannel.port2.unref();

await suite('Timeout', { timeout: 1000 }, () => {
	test('Misconfiguration', async () => {
		let error: ErrnoError;
		try {
			await configure({
				mounts: {
					'/tmp-timeout': { backend: InMemory, name: 'tmp' },
					'/port': { backend: Port, port: timeoutChannel.port1, timeout: 100 },
				},
			});
		} catch (e) {
			assert(e instanceof ErrnoError);
			error = e;
		}
		assert(error! instanceof ErrnoError);
		assert.equal(error.code, 'EIO');
		assert(error.message.includes('RPC Failed'));
	});

	test('Remote not attached', async () => {
		let error: ErrnoError;
		try {
			await configureSingle({ backend: Port, port: timeoutChannel.port1, timeout: 100 });
			await fs.promises.writeFile('/test', 'anything');
		} catch (e) {
			assert(e instanceof ErrnoError);
			error = e;
		}
		assert(error! instanceof ErrnoError);
		assert.equal(error.code, 'EIO');
		assert(error.message.includes('RPC Failed'));
	});
});

timeoutChannel.port1.unref();

// Test configuration

const configPort = new Worker(import.meta.dirname + '/config.worker.js');
await waitOnline(configPort);

await suite('Remote FS with resolveRemoteMount', () => {
	const content = 'FS is in a port';

	test('Configuration', async () => {
		await configureSingle({ backend: Port, port: configPort, timeout: 100 });
	});

	test('Write', async () => {
		await fs.promises.writeFile('/test', content);
	});

	test('Read', async () => {
		assert.equal(await fs.promises.readFile('/test', 'utf8'), content);
	});
});

await configPort.terminate();
configPort.unref();

// Test using a message channel

const channel = new MessageChannel(),
	content = 'FS is in a port';
let tmpfs: StoreFS<InMemoryStore>;

await suite('FS with MessageChannel', () => {
	test('configuration', async () => {
		tmpfs = await resolveMountConfig({ backend: InMemory, name: 'tmp' });
		attachFS(channel.port2, tmpfs);
		await configureSingle({ backend: Port, port: channel.port1, disableAsyncCache: true, timeout: 100 });
	});

	test('write', async () => {
		await fs.promises.writeFile('/test', content);
	});

	test('remote content', () => {
		fs.mount('/tmp', tmpfs);
		assert.equal(fs.readFileSync('/tmp/test', 'utf8'), content);
		fs.umount('/tmp');
	});

	test('read', async () => {
		assert.equal(await fs.promises.readFile('/test', 'utf8'), content);
	});

	test('readFileSync should throw', () => {
		assert.throws(() => fs.readFileSync('/test', 'utf8'), { code: 'ENOTSUP' });
	});
});

channel.port1.close();
channel.port2.close();
channel.port1.unref();
channel.port2.unref();

// Test using a worker

const remotePort = new Worker(import.meta.dirname + '/remote.worker.js');

await suite('Remote FS', () => {
	const content = 'FS is in a port';

	test('Configuration', async () => {
		await configureSingle({ backend: Port, port: remotePort, timeout: 100 });
	});

	test('Write', async () => {
		await fs.promises.writeFile('/test', content);
	});

	test('Read', async () => {
		assert.equal(await fs.promises.readFile('/test', 'utf8'), content);
	});
});

await remotePort.terminate();
remotePort.unref();
