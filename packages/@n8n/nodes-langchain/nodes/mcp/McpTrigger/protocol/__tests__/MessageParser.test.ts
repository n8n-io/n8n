import { MessageParser } from '../MessageParser';

describe('MessageParser', () => {
	describe('parse', () => {
		it('should parse valid JSONRPC 2.0 message with all fields', () => {
			const body = '{"jsonrpc":"2.0","id":1,"method":"test","params":{}}';
			const result = MessageParser.parse(body);
			expect(result).toEqual({
				jsonrpc: '2.0',
				id: 1,
				method: 'test',
				params: {},
			});
		});

		it('should parse JSONRPC response message', () => {
			const body = '{"jsonrpc":"2.0","id":1,"result":{"data":"test"}}';
			const result = MessageParser.parse(body);
			expect(result).toEqual({
				jsonrpc: '2.0',
				id: 1,
				result: { data: 'test' },
			});
		});

		it('should parse JSONRPC notification (no id)', () => {
			const body = '{"jsonrpc":"2.0","method":"notifications/test"}';
			const result = MessageParser.parse(body);
			expect(result).toEqual({
				jsonrpc: '2.0',
				method: 'notifications/test',
			});
		});

		it('should return undefined for empty string', () => {
			expect(MessageParser.parse('')).toBeUndefined();
		});

		it('should return undefined for malformed JSON (missing closing brace)', () => {
			expect(MessageParser.parse('{"jsonrpc":"2.0"')).toBeUndefined();
		});

		it('should return undefined for valid JSON but invalid JSONRPC (missing jsonrpc field)', () => {
			expect(MessageParser.parse('{"id":1,"method":"test"}')).toBeUndefined();
		});

		it('should return undefined for JSONRPC 1.0 messages', () => {
			expect(MessageParser.parse('{"jsonrpc":"1.0","id":1}')).toBeUndefined();
		});

		it('should return undefined for plain JSON that is not JSONRPC', () => {
			expect(MessageParser.parse('{"name":"test","value":123}')).toBeUndefined();
		});

		it('should return undefined for array input', () => {
			expect(MessageParser.parse('[1,2,3]')).toBeUndefined();
		});

		it('should return undefined for primitive JSON values', () => {
			expect(MessageParser.parse('null')).toBeUndefined();
			expect(MessageParser.parse('123')).toBeUndefined();
			expect(MessageParser.parse('"string"')).toBeUndefined();
		});
	});

	describe('isToolCall', () => {
		it('should return true for valid tools/call request', () => {
			const body =
				'{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"test","arguments":{}}}';
			expect(MessageParser.isToolCall(body)).toBe(true);
		});

		it('should return true for tools/call with string id', () => {
			const body =
				'{"jsonrpc":"2.0","id":"abc-123","method":"tools/call","params":{"name":"test","arguments":{}}}';
			expect(MessageParser.isToolCall(body)).toBe(true);
		});

		it('should return false for tools/list request (different method)', () => {
			const body = '{"jsonrpc":"2.0","id":1,"method":"tools/list"}';
			expect(MessageParser.isToolCall(body)).toBe(false);
		});

		it('should return false for notification (no id field)', () => {
			const body = '{"jsonrpc":"2.0","method":"tools/call","params":{}}';
			expect(MessageParser.isToolCall(body)).toBe(false);
		});

		it('should return false for response (no method field)', () => {
			const body = '{"jsonrpc":"2.0","id":1,"result":{}}';
			expect(MessageParser.isToolCall(body)).toBe(false);
		});

		it('should return false for empty body', () => {
			expect(MessageParser.isToolCall('')).toBe(false);
		});

		it('should return false for malformed JSON', () => {
			expect(MessageParser.isToolCall('{"jsonrpc":"2.0"')).toBe(false);
		});

		it('should return false for other MCP methods', () => {
			expect(MessageParser.isToolCall('{"jsonrpc":"2.0","id":1,"method":"initialize"}')).toBe(
				false,
			);
			expect(MessageParser.isToolCall('{"jsonrpc":"2.0","id":1,"method":"resources/list"}')).toBe(
				false,
			);
		});
	});

	describe('isListToolsRequest', () => {
		it('should return true for valid tools/list request', () => {
			const body = '{"jsonrpc":"2.0","id":1,"method":"tools/list"}';
			expect(MessageParser.isListToolsRequest(body)).toBe(true);
		});

		it('should return true for tools/list with params', () => {
			const body = '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}';
			expect(MessageParser.isListToolsRequest(body)).toBe(true);
		});

		it('should return false for tools/call request', () => {
			const body =
				'{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"test","arguments":{}}}';
			expect(MessageParser.isListToolsRequest(body)).toBe(false);
		});

		it('should return false for notification (no id)', () => {
			const body = '{"jsonrpc":"2.0","method":"tools/list"}';
			expect(MessageParser.isListToolsRequest(body)).toBe(false);
		});

		it('should return false for empty body', () => {
			expect(MessageParser.isListToolsRequest('')).toBe(false);
		});
	});

	describe('getRequestId', () => {
		it('should extract numeric id and return as string', () => {
			const message = { jsonrpc: '2.0', id: 42, method: 'test' };
			expect(MessageParser.getRequestId(message)).toBe('42');
		});

		it('should extract string id as-is', () => {
			const message = { jsonrpc: '2.0', id: 'abc-123', method: 'test' };
			expect(MessageParser.getRequestId(message)).toBe('abc-123');
		});

		it('should extract id from response message', () => {
			const message = { jsonrpc: '2.0', id: 99, result: {} };
			expect(MessageParser.getRequestId(message)).toBe('99');
		});

		it('should return undefined for notification (no id)', () => {
			const message = { jsonrpc: '2.0', method: 'test' };
			expect(MessageParser.getRequestId(message)).toBeUndefined();
		});

		it('should return undefined for invalid message structure', () => {
			expect(MessageParser.getRequestId({ invalid: true })).toBeUndefined();
		});

		it('should return undefined for null input', () => {
			expect(MessageParser.getRequestId(null)).toBeUndefined();
		});

		it('should return undefined for string input', () => {
			expect(MessageParser.getRequestId('string')).toBeUndefined();
		});

		it('should return undefined for undefined input', () => {
			expect(MessageParser.getRequestId(undefined)).toBeUndefined();
		});

		it('should return undefined for array input', () => {
			expect(MessageParser.getRequestId([1, 2, 3])).toBeUndefined();
		});
	});

	describe('extractToolCallInfo', () => {
		it('should extract tool name and arguments from valid call', () => {
			const body =
				'{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_weather","arguments":{"city":"London"}}}';
			const result = MessageParser.extractToolCallInfo(body);
			expect(result).toEqual({
				toolName: 'get_weather',
				arguments: { city: 'London' },
			});
		});

		it('should handle empty arguments object', () => {
			const body =
				'{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"no_args_tool","arguments":{}}}';
			const result = MessageParser.extractToolCallInfo(body);
			expect(result).toEqual({
				toolName: 'no_args_tool',
				arguments: {},
			});
		});

		it('should handle complex nested arguments', () => {
			const body =
				'{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"complex_tool","arguments":{"nested":{"deep":{"value":123}},"array":[1,2,3]}}}';
			const result = MessageParser.extractToolCallInfo(body);
			expect(result).toEqual({
				toolName: 'complex_tool',
				arguments: { nested: { deep: { value: 123 } }, array: [1, 2, 3] },
			});
		});

		it('should return undefined when params.name is missing', () => {
			const body = '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"arguments":{}}}';
			expect(MessageParser.extractToolCallInfo(body)).toBeUndefined();
		});

		it('should return undefined when params.arguments is missing', () => {
			const body = '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"test"}}';
			expect(MessageParser.extractToolCallInfo(body)).toBeUndefined();
		});

		it('should return undefined when params.arguments is null', () => {
			const body =
				'{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"test","arguments":null}}';
			expect(MessageParser.extractToolCallInfo(body)).toBeUndefined();
		});

		it('should return undefined when params.arguments is not an object', () => {
			const body =
				'{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"test","arguments":"string"}}';
			expect(MessageParser.extractToolCallInfo(body)).toBeUndefined();
		});

		it('should return undefined when params.name is not a string', () => {
			const body =
				'{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":123,"arguments":{}}}';
			expect(MessageParser.extractToolCallInfo(body)).toBeUndefined();
		});

		it('should return undefined for non-tool-call messages', () => {
			const body = '{"jsonrpc":"2.0","id":1,"method":"tools/list"}';
			expect(MessageParser.extractToolCallInfo(body)).toBeUndefined();
		});

		it('should return undefined when params is missing', () => {
			const body = '{"jsonrpc":"2.0","id":1,"method":"tools/call"}';
			expect(MessageParser.extractToolCallInfo(body)).toBeUndefined();
		});

		it('should return undefined for empty body', () => {
			expect(MessageParser.extractToolCallInfo('')).toBeUndefined();
		});

		it('should return undefined for malformed JSON', () => {
			expect(MessageParser.extractToolCallInfo('{"invalid')).toBeUndefined();
		});
	});
});
