import type { Logger } from '@n8n/backend-common';
import { OutboundHttp, type HttpRequestClient } from '@n8n/backend-network';
import type { EngineConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mintActionToken, mintIdentityToken } from '@n8n/engine';
import type { Request, Response } from 'express';
import { generateTlsCerts, type TlsCertFiles } from 'n8n-containers/helpers/tls-certs';
import { X509Certificate } from 'node:crypto';
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { get } from 'node:https';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { TLSSocket } from 'node:tls';
import request from 'supertest';
import { mock } from 'vitest-mock-extended';

import { EngineControlPlaneServer } from '../engine-control-plane-server';
import { EngineControlPlaneTransport } from '../engine-control-plane-transport';
import type { EngineCredentialsController } from '../engine-credentials.controller';
import type { EngineDataTablesController } from '../engine-data-tables.controller';
import { EngineMtls } from '../engine-mtls';
import type { EngineSubWorkflowController } from '../engine-sub-workflow.controller';

const authSecret = 'a'.repeat(32);

/** Binds for real, so these exercise the wiring rather than a mock app. */
describe('EngineControlPlaneServer', () => {
	let server: EngineControlPlaneServer;
	let serverLogger: Logger;
	let credentialsController: EngineCredentialsController;
	let dataTablesController: EngineDataTablesController;
	let baseUrl: string;

	const engineConfig = (overrides: Partial<EngineConfig> = {}) =>
		mock<EngineConfig>({
			authSecret,
			controlPlaneHost: '127.0.0.1',
			// Port 0: the OS picks a free one, so parallel files cannot clash.
			controlPlanePort: 0,
			...overrides,
		});

	const openedMtls: EngineMtls[] = [];

	/** Real mTLS over the given files, which it watches until the test ends. */
	const mtlsFrom = (files: Partial<EngineConfig> = {}) => {
		const logger = mock<Logger>();
		logger.scoped.mockReturnValue(logger);
		const config = engineConfig({ tlsCertFile: '', tlsKeyFile: '', tlsCaFile: '', ...files });
		const mtls = new EngineMtls(config, Container.get(OutboundHttp), logger);
		openedMtls.push(mtls);
		return mtls;
	};

	afterEach(() => {
		for (const mtls of openedMtls.splice(0)) mtls.close();
	});

	const startServer = async (mtls = mtlsFrom()) => {
		server = new EngineControlPlaneServer(
			engineConfig(),
			mtls,
			credentialsController,
			dataTablesController,
			mock<EngineSubWorkflowController>(),
			mock<Logger>({ scoped: vi.fn().mockReturnValue(serverLogger) }),
		);
		await server.start();
	};

	beforeEach(async () => {
		serverLogger = mock<Logger>();
		credentialsController = mock<EngineCredentialsController>();
		dataTablesController = mock<EngineDataTablesController>();
		await startServer();

		baseUrl = `http://127.0.0.1:${server.port}`;
	});

	afterEach(async () => {
		await server.stop();
	});

	const postResolve = (body: unknown, token?: string) => {
		const req = request(baseUrl).post('/internal/credentials/resolve');
		if (token) req.set('Authorization', `Bearer ${token}`);
		return req.send(body as object);
	};

	const postDataTableCall = (body: unknown, token?: string) => {
		const req = request(baseUrl).post('/internal/data-tables/call');
		if (token) req.set('Authorization', `Bearer ${token}`);
		return req.send(body as object);
	};

	it('logs the port it actually bound, not the configured one', () => {
		// Configured as `0`, so the OS picked it: logging the configured value
		// would tell an operator to dial port 0.
		expect(serverLogger.info).toHaveBeenCalledWith(
			expect.stringContaining(`http://127.0.0.1:${server.port}`),
		);
		expect(serverLogger.info).not.toHaveBeenCalledWith(expect.stringContaining(':0'));
	});

	it('logs a server error that is not a failure to bind', () => {
		// Nothing else handles these, so an unlogged one is a silent failure.
		const error = Object.assign(new Error('boom'), { code: 'ECONNRESET' });

		// @ts-expect-error reaching for the server's own error handler
		server.server.emit('error', error);

		expect(serverLogger.error).toHaveBeenCalledWith('Engine v2 control plane server error', {
			error,
		});
	});

	it('serves an open healthcheck', async () => {
		const response = await request(baseUrl).get('/healthz');

		expect(response.status).toBe(200);
		expect(response.body).toEqual({ status: 'ok' });
	});

	it('no longer accepts lifecycle events over HTTP', async () => {
		const response = await request(baseUrl)
			.post('/internal/status-callback')
			.set('Authorization', `Bearer ${mintActionToken(authSecret, 'credentials:read')}`)
			.send({ events: [] });

		expect(response.status).toBe(404);
	});

	describe('credential resolve route', () => {
		const body = { credential: { id: 'cred-1' } };

		beforeEach(() => {
			vi.mocked(credentialsController.resolveCredential).mockImplementation(
				async (_req: Request, res: Response) => {
					res.status(200).json({ data: {} });
				},
			);
		});

		it('does not read the request body before it authenticates the caller', async () => {
			// Malformed JSON: a parser that ran first would fail on it, not return a 401.
			const response = await request(baseUrl)
				.post('/internal/credentials/resolve')
				.set('Content-Type', 'application/json')
				.send('not json');

			expect(response.status).toBe(401);
			expect(credentialsController.resolveCredential).not.toHaveBeenCalled();
		});

		it('hands an authenticated request with its parsed body to the controller', async () => {
			const response = await postResolve(body, mintActionToken(authSecret, 'credentials:read'));

			expect(response.status).toBe(200);
			expect(credentialsController.resolveCredential).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ body }),
				expect.anything(),
			);
		});

		it.each([
			['no token', undefined],
			[
				'an identity token minted for the other direction',
				mintIdentityToken(authSecret, { cpId: 'cp-1', tenantId: 'tenant-1' }),
			],
			[
				'a token signed with a different secret',
				mintActionToken('b'.repeat(32), 'credentials:read'),
			],
		])('rejects %s before the controller sees it', async (_label, token) => {
			const response = await postResolve(body, token);

			expect(response.status).toBe(401);
			expect(response.body).toEqual({ code: 401, message: 'Unauthenticated' });
			expect(credentialsController.resolveCredential).not.toHaveBeenCalled();
		});
	});

	describe('data table call route', () => {
		const body = { call: { kind: 'getColumns', dataTableId: 'dt-1' } };

		beforeEach(() => {
			vi.mocked(dataTablesController.call).mockImplementation(
				async (_req: Request, res: Response) => {
					res.status(200).json({ data: [] });
				},
			);
		});

		it('hands an authenticated request with its parsed body to the controller', async () => {
			const response = await postDataTableCall(
				body,
				mintActionToken(authSecret, 'data-tables:use'),
			);

			expect(response.status).toBe(200);
			expect(dataTablesController.call).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ body }),
				expect.anything(),
			);
		});

		it.each([
			['no token', undefined],
			[
				'an identity token minted for the other direction',
				mintIdentityToken(authSecret, { cpId: 'cp-1', tenantId: 'tenant-1' }),
			],
			['a credentials token', mintActionToken(authSecret, 'credentials:read')],
			[
				'a token signed with a different secret',
				mintActionToken('b'.repeat(32), 'data-tables:use'),
			],
		])('rejects %s before the controller sees it', async (_label, token) => {
			const response = await postDataTableCall(body, token);

			expect(response.status).toBe(401);
			expect(dataTablesController.call).not.toHaveBeenCalled();
		});
	});

	describe('over mutual TLS', () => {
		const loopback = ['DNS:localhost', 'IP:127.0.0.1'];
		const body = { credential: { id: 'cred-1' } };
		let dir: string;
		let certs: TlsCertFiles;

		beforeAll(() => {
			dir = mkdtempSync(join(tmpdir(), 'engine-cp-tls-'));
			certs = generateTlsCerts(dir, {
				cp: loopback,
				dp: loopback,
				renewedCp: loopback,
				renewedDp: loopback,
			});
		});

		afterAll(() => rmSync(dir, { recursive: true, force: true }));

		const filesOf = (leaf: { certFile: string; keyFile: string }) => ({
			tlsCertFile: leaf.certFile,
			tlsKeyFile: leaf.keyFile,
			tlsCaFile: certs.caFile,
		});

		const dataPlaneClient = (
			controlPlaneBaseUrl: string,
			mtls = mtlsFrom(filesOf(certs.leaves.dp)),
		) =>
			new EngineControlPlaneTransport(engineConfig({ controlPlaneBaseUrl }), mtls).forScope(
				'credentials:read',
			);

		const resolveVia = async (client: HttpRequestClient) =>
			await client.request({
				url: '/internal/credentials/resolve',
				method: 'POST',
				body,
				json: true,
				returnFullResponse: true,
			});

		beforeEach(async () => {
			vi.mocked(credentialsController.resolveCredential).mockImplementation(
				async (_req: Request, res: Response) => {
					res.status(200).json({ data: {} });
				},
			);
			await server.stop();
			await startServer(mtlsFrom(filesOf(certs.leaves.cp)));
			baseUrl = `https://127.0.0.1:${server.port}`;
		});

		it('accepts the control plane transport of a data plane with a certificate from the trusted CA', async () => {
			const response = await resolveVia(dataPlaneClient(baseUrl));

			expect(response.statusCode).toBe(200);
			expect(credentialsController.resolveCredential).toHaveBeenCalledOnce();
		});

		it('refuses a control plane certificate from another CA even with NODE_TLS_REJECT_UNAUTHORIZED=0', async () => {
			const otherDir = mkdtempSync(join(tmpdir(), 'engine-cp-tls-other-'));
			try {
				const other = generateTlsCerts(otherDir, { cp: loopback });
				await server.stop();
				await startServer(mtlsFrom(filesOf(other.leaves.cp)));
				vi.stubEnv('NODE_TLS_REJECT_UNAUTHORIZED', '0');

				await expect(
					resolveVia(dataPlaneClient(`https://127.0.0.1:${server.port}`)),
				).rejects.toThrow(/certificate/);
				expect(credentialsController.resolveCredential).not.toHaveBeenCalled();
			} finally {
				vi.unstubAllEnvs();
				rmSync(otherDir, { recursive: true, force: true });
			}
		});

		it('uses renewed certificates for new connections in both directions once the files are replaced', async () => {
			const fingerprintOf = (leafName: string) =>
				new X509Certificate(readFileSync(certs.leaves[leafName].certFile)).fingerprint256;
			const replace = (files: ReturnType<typeof filesOf>, leafName: string) => {
				copyFileSync(certs.leaves[leafName].keyFile, files.tlsKeyFile);
				copyFileSync(certs.leaves[leafName].certFile, files.tlsCertFile);
			};
			const mount = (leafName: string) => {
				const mountDir = mkdtempSync(join(dir, 'mount-'));
				const files = {
					tlsCertFile: join(mountDir, 'tls.crt'),
					tlsKeyFile: join(mountDir, 'tls.key'),
					tlsCaFile: join(mountDir, 'ca.crt'),
				};
				copyFileSync(certs.caFile, files.tlsCaFile);
				replace(files, leafName);
				return files;
			};
			const serverFingerprint = async () =>
				await new Promise<string>((resolve, reject) => {
					const options = { host: '127.0.0.1', port: server.port, path: '/healthz', agent: false };
					get({ ...options, ca: readFileSync(certs.caFile) }, (res) => {
						resolve((res.socket as TLSSocket).getPeerCertificate().fingerprint256);
						res.resume();
					}).on('error', reject);
				});

			const cpFiles = mount('cp');
			const dpFiles = mount('dp');
			const cpMtls = mtlsFrom(cpFiles);
			const dpMtls = mtlsFrom(dpFiles);
			await server.stop();
			await startServer(cpMtls);
			const clientFingerprints: string[] = [];
			server['server']!.on('secureConnection', (socket: TLSSocket) => {
				clientFingerprints.push(socket.getPeerCertificate().fingerprint256);
			});
			const client = dataPlaneClient(`https://127.0.0.1:${server.port}`, dpMtls);
			await resolveVia(client);

			replace(cpFiles, 'renewedCp');
			replace(dpFiles, 'renewedDp');
			await vi.waitFor(
				() => {
					expect(cpMtls['tls']?.current.cert).toEqual(
						readFileSync(certs.leaves.renewedCp.certFile),
					);
					expect(dpMtls['tls']?.current.cert).toEqual(
						readFileSync(certs.leaves.renewedDp.certFile),
					);
				},
				{ timeout: 4000, interval: 50 },
			);

			const response = await resolveVia(client);

			expect(response.statusCode).toBe(200);
			expect(clientFingerprints).toEqual([fingerprintOf('dp'), fingerprintOf('renewedDp')]);
			await expect(serverFingerprint()).resolves.toBe(fingerprintOf('renewedCp'));
		});

		it('rejects a valid token without a client certificate', async () => {
			const response = await request(baseUrl)
				.post('/internal/credentials/resolve')
				.ca(readFileSync(certs.caFile))
				.set('Authorization', `Bearer ${mintActionToken(authSecret, 'credentials:read')}`)
				.send(body);

			expect(response.status).toBe(401);
			expect(credentialsController.resolveCredential).not.toHaveBeenCalled();
		});

		it('serves the healthcheck without a client certificate', async () => {
			const response = await request(baseUrl).get('/healthz').ca(readFileSync(certs.caFile));

			expect(response.status).toBe(200);
		});
	});

	it('stops listening when stopped', async () => {
		await server.stop();

		await expect(request(baseUrl).get('/healthz')).rejects.toThrow();
	});
});
