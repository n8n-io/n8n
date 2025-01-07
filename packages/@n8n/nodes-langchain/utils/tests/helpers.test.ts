import { DynamicTool, type Tool } from '@langchain/core/tools';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import { NodeOperationError } from 'n8n-workflow';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { z } from 'zod';

import { escapeSingleCurlyBrackets, getConnectedTools } from '../helpers';
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
			position: [0, 0],
			parameters: {},
		};

		mockExecuteFunctions = createMockExecuteFunction({}, mockNode);

		mockN8nTool = new N8nTool(mockExecuteFunctions, {
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
});
