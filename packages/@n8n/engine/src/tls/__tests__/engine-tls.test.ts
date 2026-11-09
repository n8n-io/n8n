import { UserError } from '@n8n/errors';
import { generateTlsCerts, type TlsCertFiles } from 'n8n-containers/helpers/tls-certs';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import type { Server } from 'node:http';
import { Agent, request } from 'node:https';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { assertSecureTransport, createEngineHttpServer, loadEngineTls } from '../engine-tls';

const LOOPBACK = ['DNS:localhost', 'IP:127.0.0.1'];

describe('engine TLS', () => {
	let dir: string;
	let otherDir: string;
	let certs: TlsCertFiles;
	let otherCaCerts: TlsCertFiles;

	beforeAll(() => {
		dir = mkdtempSync(join(tmpdir(), 'engine-tls-'));
		otherDir = mkdtempSync(join(tmpdir(), 'engine-tls-other-'));
		certs = generateTlsCerts(dir, { server: LOOPBACK, client: LOOPBACK });
		otherCaCerts = generateTlsCerts(otherDir, { client: LOOPBACK });
	});

	afterAll(() => {
		rmSync(dir, { recursive: true, force: true });
		rmSync(otherDir, { recursive: true, force: true });
	});

	const filesOf = (leaf: 'server' | 'client', set = certs) => ({
		tlsCertFile: set.leaves[leaf].certFile,
		tlsKeyFile: set.leaves[leaf].keyFile,
		tlsCaFile: set.caFile,
	});

	describe('loadEngineTls', () => {
		it('returns nothing when no TLS file is set', () => {
			expect(loadEngineTls({ tlsCertFile: '', tlsKeyFile: '', tlsCaFile: '' })).toBeUndefined();
		});

		it('reads the certificate, key and CA when all three are set', () => {
			const tls = loadEngineTls(filesOf('server'));

			expect(tls).toEqual({
				cert: readFileSync(certs.leaves.server.certFile),
				key: readFileSync(certs.leaves.server.keyFile),
				ca: readFileSync(certs.caFile),
			});
		});

		it('names the missing variables when only some are set', () => {
			const files = { ...filesOf('server'), tlsKeyFile: '', tlsCaFile: '' };

			expect(() => loadEngineTls(files)).toThrow(UserError);
			expect(() => loadEngineTls(files)).toThrow(
				'Missing: N8N_ENGINE_TLS_KEY_FILE, N8N_ENGINE_TLS_CA_FILE.',
			);
		});

		it('names the variable whose file cannot be read', () => {
			const files = { ...filesOf('server'), tlsCaFile: join(dir, 'missing.crt') };

			expect(() => loadEngineTls(files)).toThrow(/N8N_ENGINE_TLS_CA_FILE.*missing\.crt/);
		});

		it('refuses a key that does not match the certificate', () => {
			const files = { ...filesOf('server'), tlsKeyFile: certs.leaves.client.keyFile };

			expect(() => loadEngineTls(files)).toThrow(/not a valid certificate, key and CA/);
		});

		it('refuses a file that is not PEM', () => {
			const garbage = join(dir, 'garbage.crt');
			writeFileSync(garbage, 'not a certificate');

			expect(() => loadEngineTls({ ...filesOf('server'), tlsCertFile: garbage })).toThrow(
				/not a valid certificate, key and CA/,
			);
		});
	});

	describe('assertSecureTransport', () => {
		const logger = { warn: vi.fn() };
		const config = (tlsInsecureAllowPlainHttp = false) => ({ tlsInsecureAllowPlainHttp });

		beforeEach(() => logger.warn.mockReset());

		it('accepts TLS with https peer URLs', () => {
			const tls = loadEngineTls(filesOf('server'));

			expect(() =>
				assertSecureTransport(config(), tls, { N8N_ENGINE_BASE_URL: 'https://dp:3000' }, logger),
			).not.toThrow();
			expect(logger.warn).not.toHaveBeenCalled();
		});

		it('refuses TLS with an http peer URL', () => {
			const tls = loadEngineTls(filesOf('server'));

			expect(() =>
				assertSecureTransport(config(), tls, { N8N_ENGINE_BASE_URL: 'http://dp:3000' }, logger),
			).toThrow(
				'N8N_ENGINE_BASE_URL must start with https:// when engine TLS is on. Got: http://dp:3000',
			);
		});

		it('refuses plain HTTP without the opt-out', () => {
			expect(() => assertSecureTransport(config(), undefined, {}, logger)).toThrow(
				/needs N8N_ENGINE_TLS_CERT_FILE, N8N_ENGINE_TLS_KEY_FILE and N8N_ENGINE_TLS_CA_FILE.*N8N_ENGINE_TLS_INSECURE_ALLOW_PLAIN_HTTP=true/,
			);
		});

		it('allows plain HTTP with the opt-out, and warns', () => {
			expect(() =>
				assertSecureTransport(
					config(true),
					undefined,
					{ N8N_ENGINE_BASE_URL: 'http://dp' },
					logger,
				),
			).not.toThrow();
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('N8N_ENGINE_TLS_INSECURE_ALLOW_PLAIN_HTTP'),
			);
		});
	});

	describe('createEngineHttpServer', () => {
		let server: Server;
		let port: number;

		beforeAll(async () => {
			const tls = loadEngineTls(filesOf('server'));
			server = createEngineHttpServer((req, res) => {
				res.writeHead(200).end(`reached ${req.url}`);
			}, tls);
			await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
			port = (server.address() as AddressInfo).port;
		});

		afterAll(async () => {
			await new Promise<void>((resolve) => server.close(() => resolve()));
		});

		/** Each call gets its own agent, so no TLS session is reused across cases. */
		const get = async (path: string, client?: ReturnType<typeof filesOf>) =>
			await new Promise<{ status: number; body: string }>((resolve, reject) => {
				const agent = new Agent({
					ca: readFileSync(certs.caFile),
					...(client && {
						cert: readFileSync(client.tlsCertFile),
						key: readFileSync(client.tlsKeyFile),
					}),
				});
				const req = request({ host: '127.0.0.1', port, path, agent }, (res) => {
					let body = '';
					res.on('data', (chunk: Buffer) => (body += chunk.toString()));
					res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
				});
				req.on('error', reject);
				req.end();
			});

		it('passes a request with a client certificate from the trusted CA', async () => {
			await expect(get('/api/x', filesOf('client'))).resolves.toEqual({
				status: 200,
				body: 'reached /api/x',
			});
		});

		it.each([
			['no client certificate', undefined],
			['a client certificate from another CA', 'other'],
		] as const)('refuses a request with %s', async (_label, variant) => {
			const client = variant === 'other' ? filesOf('client', otherCaCerts) : undefined;

			const response = await get('/api/x', client);

			expect(response.status).toBe(401);
			expect(response.body).not.toContain('reached');
		});

		it('serves /healthz without a client certificate', async () => {
			await expect(get('/healthz?probe=1')).resolves.toEqual({
				status: 200,
				body: 'reached /healthz?probe=1',
			});
		});

		it('refuses a plain HTTP request on the TLS port', async () => {
			await expect(fetch(`http://127.0.0.1:${port}/healthz`)).rejects.toThrow();
		});

		it('serves plain HTTP without TLS material', async () => {
			const plain = createEngineHttpServer((_req, res) => res.writeHead(200).end('ok'), undefined);
			await new Promise<void>((resolve) => plain.listen(0, '127.0.0.1', resolve));

			const response = await fetch(`http://127.0.0.1:${(plain.address() as AddressInfo).port}/`);

			expect(response.status).toBe(200);
			await new Promise<void>((resolve) => plain.close(() => resolve()));
		});
	});
});
