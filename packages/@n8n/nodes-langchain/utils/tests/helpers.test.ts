import { DynamicTool, type Tool } from '@langchain/core/tools';
import { Toolkit } from 'langchain/agents';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import { NodeOperationError } from 'n8n-workflow';
import type { ISupplyDataFunctions, IExecuteFunctions, INode } from 'n8n-workflow';
import { z } from 'zod';

import {
	escapeSingleCurlyBrackets,
	getConnectedTools,
	nodeNameToToolName,
	unwrapNestedOutput,
} from '../helpers';
import { N8nTool } from '../N8nTool';

describe('nodeNameToToolName', () => {
	const getNodeWithName = (name: string): INode => ({
		id: 'test-node',
		name,
		type: 'test',
		typeVersion: 1,
		position: [0, 0] as [number, number],
		parameters: {},
	});
	it('should replace spaces with underscores', () => {
		expect(nodeNameToToolName(getNodeWithName('Test Node'))).toBe('Test_Node');
	});

	it('should replace dots with underscores', () => {
		expect(nodeNameToToolName(getNodeWithName('Test.Node'))).toBe('Test_Node');
	});

	it('should replace question marks with underscores', () => {
		expect(nodeNameToToolName(getNodeWithName('Test?Node'))).toBe('Test_Node');
	});

	it('should replace exclamation marks with underscores', () => {
		expect(nodeNameToToolName(getNodeWithName('Test!Node'))).toBe('Test_Node');
	});

	it('should replace equals signs with underscores', () => {
		expect(nodeNameToToolName(getNodeWithName('Test=Node'))).toBe('Test_Node');
	});

	it('should replace multiple special characters with underscores', () => {
		expect(nodeNameToToolName(getNodeWithName('Test.Node?With!Special=Chars'))).toBe(
			'Test_Node_With_Special_Chars',
		);
	});

	it('should handle names that already have underscores', () => {
		expect(nodeNameToToolName(getNodeWithName('Test_Node'))).toBe('Test_Node');
	});

	it('should handle names with consecutive special characters', () => {
		expect(nodeNameToToolName(getNodeWithName('Test..!!??==Node'))).toBe('Test_Node');
	});

	it('should replace various special characters with underscores', () => {
		expect(nodeNameToToolName(getNodeWithName('Test#+*()[]{}:;,<>/\\\'"%$Node'))).toBe('Test_Node');
	});
});

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
