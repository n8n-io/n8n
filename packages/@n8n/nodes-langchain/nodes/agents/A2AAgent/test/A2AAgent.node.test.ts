import {
	mapExecutionStatusToA2A,
	isTerminalState,
	isExecutionTerminal,
} from '../a2a-status-mapper';
import {
	createA2AMessage,
	createA2ATask,
	createAgentCard,
	createJsonRpcErrorResponse,
	createJsonRpcResponse,
	extractMessageText,
	parseMessageSendParams,
	validateJsonRpcRequest,
} from '../a2a.utils';
import { JsonRpcErrorCodes } from '../a2a.types';

describe('A2A Status Mapper', () => {
	describe('mapExecutionStatusToA2A', () => {
		it('should map new to submitted', () => {
			expect(mapExecutionStatusToA2A('new')).toBe('submitted');
		});

		it('should map running to working', () => {
			expect(mapExecutionStatusToA2A('running')).toBe('working');
		});

		it('should map waiting to input-required', () => {
			expect(mapExecutionStatusToA2A('waiting')).toBe('input-required');
		});

		it('should map success to completed', () => {
			expect(mapExecutionStatusToA2A('success')).toBe('completed');
		});

		it('should map error to failed', () => {
			expect(mapExecutionStatusToA2A('error')).toBe('failed');
		});

		it('should map canceled to canceled', () => {
			expect(mapExecutionStatusToA2A('canceled')).toBe('canceled');
		});

		it('should map crashed to failed', () => {
			expect(mapExecutionStatusToA2A('crashed')).toBe('failed');
		});

		it('should map unknown to unknown', () => {
			expect(mapExecutionStatusToA2A('unknown')).toBe('unknown');
		});
	});

	describe('isTerminalState', () => {
		it('should return true for completed', () => {
			expect(isTerminalState('completed')).toBe(true);
		});

		it('should return true for failed', () => {
			expect(isTerminalState('failed')).toBe(true);
		});

		it('should return true for canceled', () => {
			expect(isTerminalState('canceled')).toBe(true);
		});

		it('should return true for rejected', () => {
			expect(isTerminalState('rejected')).toBe(true);
		});

		it('should return false for working', () => {
			expect(isTerminalState('working')).toBe(false);
		});

		it('should return false for submitted', () => {
			expect(isTerminalState('submitted')).toBe(false);
		});
	});

	describe('isExecutionTerminal', () => {
		it('should return true for success', () => {
			expect(isExecutionTerminal('success')).toBe(true);
		});

		it('should return true for error', () => {
			expect(isExecutionTerminal('error')).toBe(true);
		});

		it('should return true for canceled', () => {
			expect(isExecutionTerminal('canceled')).toBe(true);
		});

		it('should return true for crashed', () => {
			expect(isExecutionTerminal('crashed')).toBe(true);
		});

		it('should return false for running', () => {
			expect(isExecutionTerminal('running')).toBe(false);
		});
	});
});

describe('A2A Utils', () => {
	describe('createJsonRpcResponse', () => {
		it('should create a valid JSON-RPC response', () => {
			const response = createJsonRpcResponse('123', { data: 'test' });
			expect(response).toEqual({
				jsonrpc: '2.0',
				id: '123',
				result: { data: 'test' },
			});
		});

		it('should handle undefined id', () => {
			const response = createJsonRpcResponse(undefined, { data: 'test' });
			expect(response).toEqual({
				jsonrpc: '2.0',
				id: undefined,
				result: { data: 'test' },
			});
		});
	});

	describe('createJsonRpcErrorResponse', () => {
		it('should create a valid JSON-RPC error response', () => {
			const response = createJsonRpcErrorResponse('123', -32600, 'Invalid request');
			expect(response).toEqual({
				jsonrpc: '2.0',
				id: '123',
				error: {
					code: -32600,
					message: 'Invalid request',
				},
			});
		});

		it('should include data if provided', () => {
			const response = createJsonRpcErrorResponse('123', -32600, 'Invalid request', {
				extra: 'info',
			});
			expect(response).toEqual({
				jsonrpc: '2.0',
				id: '123',
				error: {
					code: -32600,
					message: 'Invalid request',
					data: { extra: 'info' },
				},
			});
		});
	});

	describe('createA2ATask', () => {
		it('should create a basic task', () => {
			const task = createA2ATask('task-123', 'working');
			expect(task).toEqual({
				type: 'task',
				id: 'task-123',
				status: { state: 'working' },
			});
		});

		it('should include message if provided', () => {
			const message = createA2AMessage('agent', 'Hello');
			const task = createA2ATask('task-123', 'completed', message);
			expect(task).toEqual({
				type: 'task',
				id: 'task-123',
				status: {
					state: 'completed',
					message: {
						role: 'agent',
						parts: [{ type: 'text', text: 'Hello' }],
					},
				},
			});
		});
	});

	describe('createA2AMessage', () => {
		it('should create a user message', () => {
			const message = createA2AMessage('user', 'Hello');
			expect(message).toEqual({
				role: 'user',
				parts: [{ type: 'text', text: 'Hello' }],
			});
		});

		it('should create an agent message', () => {
			const message = createA2AMessage('agent', 'Hi there');
			expect(message).toEqual({
				role: 'agent',
				parts: [{ type: 'text', text: 'Hi there' }],
			});
		});
	});

	describe('createAgentCard', () => {
		it('should create a basic agent card', () => {
			const card = createAgentCard('Test Agent', 'https://example.com');
			expect(card).toEqual({
				name: 'Test Agent',
				description: undefined,
				version: '1.0.0',
				url: 'https://example.com',
				capabilities: {
					streaming: false,
					pushNotifications: true,
				},
				defaultInputModes: ['text/plain'],
				defaultOutputModes: ['text/plain'],
				skills: undefined,
			});
		});

		it('should include description and skills if provided', () => {
			const card = createAgentCard('Test Agent', 'https://example.com', 'A test agent', [
				{ id: 'skill-1', name: 'Skill One', description: 'Does something' },
			]);
			expect(card.description).toBe('A test agent');
			expect(card.skills).toEqual([
				{ id: 'skill-1', name: 'Skill One', description: 'Does something' },
			]);
		});
	});

	describe('validateJsonRpcRequest', () => {
		it('should validate a correct request', () => {
			const result = validateJsonRpcRequest({
				jsonrpc: '2.0',
				id: '123',
				method: 'message/send',
				params: {},
			});
			expect(result.valid).toBe(true);
			expect(result.request).toBeDefined();
		});

		it('should reject non-object body', () => {
			const result = validateJsonRpcRequest(null as never);
			expect(result.valid).toBe(false);
			expect(result.error?.error?.code).toBe(JsonRpcErrorCodes.INVALID_REQUEST);
		});

		it('should reject wrong jsonrpc version', () => {
			const result = validateJsonRpcRequest({
				jsonrpc: '1.0',
				method: 'test',
			});
			expect(result.valid).toBe(false);
			expect(result.error?.error?.code).toBe(JsonRpcErrorCodes.INVALID_REQUEST);
		});

		it('should reject missing method', () => {
			const result = validateJsonRpcRequest({
				jsonrpc: '2.0',
			});
			expect(result.valid).toBe(false);
			expect(result.error?.error?.code).toBe(JsonRpcErrorCodes.INVALID_REQUEST);
		});
	});

	describe('extractMessageText', () => {
		it('should extract text from message parts', () => {
			const text = extractMessageText({
				role: 'user',
				parts: [
					{ type: 'text', text: 'Hello' },
					{ type: 'text', text: 'World' },
				],
			});
			expect(text).toBe('Hello\nWorld');
		});

		it('should return empty string for no text parts', () => {
			const text = extractMessageText({
				role: 'user',
				parts: [],
			});
			expect(text).toBe('');
		});
	});

	describe('parseMessageSendParams', () => {
		it('should parse valid params', () => {
			const result = parseMessageSendParams({
				message: {
					role: 'user',
					parts: [{ type: 'text', text: 'Hello' }],
				},
			});
			expect(result.valid).toBe(true);
			expect(result.data).toBeDefined();
		});

		it('should reject missing message', () => {
			const result = parseMessageSendParams({});
			expect(result.valid).toBe(false);
			expect(result.error).toContain('message is required');
		});

		it('should reject missing parts', () => {
			const result = parseMessageSendParams({
				message: { role: 'user' },
			});
			expect(result.valid).toBe(false);
			expect(result.error).toContain('parts must be an array');
		});

		it('should reject non-object params', () => {
			const result = parseMessageSendParams(null);
			expect(result.valid).toBe(false);
		});
	});
});
