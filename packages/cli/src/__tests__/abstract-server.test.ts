import { ModuleRegistry } from '@n8n/backend-common';
import { AppsHostingService } from '@n8n/backend-module-apps/hosting';
import { GlobalConfig } from '@n8n/config';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import type express from 'express';
import { IncomingMessage, type Server } from 'node:http';
import { Socket } from 'node:net';
import { mock } from 'vitest-mock-extended';

import { AbstractServer } from '@/abstract-server';
import { ControllerRegistry } from '@/controller.registry';
import { ExternalHooks } from '@/external-hooks';
import { LiveWebhooks } from '@/webhooks/live-webhooks';
import { SlackInteractionWebhooks } from '@/webhooks/slack-interaction-webhooks';
import { TelegramInteractionWebhooks } from '@/webhooks/telegram-interaction-webhooks';
import { WaitingForms } from '@/webhooks/waiting-forms';
import { WaitingWebhooks } from '@/webhooks/waiting-webhooks';
import { createWebhookHandlerFor } from '@/webhooks/webhook-request-handler';

vi.mock('@n8n/backend-module-apps/hosting', () => ({ AppsHostingService: vi.fn() }));
vi.mock('@/controller.registry', () => ({ ControllerRegistry: vi.fn() }));

vi.mock('@/webhooks/webhook-request-handler', () => ({
	createWebhookHandlerFor: vi.fn(),
}));

const mockServer = mock<Server>();

vi.mock('http', async () => ({
	...(await vi.importActual<typeof import('http')>('http')),
	createServer: () => mockServer,
}));

const mockApp = mock<express.Application>();
mockApp.get.mockReturnValue(mockApp);
mockApp.use.mockReturnValue(mockApp);

vi.mock('express', async () => ({ __esModule: true, default: () => mockApp }));

class TestServer extends AbstractServer {
	async configure() {}
}

describe('AbstractServer', () => {
	const moduleRegistry = mock<ModuleRegistry>({ eligibleModules: [] });
	let testServer: TestServer;
	let healthHandler: (req: express.Request, res: express.Response) => void;
	let readinessHandler: (req: express.Request, res: express.Response) => void;
	let dbConnection: DbConnection;

	beforeEach(() => {
		vi.restoreAllMocks();
		vi.clearAllMocks();
		moduleRegistry.eligibleModules.length = 0;
		moduleRegistry.isActive.mockReturnValue(false);
		Container.set(ModuleRegistry, moduleRegistry);

		mockServer.listen.mockImplementation((...args: unknown[]) => {
			const callback = args.find((arg) => typeof arg === 'function');
			if (callback) callback();
			return mockServer;
		});

		dbConnection = mock<DbConnection>();
		(
			dbConnection as { connectionState: { connected: boolean; migrated: boolean } }
		).connectionState = { connected: true, migrated: true };
		Container.set(DbConnection, dbConnection);

		const globalConfig = mock<GlobalConfig>({
			path: '/',
			protocol: 'http',
			port: 5678,
			listen_address: '0.0.0.0',
			proxy_hops: 0,
			ssl_key: '',
			ssl_cert: '',
			endpoints: {
				rest: 'rest',
				form: 'form',
				formTest: 'form-test',
				formWaiting: 'form-waiting',
				webhook: 'webhook',
				webhookTest: 'webhook-test',
				webhookWaiting: 'webhook-waiting',
				mcp: 'mcp',
				mcpTest: 'mcp-test',
				health: '/healthz',
			},
		});
		Container.set(GlobalConfig, globalConfig);
		Container.set(ExternalHooks, mock<ExternalHooks>());
		Container.set(LiveWebhooks, mock<LiveWebhooks>());
		Container.set(WaitingWebhooks, mock<WaitingWebhooks>());
		Container.set(SlackInteractionWebhooks, mock<SlackInteractionWebhooks>());
		Container.set(TelegramInteractionWebhooks, mock<TelegramInteractionWebhooks>());

		mockApp.get.mockImplementation((...args: unknown[]) => {
			const [path, handler] = args as [
				string,
				(req: express.Request, res: express.Response) => void,
			];
			if (path === '/healthz') {
				healthHandler = handler;
			} else if (path === '/healthz/readiness') {
				readinessHandler = handler;
			}
			return mockApp;
		});

		testServer = new TestServer();
	});

	describe('apps startup', () => {
		const router = mock<express.Router>();
		const hosting = mock<AppsHostingService>({ router });
		const controllers = mock<ControllerRegistry>();
		const emit = vi.fn<(event: string, ...args: unknown[]) => boolean>(() => true);

		beforeEach(() => {
			Container.set(AppsHostingService, hosting);
			Container.set(ControllerRegistry, controllers);
			Container.set(WaitingForms, mock<WaitingForms>());
			Object.assign(mockServer, { emit });
		});

		const emitUpgrade = () => {
			const socket = new Socket();
			const destroy = vi.spyOn(socket, 'destroy');
			const req = new IncomingMessage(socket);
			const handled = mockServer.emit('upgrade', req, socket, Buffer.alloc(0));
			return { req, socket, destroy, handled };
		};

		it('does not mount app hosting when the apps module is not eligible', async () => {
			await testServer.init();

			expect(mockApp.use).not.toHaveBeenCalledWith(hosting.dispatch);
			expect(mockServer.emit).toBe(emit);
		});

		it('destroys upgrades that app hosting rejects before any listener receives them', async () => {
			moduleRegistry.eligibleModules.push('apps');
			hosting.allowsUpgrade.mockReturnValue(false);
			await testServer.init();

			const { req, destroy, handled } = emitUpgrade();

			expect(hosting.allowsUpgrade).toHaveBeenCalledExactlyOnceWith(req);
			expect(destroy).toHaveBeenCalledOnce();
			expect(handled).toBe(true);
			expect(emit).not.toHaveBeenCalled();
		});

		it('passes allowed upgrades and other events to the listeners', async () => {
			moduleRegistry.eligibleModules.push('apps');
			hosting.allowsUpgrade.mockReturnValue(true);
			await testServer.init();

			const { req, socket, destroy } = emitUpgrade();
			mockServer.emit('request', req);

			expect(destroy).not.toHaveBeenCalled();
			expect(emit).toHaveBeenNthCalledWith(1, 'upgrade', req, socket, Buffer.alloc(0));
			expect(emit).toHaveBeenNthCalledWith(2, 'request', req);
		});

		it('activates apps controllers on the apps router', async () => {
			moduleRegistry.eligibleModules.push('apps');
			moduleRegistry.isActive.mockReturnValue(true);

			await testServer.init();

			expect(mockApp.use).toHaveBeenNthCalledWith(1, hosting.dispatch);

			await testServer.start();

			expect(moduleRegistry.isActive).toHaveBeenCalledWith('apps');
			expect(router.use).toHaveBeenCalledOnce();
			expect(controllers.activate).toHaveBeenCalledExactlyOnceWith(router, {
				surface: 'apps',
			});
		});

		it.each([false, true])(
			'returns 503 until the server is ready when the apps module is active: %s',
			async (active) => {
				moduleRegistry.eligibleModules.push('apps');
				moduleRegistry.isActive.mockReturnValue(active);
				await testServer.init();

				expect(router.use.mock.invocationCallOrder[0]).toBeLessThan(
					mockServer.listen.mock.invocationCallOrder[0],
				);
				const gate = router.use.mock.calls[0][0] as unknown as express.RequestHandler;
				const req = mock<express.Request>();
				const res = mock<express.Response>();
				const next = vi.fn();
				await gate(req, res, next);
				expect(res.sendStatus).toHaveBeenCalledExactlyOnceWith(503);
				expect(next).not.toHaveBeenCalled();

				const healthResponse = mock<express.Response>();
				healthHandler(req, healthResponse);
				expect(healthResponse.send).toHaveBeenCalledWith({ status: 'ok' });

				await testServer.start();
				await gate(req, res, next);
				expect(res.sendStatus).toHaveBeenCalledTimes(2);
				expect(next).not.toHaveBeenCalled();

				testServer.markAsReady();
				await gate(req, res, next);
				expect(res.sendStatus).toHaveBeenCalledTimes(2);
				expect(next).toHaveBeenCalledExactlyOnceWith();
			},
		);

		it('mounts app hosting without activating apps controllers for an inactive module', async () => {
			moduleRegistry.eligibleModules.push('apps');

			await testServer.init();
			await testServer.start();

			expect(mockApp.use).toHaveBeenNthCalledWith(1, hosting.dispatch);
			expect(moduleRegistry.isActive).toHaveBeenCalledWith('apps');
			expect(router.use).toHaveBeenCalledOnce();
			expect(controllers.activate).not.toHaveBeenCalled();
		});
	});

	describe('webhook route registration', () => {
		it('should register the waiting-forms route with the form sandbox family', async () => {
			const waitingForms = mock<WaitingForms>();
			Container.set(WaitingForms, waitingForms);

			await testServer.init();
			await testServer.start();

			expect(createWebhookHandlerFor).toHaveBeenCalledWith(waitingForms, undefined, 'form');
		});
	});

	describe('/healthz (liveness)', () => {
		beforeEach(async () => await testServer.init());

		it('should return 200 regardless of fullyReady flag', () => {
			const res = mock<express.Response>();
			healthHandler(mock<express.Request>(), res);
			expect(res.send).toHaveBeenCalledWith({ status: 'ok' });
		});
	});

	describe('/healthz/readiness', () => {
		beforeEach(async () => await testServer.init());

		it('should return 503 before markAsReady() is called', () => {
			const res = mock<express.Response>();
			res.status.mockReturnValue(res);

			readinessHandler(mock<express.Request>(), res);

			expect(res.status).toHaveBeenCalledWith(503);
			expect(res.send).toHaveBeenCalledWith({ status: 'error' });
		});

		it('should return 200 after markAsReady() is called', () => {
			testServer.markAsReady();

			const res = mock<express.Response>();
			res.status.mockReturnValue(res);

			readinessHandler(mock<express.Request>(), res);

			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.send).toHaveBeenCalledWith({ status: 'ok' });
		});

		it('should return 503 if DB disconnects after markAsReady()', () => {
			testServer.markAsReady();
			dbConnection.connectionState.connected = false;

			const res = mock<express.Response>();
			res.status.mockReturnValue(res);

			readinessHandler(mock<express.Request>(), res);

			expect(res.status).toHaveBeenCalledWith(503);
			expect(res.send).toHaveBeenCalledWith({ status: 'error' });
		});
	});
});
