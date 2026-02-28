/**
 * Integration tests for the external agent proxy pipeline.
 *
 * Uses a real HTTP server (http.createServer) to mimic A2A agent responses
 * and validates the full translation pipeline: fetch → parse SSE → unwrap
 * JSON-RPC → translate A2A → write to Express response — with no jest.mock
 * on fetch.
 */
import http from 'node:http';
import { mock } from 'jest-mock-extended';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '@n8n/db';

import { AgentsController } from '../agents.controller';
import type { AgentsService } from '@/services/agents/agents.service';

// Mock SSRF validation — integration tests use localhost
jest.mock('@/agents/validate-agent-url', () => ({
	validateExternalAgentUrl: jest.fn().mockResolvedValue(undefined),
}));

/** Creates a one-shot HTTP server that responds with the given handler. Returns its URL. */
function createMockServer(
	handler: (req: http.IncomingMessage, res: http.ServerResponse) => void,
): Promise<{ url: string; close: () => Promise<void> }> {
	return new Promise((resolve) => {
		const server = http.createServer(handler);
		server.listen(0, '127.0.0.1', () => {
			const addr = server.address() as { port: number };
			resolve({
				url: `http://127.0.0.1:${String(addr.port)}/`,
				close: () => new Promise<void>((r) => server.close(() => r())),
			});
		});
	});
}

/** Captures writes to a mock Express response and returns parsed SSE events. */
function captureSseEvents(res: Response): Array<Record<string, unknown>> {
	const events: Array<Record<string, unknown>> = [];
	(res.write as jest.Mock).mockImplementation((chunk: string) => {
		// Extract JSON from SSE data lines
		const match = /^data: (.+)\n\n$/.exec(chunk);
		if (match) {
			events.push(JSON.parse(match[1]) as Record<string, unknown>);
		}
		return true;
	});
	return events;
}

function makeMockRes(): Response {
	const res = mock<Response>();
	res.writeHead.mockReturnValue(res);
	// Provide flush for sseWrite
	(res as unknown as { flush: jest.Mock }).flush = jest.fn();
	return res;
}

describe('proxyExternalTask integration', () => {
	const agentsService = mock<AgentsService>();
	let controller: AgentsController;

	beforeEach(() => {
		jest.clearAllMocks();
		controller = new AgentsController(agentsService);
		agentsService.resolveExternalAgentApiKey.mockResolvedValue('');
		agentsService.resolveCredentialMappings.mockResolvedValue({});
		agentsService.resolveProtocolVersion.mockResolvedValue(undefined);
	});

	it('should extract "Hello World" from SSE JSON-RPC v0.3 message response', async () => {
		const { url, close } = await createMockServer((_req, res) => {
			res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8' });
			res.write(
				`data: ${JSON.stringify({
					jsonrpc: '2.0',
					result: {
						kind: 'message',
						parts: [{ kind: 'text', text: 'Hello World' }],
						role: 'agent',
					},
				})}\n\n`,
			);
			res.end();
		});

		try {
			const res = makeMockRes();
			const events = captureSseEvents(res);

			await controller.proxyExternalTask(mock<AuthenticatedRequest>(), res, {
				url,
				prompt: 'Say hello',
			} as never);

			expect(events).toHaveLength(1);
			expect(events[0]).toEqual({
				type: 'task.completion',
				status: 'completed',
				summary: 'Hello World',
			});
			expect(res.end).toHaveBeenCalled();
		} finally {
			await close();
		}
	});

	it('should handle non-streaming JSON response with v0.3 message format', async () => {
		const { url, close } = await createMockServer((_req, res) => {
			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.end(
				JSON.stringify({
					jsonrpc: '2.0',
					id: 'resp-1',
					result: {
						kind: 'message',
						messageId: 'msg-1',
						role: 'agent',
						parts: [{ kind: 'text', text: 'Hello World' }],
					},
				}),
			);
		});

		try {
			const res = makeMockRes();
			const events = captureSseEvents(res);

			await controller.proxyExternalTask(mock<AuthenticatedRequest>(), res, {
				url,
				prompt: 'Say hello',
			} as never);

			expect(events).toHaveLength(1);
			expect(events[0]).toMatchObject({
				type: 'task.completion',
				status: 'completed',
				summary: 'Hello World',
			});
		} finally {
			await close();
		}
	});

	it('should translate A2A v0.2 task response correctly', async () => {
		const { url, close } = await createMockServer((_req, res) => {
			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.end(
				JSON.stringify({
					jsonrpc: '2.0',
					id: 'resp-1',
					result: {
						id: 'task-1',
						contextId: 'ctx-1',
						status: {
							state: 'completed',
							message: {
								messageId: 'msg-1',
								role: 'agent',
								parts: [{ text: 'Policy is compliant' }],
							},
						},
					},
				}),
			);
		});

		try {
			const res = makeMockRes();
			const events = captureSseEvents(res);

			await controller.proxyExternalTask(mock<AuthenticatedRequest>(), res, {
				url,
				prompt: 'Check policy',
			} as never);

			expect(events).toHaveLength(1);
			expect(events[0]).toMatchObject({
				type: 'task.completion',
				status: 'completed',
				summary: 'Policy is compliant',
			});
		} finally {
			await close();
		}
	});

	it('should surface JSON-RPC error as task.completion error', async () => {
		const { url, close } = await createMockServer((_req, res) => {
			res.writeHead(200, { 'Content-Type': 'text/event-stream' });
			res.write(
				`data: ${JSON.stringify({
					jsonrpc: '2.0',
					error: { code: -32601, message: 'Method not found' },
				})}\n\n`,
			);
			res.end();
		});

		try {
			const res = makeMockRes();
			const events = captureSseEvents(res);

			await controller.proxyExternalTask(mock<AuthenticatedRequest>(), res, {
				url,
				prompt: 'Test',
			} as never);

			expect(events).toHaveLength(1);
			expect(events[0]).toEqual({
				type: 'task.completion',
				status: 'error',
				summary: 'Remote agent error: Method not found',
			});
		} finally {
			await close();
		}
	});

	it('should abort reader after completion event and not hang on slow streams', async () => {
		const { url, close } = await createMockServer((_req, res) => {
			res.writeHead(200, { 'Content-Type': 'text/event-stream' });
			// Send completion event
			res.write(
				`data: ${JSON.stringify({
					jsonrpc: '2.0',
					result: {
						kind: 'message',
						parts: [{ kind: 'text', text: 'Done' }],
						role: 'agent',
					},
				})}\n\n`,
			);
			// Keep connection open — the proxy should NOT wait for this
			// (don't call res.end())
		});

		try {
			const res = makeMockRes();
			const events = captureSseEvents(res);

			// If the reader isn't aborted, this will hang for 120s (the abort timeout)
			const result = await Promise.race([
				controller.proxyExternalTask(mock<AuthenticatedRequest>(), res, {
					url,
					prompt: 'Test',
				} as never),
				new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 5_000)),
			]);

			expect(result).not.toBe('timeout');
			expect(events).toHaveLength(1);
			expect(events[0]).toMatchObject({
				type: 'task.completion',
				summary: 'Done',
			});
		} finally {
			await close();
		}
	}, 10_000);

	it('should flush after each SSE write (sseWrite)', async () => {
		const { url, close } = await createMockServer((_req, res) => {
			res.writeHead(200, { 'Content-Type': 'text/event-stream' });
			// Send a working status then completion
			res.write(
				`data: ${JSON.stringify({
					statusUpdate: {
						taskId: 't1',
						contextId: 'c1',
						status: {
							state: 'working',
							message: { messageId: 'm1', role: 'agent', parts: [{ text: 'Processing...' }] },
						},
					},
				})}\n\n`,
			);
			res.write(
				`data: ${JSON.stringify({
					task: {
						id: 't1',
						contextId: 'c1',
						status: {
							state: 'completed',
							message: { messageId: 'm2', role: 'agent', parts: [{ text: 'All done' }] },
						},
					},
				})}\n\n`,
			);
			res.end();
		});

		try {
			const res = makeMockRes();
			const events = captureSseEvents(res);

			await controller.proxyExternalTask(mock<AuthenticatedRequest>(), res, {
				url,
				prompt: 'Test',
			} as never);

			// Should have 2 events: action + completion
			expect(events).toHaveLength(2);
			expect(events[0]).toMatchObject({ type: 'task.action', action: 'Processing...' });
			expect(events[1]).toMatchObject({ type: 'task.completion', summary: 'All done' });

			// flush must be called for each write (sseWrite calls flush)
			const flush = (res as unknown as { flush: jest.Mock }).flush;
			expect(flush).toHaveBeenCalledTimes(2);
		} finally {
			await close();
		}
	});

	it('should handle HTTP error from remote agent', async () => {
		const { url, close } = await createMockServer((_req, res) => {
			res.writeHead(503);
			res.end('Service Unavailable');
		});

		try {
			const res = makeMockRes();
			const events = captureSseEvents(res);

			await controller.proxyExternalTask(mock<AuthenticatedRequest>(), res, {
				url,
				prompt: 'Test',
			} as never);

			expect(events).toHaveLength(1);
			expect(events[0]).toMatchObject({
				type: 'task.completion',
				status: 'error',
			});
			expect(events[0].summary).toContain('503');
		} finally {
			await close();
		}
	});
});
