import { mock } from 'jest-mock-extended';
import type { BaseChatMemory } from '@langchain/classic/memory';

import type { N8nOutputParser } from '@utils/output_parsers/N8nOutputParser';

import { finalizeResult } from '../finalizeResult';

describe('finalizeResult', () => {
	it('should finalize result without memory or output parser', () => {
		const result = {
			output: 'Test output',
			system_message: 'You are a helpful assistant',
			formatting_instructions: 'Format as JSON',
			input: 'Test input',
			chat_history: [],
			agent_scratchpad: 'scratch',
		};

		const finalized = finalizeResult(result, 0, undefined, undefined);

		expect(finalized).toEqual({
			json: {
				output: 'Test output',
			},
			pairedItem: { item: 0 },
		});
	});

	it('should omit internal keys from result', () => {
		const result = {
			output: 'Test output',
			customField: 'custom value',
			system_message: 'You are a helpful assistant',
			formatting_instructions: 'Format as JSON',
			input: 'Test input',
			chat_history: [],
			agent_scratchpad: 'scratch',
		};

		const finalized = finalizeResult(result, 0, undefined, undefined);

		expect(finalized.json).toEqual({
			output: 'Test output',
			customField: 'custom value',
		});
		expect(finalized.json).not.toHaveProperty('system_message');
		expect(finalized.json).not.toHaveProperty('formatting_instructions');
		expect(finalized.json).not.toHaveProperty('input');
		expect(finalized.json).not.toHaveProperty('chat_history');
		expect(finalized.json).not.toHaveProperty('agent_scratchpad');
	});

	it('should parse output when memory and outputParser are connected', () => {
		const mockMemory = mock<BaseChatMemory>();
		const mockOutputParser = mock<N8nOutputParser>();

		const result = {
			output: JSON.stringify({ output: { result: 'parsed result' } }),
		};

		const finalized = finalizeResult(result, 0, mockMemory, mockOutputParser);

		expect(finalized.json.output).toEqual({ result: 'parsed result' });
	});

	it('should handle output without nested output field when parsing', () => {
		const mockMemory = mock<BaseChatMemory>();
		const mockOutputParser = mock<N8nOutputParser>();

		const result = {
			output: JSON.stringify({ result: 'direct result' }),
		};

		const finalized = finalizeResult(result, 0, mockMemory, mockOutputParser);

		expect(finalized.json.output).toEqual({ result: 'direct result' });
	});

	it('should set correct pairedItem index', () => {
		const result = {
			output: 'Test output',
		};

		const finalized = finalizeResult(result, 5, undefined, undefined);

		expect(finalized.pairedItem).toEqual({ item: 5 });
	});

	it('should preserve intermediate steps when present', () => {
		const result = {
			output: 'Test output',
			intermediateSteps: [
				{
					action: { tool: 'test_tool', toolInput: {}, log: 'log', toolCallId: 'id', type: 'type' },
					observation: 'observation',
				},
			],
		};

		const finalized = finalizeResult(result, 0, undefined, undefined);

		expect(finalized.json.intermediateSteps).toBeDefined();
		expect(finalized.json.intermediateSteps).toHaveLength(1);
	});

	it('should not parse output when only memory is connected', () => {
		const mockMemory = mock<BaseChatMemory>();

		const result = {
			output: JSON.stringify({ output: { result: 'should not parse' } }),
		};

		const finalized = finalizeResult(result, 0, mockMemory, undefined);

		// Should remain as string
		expect(typeof finalized.json.output).toBe('string');
		expect(finalized.json.output).toBe(JSON.stringify({ output: { result: 'should not parse' } }));
	});

	it('should not parse output when only outputParser is connected', () => {
		const mockOutputParser = mock<N8nOutputParser>();

		const result = {
			output: JSON.stringify({ output: { result: 'should not parse' } }),
		};

		const finalized = finalizeResult(result, 0, undefined, mockOutputParser);

		// Should remain as string
		expect(typeof finalized.json.output).toBe('string');
		expect(finalized.json.output).toBe(JSON.stringify({ output: { result: 'should not parse' } }));
	});

	it('should throw error when parsing invalid JSON', () => {
		const mockMemory = mock<BaseChatMemory>();
		const mockOutputParser = mock<N8nOutputParser>();

		const result = {
			output: 'not valid JSON',
		};

		// jsonParse throws an error on invalid JSON
		expect(() => finalizeResult(result, 0, mockMemory, mockOutputParser)).toThrow();
	});

	describe('parseOutput option', () => {
		it('should parse clean JSON object when parseOutput is true', () => {
			const result = { output: '{"key": "value"}' };
			const finalized = finalizeResult(result, 0, undefined, undefined, true);
			expect(finalized.json.output).toEqual({ key: 'value' });
		});

		it('should extract JSON from markdown code fence when parseOutput is true', () => {
			const result = { output: '```json\n{"key": "value"}\n```' };
			const finalized = finalizeResult(result, 0, undefined, undefined, true);
			expect(finalized.json.output).toEqual({ key: 'value' });
		});

		it('should extract JSON from preamble text when parseOutput is true', () => {
			const result = { output: 'Here\'s the result:\n{"key": "value"}' };
			const finalized = finalizeResult(result, 0, undefined, undefined, true);
			expect(finalized.json.output).toEqual({ key: 'value' });
		});

		it('should fall back to raw text when no JSON found and parseOutput is true', () => {
			const result = { output: 'Just plain text, no JSON here.' };
			const finalized = finalizeResult(result, 0, undefined, undefined, true);
			expect(finalized.json.output).toBe('Just plain text, no JSON here.');
		});

		it('should not attempt JSON extraction when parseOutput is false', () => {
			const result = { output: '{"key": "value"}' };
			const finalized = finalizeResult(result, 0, undefined, undefined, false);
			expect(typeof finalized.json.output).toBe('string');
			expect(finalized.json.output).toBe('{"key": "value"}');
		});

		it('should not attempt JSON extraction when parseOutput is omitted', () => {
			const result = { output: '{"key": "value"}' };
			const finalized = finalizeResult(result, 0, undefined, undefined);
			expect(typeof finalized.json.output).toBe('string');
		});

		it('should set output to null when JSON null is returned and parseOutput is true', () => {
			const result = { output: 'null' };
			const finalized = finalizeResult(result, 0, undefined, undefined, true);
			expect(finalized.json.output).toBeNull();
		});

		it('should set output to null when JSON null is inside a code fence and parseOutput is true', () => {
			const result = { output: '```json\nnull\n```' };
			const finalized = finalizeResult(result, 0, undefined, undefined, true);
			expect(finalized.json.output).toBeNull();
		});

		it('should prefer memory+outputParser parsing over parseOutput', () => {
			const mockMemory = mock<BaseChatMemory>();
			const mockOutputParser = mock<N8nOutputParser>();
			const result = { output: JSON.stringify({ output: { result: 'from memory parser' } }) };
			const finalized = finalizeResult(result, 0, mockMemory, mockOutputParser, true);
			expect(finalized.json.output).toEqual({ result: 'from memory parser' });
		});
	});

	it('should handle multiple custom fields in result', () => {
		const result = {
			output: 'Test output',
			field1: 'value1',
			field2: 123,
			field3: true,
			field4: { nested: 'object' },
			system_message: 'should be omitted',
		};

		const finalized = finalizeResult(result, 0, undefined, undefined);

		expect(finalized.json).toEqual({
			output: 'Test output',
			field1: 'value1',
			field2: 123,
			field3: true,
			field4: { nested: 'object' },
		});
	});
});
