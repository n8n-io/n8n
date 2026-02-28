import type { AuthenticatedRequest } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { Request, Response } from 'express';

import type { INode } from 'n8n-workflow';

import { AgentsController } from '../agents.controller';

import type { AgentsService } from '@/services/agents/agents.service';
import { callExternalAgent } from '@/services/agents/agent-external-client';
import { callLlm } from '@/services/agents/agent-llm-client';
import { buildSystemPrompt } from '@/services/agents/agent-prompt-builder';
import { findSupportedTrigger, buildPinData } from '@/services/agents/agent-workflow-runner';
import type { ExternalAgentConfig, AgentDto, LlmConfig } from '@/services/agents/agents.types';
import { sseWrite, scrubSecrets } from '@/services/agents/agents.types';
import { jsonStringify } from 'n8n-workflow';

// Mock SSRF validation — unit tests don't resolve DNS
jest.mock('@/agents/validate-agent-url', () => ({
	validateExternalAgentUrl: jest.fn().mockResolvedValue(undefined),
}));

function makeAgentDto(overrides: Partial<AgentDto> = {}): AgentDto {
	return {
		id: 'agent-1',
		firstName: 'TestAgent',
		lastName: '',
		email: 'agent-test@internal.n8n.local',
		avatar: null,
		description: null,
		agentAccessLevel: 'external',
		...overrides,
	};
}

describe('AgentsController', () => {
	const agentsService = mock<AgentsService>();
	let controller: AgentsController;

	beforeEach(() => {
		jest.clearAllMocks();
		controller = new AgentsController(agentsService);
	});

	describe('getAgentCard', () => {
		it('should return valid A2A agent card schema with requiredCredentials', async () => {
			const card = {
				name: 'TestAgent',
				description: 'Handles docs',
				url: 'https://example.com/api/v1/agents/agent-1/task',
				version: '1.0.0',
				protocolVersion: '0.3',
				defaultInputModes: ['application/json'],
				defaultOutputModes: ['application/json'],
				provider: { organization: 'n8n', url: 'https://example.com' },
				capabilities: { streaming: true, pushNotifications: false, multiTurn: true },
				skills: [],
				additionalInterfaces: [
					{ transport: 'JSONRPC', url: 'https://example.com/api/v1/agents/agent-1/task' },
				],
				securitySchemes: {
					apiKey: { type: 'apiKey', name: 'x-n8n-api-key', in: 'header' },
				},
				security: [{ apiKey: [] }],
				id: 'agent-1',
				requiredCredentials: [{ type: 'anthropicApi', description: 'My Anthropic Key' }],
			};
			agentsService.getAgentCard.mockResolvedValue(card);

			const req = mock<Request>({ protocol: 'https' });
			req.get.mockReturnValue('example.com');

			const result = await controller.getAgentCard(req, mock<Response>(), 'agent-1');

			expect(agentsService.getAgentCard).toHaveBeenCalledWith('agent-1', 'https://example.com');
			expect(result).toEqual(card);
			expect(result.requiredCredentials).toEqual([
				{ type: 'anthropicApi', description: 'My Anthropic Key' },
			]);
		});

		it('should return empty requiredCredentials for agent with no credentials', async () => {
			const card = {
				name: 'EmptyAgent',
				description: '',
				url: 'https://example.com/api/v1/agents/agent-2/task',
				version: '1.0.0',
				protocolVersion: '0.3',
				defaultInputModes: ['application/json'],
				defaultOutputModes: ['application/json'],
				provider: { organization: 'n8n', url: 'https://example.com' },
				capabilities: { streaming: true, pushNotifications: false, multiTurn: true },
				skills: [],
				additionalInterfaces: [
					{ transport: 'JSONRPC', url: 'https://example.com/api/v1/agents/agent-2/task' },
				],
				securitySchemes: {
					apiKey: { type: 'apiKey', name: 'x-n8n-api-key', in: 'header' },
				},
				security: [{ apiKey: [] }],
				id: 'agent-2',
				requiredCredentials: [],
			};
			agentsService.getAgentCard.mockResolvedValue(card);

			const req = mock<Request>({ protocol: 'https' });
			req.get.mockReturnValue('example.com');

			const result = await controller.getAgentCard(req, mock<Response>(), 'agent-2');

			expect(result.requiredCredentials).toEqual([]);
		});

		it('should propagate 404 for non-existent agent', async () => {
			agentsService.getAgentCard.mockRejectedValue(new Error('Agent nonexistent not found'));

			const req = mock<Request>();
			await expect(controller.getAgentCard(req, mock<Response>(), 'nonexistent')).rejects.toThrow(
				'Agent nonexistent not found',
			);
		});
	});

	describe('createAgent', () => {
		it('should delegate to service and return result', async () => {
			const dto = makeAgentDto({ description: 'Test desc', agentAccessLevel: 'external' });
			agentsService.createAgent.mockResolvedValue(dto);

			const result = await controller.createAgent(mock(), mock<Response>(), {
				firstName: 'TestAgent',
				description: 'Test desc',
				agentAccessLevel: 'external',
			} as never);

			expect(agentsService.createAgent).toHaveBeenCalled();
			expect(result.description).toBe('Test desc');
			expect(result.agentAccessLevel).toBe('external');
		});
	});

	describe('updateAgent', () => {
		it('should delegate to service and return updated agent', async () => {
			const dto = makeAgentDto({ description: 'Updated desc', agentAccessLevel: 'internal' });
			agentsService.updateAgent.mockResolvedValue(dto);

			const result = await controller.updateAgent(mock(), mock<Response>(), 'agent-1', {
				description: 'Updated desc',
				agentAccessLevel: 'internal',
			} as never);

			expect(agentsService.updateAgent).toHaveBeenCalledWith('agent-1', {
				description: 'Updated desc',
				agentAccessLevel: 'internal',
			});
			expect(result.description).toBe('Updated desc');
		});

		it('should propagate 404 for non-existent agent', async () => {
			agentsService.updateAgent.mockRejectedValue(new Error('Agent bad-id not found'));

			await expect(
				controller.updateAgent(mock(), mock<Response>(), 'bad-id', {} as never),
			).rejects.toThrow('Agent bad-id not found');
		});
	});

	describe('getCapabilities', () => {
		it('should delegate to service', async () => {
			const caps = {
				agentId: 'agent-1',
				agentName: 'TestAgent',
				description: 'A helpful agent',
				agentAccessLevel: 'external' as const,
				llmConfigured: true,
				projects: [] as Array<{ id: string; name: string }>,
				workflows: [] as Array<{ id: string; name: string; active: boolean }>,
				credentials: [] as Array<{ id: string; name: string; type: string }>,
			};
			agentsService.getCapabilities.mockResolvedValue(caps);

			const result = await controller.getCapabilities(mock(), mock<Response>(), 'agent-1');

			expect(result.description).toBe('A helpful agent');
			expect(result.agentAccessLevel).toBe('external');
			expect(result.llmConfigured).toBe(true);
		});

		it('should return 404 when queried with a non-agent user ID', async () => {
			agentsService.getCapabilities.mockRejectedValue(new Error('Agent human-user-id not found'));

			await expect(
				controller.getCapabilities(mock(), mock<Response>(), 'human-user-id'),
			).rejects.toThrow('Agent human-user-id not found');
		});
	});

	describe('deleteAgent', () => {
		it('should delete agent and return 204', async () => {
			agentsService.deleteAgent.mockResolvedValue(undefined);

			const res = mock<Response>();
			res.status.mockReturnValue(res);

			await controller.deleteAgent(mock(), res, 'agent-1');

			expect(agentsService.deleteAgent).toHaveBeenCalledWith('agent-1');
			expect(res.status).toHaveBeenCalledWith(204);
		});

		it('should propagate 404 for non-existent agent', async () => {
			agentsService.deleteAgent.mockRejectedValue(new Error('Agent bad-id not found'));

			await expect(controller.deleteAgent(mock(), mock<Response>(), 'bad-id')).rejects.toThrow(
				'Agent bad-id not found',
			);
		});
	});

	describe('listAgents', () => {
		it('should return all agents', async () => {
			const agents = [
				makeAgentDto({ id: 'a-1', firstName: 'Bot1' }),
				makeAgentDto({ id: 'a-2', firstName: 'Bot2' }),
			];
			agentsService.listAgents.mockResolvedValue(agents);

			const result = await controller.listAgents(mock());

			expect(result).toHaveLength(2);
			expect(result[0].id).toBe('a-1');
			expect(result[1].id).toBe('a-2');
		});

		it('should return empty array when no agents exist', async () => {
			agentsService.listAgents.mockResolvedValue([]);

			const result = await controller.listAgents(mock());

			expect(result).toEqual([]);
		});
	});

	describe('dispatchTask', () => {
		function makeAuthReq(accept: string) {
			const req = mock<AuthenticatedRequest>();
			req.user = { id: 'caller-1' } as AuthenticatedRequest['user'];
			Object.defineProperty(req, 'headers', {
				value: { accept, 'push-ref': 'test' },
				writable: true,
			});
			// Mock socket for hardenSseConnection
			Object.defineProperty(req, 'socket', {
				value: {
					setTimeout: jest.fn(),
					setKeepAlive: jest.fn(),
					setNoDelay: jest.fn(),
				},
				writable: true,
			});
			Object.defineProperty(req, 'once', {
				value: jest.fn(),
				writable: true,
			});
			return req;
		}

		it('should enforce access level before executing', async () => {
			agentsService.enforceAccessLevel.mockResolvedValue(undefined);
			agentsService.executeAgentTask.mockResolvedValue({
				status: 'completed',
				summary: 'Done',
				steps: [],
			});

			const req = makeAuthReq('application/json');

			await controller.dispatchTask(req, mock<Response>(), 'agent-1', {
				prompt: 'Do something',
			} as never);

			expect(agentsService.enforceAccessLevel).toHaveBeenCalledWith('agent-1', req.user);
		});

		it('should return JSON for non-stream requests', async () => {
			agentsService.enforceAccessLevel.mockResolvedValue(undefined);
			const taskResult = { status: 'completed', summary: 'Done', steps: [] };
			agentsService.executeAgentTask.mockResolvedValue(taskResult);

			const req = makeAuthReq('application/json');
			const res = mock<Response>();

			await controller.dispatchTask(req, res, 'agent-1', {
				prompt: 'Test',
			} as never);

			expect(res.json).toHaveBeenCalledWith(taskResult);
		});

		it('should write SSE headers for stream requests', async () => {
			agentsService.enforceAccessLevel.mockResolvedValue(undefined);
			agentsService.executeAgentTask.mockResolvedValue({
				status: 'completed',
				summary: 'Done',
				steps: [],
			});

			const req = makeAuthReq('text/event-stream');
			const res = mock<Response>();

			await controller.dispatchTask(req, res, 'agent-1', {
				prompt: 'Test',
			} as never);

			expect(res.writeHead).toHaveBeenCalledWith(200, {
				'Content-Type': 'text/event-stream; charset=UTF-8',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
			});
			expect(res.end).toHaveBeenCalled();
		});

		it('should pass byokApiKey and callerId from DTO to service', async () => {
			agentsService.enforceAccessLevel.mockResolvedValue(undefined);
			agentsService.executeAgentTask.mockResolvedValue({
				status: 'completed',
				summary: 'Done',
				steps: [],
			});

			const req = makeAuthReq('application/json');

			await controller.dispatchTask(req, mock<Response>(), 'agent-1', {
				prompt: 'Test',
				byokCredentials: { anthropicApiKey: 'sk-ant-test' },
				callerId: 'external-caller',
			} as never);

			const callOpts = agentsService.executeAgentTask.mock.calls[0][3];
			expect(callOpts).toHaveProperty('byokApiKey', 'sk-ant-test');
			expect(callOpts).toHaveProperty('callerId', 'external-caller');
		});

		it('should pass workflowCredentials from DTO to service', async () => {
			agentsService.enforceAccessLevel.mockResolvedValue(undefined);
			agentsService.executeAgentTask.mockResolvedValue({
				status: 'completed',
				summary: 'Done',
				steps: [],
			});

			const req = makeAuthReq('application/json');
			const workflowCredentials = { currentsApi: { apiKey: 'cur_test_key' } };

			await controller.dispatchTask(req, mock<Response>(), 'agent-1', {
				prompt: 'Test',
				byokCredentials: { anthropicApiKey: 'sk-ant-test', workflowCredentials },
			} as never);

			const callOpts = agentsService.executeAgentTask.mock.calls[0][3];
			expect(callOpts).toHaveProperty('workflowCredentials', workflowCredentials);
			expect(callOpts).toHaveProperty('byokApiKey', 'sk-ant-test');
		});

		it('should pass workflowCredentials in SSE streaming path', async () => {
			agentsService.enforceAccessLevel.mockResolvedValue(undefined);
			agentsService.executeAgentTask.mockResolvedValue({
				status: 'completed',
				summary: 'Done',
				steps: [],
			});

			const req = makeAuthReq('text/event-stream');
			const workflowCredentials = { notionApi: { apiKey: 'ntn_test' } };

			await controller.dispatchTask(req, mock<Response>(), 'agent-1', {
				prompt: 'Test',
				byokCredentials: { workflowCredentials },
			} as never);

			const callOpts = agentsService.executeAgentTask.mock.calls[0][3];
			expect(callOpts).toHaveProperty('workflowCredentials', workflowCredentials);
		});

		it('should not pass workflowCredentials when byokCredentials is absent', async () => {
			agentsService.enforceAccessLevel.mockResolvedValue(undefined);
			agentsService.executeAgentTask.mockResolvedValue({
				status: 'completed',
				summary: 'Done',
				steps: [],
			});

			const req = makeAuthReq('application/json');

			await controller.dispatchTask(req, mock<Response>(), 'agent-1', {
				prompt: 'Test',
			} as never);

			const callOpts = agentsService.executeAgentTask.mock.calls[0][3];
			expect(callOpts?.workflowCredentials).toBeUndefined();
			expect(callOpts?.byokApiKey).toBeUndefined();
		});

		it('should flush after each SSE write to prevent compression buffering', async () => {
			agentsService.enforceAccessLevel.mockResolvedValue(undefined);

			// Capture the onStep callback and simulate step events
			agentsService.executeAgentTask.mockImplementation(async (_id, _prompt, _budget, opts) => {
				opts?.onStep?.({ type: 'task.action', action: 'execute_workflow', workflowName: 'Report' });
				opts?.onStep?.({ type: 'task.observation', result: 'success' });
				return { status: 'completed', summary: 'Done', steps: [] };
			});

			const req = makeAuthReq('text/event-stream');
			const res = mock<Response>();

			await controller.dispatchTask(req, res, 'agent-1', {
				prompt: 'Test',
			} as never);

			// 2 onStep writes + 1 final "task.completion" write = 3 total
			expect(res.write).toHaveBeenCalledTimes(3);
			// flush must be called after EVERY write (regression: compression middleware buffers SSE)
			expect(res.flush).toHaveBeenCalledTimes(3);
		});
	});
});

describe('buildSystemPrompt', () => {
	it('should include delegate instructions when canDelegate is true', () => {
		const agents = [{ id: 'a-1', firstName: 'Helper', description: 'Helps with things' }];
		const prompt = buildSystemPrompt('TestAgent', [], agents, true);

		expect(prompt).toContain('delegate');
		expect(prompt).toContain('Helper (id: a-1): Helps with things');
	});

	it('should exclude delegate when canDelegate is false', () => {
		const agents = [{ id: 'a-1', firstName: 'Helper', description: 'Helps' }];
		const prompt = buildSystemPrompt('TestAgent', [], agents, false);

		expect(prompt).not.toContain('delegate');
		expect(prompt).not.toContain('Helper');
	});

	it('should use description in agent list', () => {
		const agents = [
			{ id: 'a-1', firstName: 'DocBot', description: 'Knowledge Base' },
			{ id: 'a-2', firstName: 'QABot', description: '' },
		];
		const prompt = buildSystemPrompt('TestAgent', [], agents, true);

		expect(prompt).toContain('DocBot (id: a-1): Knowledge Base');
		expect(prompt).toContain('QABot (id: a-2)');
	});

	it('should list workflows when provided', () => {
		const workflows = [
			{ id: 'wf-1', name: 'Deploy', active: true },
			{ id: 'wf-2', name: 'Test', active: false },
		];
		const prompt = buildSystemPrompt('TestAgent', workflows, [], false);

		expect(prompt).toContain('Deploy (id: wf-1, active: true)');
		expect(prompt).toContain('Test (id: wf-2, active: false)');
	});

	it('should show (none) when no workflows', () => {
		const prompt = buildSystemPrompt('TestAgent', [], [], false);
		expect(prompt).toContain('(none)');
	});

	it('should only allow execute_workflow and complete when canDelegate is false', () => {
		const prompt = buildSystemPrompt('TestAgent', [], [], false);
		expect(prompt).toContain('"execute_workflow" or "complete"');
		expect(prompt).not.toContain('"delegate"');
	});

	it('should include targetUserId in delegation instructions', () => {
		const agents = [{ id: 'a-1', firstName: 'Helper', description: 'Helps' }];
		const prompt = buildSystemPrompt('TestAgent', [], agents, true);

		expect(prompt).toContain('targetUserId');
		expect(prompt).not.toContain('"toAgentId"');
	});

	it('should include external agents in prompt alongside local agents', () => {
		const localAgents = [{ id: 'a-1', firstName: 'LocalBot', description: 'Local helper' }];
		const externalAgents = [
			{ id: 'external:RemoteBot', firstName: 'RemoteBot', description: 'Remote helper' },
		];
		const merged = [...localAgents, ...externalAgents];
		const prompt = buildSystemPrompt('TestAgent', [], merged, true);

		expect(prompt).toContain('LocalBot (id: a-1): Local helper');
		expect(prompt).toContain('RemoteBot (id: external:RemoteBot): Remote helper');
		expect(prompt).toContain('delegate');
	});

	it('should show external-only agents when no local agents exist', () => {
		const externalOnly = [
			{ id: 'external:ExtBot', firstName: 'ExtBot', description: 'External only' },
		];
		const prompt = buildSystemPrompt('TestAgent', [], externalOnly, true);

		expect(prompt).toContain('ExtBot (id: external:ExtBot): External only');
		expect(prompt).toContain('delegate');
	});

	it('should render typed inputs for workflows with skills', () => {
		const workflows = [
			{ id: 'wf-1', name: 'Send Slack', active: true },
			{ id: 'wf-2', name: 'Deploy', active: true },
		];
		const skills = [
			{
				workflowId: 'wf-1',
				workflowName: 'Send Slack',
				inputs: [
					{ name: 'channel', type: 'string' },
					{ name: 'message', type: 'string' },
				],
			},
		];
		const prompt = buildSystemPrompt('TestAgent', workflows, [], false, skills);

		expect(prompt).toContain('Typed inputs: { channel: string, message: string }');
		// wf-2 has no skill — should appear without typed inputs line
		expect(prompt).toContain('Deploy (id: wf-2, active: true)');
		expect(prompt).not.toMatch(/Deploy.*Typed inputs/);
	});

	it('should include inputs instruction when skills are present', () => {
		const workflows = [{ id: 'wf-1', name: 'Test', active: true }];
		const skills = [
			{
				workflowId: 'wf-1',
				workflowName: 'Test',
				inputs: [{ name: 'field', type: 'string' }],
			},
		];
		const prompt = buildSystemPrompt('TestAgent', workflows, [], false, skills);

		expect(prompt).toContain('"inputs"');
		expect(prompt).toContain('fieldName');
	});

	it('should not include inputs instruction when no skills', () => {
		const prompt = buildSystemPrompt('TestAgent', [], [], false);

		expect(prompt).not.toContain('"inputs"');
	});

	it('should not include inputs instruction when skills array is empty', () => {
		const prompt = buildSystemPrompt('TestAgent', [], [], false, []);

		expect(prompt).not.toContain('"inputs"');
	});
});

describe('callExternalAgent', () => {
	const originalFetch = global.fetch;

	afterEach(() => {
		global.fetch = originalFetch;
	});

	it('should POST to n8n external agent URL with correct headers and body', async () => {
		const config: ExternalAgentConfig = {
			name: 'RemoteBot',
			url: 'https://remote.example.com/api/v1/agents/abc/task',
			apiKey: 'remote-api-key',
		};

		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				data: { status: 'completed', summary: 'Done remotely', steps: [] },
			}),
		});

		const result = await callExternalAgent(config, 'Do something');

		expect(global.fetch).toHaveBeenCalledWith(
			'https://remote.example.com/api/v1/agents/abc/task',
			expect.objectContaining({
				method: 'POST',
				headers: expect.objectContaining({
					'Content-Type': 'application/json',
					'x-n8n-api-key': 'remote-api-key',
				}),
				body: JSON.stringify({ prompt: 'Do something' }),
			}),
		);

		expect(result.status).toBe('completed');
		expect(result.summary).toBe('Done remotely');
	});

	it('should POST to A2A v0.3 endpoint with JSON-RPC message/send format', async () => {
		const config: ExternalAgentConfig = {
			name: 'PolicyCheck',
			url: 'https://policycheck.tools/api/a2a',
			apiKey: 'test-key',
		};

		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				jsonrpc: '2.0',
				id: 'resp-1',
				result: {
					kind: 'message',
					messageId: 'msg-1',
					role: 'agent',
					parts: [{ kind: 'text', text: 'Policy analysed' }],
				},
			}),
		});

		const result = await callExternalAgent(config, 'Analyse policies');

		const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
		const body = JSON.parse(fetchCall[1].body as string);

		// Should use JSON-RPC message/stream format (v0.3 default for non-n8n URLs)
		expect(body.jsonrpc).toBe('2.0');
		expect(body.method).toBe('message/stream');
		expect(body.params.message.parts[0]).toEqual({ text: 'Analyse policies' });

		// Should use X-API-Key header (not x-n8n-api-key)
		expect(fetchCall[1].headers).toHaveProperty('X-API-Key', 'test-key');
		expect(fetchCall[1].headers).not.toHaveProperty('x-n8n-api-key');

		expect(result.status).toBe('completed');
		expect(result.summary).toBe('Policy analysed');
	});

	it('should work without API key for public A2A agents', async () => {
		const config: ExternalAgentConfig = {
			name: 'PublicBot',
			url: 'https://public.example.com/a2a',
		};

		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				jsonrpc: '2.0',
				id: 'resp-1',
				result: {
					id: 'task-1',
					status: { state: 'completed', message: { role: 'agent', parts: [{ text: 'Done' }] } },
				},
			}),
		});

		const result = await callExternalAgent(config, 'Hello');

		const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
		expect(fetchCall[1].headers).not.toHaveProperty('X-API-Key');
		expect(fetchCall[1].headers).not.toHaveProperty('x-n8n-api-key');
		expect(result.status).toBe('completed');
	});

	it('should not forward keys in the request body', async () => {
		const config: ExternalAgentConfig = {
			name: 'RemoteBot',
			url: 'https://remote.example.com/api/v1/agents/abc/task',
			apiKey: 'key',
		};

		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ status: 'completed', summary: 'OK', steps: [] }),
		});

		await callExternalAgent(config, 'Hello');

		const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
		const body = JSON.parse(fetchCall[1].body as string);
		expect(body).not.toHaveProperty('keys');
	});

	it('should unwrap response without data envelope', async () => {
		const config: ExternalAgentConfig = {
			name: 'RemoteBot',
			url: 'https://remote.example.com/api/v1/agents/abc/task',
			apiKey: 'key',
		};

		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ status: 'completed', summary: 'Direct', steps: [] }),
		});

		const result = await callExternalAgent(config, 'Hello');

		expect(result.status).toBe('completed');
		expect(result.summary).toBe('Direct');
	});

	it('should throw on non-OK response', async () => {
		const config: ExternalAgentConfig = {
			name: 'RemoteBot',
			url: 'https://remote.example.com/api/v1/agents/abc/task',
			apiKey: 'key',
		};

		global.fetch = jest.fn().mockResolvedValue({
			ok: false,
			status: 500,
			text: async () => 'Internal Server Error',
		});

		await expect(callExternalAgent(config, 'Hello')).rejects.toThrow(
			'External agent returned 500: Internal Server Error',
		);
	});
});

describe('sseWrite', () => {
	it('should write SSE-formatted data', () => {
		const res = { write: jest.fn(), flush: jest.fn() };
		sseWrite(res, { type: 'task.action', action: 'execute_workflow' });

		expect(res.write).toHaveBeenCalledWith(
			'data: {"type":"task.action","action":"execute_workflow"}\n\n',
		);
	});

	it('should flush after every write to prevent compression buffering', () => {
		const res = { write: jest.fn(), flush: jest.fn() };

		sseWrite(res, { type: 'task.action', action: 'execute_workflow' });
		expect(res.flush).toHaveBeenCalledTimes(1);

		sseWrite(res, { type: 'task.observation', result: 'success' });
		expect(res.flush).toHaveBeenCalledTimes(2);

		sseWrite(res, { type: 'task.completion', summary: 'All done' });
		expect(res.flush).toHaveBeenCalledTimes(3);
	});

	it('should not throw when flush is not available', () => {
		const res = { write: jest.fn() };
		expect(() => sseWrite(res, { type: 'task.completion', summary: 'OK' })).not.toThrow();
		expect(res.write).toHaveBeenCalled();
	});
});

describe('callLlm', () => {
	const originalFetch = global.fetch;

	afterEach(() => {
		global.fetch = originalFetch;
	});

	const defaultConfig: LlmConfig = {
		apiKey: 'test-key',
		baseUrl: 'https://api.anthropic.com',
		model: 'claude-sonnet-4-5-20250929',
	};

	it('should use config values for API call', async () => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ content: [{ type: 'text', text: 'Hello' }] }),
		});

		const result = await callLlm(
			[
				{ role: 'system', content: 'You are helpful' },
				{ role: 'user', content: 'Hi' },
			],
			defaultConfig,
		);

		expect(result).toBe('Hello');
		expect(global.fetch).toHaveBeenCalledWith(
			'https://api.anthropic.com/v1/messages',
			expect.objectContaining({
				headers: expect.objectContaining({
					'x-api-key': 'test-key',
				}),
				body: expect.stringContaining('"model":"claude-sonnet-4-5-20250929"'),
			}),
		);
	});

	it('should use custom baseUrl from config', async () => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ content: [{ type: 'text', text: 'OK' }] }),
		});

		await callLlm([{ role: 'user', content: 'Hi' }], {
			...defaultConfig,
			baseUrl: 'https://custom.api.com',
		});

		expect(global.fetch).toHaveBeenCalledWith(
			'https://custom.api.com/v1/messages',
			expect.anything(),
		);
	});

	it('should throw on non-OK response', async () => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: false,
			status: 401,
			text: async () => 'Unauthorized',
		});

		await expect(callLlm([{ role: 'user', content: 'Hi' }], defaultConfig)).rejects.toThrow(
			'LLM API returned 401: Unauthorized',
		);
	});
});

describe('credential leak investigation', () => {
	// These tests document how workflow error data flows through the agent's
	// observation path. Line 634 of agents.service.ts serialises the full
	// runWorkflow result (including resultData) and sends it to:
	//   1. The LLM context (messages array)
	//   2. The SSE stream (onStep callback)
	//   3. The final task result (steps array)
	//
	// If a node fails and its error includes credential data in the response
	// body (e.g. a 401 that echoes the auth header), that data leaks.

	it('should expose credential values in serialised workflow result when node error contains them', () => {
		// Simulate what runWorkflow returns when a node fails with credential data
		// in the error context (e.g. API echoes back Authorization header in 401)
		const fakeRunWorkflowResult = {
			success: false,
			executionId: 'exec-123',
			data: {
				// This is resultData — what line 839 returns
				error: {
					message: 'Request failed with status code 401',
					name: 'NodeApiError',
					context: {
						data: {
							error: 'Unauthorized',
							// API echoed back the auth header — this is the leak
							received_authorization: 'Bearer cur_SUPER_SECRET_CURRENTS_KEY',
						},
					},
				},
				runData: {},
				lastNodeExecuted: 'Currents',
			},
		};

		// This is exactly what line 634 does:
		// `Workflow "${workflowName}" executed. Result: ${jsonStringify(result).slice(0, 2000)}`
		const serialised = jsonStringify(fakeRunWorkflowResult).slice(0, 2000);

		// PROVES THE LEAK: credential value appears in the serialised output
		// that gets sent to LLM context + SSE stream + final result
		expect(serialised).toContain('cur_SUPER_SECRET_CURRENTS_KEY');
	});

	it('should expose credential values from error.message when thrown error contains them', () => {
		// Some APIs include credential hints in error messages
		const error = new Error('Authentication failed for API key cur_abc123... Invalid key format');
		const errorMsg = error.message;

		// This is exactly what line 642 does:
		// `Workflow execution failed: ${errorMsg}`
		const observation = `Workflow execution failed: ${errorMsg}`;

		// PROVES THE LEAK: credential fragment appears in the observation
		expect(observation).toContain('cur_abc123');
	});

	it('should expose BYOK LLM key if anthropic returns it in an error response', () => {
		// Simulate anthropic API error that echoes back the key
		const fakeRunWorkflowResult = {
			success: false,
			executionId: 'exec-456',
			data: {
				error: {
					message: 'Invalid API key provided',
					name: 'NodeApiError',
					context: {
						data: {
							type: 'authentication_error',
							message: 'Invalid API key provided: sk-ant-BUYER_SECRET_KEY',
						},
					},
				},
				runData: {},
			},
		};

		const serialised = jsonStringify(fakeRunWorkflowResult).slice(0, 2000);

		// PROVES THE LEAK: BYOK key appears in serialised output
		expect(serialised).toContain('sk-ant-BUYER_SECRET_KEY');
	});

	it('should document all output channels where leaked data appears', () => {
		// recordObservation (line 406-425) sends data to THREE channels:
		const steps: Array<{ action: string; result?: string }> = [];
		const messages: Array<{ role: string; content: string }> = [];
		const sseEvents: Array<Record<string, unknown>> = [];

		const secretKey = 'cur_LEAKED_API_KEY_12345';
		const observationMessage = `Workflow "Currents Check" executed. Result: {"success":false,"data":{"error":{"context":{"data":{"key":"${secretKey}"}}}}}`;

		// Simulating what recordObservation does:
		// Line 417: steps[steps.length - 1].result = observation.result;
		steps.push({ action: 'execute_workflow' });
		steps[steps.length - 1].result = 'failed';

		// Line 418: messages.push(...)
		messages.push({ role: 'user', content: `Observation: ${observationMessage}` });

		// Line 419-424: onStep callback
		sseEvents.push({
			type: 'observation',
			action: 'execute_workflow',
			result: 'failed',
			workflowName: 'Currents Check',
		});

		// Channel 1: LLM context — credential leaks into the LLM's conversation
		expect(messages[0].content).toContain(secretKey);

		// Channel 2: SSE events — the extra fields do NOT include the message,
		// only workflowName. So SSE observation events are SAFE.
		const sseJson = JSON.stringify(sseEvents[0]);
		expect(sseJson).not.toContain(secretKey);

		// Channel 3: Steps array — steps only contain action + result string,
		// not the full message. So the final task result steps are SAFE.
		const stepsJson = JSON.stringify(steps);
		expect(stepsJson).not.toContain(secretKey);

		// CONCLUSION: The primary leak channel is the LLM context (messages array).
		// The LLM sees the credential value and could potentially include it in
		// its reasoning/summary, which WOULD then appear in the final result.
	});
});

describe('credential leak mitigation via scrubSecrets', () => {
	it('should scrub leaked credential from serialised workflow result', () => {
		const secretKey = 'cur_SUPER_SECRET_CURRENTS_KEY';
		const fakeResult = {
			success: false,
			data: {
				error: {
					context: { data: { received_authorization: `Bearer ${secretKey}` } },
				},
			},
		};

		const rawMessage = `Workflow "Test" executed. Result: ${jsonStringify(fakeResult).slice(0, 2000)}`;

		// Before scrubbing — proves the leak exists
		expect(rawMessage).toContain(secretKey);

		// After scrubbing — proves the fix works
		const scrubbed = scrubSecrets(rawMessage, [secretKey]);
		expect(scrubbed).not.toContain(secretKey);
		expect(scrubbed).toContain('*****KEY');
	});

	it('should scrub BYOK key from anthropic error in observation', () => {
		const byokKey = 'sk-ant-BUYER_SECRET_KEY';
		const rawMessage = `Workflow execution failed: Invalid API key provided: ${byokKey}`;

		const scrubbed = scrubSecrets(rawMessage, [byokKey]);
		expect(scrubbed).not.toContain(byokKey);
	});

	it('should scrub all workflow credentials from a single error message', () => {
		const llmKey = 'sk-ant-llm-key-12345';
		const currentsKey = 'cur_live_abcdef';
		const notionKey = 'ntn_secret_xyz789';

		const rawMessage = `Error: keys ${llmKey}, ${currentsKey}, ${notionKey} all invalid`;
		const scrubbed = scrubSecrets(rawMessage, [llmKey, currentsKey, notionKey]);

		expect(scrubbed).not.toContain(llmKey);
		expect(scrubbed).not.toContain(currentsKey);
		expect(scrubbed).not.toContain(notionKey);
	});

	it('should leave the observation intact when no secrets leak', () => {
		const message = 'Workflow "Deploy" executed. Result: {"success":true}';
		const scrubbed = scrubSecrets(message, ['sk-ant-secret-key']);

		expect(scrubbed).toBe(message);
	});
});

describe('findSupportedTrigger', () => {
	function makeNode(type: string, overrides: Partial<INode> = {}): INode {
		return {
			id: 'n-1',
			name: 'Trigger',
			type,
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
			...overrides,
		};
	}

	it('should find manual trigger', () => {
		const nodes = [makeNode('n8n-nodes-base.manualTrigger')];
		expect(findSupportedTrigger(nodes)?.type).toBe('n8n-nodes-base.manualTrigger');
	});

	it('should find execute workflow trigger', () => {
		const nodes = [makeNode('n8n-nodes-base.executeWorkflowTrigger')];
		expect(findSupportedTrigger(nodes)?.type).toBe('n8n-nodes-base.executeWorkflowTrigger');
	});

	it('should skip disabled triggers', () => {
		const nodes = [makeNode('n8n-nodes-base.manualTrigger', { disabled: true })];
		expect(findSupportedTrigger(nodes)).toBeUndefined();
	});

	it('should return undefined for unsupported trigger types', () => {
		const nodes = [makeNode('n8n-nodes-base.someRandomTrigger')];
		expect(findSupportedTrigger(nodes)).toBeUndefined();
	});

	it('should return the first supported trigger when multiple exist', () => {
		const nodes = [
			makeNode('n8n-nodes-base.webhook', { id: 'n-1', name: 'Webhook' }),
			makeNode('n8n-nodes-base.manualTrigger', { id: 'n-2', name: 'Manual' }),
		];
		expect(findSupportedTrigger(nodes)?.id).toBe('n-1');
	});
});

describe('proxyExternalTask — A2A protocol adapter', () => {
	const agentsService = mock<AgentsService>();
	let controller: AgentsController;
	const originalFetch = global.fetch;

	beforeEach(() => {
		jest.clearAllMocks();
		controller = new AgentsController(agentsService);
	});

	afterEach(() => {
		global.fetch = originalFetch;
	});

	/** Encode SSE events into a ReadableStream that mimics a fetch response body. */
	function makeSseStream(events: string[]): ReadableStream<Uint8Array> {
		const encoder = new TextEncoder();
		const chunks = events.map((e) => encoder.encode(e));
		let i = 0;
		return new ReadableStream<Uint8Array>({
			pull(ctrl) {
				if (i < chunks.length) {
					ctrl.enqueue(chunks[i++]);
				} else {
					ctrl.close();
				}
			},
		});
	}

	function makeFetchSseResponse(events: string[]) {
		const body = makeSseStream(events);
		return {
			ok: true,
			status: 200,
			headers: { get: (key: string) => (key === 'content-type' ? 'text/event-stream' : null) },
			body,
		};
	}

	function makeRes() {
		const written: string[] = [];
		const res = mock<Response>();
		res.writeHead.mockReturnValue(res);
		res.write.mockImplementation((chunk: unknown) => {
			written.push(String(chunk));
			return true;
		});
		return { res, written };
	}

	function makePayload(overrides: Record<string, unknown> = {}) {
		return {
			url: 'https://remote.example.com/api/v1/agents/abc/task',
			prompt: 'Do something',
			apiKey: 'remote-key',
			...overrides,
		} as never;
	}

	it('should translate A2A statusUpdate (working) to n8n task.action event', async () => {
		const a2aEvent = JSON.stringify({
			statusUpdate: {
				taskId: 't1',
				contextId: 'c1',
				status: {
					state: 'working',
					message: { messageId: 'm1', role: 'agent', parts: [{ text: 'Analyzing...' }] },
				},
			},
		});

		global.fetch = jest.fn().mockResolvedValue(makeFetchSseResponse([`data: ${a2aEvent}\n\n`]));
		const { res, written } = makeRes();

		await controller.proxyExternalTask(mock(), res, makePayload());

		const parsed = written
			.filter((w) => w.startsWith('data:'))
			.map((w) => JSON.parse(w.replace('data: ', '').trim()));

		expect(parsed).toHaveLength(1);
		expect(parsed[0]).toEqual({
			type: 'task.action',
			action: 'Analyzing...',
			origin: 'external',
		});
	});

	it('should skip A2A submitted statusUpdate (no output)', async () => {
		const submitted = JSON.stringify({
			statusUpdate: {
				taskId: 't1',
				contextId: 'c1',
				status: { state: 'submitted' },
			},
		});

		global.fetch = jest.fn().mockResolvedValue(makeFetchSseResponse([`data: ${submitted}\n\n`]));
		const { res, written } = makeRes();

		await controller.proxyExternalTask(mock(), res, makePayload());

		const dataEvents = written.filter((w) => w.startsWith('data:'));
		expect(dataEvents).toHaveLength(0);
	});

	it('should translate A2A artifactUpdate to n8n task.observation event', async () => {
		const a2aEvent = JSON.stringify({
			artifactUpdate: {
				taskId: 't1',
				contextId: 'c1',
				artifact: { artifactId: 'a1', parts: [{ text: 'Result: 42' }] },
			},
		});

		global.fetch = jest.fn().mockResolvedValue(makeFetchSseResponse([`data: ${a2aEvent}\n\n`]));
		const { res, written } = makeRes();

		await controller.proxyExternalTask(mock(), res, makePayload());

		const parsed = written
			.filter((w) => w.startsWith('data:'))
			.map((w) => JSON.parse(w.replace('data: ', '').trim()));

		expect(parsed[0]).toEqual({ type: 'task.observation', result: 'Result: 42' });
	});

	it('should translate A2A task (completed) to n8n task.completion event', async () => {
		const a2aEvent = JSON.stringify({
			task: {
				id: 't1',
				contextId: 'c1',
				status: {
					state: 'completed',
					message: { messageId: 'm1', role: 'agent', parts: [{ text: 'All done' }] },
				},
			},
		});

		global.fetch = jest.fn().mockResolvedValue(makeFetchSseResponse([`data: ${a2aEvent}\n\n`]));
		const { res, written } = makeRes();

		await controller.proxyExternalTask(mock(), res, makePayload());

		const parsed = written
			.filter((w) => w.startsWith('data:'))
			.map((w) => JSON.parse(w.replace('data: ', '').trim()));

		expect(parsed[0]).toEqual({
			type: 'task.completion',
			status: 'completed',
			summary: 'All done',
		});
	});

	it('should pass through n8n internal events unchanged', async () => {
		const internalEvent = JSON.stringify({
			type: 'task.action',
			action: 'execute_workflow',
			workflowName: 'Deploy',
		});

		global.fetch = jest
			.fn()
			.mockResolvedValue(makeFetchSseResponse([`data: ${internalEvent}\n\n`]));
		const { res, written } = makeRes();

		await controller.proxyExternalTask(mock(), res, makePayload());

		const parsed = written
			.filter((w) => w.startsWith('data:'))
			.map((w) => JSON.parse(w.replace('data: ', '').trim()));

		expect(parsed[0]).toEqual({
			type: 'task.action',
			action: 'execute_workflow',
			workflowName: 'Deploy',
		});
	});

	it('should handle mixed A2A and n8n events in the same stream', async () => {
		const a2aStep = JSON.stringify({
			statusUpdate: {
				taskId: 't1',
				contextId: 'c1',
				status: {
					state: 'working',
					message: { messageId: 'm1', role: 'agent', parts: [{ text: 'Working...' }] },
				},
			},
		});
		const n8nDone = JSON.stringify({
			type: 'task.completion',
			status: 'completed',
			summary: 'Done',
		});

		global.fetch = jest
			.fn()
			.mockResolvedValue(makeFetchSseResponse([`data: ${a2aStep}\n\n`, `data: ${n8nDone}\n\n`]));
		const { res, written } = makeRes();

		await controller.proxyExternalTask(mock(), res, makePayload());

		const parsed = written
			.filter((w) => w.startsWith('data:'))
			.map((w) => JSON.parse(w.replace('data: ', '').trim()));

		expect(parsed).toHaveLength(2);
		expect(parsed[0].type).toBe('task.action');
		expect(parsed[0].action).toBe('Working...');
		expect(parsed[1].type).toBe('task.completion');
	});

	it('should use A2A request format (JSON-RPC wrapped) for /message:stream URLs', async () => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			headers: { get: () => 'application/json' },
			json: async () => ({ status: 'completed' }),
		});
		const res = mock<Response>();

		await controller.proxyExternalTask(
			mock(),
			res,
			makePayload({ url: 'https://agent.example.com/message:stream' }),
		);

		const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
		const body = JSON.parse(fetchCall[1].body as string);
		// JSON-RPC 2.0 envelope
		expect(body).toHaveProperty('jsonrpc', '2.0');
		expect(body).toHaveProperty('method', 'message/stream');
		expect(body).toHaveProperty('id');
		expect(body).toHaveProperty('params');
		// Message inside params
		expect(body.params).toHaveProperty('message');
		expect(body.params.message).toHaveProperty('parts');
		expect(body.params.message.parts[0].text).toBe('Do something');
		expect(body).not.toHaveProperty('prompt');
	});

	it('should use n8n request format for non-A2A URLs', async () => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			headers: { get: () => 'application/json' },
			json: async () => ({ status: 'completed' }),
		});
		const res = mock<Response>();

		await controller.proxyExternalTask(mock(), res, makePayload());

		const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
		const body = JSON.parse(fetchCall[1].body as string);
		expect(body).toHaveProperty('prompt', 'Do something');
		expect(body).not.toHaveProperty('message');
	});

	it('should use A2A v0.3 message/stream format for generic A2A URLs', async () => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			headers: { get: () => 'application/json' },
			json: async () => ({
				jsonrpc: '2.0',
				id: 'resp-1',
				result: { kind: 'message', messageId: 'msg-1', role: 'agent', parts: [{ text: 'Done' }] },
			}),
		});
		const res = mock<Response>();

		await controller.proxyExternalTask(
			mock(),
			res,
			makePayload({ url: 'https://policycheck.tools/api/a2a' }),
		);

		const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
		const body = JSON.parse(fetchCall[1].body as string);
		expect(body).toHaveProperty('jsonrpc', '2.0');
		expect(body).toHaveProperty('method', 'message/stream');
		expect(body.params.message.parts[0]).toEqual({ text: 'Do something' });
		// Should use X-API-Key header for A2A endpoints
		expect(fetchCall[1].headers).toHaveProperty('X-API-Key', 'remote-key');
	});

	it('should wrap non-streaming A2A response as SSE for frontend consumption', async () => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			headers: { get: () => 'application/json' },
			json: async () => ({
				jsonrpc: '2.0',
				id: 'resp-1',
				result: {
					id: 'task-1',
					status: {
						state: 'completed',
						message: { role: 'agent', parts: [{ text: 'Analysis complete' }] },
					},
				},
			}),
		});
		const res = mock<Response>();
		const written: string[] = [];
		res.write.mockImplementation((chunk: unknown) => {
			written.push(chunk as string);
			return true;
		});

		await controller.proxyExternalTask(
			mock(),
			res,
			makePayload({ url: 'https://policycheck.tools/api/a2a' }),
		);

		// Should send SSE headers, not JSON
		expect(res.writeHead).toHaveBeenCalledWith(
			200,
			expect.objectContaining({
				'Content-Type': 'text/event-stream',
			}),
		);
		// Should wrap result as SSE task.completion event
		expect(written).toHaveLength(1);
		const parsed = JSON.parse(written[0].replace('data: ', '').trim());
		expect(parsed).toEqual({
			type: 'task.completion',
			status: 'completed',
			summary: 'Analysis complete',
		});
		expect(res.end).toHaveBeenCalled();
	});

	it('should wrap v0.3 message response as SSE for frontend consumption', async () => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			headers: { get: () => 'application/json' },
			json: async () => ({
				jsonrpc: '2.0',
				id: 'test-1',
				result: {
					kind: 'message',
					messageId: 'msg-1',
					role: 'agent',
					parts: [{ kind: 'text', text: 'Hello World' }],
				},
			}),
		});
		const res = mock<Response>();
		const written: string[] = [];
		res.write.mockImplementation((chunk: unknown) => {
			written.push(chunk as string);
			return true;
		});

		await controller.proxyExternalTask(
			mock(),
			res,
			makePayload({ url: 'https://hello-world.onrender.com/' }),
		);

		expect(res.writeHead).toHaveBeenCalledWith(
			200,
			expect.objectContaining({
				'Content-Type': 'text/event-stream',
			}),
		);
		expect(written).toHaveLength(1);
		const parsed = JSON.parse(written[0].replace('data: ', '').trim());
		expect(parsed).toEqual({
			type: 'task.completion',
			status: 'completed',
			summary: 'Hello World',
		});
		expect(res.end).toHaveBeenCalled();
	});

	it('should translate Hello World v0.3 SSE message/stream response to task.completion', async () => {
		// Exact response format from https://hello-world-gxfr.onrender.com/
		const ssePayload = `data: {"id":"test-stream","jsonrpc":"2.0","result":{"kind":"message","messageId":"msg-1","parts":[{"kind":"text","text":"Hello World"}],"role":"agent"}}\n\n`;
		global.fetch = jest.fn().mockResolvedValue(makeFetchSseResponse([ssePayload]));
		const { res, written } = makeRes();

		await controller.proxyExternalTask(
			mock(),
			res,
			makePayload({ url: 'https://hello-world.onrender.com/' }),
		);

		expect(res.writeHead).toHaveBeenCalledWith(
			200,
			expect.objectContaining({ 'Content-Type': 'text/event-stream' }),
		);
		// Should translate to task.completion
		const dataEvents = written.filter((w) => w.startsWith('data:'));
		expect(dataEvents).toHaveLength(1);
		const parsed = JSON.parse(dataEvents[0].replace('data: ', '').trim());
		expect(parsed).toEqual({
			type: 'task.completion',
			status: 'completed',
			summary: 'Hello World',
		});
	});

	it('should pass through SSE comments/pings unchanged', async () => {
		global.fetch = jest.fn().mockResolvedValue(makeFetchSseResponse([`:ping\n\n`]));
		const { res, written } = makeRes();

		await controller.proxyExternalTask(mock(), res, makePayload());

		expect(written).toContain(':ping\n\n');
	});
});

describe('discoverExternalAgent — card normalization', () => {
	const agentsService = mock<AgentsService>();
	let controller: AgentsController;
	const originalFetch = global.fetch;

	beforeEach(() => {
		jest.clearAllMocks();
		controller = new AgentsController(agentsService);
	});

	afterEach(() => {
		global.fetch = originalFetch;
	});

	it('should normalize standard A2A card to n8n shape', async () => {
		const standardCard = {
			name: 'Weather Agent',
			description: 'Gets weather data',
			url: 'https://weather.example.com',
			version: '1.0',
			capabilities: { streaming: true, pushNotifications: false },
			skills: [{ name: 'get_weather', description: 'Get current weather' }],
		};

		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: async () => standardCard,
		});

		const req = mock<AuthenticatedRequest>();
		const result = (await controller.discoverExternalAgent(req, mock<Response>(), {
			url: 'https://localhost:5678',
			apiKey: 'key',
		} as never)) as unknown as Record<string, unknown>;

		expect(result).toHaveProperty('requiredCredentials');
		expect(result).toHaveProperty('additionalInterfaces');
		expect(result.name).toBe('Weather Agent');
		expect(result.description).toBe('Gets weather data');
		expect(result.url).toBe('https://weather.example.com');
		expect(result.protocolVersion).toBe('0.3');
		expect(result.defaultInputModes).toEqual(['application/json']);
		expect(result.defaultOutputModes).toEqual(['application/json']);
		expect((result.capabilities as Record<string, unknown>).streaming).toBe(true);
		expect((result.capabilities as Record<string, unknown>).multiTurn).toBe(false);
	});

	it('should pass through n8n card unchanged', async () => {
		const n8nCard = {
			name: 'n8n Agent',
			description: 'Internal agent',
			url: 'https://example.com/api/v1/agents/1/task',
			version: '1.0.0',
			protocolVersion: '0.3',
			defaultInputModes: ['application/json'],
			defaultOutputModes: ['application/json'],
			requiredCredentials: [{ type: 'notionApi' }],
			additionalInterfaces: [{ transport: 'JSONRPC', url: 'https://example.com/task' }],
			capabilities: { streaming: true, multiTurn: true },
			skills: [],
		};

		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: async () => n8nCard,
		});

		const req = mock<AuthenticatedRequest>();
		const result = (await controller.discoverExternalAgent(req, mock<Response>(), {
			url: 'https://localhost:5678',
			apiKey: 'key',
		} as never)) as unknown as Record<string, unknown>;

		expect(result.name).toBe('n8n Agent');
		expect(result.requiredCredentials).toEqual([{ type: 'notionApi' }]);
		expect(result.additionalInterfaces).toEqual([
			{ transport: 'JSONRPC', url: 'https://example.com/task' },
		]);
	});
});

describe('buildPinData', () => {
	function makeNode(type: string, name = 'Trigger'): INode {
		return {
			id: 'n-1',
			name,
			type,
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};
	}

	it('should inject typed inputs for execute workflow trigger', () => {
		const node = makeNode('n8n-nodes-base.executeWorkflowTrigger', 'EWT');
		const result = buildPinData(node, undefined, { channel: '#general', msg: 'hello' });

		expect(result).toEqual({
			EWT: [{ json: { channel: '#general', msg: 'hello' } }],
		});
	});

	it('should fall back to agent prompt for execute workflow trigger without typed inputs', () => {
		const node = makeNode('n8n-nodes-base.executeWorkflowTrigger', 'EWT');
		const result = buildPinData(node, 'Run the tests');

		expect(result.EWT[0].json).toHaveProperty('triggeredByAgent', true);
		expect(result.EWT[0].json).toHaveProperty('message', 'Run the tests');
	});

	it('should include agent prompt for manual trigger', () => {
		const node = makeNode('n8n-nodes-base.manualTrigger', 'Manual');
		const result = buildPinData(node, 'Do stuff');

		expect(result.Manual[0].json).toHaveProperty('triggeredByAgent', true);
		expect(result.Manual[0].json).toHaveProperty('message', 'Do stuff');
	});

	it('should produce webhook pin data', () => {
		const node = makeNode('n8n-nodes-base.webhook', 'Hook');
		const result = buildPinData(node);

		expect(result.Hook[0].json).toHaveProperty('headers');
		expect(result.Hook[0].json).toHaveProperty('body');
	});

	it('should produce chat trigger pin data', () => {
		const node = makeNode('@n8n/n8n-nodes-langchain.chatTrigger', 'Chat');
		const result = buildPinData(node);

		expect(result.Chat[0].json).toHaveProperty('sessionId');
		expect(result.Chat[0].json).toHaveProperty('chatInput');
	});

	it('should return empty object for unknown trigger type', () => {
		const node = makeNode('n8n-nodes-base.unknownTrigger');
		expect(buildPinData(node)).toEqual({});
	});
});
