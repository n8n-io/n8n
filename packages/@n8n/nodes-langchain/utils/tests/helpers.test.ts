import { DynamicTool, type Tool } from '@langchain/core/tools';
import { Toolkit } from 'langchain/agents';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import { NodeOperationError } from 'n8n-workflow';
import type { ISupplyDataFunctions, IExecuteFunctions, INode } from 'n8n-workflow';
import { z } from 'zod';

import {
	escapeSingleCurlyBrackets,
	getConnectedTools,
	hasLongSequentialRepeat,
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
		class MockToolkit extends Toolkit {
			tools: Tool[];

			constructor(tools: unknown[]) {
				super();
				this.tools = tools as Tool[];
			}
		}
		const mockTools = [
			{ name: 'tool1', description: 'desc1' },

			new MockToolkit([
				{ name: 'toolkitTool1', description: 'toolkitToolDesc1' },
				{ name: 'toolkitTool2', description: 'toolkitToolDesc2' },
			]),
		];

		mockExecuteFunctions.getInputConnectionData = jest.fn().mockResolvedValue(mockTools);

		const tools = await getConnectedTools(mockExecuteFunctions, false);
		expect(tools).toEqual([
			{ name: 'tool1', description: 'desc1' },
			{ name: 'toolkitTool1', description: 'toolkitToolDesc1' },
			{ name: 'toolkitTool2', description: 'toolkitToolDesc2' },
		]);
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

describe('hasLongSequentialRepeat', () => {
	it('should return false for text shorter than threshold', () => {
		const text = 'a'.repeat(99);
		expect(hasLongSequentialRepeat(text, 100)).toBe(false);
	});

	it('should return false for normal text without repeats', () => {
		const text = 'This is a normal text without many sequential repeating characters.';
		expect(hasLongSequentialRepeat(text)).toBe(false);
	});

	it('should return true for text with exactly threshold repeats', () => {
		const text = 'a'.repeat(100);
		expect(hasLongSequentialRepeat(text, 100)).toBe(true);
	});

	it('should return true for text with more than threshold repeats', () => {
		const text = 'b'.repeat(150);
		expect(hasLongSequentialRepeat(text, 100)).toBe(true);
	});

	it('should detect repeats in the middle of text', () => {
		const text = 'Normal text ' + 'x'.repeat(100) + ' more normal text';
		expect(hasLongSequentialRepeat(text, 100)).toBe(true);
	});

	it('should detect repeats at the end of text', () => {
		const text = 'Normal text at the beginning' + 'z'.repeat(100);
		expect(hasLongSequentialRepeat(text, 100)).toBe(true);
	});

	it('should work with different thresholds', () => {
		const text = 'a'.repeat(50);
		expect(hasLongSequentialRepeat(text, 30)).toBe(true);
		expect(hasLongSequentialRepeat(text, 60)).toBe(false);
	});

	it('should handle special characters', () => {
		const text = '.'.repeat(100);
		expect(hasLongSequentialRepeat(text, 100)).toBe(true);
	});

	it('should handle spaces', () => {
		const text = ' '.repeat(100);
		expect(hasLongSequentialRepeat(text, 100)).toBe(true);
	});

	it('should handle newlines', () => {
		const text = '\n'.repeat(100);
		expect(hasLongSequentialRepeat(text, 100)).toBe(true);
	});

	it('should not detect non-sequential repeats', () => {
		const text = 'ababab'.repeat(50); // 300 chars but no sequential repeats
		expect(hasLongSequentialRepeat(text, 100)).toBe(false);
	});

	it('should handle mixed content with repeats below threshold', () => {
		const text = 'aaa' + 'b'.repeat(50) + 'ccc' + 'd'.repeat(40) + 'eee';
		expect(hasLongSequentialRepeat(text, 100)).toBe(false);
	});

	it('should handle empty string', () => {
		expect(hasLongSequentialRepeat('', 100)).toBe(false);
	});

	it('should work with very large texts', () => {
		const normalText = 'Lorem ipsum dolor sit amet '.repeat(1000);
		const textWithRepeat = normalText + 'A'.repeat(100) + normalText;
		expect(hasLongSequentialRepeat(textWithRepeat, 100)).toBe(true);
	});

	it('should detect unicode character repeats', () => {
		const text = '😀'.repeat(100);
		expect(hasLongSequentialRepeat(text, 100)).toBe(true);
	});

	describe('error handling', () => {
		it('should handle null input', () => {
			expect(hasLongSequentialRepeat(null as any)).toBe(false);
		});

		it('should handle undefined input', () => {
			expect(hasLongSequentialRepeat(undefined as any)).toBe(false);
		});

		it('should handle non-string input', () => {
			expect(hasLongSequentialRepeat(123 as any)).toBe(false);
			expect(hasLongSequentialRepeat({} as any)).toBe(false);
			expect(hasLongSequentialRepeat([] as any)).toBe(false);
		});

		it('should handle zero or negative threshold', () => {
			const text = 'a'.repeat(100);
			expect(hasLongSequentialRepeat(text, 0)).toBe(false);
			expect(hasLongSequentialRepeat(text, -1)).toBe(false);
		});

		it('should handle empty string', () => {
			expect(hasLongSequentialRepeat('', 100)).toBe(false);
		});
	});
});
