import { generateTlsCerts, type TlsCertFiles } from 'n8n-containers/helpers/tls-certs';
import { X509Certificate } from 'node:crypto';
import {
	copyFileSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	renameSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from 'node:fs';
import type { Server } from 'node:http';
import { Agent, request } from 'node:https';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { TLSSocket } from 'node:tls';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	createEngineHttpServer,
	openEngineTls,
	type EngineTls,
	type EngineTlsSource,
} from '../engine-tls';

const LOOPBACK = ['DNS:localhost', 'IP:127.0.0.1'];

describe('engine TLS reload', () => {
	let certsDir: string;
	let certs: TlsCertFiles;
	let mountDir: string;
	let tls: EngineTlsSource | undefined;
	let generation = 0;
	const logger = { info: vi.fn(), error: vi.fn() };
	const onReload = vi.fn();

	beforeAll(() => {
		certsDir = mkdtempSync(join(tmpdir(), 'engine-tls-reload-'));
		certs = generateTlsCerts(certsDir, {
			server: LOOPBACK,
			renewedServer: LOOPBACK,
			client: LOOPBACK,
		});
	});

	afterAll(() => rmSync(certsDir, { recursive: true, force: true }));

	const tlsOf = (leaf: string): EngineTls => ({
		cert: readFileSync(certs.leaves[leaf].certFile),
		key: readFileSync(certs.leaves[leaf].keyFile),
		ca: readFileSync(certs.caFile),
	});

	const filesIn = (dir: string) => ({
		tlsCertFile: join(dir, 'tls.crt'),
		tlsKeyFile: join(dir, 'tls.key'),
		tlsCaFile: join(dir, 'ca.crt'),
	});

	const copyLeaf = (leaf: string, dir: string) => {
		const files = filesIn(dir);
		copyFileSync(certs.leaves[leaf].keyFile, files.tlsKeyFile);
		copyFileSync(certs.leaves[leaf].certFile, files.tlsCertFile);
		copyFileSync(certs.caFile, files.tlsCaFile);
	};

	/**
	 * Updates the files the way the kubelet updates a mounted Secret: it
	 * writes a new timestamped directory, then swaps the `..data` symlink.
	 */
	const publish = (leaf: string, key?: string) => {
		const dataDir = `..gen_${++generation}`;
		mkdirSync(join(mountDir, dataDir));
		copyLeaf(leaf, join(mountDir, dataDir));
		if (key !== undefined) writeFileSync(join(mountDir, dataDir, 'tls.key'), key);
		symlinkSync(dataDir, join(mountDir, '..data_tmp'));
		renameSync(join(mountDir, '..data_tmp'), join(mountDir, '..data'));
	};

	beforeEach(() => {
		mountDir = mkdtempSync(join(tmpdir(), 'engine-tls-mount-'));
		publish('server');
		for (const name of ['tls.crt', 'tls.key', 'ca.crt']) {
			symlinkSync(join('..data', name), join(mountDir, name));
		}
		logger.info.mockReset();
		logger.error.mockReset();
		onReload.mockReset();
		tls = openEngineTls(filesIn(mountDir), logger, 20);
		tls?.subscribe(onReload);
	});

	afterEach(() => {
		tls?.close();
		rmSync(mountDir, { recursive: true, force: true });
	});

	describe('openEngineTls', () => {
		it('reloads the certificate after a Kubernetes Secret update', async () => {
			publish('renewedServer');

			await vi.waitFor(() => expect(onReload).toHaveBeenCalledOnce());
			expect(onReload).toHaveBeenCalledWith(tlsOf('renewedServer'));
			expect(tls?.current).toEqual(tlsOf('renewedServer'));
		});

		it('reloads the certificate after plain files are overwritten in place', async () => {
			const plainDir = mkdtempSync(join(tmpdir(), 'engine-tls-plain-'));
			copyLeaf('server', plainDir);
			const plain = openEngineTls(filesIn(plainDir), logger, 20);

			try {
				// On macOS, a second watch restarts the shared FSEvents stream, which drops events for a moment.
				await new Promise((resolve) => setTimeout(resolve, 100));
				copyLeaf('renewedServer', plainDir);

				await vi.waitFor(() => expect(plain?.current).toEqual(tlsOf('renewedServer')));
			} finally {
				plain?.close();
				rmSync(plainDir, { recursive: true, force: true });
			}
		});

		it('keeps the current certificate and logs an error when the new files are invalid', async () => {
			publish('renewedServer', 'half written');

			await vi.waitFor(() => expect(logger.error).toHaveBeenCalledOnce());
			expect(logger.error.mock.calls[0][0]).toMatch(/keeping the current certificate/i);
			expect(onReload).not.toHaveBeenCalled();
			expect(tls?.current).toEqual(tlsOf('server'));
		});

		it('notifies every listener and applies the same files again after one failed', async () => {
			const failingOnce = vi.fn().mockImplementationOnce(() => {
				throw new Error('apply failed');
			});
			tls?.subscribe(failingOnce);
			publish('renewedServer');
			await vi.waitFor(() => expect(logger.error).toHaveBeenCalledOnce());
			expect(onReload).toHaveBeenCalledOnce();

			publish('renewedServer');

			await vi.waitFor(() => expect(failingOnce).toHaveBeenCalledTimes(2));
			expect(onReload).toHaveBeenCalledTimes(2);
			expect(logger.info).toHaveBeenCalledExactlyOnceWith('Reloaded the engine TLS certificate');
		});

		it('does not reload when another file in the directory changes', async () => {
			writeFileSync(join(mountDir, 'unrelated.txt'), 'x');
			publish('server');

			await new Promise((resolve) => setTimeout(resolve, 200));
			expect(onReload).not.toHaveBeenCalled();
			expect(logger.error).not.toHaveBeenCalled();
		});

		it('stops notifying a listener once it is removed', async () => {
			const removed = vi.fn();
			tls?.subscribe(removed)();
			publish('renewedServer');

			await vi.waitFor(() => expect(onReload).toHaveBeenCalledOnce());
			expect(removed).not.toHaveBeenCalled();
		});

		it('stops reloading once closed', async () => {
			tls?.close();
			publish('renewedServer');

			await new Promise((resolve) => setTimeout(resolve, 200));
			expect(onReload).not.toHaveBeenCalled();
		});
	});

	describe('createEngineHttpServer', () => {
		let server: Server;
		let port: number;

		beforeEach(async () => {
			server = createEngineHttpServer((_req, res) => res.writeHead(200).end(), tls);
			await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
			port = (server.address() as AddressInfo).port;
		});

		afterEach(async () => {
			await new Promise<void>((resolve) => server.close(() => resolve()));
		});

		/** A new agent per call, so each call opens a new connection. */
		const get = async (withClientCert: boolean) =>
			await new Promise<{ status: number; serverFingerprint: string }>((resolve, reject) => {
				const client = tlsOf('client');
				const agent = new Agent({
					ca: client.ca,
					...(withClientCert && { cert: client.cert, key: client.key }),
				});
				const req = request({ host: '127.0.0.1', port, path: '/api/x', agent }, (res) => {
					const serverFingerprint = (res.socket as TLSSocket).getPeerCertificate().fingerprint256;
					res.resume();
					res.on('end', () => resolve({ status: res.statusCode ?? 0, serverFingerprint }));
				});
				req.on('error', reject);
				req.end();
			});

		it('serves a reloaded certificate to new connections and still requires a client certificate', async () => {
			publish('renewedServer');
			await vi.waitFor(() => expect(onReload).toHaveBeenCalledOnce());

			await expect(get(true)).resolves.toEqual({
				status: 200,
				serverFingerprint: new X509Certificate(tlsOf('renewedServer').cert).fingerprint256,
			});
			await expect(get(false)).resolves.toMatchObject({ status: 401 });
		});

		it('stops following the TLS source once closed', async () => {
			const unsubscribe = vi.fn();
			const source = {
				current: tlsOf('server'),
				subscribe: vi.fn(() => unsubscribe),
				close: vi.fn(),
			};
			const other = createEngineHttpServer((_req, res) => res.end(), source);
			await new Promise<void>((resolve) => other.listen(0, '127.0.0.1', resolve));

			await new Promise<void>((resolve) => other.close(() => resolve()));

			expect(source.subscribe).toHaveBeenCalledOnce();
			expect(unsubscribe).toHaveBeenCalledOnce();
		});
	});
});
