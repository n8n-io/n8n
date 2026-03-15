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
