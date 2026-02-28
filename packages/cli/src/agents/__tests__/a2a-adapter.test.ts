import {
	fromA2ARequest,
	toA2AResponse,
	internalStepToA2AStream,
	isA2AStreamEvent,
	a2aStreamEventToInternal,
	toA2ASendMessageRequest,
	toA2ATaskSendRequest,
	classifyEndpoint,
	buildRequestBody,
	buildRequestHeaders,
	a2aResponseToInternal,
	normalizeAgentCard,
	wrapJsonRpc,
	unwrapJsonRpc,
} from '../a2a-adapter';
import type { A2ASendMessageRequest, A2AStreamResponse } from '../a2a-adapter';
import type { AgentTaskResult } from '@/services/agents/agents.types';

describe('fromA2ARequest', () => {
	it('should concatenate text parts into prompt', () => {
		const req: A2ASendMessageRequest = {
			message: {
				messageId: 'msg-1',
				role: 'user',
				parts: [{ text: 'Hello' }, { text: 'World' }],
			},
		};

		const result = fromA2ARequest(req);
		expect(result.prompt).toBe('Hello\nWorld');
	});

	it('should use taskId and contextId from request root (A2A spec)', () => {
		const req: A2ASendMessageRequest = {
			message: {
				messageId: 'msg-1',
				role: 'user',
				parts: [{ text: 'Test' }],
			},
			taskId: 'task-root',
			contextId: 'ctx-root',
		};

		const result = fromA2ARequest(req);
		expect(result.taskId).toBe('task-root');
		expect(result.contextId).toBe('ctx-root');
	});

	it('should fall back to message-level taskId/contextId for compat', () => {
		const req: A2ASendMessageRequest = {
			message: {
				messageId: 'msg-1',
				role: 'user',
				parts: [{ text: 'Test' }],
				taskId: 'task-msg',
				contextId: 'ctx-msg',
			},
		};

		const result = fromA2ARequest(req);
		expect(result.taskId).toBe('task-msg');
		expect(result.contextId).toBe('ctx-msg');
	});

	it('should prefer request root over message-level taskId/contextId', () => {
		const req: A2ASendMessageRequest = {
			message: {
				messageId: 'msg-1',
				role: 'user',
				parts: [{ text: 'Test' }],
				taskId: 'task-msg',
				contextId: 'ctx-msg',
			},
			taskId: 'task-root',
			contextId: 'ctx-root',
		};

		const result = fromA2ARequest(req);
		expect(result.taskId).toBe('task-root');
		expect(result.contextId).toBe('ctx-root');
	});

	it('should generate UUIDs when taskId and contextId are missing', () => {
		const req: A2ASendMessageRequest = {
			message: {
				messageId: 'msg-1',
				role: 'user',
				parts: [{ text: 'Test' }],
			},
		};

		const result = fromA2ARequest(req);
		expect(result.taskId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
		expect(result.contextId).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
		);
	});

	it('should return empty prompt when no text parts', () => {
		const req: A2ASendMessageRequest = {
			message: {
				messageId: 'msg-1',
				role: 'user',
				parts: [{ data: { key: 'value' } }],
			},
		};

		const result = fromA2ARequest(req);
		expect(result.prompt).toBe('');
	});

	it('should skip non-text parts', () => {
		const req: A2ASendMessageRequest = {
			message: {
				messageId: 'msg-1',
				role: 'user',
				parts: [{ text: 'Start' }, { data: { some: 'data' } }, { text: 'End' }],
			},
		};

		const result = fromA2ARequest(req);
		expect(result.prompt).toBe('Start\nEnd');
	});
});

describe('toA2AResponse', () => {
	it('should map completed result to A2A task with completed state', () => {
		const result: AgentTaskResult = {
			status: 'completed',
			summary: 'All done',
			steps: [],
		};

		const response = toA2AResponse(result, 'task-1', 'ctx-1');

		expect(response.task.id).toBe('task-1');
		expect(response.task.contextId).toBe('ctx-1');
		expect(response.task.status.state).toBe('completed');
	});

	it('should map error result to failed state', () => {
		const result: AgentTaskResult = {
			status: 'error',
			message: 'Something broke',
			steps: [],
		};

		const response = toA2AResponse(result, 'task-1', 'ctx-1');

		expect(response.task.status.state).toBe('failed');
		expect(response.task.status.message?.parts[0].text).toBe('Something broke');
	});

	it('should include summary as result artifact', () => {
		const result: AgentTaskResult = {
			status: 'completed',
			summary: 'Deployed to prod',
			steps: [],
		};

		const response = toA2AResponse(result, 'task-1', 'ctx-1');

		expect(response.task.artifacts).toHaveLength(1);
		expect(response.task.artifacts![0].name).toBe('result');
		expect(response.task.artifacts![0].parts[0].text).toBe('Deployed to prod');
	});

	it('should include execution log artifact when steps exist', () => {
		const result: AgentTaskResult = {
			status: 'completed',
			summary: 'Done',
			steps: [{ action: 'execute_workflow', workflowName: 'Test', result: 'success' }],
		};

		const response = toA2AResponse(result, 'task-1', 'ctx-1');

		expect(response.task.artifacts).toHaveLength(2);
		expect(response.task.artifacts![1].name).toBe('execution-log');
		expect(response.task.artifacts![1].parts[0].data).toEqual(result.steps);
	});

	it('should omit artifacts when no summary and no steps', () => {
		const result: AgentTaskResult = {
			status: 'completed',
			steps: [],
		};

		const response = toA2AResponse(result, 'task-1', 'ctx-1');
		expect(response.task.artifacts).toBeUndefined();
	});
});

describe('internalStepToA2AStream', () => {
	it('should map task.action event to statusUpdate with working state', () => {
		const event = {
			type: 'task.action',
			action: 'execute_workflow',
			workflowName: 'Deploy',
			reasoning: 'Need to deploy',
		};

		const result = internalStepToA2AStream(event, 'task-1', 'ctx-1');

		expect('statusUpdate' in result).toBe(true);
		const update = (result as { statusUpdate: { status: { state: string } } }).statusUpdate;
		expect(update.status.state).toBe('working');
	});

	it('should map delegate action to delegation description', () => {
		const event = {
			type: 'task.action',
			action: 'delegate',
			targetUserName: 'CommsBot',
		};

		const result = internalStepToA2AStream(event, 'task-1', 'ctx-1');

		const update = (
			result as { statusUpdate: { status: { message: { parts: Array<{ text: string }> } } } }
		).statusUpdate;
		expect(update.status.message.parts[0].text).toContain('CommsBot');
	});

	it('should map task.observation to artifactUpdate', () => {
		const event = {
			type: 'task.observation',
			action: 'execute_workflow',
			result: 'success',
			workflowName: 'Test Suite',
		};

		const result = internalStepToA2AStream(event, 'task-1', 'ctx-1');

		expect('artifactUpdate' in result).toBe(true);
		const update = (
			result as {
				artifactUpdate: {
					artifact: { name: string; parts: Array<{ data: Record<string, unknown> }> };
				};
			}
		).artifactUpdate;
		expect(update.artifact.name).toBe('observation-execute_workflow');
		expect(update.artifact.parts[0].data).toMatchObject({
			action: 'execute_workflow',
			result: 'success',
			workflowName: 'Test Suite',
		});
	});

	it('should map task.completion event to final task object', () => {
		const event = {
			type: 'task.completion',
			status: 'completed',
			summary: 'All tasks finished',
		};

		const result = internalStepToA2AStream(event, 'task-1', 'ctx-1');

		expect('task' in result).toBe(true);
		const task = (
			result as { task: { status: { state: string; message: { parts: Array<{ text: string }> } } } }
		).task;
		expect(task.status.state).toBe('completed');
		expect(task.status.message.parts[0].text).toBe('All tasks finished');
	});

	it('should map failed task.completion event to failed state', () => {
		const event = {
			type: 'task.completion',
			status: 'error',
			summary: 'Something broke',
		};

		const result = internalStepToA2AStream(event, 'task-1', 'ctx-1');
		const task = (result as { task: { status: { state: string } } }).task;
		expect(task.status.state).toBe('failed');
	});

	it('should preserve task and context IDs across all event types', () => {
		const events = [
			{ type: 'task.action', action: 'execute_workflow', workflowName: 'Test' },
			{ type: 'task.observation', action: 'execute_workflow', result: 'success' },
			{ type: 'task.completion', status: 'completed', summary: 'Done' },
		];

		for (const event of events) {
			const result = internalStepToA2AStream(event, 'task-42', 'ctx-99');
			const json = JSON.stringify(result);
			expect(json).toContain('task-42');
			expect(json).toContain('ctx-99');
		}
	});
});

// ─── Reverse Adapter Tests ──────────────────────────────────────────────────

describe('isA2AStreamEvent', () => {
	it('should return true for statusUpdate events', () => {
		expect(
			isA2AStreamEvent({
				statusUpdate: { taskId: 't1', contextId: 'c1', status: { state: 'working' } },
			}),
		).toBe(true);
	});

	it('should return true for artifactUpdate events', () => {
		expect(
			isA2AStreamEvent({
				artifactUpdate: {
					taskId: 't1',
					contextId: 'c1',
					artifact: { artifactId: 'a1', parts: [] },
				},
			}),
		).toBe(true);
	});

	it('should return true for task events', () => {
		expect(
			isA2AStreamEvent({ task: { id: 't1', contextId: 'c1', status: { state: 'completed' } } }),
		).toBe(true);
	});

	it('should return false for n8n internal task.action events', () => {
		expect(isA2AStreamEvent({ type: 'task.action', action: 'execute_workflow' })).toBe(false);
	});

	it('should return false for n8n internal task.completion events', () => {
		expect(isA2AStreamEvent({ type: 'task.completion', status: 'completed' })).toBe(false);
	});
});

describe('a2aStreamEventToInternal', () => {
	it('should convert working statusUpdate with message to task.action event', () => {
		const event: A2AStreamResponse = {
			statusUpdate: {
				taskId: 't1',
				contextId: 'c1',
				status: {
					state: 'working',
					message: {
						messageId: 'm1',
						role: 'agent',
						parts: [{ text: 'Analyzing data...' }],
					},
				},
			},
		};

		const result = a2aStreamEventToInternal(event);
		expect(result).toEqual({
			type: 'task.action',
			action: 'Analyzing data...',
			origin: 'external',
		});
	});

	it('should return null for submitted statusUpdate (skip)', () => {
		const event: A2AStreamResponse = {
			statusUpdate: {
				taskId: 't1',
				contextId: 'c1',
				status: { state: 'submitted' },
			},
		};

		expect(a2aStreamEventToInternal(event)).toBeNull();
	});

	it('should preserve n8n metadata fields when present in statusUpdate', () => {
		const event: A2AStreamResponse = {
			statusUpdate: {
				taskId: 't1',
				contextId: 'c1',
				status: {
					state: 'working',
					message: {
						messageId: 'm1',
						role: 'agent',
						parts: [
							{
								text: 'Executing workflow: Deploy',
								metadata: {
									action: 'execute_workflow',
									workflowName: 'Deploy',
									reasoning: 'Need to deploy',
								},
							},
						],
					},
				},
			},
		};

		const result = a2aStreamEventToInternal(event);
		expect(result).toEqual({
			type: 'task.action',
			action: 'execute_workflow',
			workflowName: 'Deploy',
			reasoning: 'Need to deploy',
			origin: 'external',
		});
	});

	it('should convert artifactUpdate with text part to task.observation', () => {
		const event: A2AStreamResponse = {
			artifactUpdate: {
				taskId: 't1',
				contextId: 'c1',
				artifact: {
					artifactId: 'a1',
					parts: [{ text: 'Result: 42' }],
				},
			},
		};

		const result = a2aStreamEventToInternal(event);
		expect(result).toEqual({ type: 'task.observation', result: 'Result: 42' });
	});

	it('should extract n8n observation data from artifact data part', () => {
		const event: A2AStreamResponse = {
			artifactUpdate: {
				taskId: 't1',
				contextId: 'c1',
				artifact: {
					artifactId: 'a1',
					parts: [
						{
							data: {
								action: 'execute_workflow',
								result: 'success',
								workflowName: 'Test Suite',
							},
						},
					],
				},
			},
		};

		const result = a2aStreamEventToInternal(event);
		expect(result).toEqual({
			type: 'task.observation',
			action: 'execute_workflow',
			result: 'success',
			workflowName: 'Test Suite',
		});
	});

	it('should convert completed task event to task.completion event', () => {
		const event: A2AStreamResponse = {
			task: {
				id: 't1',
				contextId: 'c1',
				status: {
					state: 'completed',
					message: {
						messageId: 'm1',
						role: 'agent',
						parts: [{ text: 'All tasks finished' }],
					},
				},
			},
		};

		const result = a2aStreamEventToInternal(event);
		expect(result).toEqual({
			type: 'task.completion',
			status: 'completed',
			summary: 'All tasks finished',
		});
	});

	it('should convert failed task event to error task.completion event', () => {
		const event: A2AStreamResponse = {
			task: {
				id: 't1',
				contextId: 'c1',
				status: {
					state: 'failed',
					message: {
						messageId: 'm1',
						role: 'agent',
						parts: [{ text: 'Connection refused' }],
					},
				},
			},
		};

		const result = a2aStreamEventToInternal(event);
		expect(result).toEqual({
			type: 'task.completion',
			status: 'error',
			summary: 'Connection refused',
		});
	});

	it('should extract summary from first artifact when task has no message', () => {
		const event: A2AStreamResponse = {
			task: {
				id: 't1',
				contextId: 'c1',
				status: { state: 'completed' },
				artifacts: [
					{
						artifactId: 'a1',
						parts: [{ text: 'Final result here' }],
					},
				],
			},
		};

		const result = a2aStreamEventToInternal(event);
		expect(result).toEqual({
			type: 'task.completion',
			status: 'completed',
			summary: 'Final result here',
		});
	});
});

describe('toA2ASendMessageRequest', () => {
	it('should wrap prompt in JSON-RPC 2.0 envelope with A2A message', () => {
		const result = toA2ASendMessageRequest('Hello, agent');

		expect(result.jsonrpc).toBe('2.0');
		expect(result.method).toBe('message/stream');
		expect(result.id).toBeDefined();
		const params = result.params as {
			message: { role: string; parts: Array<{ text: string }>; messageId: string };
			metadata?: unknown;
		};
		expect(params.message.role).toBe('user');
		expect(params.message.parts).toEqual([{ text: 'Hello, agent' }]);
		expect(params.message.messageId).toBeDefined();
		expect(params.metadata).toBeUndefined();
	});

	it('should include byokCredentials in metadata when provided', () => {
		const creds = {
			anthropicApiKey: 'sk-test',
			workflowCredentials: { notionApi: { apiKey: 'ntn-test' } },
		};
		const result = toA2ASendMessageRequest('Hello', creds);

		const params = result.params as { metadata?: { byokCredentials: unknown } };
		expect(params.metadata).toEqual({ byokCredentials: creds });
	});
});

describe('normalizeAgentCard', () => {
	it('should convert standard A2A card to n8n shape with defaults', () => {
		const card = {
			name: 'Weather Agent',
			description: 'Gets weather data',
			url: 'https://weather.example.com',
			version: '1.0',
			capabilities: { streaming: true, pushNotifications: false },
			skills: [{ name: 'get_weather', description: 'Get current weather' }],
		};

		const result = normalizeAgentCard(card);

		expect(result.name).toBe('Weather Agent');
		expect(result.description).toBe('Gets weather data');
		expect(result.capabilities).toEqual({ streaming: true, multiTurn: false });
		expect(result.skills).toEqual(card.skills);
		expect(result.requiredCredentials).toEqual([]);
		expect(result.interfaces).toEqual({});
	});

	it('should pass through n8n card unchanged when it has requiredCredentials', () => {
		const card = {
			name: 'n8n Agent',
			description: 'Internal agent',
			requiredCredentials: [{ type: 'notionApi' }],
			interfaces: { chat: true },
			capabilities: { streaming: true, multiTurn: true },
			skills: [],
		};

		const result = normalizeAgentCard(card);
		expect(result).toBe(card); // Same reference — passed through
	});
});

// ─── JSON-RPC 2.0 Tests ────────────────────────────────────────────────────

describe('wrapJsonRpc', () => {
	it('should create valid JSON-RPC 2.0 envelope', () => {
		const result = wrapJsonRpc('message/stream', { message: { text: 'hello' } });

		expect(result.jsonrpc).toBe('2.0');
		expect(result.method).toBe('message/stream');
		expect(result.id).toMatch(/^[0-9a-f]{8}-/);
		expect(result.params).toEqual({ message: { text: 'hello' } });
	});
});

describe('unwrapJsonRpc', () => {
	it('should extract params from JSON-RPC envelope', () => {
		const wrapped = {
			jsonrpc: '2.0',
			method: 'message/stream',
			id: 'test-id',
			params: { message: { text: 'hello' } },
		};

		const result = unwrapJsonRpc(wrapped);
		expect(result).toEqual({ message: { text: 'hello' } });
	});

	it('should return data as-is when not JSON-RPC wrapped', () => {
		const bare = { statusUpdate: { taskId: 't1', status: { state: 'working' } } };

		const result = unwrapJsonRpc(bare);
		expect(result).toBe(bare);
	});

	it('should return data as-is when jsonrpc version is wrong', () => {
		const wrong = { jsonrpc: '1.0', params: { foo: 'bar' } };

		const result = unwrapJsonRpc(wrong);
		expect(result).toBe(wrong);
	});

	it('should return data as-is when params is not an object', () => {
		const wrong = { jsonrpc: '2.0', params: 'not-an-object' };

		const result = unwrapJsonRpc(wrong);
		expect(result).toBe(wrong);
	});
});

// ─── A2A v0.2 Task Send Request ──────────────────────────────────────────────

describe('toA2ATaskSendRequest', () => {
	it('should wrap prompt in JSON-RPC 2.0 envelope with tasks/send method', () => {
		const result = toA2ATaskSendRequest('Check policy compliance');

		expect(result.jsonrpc).toBe('2.0');
		expect(result.method).toBe('tasks/send');
		expect(result.id).toBeDefined();
		const params = result.params as {
			id: string;
			message: { role: string; parts: Array<{ type: string; text: string }> };
			metadata?: unknown;
		};
		expect(params.id).toBeDefined();
		expect(params.message.role).toBe('user');
		expect(params.message.parts).toEqual([{ type: 'text', text: 'Check policy compliance' }]);
		expect(params.metadata).toBeUndefined();
	});

	it('should include byokCredentials in metadata when provided', () => {
		const creds = { anthropicApiKey: 'sk-test' };
		const result = toA2ATaskSendRequest('Hello', creds);

		const params = result.params as { metadata?: { byokCredentials: unknown } };
		expect(params.metadata).toEqual({ byokCredentials: creds });
	});
});

// ─── Endpoint Classification ─────────────────────────────────────────────────

describe('classifyEndpoint', () => {
	it('should classify n8n agent URLs as n8n', () => {
		expect(classifyEndpoint('https://n8n.example.com/api/v1/agents/abc/task')).toBe('n8n');
		expect(classifyEndpoint('https://n8n.example.com/api/v2/agents/xyz/task')).toBe('n8n');
	});

	it('should classify /message:stream URLs as a2a-v03', () => {
		expect(classifyEndpoint('https://agent.example.com/message:stream')).toBe('a2a-v03');
	});

	it('should classify /message:send URLs as a2a-v03', () => {
		expect(classifyEndpoint('https://agent.example.com/message:send')).toBe('a2a-v03');
	});

	it('should classify generic URLs as a2a-v02', () => {
		expect(classifyEndpoint('https://policycheck.tools/api/a2a')).toBe('a2a-v02');
		expect(classifyEndpoint('https://agent.example.com/task')).toBe('a2a-v02');
	});
});

// ─── Request Body Builder ────────────────────────────────────────────────────

describe('buildRequestBody', () => {
	it('should build n8n format with prompt field', () => {
		const body = buildRequestBody('n8n', 'Hello agent');
		expect(body).toEqual({ prompt: 'Hello agent' });
	});

	it('should include byokCredentials for n8n format', () => {
		const body = buildRequestBody('n8n', 'Hello', { anthropicApiKey: 'sk-test' });
		expect(body).toEqual({ prompt: 'Hello', byokCredentials: { anthropicApiKey: 'sk-test' } });
	});

	it('should build A2A v0.3 format with message/stream method', () => {
		const body = buildRequestBody('a2a-v03', 'Hello') as { jsonrpc: string; method: string };
		expect(body.jsonrpc).toBe('2.0');
		expect(body.method).toBe('message/stream');
	});

	it('should build A2A v0.2 format with tasks/send method', () => {
		const body = buildRequestBody('a2a-v02', 'Hello') as { jsonrpc: string; method: string };
		expect(body.jsonrpc).toBe('2.0');
		expect(body.method).toBe('tasks/send');
	});
});

// ─── Request Headers Builder ─────────────────────────────────────────────────

describe('buildRequestHeaders', () => {
	it('should use x-n8n-api-key for n8n endpoints', () => {
		const headers = buildRequestHeaders('n8n', 'my-key');
		expect(headers['x-n8n-api-key']).toBe('my-key');
		expect(headers['X-API-Key']).toBeUndefined();
		expect(headers.Accept).toBe('text/event-stream');
	});

	it('should use X-API-Key for A2A endpoints', () => {
		const headers = buildRequestHeaders('a2a-v02', 'my-key');
		expect(headers['X-API-Key']).toBe('my-key');
		expect(headers['x-n8n-api-key']).toBeUndefined();
		expect(headers.Accept).toBe('application/json');
	});

	it('should omit auth header when no API key provided', () => {
		const headers = buildRequestHeaders('n8n');
		expect(headers['x-n8n-api-key']).toBeUndefined();
		expect(headers['X-API-Key']).toBeUndefined();
	});

	it('should use same headers for a2a-v03 as a2a-v02', () => {
		const v02 = buildRequestHeaders('a2a-v02', 'key');
		const v03 = buildRequestHeaders('a2a-v03', 'key');
		expect(v02).toEqual(v03);
	});
});

// ─── A2A Response Translation ────────────────────────────────────────────────

describe('a2aResponseToInternal', () => {
	it('should translate completed A2A task to internal format', () => {
		const data = {
			status: { state: 'completed', message: { parts: [{ text: 'Policy is compliant' }] } },
		};

		const result = a2aResponseToInternal(data);
		expect(result).toEqual({
			status: 'completed',
			summary: 'Policy is compliant',
			message: undefined,
		});
	});

	it('should translate failed A2A task to error format', () => {
		const data = {
			status: { state: 'failed', message: { parts: [{ text: 'Check failed' }] } },
		};

		const result = a2aResponseToInternal(data);
		expect(result).toEqual({
			status: 'error',
			summary: 'Check failed',
			message: 'Check failed',
		});
	});

	it('should unwrap JSON-RPC envelope from response', () => {
		const data = {
			jsonrpc: '2.0',
			id: 'req-1',
			result: {
				status: { state: 'completed', message: { parts: [{ text: 'Done' }] } },
			},
		};

		const result = a2aResponseToInternal(data);
		expect(result.status).toBe('completed');
		expect(result.summary).toBe('Done');
	});

	it('should extract summary from artifacts when no message', () => {
		const data = {
			status: { state: 'completed' },
			artifacts: [{ artifactId: 'a1', parts: [{ text: 'Result from artifact' }] }],
		};

		const result = a2aResponseToInternal(data);
		expect(result.summary).toBe('Result from artifact');
	});

	it('should use default summary when no message or artifacts', () => {
		const data = {
			status: { state: 'completed' },
		};

		const result = a2aResponseToInternal(data);
		expect(result.summary).toBe('Task completed');
	});

	it('should use default failed summary when no message', () => {
		const data = {
			status: { state: 'failed' },
		};

		const result = a2aResponseToInternal(data);
		expect(result.summary).toBe('Task failed');
	});

	it('should return data as-is when no status.state field', () => {
		const data = { custom: 'response', foo: 'bar' };

		const result = a2aResponseToInternal(data);
		expect(result).toBe(data);
	});
});

// ─── Round-trip Tests (Internal → A2A → Internal) ──────────────────────────

describe('round-trip: internalStepToA2AStream → a2aStreamEventToInternal', () => {
	it('should preserve task.action semantics through round-trip', () => {
		const original = {
			type: 'task.action',
			action: 'execute_workflow',
			workflowName: 'Deploy',
			reasoning: 'Need to deploy',
		};

		const a2aEvent = internalStepToA2AStream(original, 'task-1', 'ctx-1');
		const roundTripped = a2aStreamEventToInternal(a2aEvent);

		expect(roundTripped).toMatchObject({
			type: 'task.action',
			action: 'execute_workflow',
			workflowName: 'Deploy',
			reasoning: 'Need to deploy',
			origin: 'external',
		});
	});

	it('should preserve task.observation semantics through round-trip', () => {
		const original = {
			type: 'task.observation',
			action: 'execute_workflow',
			result: 'success',
			workflowName: 'Test Suite',
		};

		const a2aEvent = internalStepToA2AStream(original, 'task-1', 'ctx-1');
		const roundTripped = a2aStreamEventToInternal(a2aEvent);

		expect(roundTripped).toMatchObject({
			type: 'task.observation',
			action: 'execute_workflow',
			result: 'success',
			workflowName: 'Test Suite',
		});
	});

	it('should preserve task.completion status through round-trip', () => {
		const original = {
			type: 'task.completion',
			status: 'completed',
			summary: 'All tasks finished',
		};

		const a2aEvent = internalStepToA2AStream(original, 'task-1', 'ctx-1');
		const roundTripped = a2aStreamEventToInternal(a2aEvent);

		expect(roundTripped).toEqual({
			type: 'task.completion',
			status: 'completed',
			summary: 'All tasks finished',
		});
	});
});
