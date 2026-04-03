import { DynamicTool, type Tool } from '@langchain/core/tools';
import { StructuredToolkit } from 'n8n-core';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import { NodeOperationError } from 'n8n-workflow';
import type { ISupplyDataFunctions, IExecuteFunctions, INode } from 'n8n-workflow';
import { z } from 'zod';

import {
	escapeSingleCurlyBrackets,
	getConnectedTools,
	mergeCustomHeaders,
	unwrapNestedOutput,
	getSessionId,
	getPromptInputByType,
} from '../helpers';
import { N8nTool } from '../N8nTool';

describe('escapeSingleCurlyBrackets', () => {
	it('should return undefined when input is undefined', () => {
		expect(escapeSingleCurlyBrackets(undefined)).toBeUndefined();
	});

	it('should escape single curly brackets', () => {
		expect(escapeSingleCurlyBrackets('Hello {world}')).toBe('Hello {{world}}');
		expect(escapeSingleCurlyBrackets('Test {value} here')).toBe('Test {{value}} here');
	});

	it('should not escape already double curly brackets', () => {
		expect(escapeSingleCurlyBrackets('Hello {{world}}')).toBe('Hello {{world}}');
		expect(escapeSingleCurlyBrackets('Test {{value}} here')).toBe('Test {{value}} here');
	});

	it('should handle mixed single and double curly brackets', () => {
		expect(escapeSingleCurlyBrackets('Hello {{world}} and {earth}')).toBe(
			'Hello {{world}} and {{earth}}',
		);
	});

	it('should handle empty string', () => {
		expect(escapeSingleCurlyBrackets('')).toBe('');
	});
	it('should handle string with no curly brackets', () => {
		expect(escapeSingleCurlyBrackets('Hello world')).toBe('Hello world');
	});

	it('should handle string with only opening curly bracket', () => {
		expect(escapeSingleCurlyBrackets('Hello { world')).toBe('Hello {{ world');
	});

	it('should handle string with only closing curly bracket', () => {
		expect(escapeSingleCurlyBrackets('Hello world }')).toBe('Hello world }}');
	});

	it('should handle string with multiple single curly brackets', () => {
		expect(escapeSingleCurlyBrackets('{Hello} {world}')).toBe('{{Hello}} {{world}}');
	});

	it('should handle string with alternating single and double curly brackets', () => {
		expect(escapeSingleCurlyBrackets('{a} {{b}} {c} {{d}}')).toBe('{{a}} {{b}} {{c}} {{d}}');
	});

	it('should handle string with curly brackets at the start and end', () => {
		expect(escapeSingleCurlyBrackets('{start} middle {end}')).toBe('{{start}} middle {{end}}');
	});

	it('should handle string with special characters', () => {
		expect(escapeSingleCurlyBrackets('Special {!@#$%^&*} chars')).toBe(
			'Special {{!@#$%^&*}} chars',
		);
	});

	it('should handle string with numbers in curly brackets', () => {
		expect(escapeSingleCurlyBrackets('Numbers {123} here')).toBe('Numbers {{123}} here');
	});

	it('should handle string with whitespace in curly brackets', () => {
		expect(escapeSingleCurlyBrackets('Whitespace {  } here')).toBe('Whitespace {{  }} here');
	});
	it('should handle multi-line input with single curly brackets', () => {
		const input = `
      Line 1 {test}
      Line 2 {another test}
      Line 3
    `;
		const expected = `
      Line 1 {{test}}
      Line 2 {{another test}}
      Line 3
    `;
		expect(escapeSingleCurlyBrackets(input)).toBe(expected);
	});

	it('should handle multi-line input with mixed single and double curly brackets', () => {
		const input = `
      {Line 1}
      {{Line 2}}
      Line {3} {{4}}
    `;
		const expected = `
      {{Line 1}}
      {{Line 2}}
      Line {{3}} {{4}}
    `;
		expect(escapeSingleCurlyBrackets(input)).toBe(expected);
	});

	it('should handle multi-line input with curly brackets at line starts and ends', () => {
		const input = `
      {Start of line 1
      End of line 2}
      {3} Line 3 {3}
    `;
		const expected = `
      {{Start of line 1
      End of line 2}}
      {{3}} Line 3 {{3}}
    `;
		expect(escapeSingleCurlyBrackets(input)).toBe(expected);
	});

	it('should handle multi-line input with nested curly brackets', () => {
		const input = `
      Outer {
        Inner {nested}
      }
    `;
		const expected = `
      Outer {{
        Inner {{nested}}
      }}
    `;
		expect(escapeSingleCurlyBrackets(input)).toBe(expected);
	});
	it('should handle string with triple uneven curly brackets - opening', () => {
		expect(escapeSingleCurlyBrackets('Hello {{{world}')).toBe('Hello {{{{world}}');
	});

	it('should handle string with triple uneven curly brackets - closing', () => {
		expect(escapeSingleCurlyBrackets('Hello world}}}')).toBe('Hello world}}}}');
	});

	it('should handle string with triple uneven curly brackets - mixed opening and closing', () => {
		expect(escapeSingleCurlyBrackets('{{{Hello}}} {world}}}')).toBe('{{{{Hello}}}} {{world}}}}');
	});

	it('should handle string with triple uneven curly brackets - multiple occurrences', () => {
		expect(escapeSingleCurlyBrackets('{{{a}}} {{b}}} {{{c}')).toBe('{{{{a}}}} {{b}}}} {{{{c}}');
	});

	it('should handle multi-line input with triple uneven curly brackets', () => {
		const input = `
					{{{Line 1}
					Line 2}}}
					{{{3}}} Line 3 {{{4
			`;
		const expected = `
					{{{{Line 1}}
					Line 2}}}}
					{{{{3}}}} Line 3 {{{{4
			`;
		expect(escapeSingleCurlyBrackets(input)).toBe(expected);
	});
});

describe('getConnectedTools', () => {
	let mockExecuteFunctions: IExecuteFunctions;
	let mockNode: INode;
	let mockN8nTool: N8nTool;

	beforeEach(() => {
		mockNode = {
			id: 'test-node',
			name: 'Test Node',
			type: 'test',
			typeVersion: 1,
			position: [0, 0] as [number, number],
			parameters: {},
		};

		mockExecuteFunctions = createMockExecuteFunction({}, mockNode);
		// Add getParentNodes mock for metadata functionality
		mockExecuteFunctions.getParentNodes = jest.fn().mockReturnValue([]);

		mockN8nTool = new N8nTool(mockExecuteFunctions as unknown as ISupplyDataFunctions, {
			name: 'Dummy Tool',
			description: 'A dummy tool for testing',
			func: jest.fn(),
			schema: z.object({
				foo: z.string(),
			}),
		});
	});

	it('should return empty array when no tools are connected', async () => {
		mockExecuteFunctions.getInputConnectionData = jest.fn().mockResolvedValue([]);

		const tools = await getConnectedTools(mockExecuteFunctions, true);
		expect(tools).toEqual([]);
	});

	it('should return tools without modification when enforceUniqueNames is false', async () => {
		const mockTools = [
			{ name: 'tool1', description: 'desc1' },
			{ name: 'tool1', description: 'desc2' }, // Duplicate name
		];

		mockExecuteFunctions.getInputConnectionData = jest.fn().mockResolvedValue(mockTools);

		const tools = await getConnectedTools(mockExecuteFunctions, false);
		expect(tools).toEqual(mockTools);
	});

	it('should throw error when duplicate tool names exist and enforceUniqueNames is true', async () => {
		const mockTools = [
			{ name: 'tool1', description: 'desc1' },
			{ name: 'tool1', description: 'desc2' },
		];

		mockExecuteFunctions.getInputConnectionData = jest.fn().mockResolvedValue(mockTools);

		await expect(getConnectedTools(mockExecuteFunctions, true)).rejects.toThrow(NodeOperationError);
	});

	it('should escape curly brackets in tool descriptions when escapeCurlyBrackets is true', async () => {
		const mockTools = [{ name: 'tool1', description: 'Test {value}' }] as Tool[];

		mockExecuteFunctions.getInputConnectionData = jest.fn().mockResolvedValue(mockTools);

		const tools = await getConnectedTools(mockExecuteFunctions, true, false, true);
		expect(tools[0].description).toBe('Test {{value}}');
	});

	it('should convert N8nTool to dynamic tool when convertStructuredTool is true', async () => {
		const mockDynamicTool = new DynamicTool({
			name: 'dynamicTool',
			description: 'desc',
			func: jest.fn(),
		});
		const asDynamicToolSpy = jest.fn().mockReturnValue(mockDynamicTool);
		mockN8nTool.asDynamicTool = asDynamicToolSpy;

		mockExecuteFunctions.getInputConnectionData = jest.fn().mockResolvedValue([mockN8nTool]);

		const tools = await getConnectedTools(mockExecuteFunctions, true, true);
		expect(asDynamicToolSpy).toHaveBeenCalled();
		expect(tools[0]).toEqual(mockDynamicTool);
	});

	it('should not convert N8nTool when convertStructuredTool is false', async () => {
		mockExecuteFunctions.getInputConnectionData = jest.fn().mockResolvedValue([mockN8nTool]);

		const tools = await getConnectedTools(mockExecuteFunctions, true, false);
		expect(tools[0]).toBe(mockN8nTool);
	});

	it('should flatten tools from a toolkit', async () => {
		const mockTools = [
			{ name: 'tool1', description: 'desc1' },

			new StructuredToolkit([
				{ name: 'toolkitTool1', description: 'toolkitToolDesc1' },
				{ name: 'toolkitTool2', description: 'toolkitToolDesc2' },
			] as any),
		];

		mockExecuteFunctions.getInputConnectionData = jest.fn().mockResolvedValue(mockTools);

		const tools = await getConnectedTools(mockExecuteFunctions, false);
		expect(tools).toEqual([
			{
				name: 'tool1',
				description: 'desc1',
				metadata: { isFromToolkit: false, sourceNodeName: undefined },
			},
			{
				name: 'toolkitTool1',
				description: 'toolkitToolDesc1',
				metadata: { isFromToolkit: true, sourceNodeName: undefined },
			},
			{
				name: 'toolkitTool2',
				description: 'toolkitToolDesc2',
				metadata: { isFromToolkit: true, sourceNodeName: undefined },
			},
		]);
	});

	it('should add metadata to all tools with source node information', async () => {
		const mockParentNodes = [{ name: 'RegularTool' }, { name: 'MCP Client Tool' }];
		const mockTools = [
			{ name: 'tool1', description: 'desc1' },
			new StructuredToolkit([
				{ name: 'toolkitTool1', description: 'toolkitToolDesc1' },
				{ name: 'toolkitTool2', description: 'toolkitToolDesc2' },
			] as any),
		];

		mockExecuteFunctions.getInputConnectionData = jest.fn().mockResolvedValue(mockTools);
		mockExecuteFunctions.getParentNodes = jest.fn().mockReturnValue(mockParentNodes);

		const tools = await getConnectedTools(mockExecuteFunctions, false);

		expect(tools).toHaveLength(3);

		// Regular tool should have metadata with isFromToolkit: false
		expect(tools[0].name).toBe('tool1');
		expect(tools[0].metadata).toEqual({
			isFromToolkit: false,
			sourceNodeName: 'RegularTool',
		});

		// Toolkit tools should have metadata with isFromToolkit: true
		expect(tools[1].name).toBe('toolkitTool1');
		expect(tools[1].metadata).toEqual({
			isFromToolkit: true,
			sourceNodeName: 'MCP Client Tool',
		});

		expect(tools[2].name).toBe('toolkitTool2');
		expect(tools[2].metadata).toEqual({
			isFromToolkit: true,
			sourceNodeName: 'MCP Client Tool',
		});
	});

	it('should preserve existing metadata when adding toolkit metadata', async () => {
		const mockParentNodes = [{ name: 'MCP Client Tool' }];
		const mockTools = [
			new StructuredToolkit([
				{ name: 'toolkitTool1', description: 'desc1', metadata: { customField: 'value' } },
			] as any),
		];

		mockExecuteFunctions.getInputConnectionData = jest.fn().mockResolvedValue(mockTools);
		mockExecuteFunctions.getParentNodes = jest.fn().mockReturnValue(mockParentNodes);

		const tools = await getConnectedTools(mockExecuteFunctions, false);

		expect(tools[0].metadata).toEqual({
			customField: 'value',
			isFromToolkit: true,
			sourceNodeName: 'MCP Client Tool',
		});
	});
});

describe('unwrapNestedOutput', () => {
	it('should unwrap doubly nested output', () => {
		const input = {
			output: {
				output: {
					text: 'Hello world',
					confidence: 0.95,
				},
			},
		};

		const expected = {
			output: {
				text: 'Hello world',
				confidence: 0.95,
			},
		};

		expect(unwrapNestedOutput(input)).toEqual(expected);
	});

	it('should not modify regular output object', () => {
		const input = {
			output: {
				text: 'Hello world',
				confidence: 0.95,
			},
		};

		expect(unwrapNestedOutput(input)).toEqual(input);
	});

	it('should not modify object without output property', () => {
		const input = {
			result: 'success',
			data: {
				text: 'Hello world',
			},
		};

		expect(unwrapNestedOutput(input)).toEqual(input);
	});

	it('should not modify when output is not an object', () => {
		const input = {
			output: 'Hello world',
		};

		expect(unwrapNestedOutput(input)).toEqual(input);
	});

	it('should not modify when object has multiple properties', () => {
		const input = {
			output: {
				output: {
					text: 'Hello world',
				},
			},
			meta: {
				timestamp: 123456789,
			},
		};

		expect(unwrapNestedOutput(input)).toEqual(input);
	});

	it('should not modify when inner output has multiple properties', () => {
		const input = {
			output: {
				output: {
					text: 'Hello world',
				},
				meta: {
					timestamp: 123456789,
				},
			},
		};

		expect(unwrapNestedOutput(input)).toEqual(input);
	});

	it('should handle null values properly', () => {
		const input = {
			output: null,
		};

		expect(unwrapNestedOutput(input)).toEqual(input);
	});

	it('should handle empty object values properly', () => {
		const input = {
			output: {},
		};

		expect(unwrapNestedOutput(input)).toEqual(input);
	});
});

describe('getSessionId', () => {
	let mockCtx: any;

	beforeEach(() => {
		mockCtx = {
			getNodeParameter: jest.fn(),
			evaluateExpression: jest.fn(),
			getChatTrigger: jest.fn(),
			getNode: jest.fn(),
		};
	});

	it('should retrieve sessionId from bodyData', () => {
		mockCtx.getBodyData = jest.fn();
		mockCtx.getNodeParameter.mockReturnValue('fromInput');
		mockCtx.getBodyData.mockReturnValue({ sessionId: '12345' });

		const sessionId = getSessionId(mockCtx, 0);
		expect(sessionId).toBe('12345');
	});

	it('should retrieve sessionId from chat trigger', () => {
		mockCtx.getNodeParameter.mockReturnValue('fromInput');
		mockCtx.evaluateExpression.mockReturnValueOnce(undefined);
		mockCtx.getChatTrigger.mockReturnValue({ name: 'chatTrigger' });
		mockCtx.evaluateExpression.mockReturnValueOnce('67890');
		const sessionId = getSessionId(mockCtx, 0);
		expect(sessionId).toBe('67890');
	});

	it('should throw error if sessionId is not found', () => {
		mockCtx.getNodeParameter.mockReturnValue('fromInput');
		mockCtx.evaluateExpression.mockReturnValue(undefined);
		mockCtx.getChatTrigger.mockReturnValue(undefined);

		expect(() => getSessionId(mockCtx, 0)).toThrow(NodeOperationError);
	});

	it('should use custom sessionId if provided', () => {
		mockCtx.getNodeParameter.mockReturnValueOnce('custom').mockReturnValueOnce('customSessionId');

		const sessionId = getSessionId(mockCtx, 0);
		expect(sessionId).toBe('customSessionId');
	});
});

describe('mergeCustomHeaders', () => {
	it('should merge custom header when credential has header enabled', () => {
		const credentials = {
			apiKey: 'test-key',
			header: true,
			headerName: 'X-Custom-Header',
			headerValue: 'custom-value',
		};
		const defaultHeaders = { 'Content-Type': 'application/json' };

		const result = mergeCustomHeaders(credentials, defaultHeaders);

		expect(result).toEqual({
			'Content-Type': 'application/json',
			'X-Custom-Header': 'custom-value',
		});
	});

	it('should return original headers when header option is disabled', () => {
		const credentials = {
			apiKey: 'test-key',
			header: false,
			headerName: 'X-Custom-Header',
			headerValue: 'custom-value',
		};
		const defaultHeaders = { 'Content-Type': 'application/json' };

		const result = mergeCustomHeaders(credentials, defaultHeaders);

		expect(result).toEqual({ 'Content-Type': 'application/json' });
	});

	it('should return original headers when headerName is empty', () => {
		const credentials = {
			apiKey: 'test-key',
			header: true,
			headerName: '',
			headerValue: 'custom-value',
		};
		const defaultHeaders = { 'Content-Type': 'application/json' };

		const result = mergeCustomHeaders(credentials, defaultHeaders);

		expect(result).toEqual({ 'Content-Type': 'application/json' });
	});

	it('should return original headers when headerName is not a string', () => {
		const credentials = {
			apiKey: 'test-key',
			header: true,
			headerName: 123,
			headerValue: 'custom-value',
		};
		const defaultHeaders = { 'Content-Type': 'application/json' };

		const result = mergeCustomHeaders(credentials, defaultHeaders);

		expect(result).toEqual({ 'Content-Type': 'application/json' });
	});

	it('should return original headers when headerValue is not a string', () => {
		const credentials = {
			apiKey: 'test-key',
			header: true,
			headerName: 'X-Custom-Header',
			headerValue: 123,
		};
		const defaultHeaders = { 'Content-Type': 'application/json' };

		const result = mergeCustomHeaders(credentials, defaultHeaders);

		expect(result).toEqual({ 'Content-Type': 'application/json' });
	});

	it('should return original headers when credential has no header properties', () => {
		const credentials = {
			apiKey: 'test-key',
		};
		const defaultHeaders = { 'Content-Type': 'application/json' };

		const result = mergeCustomHeaders(credentials, defaultHeaders);

		expect(result).toEqual({ 'Content-Type': 'application/json' });
	});

	it('should handle empty defaultHeaders', () => {
		const credentials = {
			apiKey: 'test-key',
			header: true,
			headerName: 'X-Api-Key',
			headerValue: 'my-api-key',
		};

		const result = mergeCustomHeaders(credentials, {});

		expect(result).toEqual({ 'X-Api-Key': 'my-api-key' });
	});

	it('should override existing header with same name', () => {
		const credentials = {
			apiKey: 'test-key',
			header: true,
			headerName: 'Authorization',
			headerValue: 'Bearer new-token',
		};
		const defaultHeaders = { Authorization: 'Bearer old-token' };

		const result = mergeCustomHeaders(credentials, defaultHeaders);

		expect(result).toEqual({ Authorization: 'Bearer new-token' });
	});
});

describe('getPromptInputByType', () => {
	let mockCtx: any;

	const defaultOptions = { i: 0, promptTypeKey: 'promptType', inputKey: 'text' };

	beforeEach(() => {
		mockCtx = {
			getNodeParameter: jest.fn(),
			evaluateExpression: jest.fn(),
			getNode: jest.fn().mockReturnValue({
				name: 'Test Node',
				type: 'test',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			}),
		};
	});

	function call(i = 0) {
		return getPromptInputByType({ ctx: mockCtx, ...defaultOptions, i });
	}

	function setupAuto(chatInputValue: unknown, guardrailsInputValue: unknown = undefined) {
		mockCtx.getNodeParameter.mockReturnValueOnce('auto');
		mockCtx.evaluateExpression.mockImplementation((expr: string) => {
			if (expr.includes('chatInput')) return chatInputValue;
			if (expr.includes('guardrailsInput')) return guardrailsInputValue;
			return undefined;
		});
	}

	function setupGuardrails(value: unknown) {
		mockCtx.getNodeParameter.mockReturnValueOnce('guardrails');
		mockCtx.evaluateExpression.mockReturnValueOnce(value);
	}

	function setupDefine(value: unknown) {
		mockCtx.getNodeParameter.mockReturnValueOnce('define').mockReturnValueOnce(value);
	}

	// ════════════════════════════════════════════════════════════════
	// GROUP 1 — Happy path
	// ════════════════════════════════════════════════════════════════
	describe('Happy path', () => {
		it('auto + chatInput valid → returns chatInput', () => {
			setupAuto('Hello from chat');
			expect(call()).toBe('Hello from chat');
		});

		it('auto + chatInput null + guardrailsInput valid → returns guardrailsInput (the bug fix)', () => {
			setupAuto(null, 'Hello from guardrails');
			expect(call()).toBe('Hello from guardrails');
		});

		it('auto + chatInput undefined + guardrailsInput valid → returns guardrailsInput', () => {
			setupAuto(undefined, 'Hello from guardrails');
			expect(call()).toBe('Hello from guardrails');
		});

		it('guardrails + valid string → returns it', () => {
			setupGuardrails('Guarded input');
			expect(call()).toBe('Guarded input');
		});

		it('define + valid string → returns it', () => {
			setupDefine('Manual prompt');
			expect(call()).toBe('Manual prompt');
		});

		it('auto + number 42 → silently casts to "42"', () => {
			setupAuto(42);
			expect(call()).toBe('42');
		});

		it('auto + boolean true → silently casts to "true"', () => {
			setupAuto(true);
			expect(call()).toBe('true');
		});

		it('auto + boolean false → silently casts to "false"', () => {
			setupAuto(false);
			expect(call()).toBe('false');
		});

		it('guardrailsInput number → silently casts to string', () => {
			setupAuto(null, 42);
			expect(call()).toBe('42');
		});
	});

	// ════════════════════════════════════════════════════════════════
	// GROUP 2 — null and undefined inputs — the bug fix
	// ════════════════════════════════════════════════════════════════
	describe('null and undefined inputs — the bug fix', () => {
		it('auto + both null → throws NodeOperationError', () => {
			setupAuto(null, null);
			expect(() => call()).toThrow(NodeOperationError);
		});

		it('auto + both undefined → throws NodeOperationError', () => {
			setupAuto(undefined, undefined);
			expect(() => call()).toThrow(NodeOperationError);
		});

		it('guardrails + null → throws NodeOperationError', () => {
			setupGuardrails(null);
			expect(() => call()).toThrow(NodeOperationError);
		});

		it('guardrails + undefined → throws NodeOperationError', () => {
			setupGuardrails(undefined);
			expect(() => call()).toThrow(NodeOperationError);
		});

		it('define + null → throws NodeOperationError', () => {
			setupDefine(null);
			expect(() => call()).toThrow(NodeOperationError);
		});

		it('define + undefined → throws NodeOperationError', () => {
			setupDefine(undefined);
			expect(() => call()).toThrow(NodeOperationError);
		});
	});

	// ════════════════════════════════════════════════════════════════
	// GROUP 3 — Invalid type inputs
	// ════════════════════════════════════════════════════════════════
	describe('Invalid type inputs', () => {
		it('auto + chatInput object → throws NodeOperationError', () => {
			setupAuto({ key: 'value' });
			expect(() => call()).toThrow(NodeOperationError);
		});

		it('auto + chatInput array → throws NodeOperationError', () => {
			setupAuto(['item1', 'item2']);
			expect(() => call()).toThrow(NodeOperationError);
		});

		it('define + object → throws NodeOperationError', () => {
			setupDefine({ key: 'value' });
			expect(() => call()).toThrow(NodeOperationError);
		});
	});

	// ════════════════════════════════════════════════════════════════
	// GROUP 4 — Empty and whitespace-only strings
	// ════════════════════════════════════════════════════════════════
	describe('Empty and whitespace-only strings', () => {
		it('auto + chatInput "" → throws NodeOperationError', () => {
			setupAuto('');
			expect(() => call()).toThrow(NodeOperationError);
		});

		it('auto + chatInput "   " → throws NodeOperationError', () => {
			setupAuto('   ');
			expect(() => call()).toThrow(NodeOperationError);
		});

		it('auto + chatInput "\\n\\t" → throws NodeOperationError', () => {
			setupAuto('\n\t');
			expect(() => call()).toThrow(NodeOperationError);
		});

		it('define + "" → throws NodeOperationError', () => {
			setupDefine('');
			expect(() => call()).toThrow(NodeOperationError);
		});
	});

	// ════════════════════════════════════════════════════════════════
	// GROUP 5 — Error message content
	// ════════════════════════════════════════════════════════════════
	describe('Error message content', () => {
		it('auto both null → error.message === "No prompt specified"', () => {
			setupAuto(null, null);
			try {
				call();
				fail('Expected error to be thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(NodeOperationError);
				expect((error as NodeOperationError).message).toBe('No prompt specified');
			}
		});

		it('auto both null → description mentions "Chat Trigger or Guardrails"', () => {
			setupAuto(null, null);
			try {
				call();
				fail('Expected error to be thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(NodeOperationError);
				expect((error as NodeOperationError).description).toContain('Chat Trigger or Guardrails');
			}
		});

		it('auto both null → description mentions "Define below"', () => {
			setupAuto(null, null);
			try {
				call();
				fail('Expected error to be thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(NodeOperationError);
				expect((error as NodeOperationError).description).toContain('Define below');
			}
		});

		it('define null → description mentions "expression"', () => {
			setupDefine(null);
			try {
				call();
				fail('Expected error to be thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(NodeOperationError);
				expect((error as NodeOperationError).description).toContain('expression');
			}
		});

		it('auto object → error.message === "Invalid prompt value"', () => {
			setupAuto({ key: 'value' });
			try {
				call();
				fail('Expected error to be thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(NodeOperationError);
				expect((error as NodeOperationError).message).toBe('Invalid prompt value');
			}
		});

		it('auto object → description mentions "object or array"', () => {
			setupAuto({ key: 'value' });
			try {
				call();
				fail('Expected error to be thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(NodeOperationError);
				expect((error as NodeOperationError).description).toContain('object or array');
			}
		});

		it('auto "" → description mentions "whitespace"', () => {
			setupAuto('');
			try {
				call();
				fail('Expected error to be thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(NodeOperationError);
				expect((error as NodeOperationError).description).toContain('whitespace');
			}
		});
	});

	// ════════════════════════════════════════════════════════════════
	// GROUP 6 — itemIndex in errors
	// ════════════════════════════════════════════════════════════════
	describe('itemIndex in errors', () => {
		it('auto both null at i=0 → itemIndex === 0', () => {
			setupAuto(null, null);
			try {
				call(0);
				fail('Expected error to be thrown');
			} catch (error) {
				expect((error as NodeOperationError).context?.itemIndex).toBe(0);
			}
		});

		it('auto both null at i=2 → itemIndex === 2', () => {
			setupAuto(null, null);
			try {
				call(2);
				fail('Expected error to be thrown');
			} catch (error) {
				expect((error as NodeOperationError).context?.itemIndex).toBe(2);
			}
		});

		it('define null at i=0 → itemIndex === 0', () => {
			setupDefine(null);
			try {
				call(0);
				fail('Expected error to be thrown');
			} catch (error) {
				expect((error as NodeOperationError).context?.itemIndex).toBe(0);
			}
		});

		it('define null at i=2 → itemIndex === 2', () => {
			setupDefine(null);
			try {
				call(2);
				fail('Expected error to be thrown');
			} catch (error) {
				expect((error as NodeOperationError).context?.itemIndex).toBe(2);
			}
		});
	});

	// ════════════════════════════════════════════════════════════════
	// GROUP 7 — Correct method called per promptType
	// ════════════════════════════════════════════════════════════════
	describe('Correct method called per promptType', () => {
		it('auto → evaluateExpression called with chatInput expression first', () => {
			setupAuto('test');
			call();
			expect(mockCtx.evaluateExpression).toHaveBeenCalledWith('{{ $json["chatInput"] }}', 0);
		});

		it('auto chatInput null → evaluateExpression also called with guardrailsInput', () => {
			setupAuto(null, 'fallback');
			call();
			expect(mockCtx.evaluateExpression).toHaveBeenCalledWith('{{ $json["guardrailsInput"] }}', 0);
		});

		it('auto chatInput valid → evaluateExpression NOT called with guardrailsInput', () => {
			setupAuto('hello');
			call();
			expect(mockCtx.evaluateExpression).not.toHaveBeenCalledWith(
				'{{ $json["guardrailsInput"] }}',
				expect.anything(),
			);
		});

		it('guardrails → evaluateExpression called with guardrailsInput expression', () => {
			setupGuardrails('test');
			call();
			expect(mockCtx.evaluateExpression).toHaveBeenCalledWith('{{ $json["guardrailsInput"] }}', 0);
		});

		it('define → getNodeParameter called twice, evaluateExpression NOT called', () => {
			setupDefine('test');
			call();
			expect(mockCtx.getNodeParameter).toHaveBeenCalledTimes(2);
			expect(mockCtx.evaluateExpression).not.toHaveBeenCalled();
		});
	});
});
