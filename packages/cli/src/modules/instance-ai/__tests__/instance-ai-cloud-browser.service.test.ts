import type { Logger } from '@n8n/backend-common';
import type { User, UserRepository } from '@n8n/db';
import type { DomainAccessTracker } from '@n8n/instance-ai';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { AiGatewayBrowserUseService } from '@/services/ai-gateway-browser-use.service';

import type { BrowserDomainGate } from '../browser/browser.helpers';
import { CloudBrowserLocalMcpServer } from '../browser/cloud-browser-local-mcp-server';
import { InstanceAiCloudBrowserService } from '../browser/instance-ai-cloud-browser.service';

vi.mock('node:fs/promises', () => ({ mkdir: vi.fn().mockResolvedValue(undefined) }));

describe('InstanceAiCloudBrowserService', () => {
	let service: InstanceAiCloudBrowserService;
	const userRepository = mock<UserRepository>();
	const credentialsService = mock<CredentialsService>();
	const domainGate: BrowserDomainGate = { tracker: mock<DomainAccessTracker>(), runId: 'run-1' };
	let release: ReturnType<typeof vi.spyOn>;
	let aiGatewayBrowserUseService: ReturnType<typeof mock<AiGatewayBrowserUseService>>;

	beforeEach(() => {
		const logger = mock<Logger>();
		logger.scoped.mockReturnValue(logger);
		aiGatewayBrowserUseService = mock<AiGatewayBrowserUseService>();
		aiGatewayBrowserUseService.isGatewayBrowserUseEnabled.mockReturnValue(true);
		service = new InstanceAiCloudBrowserService(
			logger,
			aiGatewayBrowserUseService,
			userRepository,
			credentialsService,
		);
		release = vi.spyOn(CloudBrowserLocalMcpServer.prototype, 'release').mockResolvedValue();
	});

	afterEach(() => vi.restoreAllMocks());

	it('creates one server per task and finds it by task id', async () => {
		const first = await service.createServer('user-1', 'thread-1', 'task-1', domainGate);
		const other = await service.createServer('user-1', 'thread-1', 'task-2', domainGate);

		expect(await service.createServer('user-1', 'thread-1', 'task-1', domainGate)).toBe(first);
		expect(other).not.toBe(first);
		expect(service.findServer('task-1')).toBe(first);
		expect(service.findServer('task-3')).toBeUndefined();
	});

	it('creates a single server when two calls for a task overlap', async () => {
		const [first, second] = await Promise.all([
			service.createServer('user-1', 'thread-1', 'task-1', domainGate),
			service.createServer('user-1', 'thread-1', 'task-1', domainGate),
		]);

		expect(second).toBe(first);
	});

	it('refuses to return a task server to another user', async () => {
		await service.createServer('user-1', 'thread-1', 'task-1', domainGate);

		await expect(service.createServer('user-2', 'thread-2', 'task-1', domainGate)).rejects.toThrow(
			'Cloud browser task belongs to another user',
		);
	});

	it('releases the task server and forgets it', async () => {
		await service.createServer('user-1', 'thread-1', 'task-1', domainGate);

		await service.release('task-1');

		expect(release).toHaveBeenCalledTimes(1);
		expect(service.findServer('task-1')).toBeUndefined();
	});

	it('does nothing when releasing a task without a server', async () => {
		await service.release('task-1');

		expect(release).not.toHaveBeenCalled();
	});

	it('releases every server on shutdown', async () => {
		await service.createServer('user-1', 'thread-1', 'task-1', domainGate);
		await service.createServer('user-2', 'thread-2', 'task-2', domainGate);

		await service.shutdown();

		expect(release).toHaveBeenCalledTimes(2);
		expect(service.findServer('task-1')).toBeUndefined();
		expect(service.findServer('task-2')).toBeUndefined();
	});

	it('gives the server the real browser tools, without the hidden ones', async () => {
		const server = await service.createServer('user-1', 'thread-1', 'task-1', domainGate);

		const names = server.getAvailableTools().map((tool) => tool.name);

		expect(names).toEqual(expect.arrayContaining(['browser_start_session', 'browser_navigate']));
		for (const hidden of [
			'browser_connect',
			'browser_disconnect',
			'browser_cookies',
			'browser_storage',
			'browser_evaluate',
			'browser_upload',
		]) {
			expect(names).not.toContain(hidden);
		}
		expect(
			server.getAvailableTools().every((tool) => tool.annotations?.category === 'browser'),
		).toBe(true);
	});

	it('gives the server the domain gate', async () => {
		const server = await service.createServer('user-1', 'thread-1', 'task-1', domainGate);

		expect(server['domainGate']).toBe(domainGate);
	});

	it('gives the server the newest domain gate when a task asks for it again', async () => {
		const server = await service.createServer('user-1', 'thread-1', 'task-1', domainGate);
		const newGate: BrowserDomainGate = {
			tracker: mock<DomainAccessTracker>(),
			runId: 'run-2',
			permissionMode: 'blocked',
		};

		expect(await service.createServer('user-1', 'thread-1', 'task-1', newGate)).toBe(server);
		expect(server['domainGate']).toBe(newGate);
	});

	it('creates credentials as the task user', async () => {
		const user = mock<User>({ id: 'user-1' });
		userRepository.findOne.mockResolvedValue(user);
		credentialsService.createUnmanagedCredential.mockResolvedValue({ id: 'cred-1' } as never);
		const server = await service.createServer('user-1', 'thread-1', 'task-1', domainGate);
		const payload = { name: 'Acme API', type: 'httpHeaderAuth', data: {} };

		const result = await server['options'].toolContext.createCredential?.(payload);

		expect(result).toEqual({ credentialId: 'cred-1' });
		expect(userRepository.findOne).toHaveBeenCalledWith(
			expect.objectContaining({ where: { id: 'user-1' } }),
		);
		expect(credentialsService.createUnmanagedCredential).toHaveBeenCalledWith(payload, user);
	});

	it('gives each task its own secrets buffer', async () => {
		const first = await service.createServer('user-1', 'thread-1', 'task-1', domainGate);
		const second = await service.createServer('user-1', 'thread-1', 'task-2', domainGate);

		first['options'].toolContext.secretsBuffer?.capture('acme', 'apiKey', 'secret');

		expect(second['options'].toolContext.secretsBuffer?.getFields('acme')).toBeUndefined();
	});

	it('gives the tools the system temp folder, without creating a folder', async () => {
		const server = await service.createServer('user-1', 'thread-1', 'task-1', domainGate);

		expect(server['options'].toolContext.dir).toBe(tmpdir());
		expect(mkdir).not.toHaveBeenCalled();
	});

	it('is available only when the gateway can create browser sessions', () => {
		expect(service.isAvailable()).toBe(true);

		aiGatewayBrowserUseService.isGatewayBrowserUseEnabled.mockReturnValue(false);

		expect(service.isAvailable()).toBe(false);
	});

	it('refuses to create a server when the gateway cannot create browser sessions', async () => {
		aiGatewayBrowserUseService.isGatewayBrowserUseEnabled.mockReturnValue(false);

		await expect(service.createServer('user-1', 'thread-1', 'task-1', domainGate)).rejects.toThrow(
			'Cloud browser use is not enabled',
		);
		expect(service.findServer('task-1')).toBeUndefined();
	});

	it('lets a later call create the server after a creation fails', async () => {
		aiGatewayBrowserUseService.isGatewayBrowserUseEnabled.mockReturnValueOnce(false);
		await expect(
			service.createServer('user-1', 'thread-1', 'task-1', domainGate),
		).rejects.toThrow();

		const server = await service.createServer('user-1', 'thread-1', 'task-1', domainGate);

		expect(service.findServer('task-1')).toBe(server);
	});

	it('creates and releases sessions through the gateway for the task', async () => {
		const session = { id: 'sess-1', connectUrl: 'wss://connect' };
		aiGatewayBrowserUseService.createSession.mockResolvedValue(session);
		const server = await service.createServer('user-1', 'thread-1', 'task-1', domainGate);
		const { sessionProvider, scope } = server['options'];

		await expect(sessionProvider.createSession(scope)).resolves.toEqual(session);
		await sessionProvider.releaseSession(scope, 'sess-1');

		const attribution = { instanceAiThreadId: 'thread-1', instanceAiTaskId: 'task-1' };
		expect(aiGatewayBrowserUseService.createSession).toHaveBeenCalledWith({
			userId: 'user-1',
			attribution,
		});
		expect(aiGatewayBrowserUseService.releaseSession).toHaveBeenCalledWith({
			userId: 'user-1',
			attribution,
			sessionId: 'sess-1',
		});
	});
});
