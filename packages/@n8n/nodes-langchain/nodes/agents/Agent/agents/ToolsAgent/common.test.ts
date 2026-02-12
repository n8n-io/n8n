import type { AgentAction, AgentFinish } from '@langchain/classic/agents';

import { handleAgentFinishOutput } from './common';

describe('handleAgentFinishOutput', () => {
	describe('undefined/null output handling', () => {
		/**
		 * This test reproduces the downstream effect of the Gemini "content.parts" bug.
		 *
		 * When the SafeChatGoogleGenerativeAI wrapper catches the malformed response and
		 * returns createEmptyChatResult(), the agent may finish with undefined output.
		 *
		 * On the BUGGY version: downstream code that accesses output.length, output.trim(),
		 * etc. would crash with a new TypeError because output is undefined.
		 *
		 * On the FIXED version: handleAgentFinishOutput normalizes undefined to '' before
		 * any downstream processing occurs.
		 */
		it('should normalize undefined output to empty string', () => {
			const steps: AgentFinish = {
				returnValues: { output: undefined },
				log: '',
			};

			const result = handleAgentFinishOutput(steps) as AgentFinish;

			expect(result.returnValues.output).toBe('');
		});

		it('should normalize null output to empty string', () => {
			const steps: AgentFinish = {
				returnValues: { output: null },
				log: '',
			};

			const result = handleAgentFinishOutput(steps) as AgentFinish;

			expect(result.returnValues.output).toBe('');
		});
	});

	describe('valid outputs are preserved', () => {
		it('should preserve string output as-is', () => {
			const steps: AgentFinish = {
				returnValues: { output: 'The answer is 42.' },
				log: '',
			};

			const result = handleAgentFinishOutput(steps) as AgentFinish;

			expect(result.returnValues.output).toBe('The answer is 42.');
		});

		it('should preserve empty string output', () => {
			const steps: AgentFinish = {
				returnValues: { output: '' },
				log: '',
			};

			const result = handleAgentFinishOutput(steps) as AgentFinish;

			expect(result.returnValues.output).toBe('');
		});
	});

	describe('multi-output format (Anthropic-style)', () => {
		it('should extract text from multi-output array', () => {
			const steps: AgentFinish = {
				returnValues: {
					output: [
						{ type: 'text', text: 'Hello world', index: 0 },
						{ type: 'thinking', thinking: 'I should greet them', index: 1 },
					],
				},
				log: '',
			};

			const result = handleAgentFinishOutput(steps) as AgentFinish;

			expect(result.returnValues.output).toBe('Hello world');
		});

		it('should fall back to thinking content when no text blocks exist', () => {
			const steps: AgentFinish = {
				returnValues: {
					output: [{ type: 'thinking', thinking: 'Deep thought', index: 0 }],
				},
				log: '',
			};

			const result = handleAgentFinishOutput(steps) as AgentFinish;

			expect(result.returnValues.output).toBe('Deep thought');
		});

		it('should return empty string when multi-output has no text or thinking', () => {
			const steps: AgentFinish = {
				returnValues: {
					output: [{ type: 'other', index: 0 }],
				},
				log: '',
			};

			const result = handleAgentFinishOutput(steps) as AgentFinish;

			expect(result.returnValues.output).toBe('');
		});
	});

	describe('AgentAction passthrough', () => {
		it('should pass through AgentAction arrays unchanged', () => {
			const steps: AgentAction[] = [
				{
					tool: 'calculator',
					toolInput: { expression: '1+1' },
					log: 'Using calculator',
				},
			];

			const result = handleAgentFinishOutput(steps);

			expect(result).toEqual(steps);
		});
	});
});
