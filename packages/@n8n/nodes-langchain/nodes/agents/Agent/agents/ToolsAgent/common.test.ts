import type { AgentFinish } from 'langchain/agents';

import { handleAgentFinishOutput } from './common';

describe('handleAgentFinishOutput', () => {
	it('handles multi-output with only text blocks', () => {
		const steps = {
			returnValues: {
				output: [
					{ index: 0, type: 'text', text: 'First output' },
					{ index: 1, type: 'text', text: 'Second output' },
				],
			},
			log: '',
		} as AgentFinish;

		const result = handleAgentFinishOutput(steps) as AgentFinish;
		expect(result.returnValues.output).toBe('First output\nSecond output');
	});

	it('filters out thinking blocks and returns only text blocks', () => {
		const steps = {
			returnValues: {
				output: [
					{ index: 0, type: 'thinking', thinking: 'Internal reasoning...' },
					{ index: 1, type: 'text', text: 'User-facing output' },
				],
			},
			log: '',
		} as AgentFinish;

		const result = handleAgentFinishOutput(steps) as AgentFinish;
		expect(result.returnValues.output).toBe('User-facing output');
	});

	it('returns thinking content when no text blocks exist', () => {
		const steps = {
			returnValues: {
				output: [
					{ index: 0, type: 'thinking', thinking: 'Only thinking content' },
					{ index: 1, type: 'thinking', thinking: 'More thinking' },
				],
			},
			log: '',
		} as AgentFinish;

		const result = handleAgentFinishOutput(steps) as AgentFinish;
		expect(result.returnValues.output).toBe('Only thinking content\nMore thinking');
	});

	it('returns empty string when no text or thinking blocks exist', () => {
		const steps = {
			returnValues: {
				output: [{ index: 0, type: 'unknown' }],
			},
			log: '',
		} as AgentFinish;

		const result = handleAgentFinishOutput(steps) as AgentFinish;
		expect(result.returnValues.output).toBe('');
	});

	it('returns original steps when not multi-output', () => {
		const steps = {
			returnValues: {
				output: 'Simple string output',
			},
			log: '',
		} as AgentFinish;

		const result = handleAgentFinishOutput(steps) as AgentFinish;
		expect(result.returnValues.output).toBe('Simple string output');
	});
});
