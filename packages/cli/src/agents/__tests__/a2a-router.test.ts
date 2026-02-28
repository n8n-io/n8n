/**
 * Tests for the A2A router's resolveAgentFromApiKey middleware
 * and endpoint behaviour.
 *
 * We mock Container.get to control PublicApiKeyService and AgentsService,
 * then exercise the Express routes via supertest-like manual invocation.
 */

import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import type express from 'express';

import { createA2ARouter } from '../a2a-router';
import type { AgentsService } from '@/services/agents/agents.service';
import type { PublicApiKeyService } from '@/services/public-api-key.service';

// Mock Container.get to return our test doubles
const mockPublicApiKeyService: Partial<PublicApiKeyService> = {
	resolveUserFromApiKey: jest.fn(),
	apiKeyHasValidScopes: jest.fn(),
};

const mockAgentsService: Partial<AgentsService> = {
	getAgentCard: jest.fn(),
	executeAgentTask: jest.fn(),
};

jest.spyOn(Container, 'get').mockImplementation((token: unknown) => {
	const name = typeof token === 'function' ? token.name : String(token);
	if (name === 'PublicApiKeyService') return mockPublicApiKeyService;
	if (name === 'AgentsService') return mockAgentsService;
	return {};
});

// Helper to build mock req/res for Express route handlers
function makeMockReqRes(
	overrides: {
		method?: string;
		path?: string;
		headers?: Record<string, string>;
		body?: unknown;
	} = {},
) {
	const statusFn = jest.fn().mockReturnThis();
	const jsonFn = jest.fn().mockReturnThis();
	const setFn = jest.fn().mockReturnThis();
	const writeHeadFn = jest.fn();
	const writeFn = jest.fn();
	const endFn = jest.fn();
	const flushFn = jest.fn();
	const onceFn = jest.fn();

	const req = {
		method: overrides.method ?? 'GET',
		path: overrides.path ?? '/',
		headers: overrides.headers ?? {},
		body: overrides.body ?? {},
		get: jest.fn((name: string) => (overrides.headers ?? {})[name.toLowerCase()]),
		protocol: 'https',
		socket: { setTimeout: jest.fn(), setKeepAlive: jest.fn(), setNoDelay: jest.fn() },
		once: onceFn,
	};

	const res = {
		status: statusFn,
		json: jsonFn,
		set: setFn,
		writeHead: writeHeadFn,
		write: writeFn,
		end: endFn,
		flush: flushFn,
		once: onceFn,
		writableEnded: false,
	};

	return {
		req: req as unknown as express.Request,
		res: res as unknown as express.Response,
		statusFn,
		jsonFn,
		setFn,
		writeHeadFn,
		writeFn,
		endFn,
	};
}

// We test resolveAgentFromApiKey indirectly through the routes
describe('A2A Router - resolveAgentFromApiKey', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	const agentUser = {
		id: 'agent-1',
		firstName: 'TestBot',
		type: 'agent',
	} as User;

	it('should return 401 when x-n8n-api-key header is missing', async () => {
		const router = createA2ARouter();
		const discoveryRoute = router.stack.find(
			(layer: { route?: { path: string } }) => layer.route?.path === '/.well-known/agent-card.json',
		);
		expect(discoveryRoute).toBeDefined();

		const { req, res, statusFn, jsonFn } = makeMockReqRes({
			headers: {},
		});

		await discoveryRoute!.route!.stack[0].handle(req, res, jest.fn());

		expect(statusFn).toHaveBeenCalledWith(401);
		expect(jsonFn).toHaveBeenCalledWith({ message: 'x-n8n-api-key header required' });
	});

	it('should return 401 for invalid API key', async () => {
		(mockPublicApiKeyService.resolveUserFromApiKey as jest.Mock).mockResolvedValue(null);

		const router = createA2ARouter();
		const discoveryRoute = router.stack.find(
			(layer: { route?: { path: string } }) => layer.route?.path === '/.well-known/agent-card.json',
		);

		const { req, res, statusFn, jsonFn } = makeMockReqRes({
			headers: { 'x-n8n-api-key': 'invalid-key' },
		});

		await discoveryRoute!.route!.stack[0].handle(req, res, jest.fn());

		expect(statusFn).toHaveBeenCalledWith(401);
		expect(jsonFn).toHaveBeenCalledWith({ message: 'Invalid API key' });
	});

	it('should return 400 when API key belongs to a non-agent user', async () => {
		const humanUser = { id: 'user-1', type: 'member' } as unknown as User;
		(mockPublicApiKeyService.resolveUserFromApiKey as jest.Mock).mockResolvedValue(humanUser);

		const router = createA2ARouter();
		const discoveryRoute = router.stack.find(
			(layer: { route?: { path: string } }) => layer.route?.path === '/.well-known/agent-card.json',
		);

		const { req, res, statusFn, jsonFn } = makeMockReqRes({
			headers: { 'x-n8n-api-key': 'human-key' },
		});

		await discoveryRoute!.route!.stack[0].handle(req, res, jest.fn());

		expect(statusFn).toHaveBeenCalledWith(400);
		expect(jsonFn).toHaveBeenCalledWith({ message: 'API key does not belong to an agent' });
	});

	it('should return 403 when API key lacks required scope', async () => {
		(mockPublicApiKeyService.resolveUserFromApiKey as jest.Mock).mockResolvedValue(agentUser);
		(mockPublicApiKeyService.apiKeyHasValidScopes as jest.Mock).mockResolvedValue(false);

		const router = createA2ARouter();
		const discoveryRoute = router.stack.find(
			(layer: { route?: { path: string } }) => layer.route?.path === '/.well-known/agent-card.json',
		);

		const { req, res, statusFn, jsonFn } = makeMockReqRes({
			headers: { 'x-n8n-api-key': 'no-scope-key' },
		});

		await discoveryRoute!.route!.stack[0].handle(req, res, jest.fn());

		expect(statusFn).toHaveBeenCalledWith(403);
		expect(jsonFn).toHaveBeenCalledWith({
			message: 'API key missing agent:receive scope',
		});
	});

	it('should return agent card on successful auth', async () => {
		(mockPublicApiKeyService.resolveUserFromApiKey as jest.Mock).mockResolvedValue(agentUser);
		(mockPublicApiKeyService.apiKeyHasValidScopes as jest.Mock).mockResolvedValue(true);
		(mockAgentsService.getAgentCard as jest.Mock).mockResolvedValue({
			id: 'agent-1',
			name: 'TestBot',
		});

		const router = createA2ARouter();
		const discoveryRoute = router.stack.find(
			(layer: { route?: { path: string } }) => layer.route?.path === '/.well-known/agent-card.json',
		);

		const { req, res, setFn, jsonFn } = makeMockReqRes({
			headers: { 'x-n8n-api-key': 'valid-key', host: 'example.com' },
		});

		await discoveryRoute!.route!.stack[0].handle(req, res, jest.fn());

		expect(setFn).toHaveBeenCalledWith('A2A-Version', '0.3');
		expect(jsonFn).toHaveBeenCalledWith({ id: 'agent-1', name: 'TestBot' });
	});
});

describe('A2A Router - POST /message\\:send', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	const agentUser = {
		id: 'agent-1',
		firstName: 'TestBot',
		type: 'agent',
	} as User;

	it('should return 400 for empty message parts', async () => {
		(mockPublicApiKeyService.resolveUserFromApiKey as jest.Mock).mockResolvedValue(agentUser);
		(mockPublicApiKeyService.apiKeyHasValidScopes as jest.Mock).mockResolvedValue(true);

		const router = createA2ARouter();
		const sendRoute = router.stack.find(
			(layer: { route?: { path: string; methods?: { post?: boolean } } }) =>
				layer.route?.path === '/message\\:send',
		);
		// Skip express.json() middleware (index 0), get the handler (index 1)
		const handler = sendRoute!.route!.stack[1].handle;

		const { req, res, statusFn, jsonFn } = makeMockReqRes({
			headers: { 'x-n8n-api-key': 'valid-key' },
			body: { message: { messageId: 'msg-1', role: 'user', parts: [] } },
		});

		await handler(req, res, jest.fn());

		expect(statusFn).toHaveBeenCalledWith(400);
		expect(jsonFn).toHaveBeenCalledWith({
			message: 'Message must contain at least one part',
		});
	});

	it('should execute task and return A2A response on success', async () => {
		(mockPublicApiKeyService.resolveUserFromApiKey as jest.Mock).mockResolvedValue(agentUser);
		(mockPublicApiKeyService.apiKeyHasValidScopes as jest.Mock).mockResolvedValue(true);
		(mockAgentsService.executeAgentTask as jest.Mock).mockResolvedValue({
			status: 'completed',
			summary: 'Done',
			steps: [],
		});

		const router = createA2ARouter();
		const sendRoute = router.stack.find(
			(layer: { route?: { path: string; methods?: { post?: boolean } } }) =>
				layer.route?.path === '/message\\:send',
		);
		const handler = sendRoute!.route!.stack[1].handle;

		const { req, res, setFn, jsonFn } = makeMockReqRes({
			headers: { 'x-n8n-api-key': 'valid-key' },
			body: {
				message: {
					messageId: 'msg-1',
					role: 'user',
					parts: [{ text: 'Run tests' }],
					taskId: 'task-1',
					contextId: 'ctx-1',
				},
			},
		});

		await handler(req, res, jest.fn());

		expect(mockAgentsService.executeAgentTask).toHaveBeenCalledWith(
			'agent-1',
			'Run tests',
			expect.any(Object),
			expect.any(Object),
		);
		expect(setFn).toHaveBeenCalledWith('A2A-Version', '0.3');
		expect(jsonFn).toHaveBeenCalledWith(
			expect.objectContaining({
				task: expect.objectContaining({
					id: 'task-1',
					contextId: 'ctx-1',
					status: expect.objectContaining({ state: 'completed' }),
				}),
			}),
		);
	});

	it('should forward BYOK credentials from metadata', async () => {
		(mockPublicApiKeyService.resolveUserFromApiKey as jest.Mock).mockResolvedValue(agentUser);
		(mockPublicApiKeyService.apiKeyHasValidScopes as jest.Mock).mockResolvedValue(true);
		(mockAgentsService.executeAgentTask as jest.Mock).mockResolvedValue({
			status: 'completed',
			summary: 'Done',
			steps: [],
		});

		const router = createA2ARouter();
		const sendRoute = router.stack.find(
			(layer: { route?: { path: string } }) => layer.route?.path === '/message\\:send',
		);
		const handler = sendRoute!.route!.stack[1].handle;

		const { req, res } = makeMockReqRes({
			headers: { 'x-n8n-api-key': 'valid-key' },
			body: {
				message: {
					messageId: 'msg-1',
					role: 'user',
					parts: [{ text: 'Go' }],
				},
				metadata: {
					byokCredentials: { anthropicApiKey: 'sk-test' },
					callerId: 'ext-caller',
				},
			},
		});

		await handler(req, res, jest.fn());

		const callOpts = (mockAgentsService.executeAgentTask as jest.Mock).mock.calls[0][3];
		expect(callOpts.byokApiKey).toBe('sk-test');
		expect(callOpts.callerId).toBe('ext-caller');
	});
});
