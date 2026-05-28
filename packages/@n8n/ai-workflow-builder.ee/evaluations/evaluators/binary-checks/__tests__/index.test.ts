import type { INodeTypeDescription } from 'n8n-workflow';

import { DETERMINISTIC_CHECKS } from '../checks';
import { createBinaryChecksEvaluator } from '../index';

const mockNodeTypes: INodeTypeDescription[] = [];

describe('createBinaryChecksEvaluator', () => {
	it('creates evaluator with correct name', () => {
		const evaluator = createBinaryChecksEvaluator({ nodeTypes: mockNodeTypes });
		expect(evaluator.name).toBe('binary-checks');
	});

	it('runs deterministic checks without LLM', async () => {
		const evaluator = createBinaryChecksEvaluator({ nodeTypes: mockNodeTypes });
		const workflow = { name: 'test', nodes: [], connections: {} };
		const feedback = await evaluator.evaluate(workflow, { prompt: 'test' });
		expect(feedback.length).toBe(DETERMINISTIC_CHECKS.length);
		expect(feedback.every((f) => f.evaluator === 'binary-checks')).toBe(true);
		expect(feedback.every((f) => f.kind === 'metric')).toBe(true);
		expect(feedback.every((f) => f.score === 0 || f.score === 1)).toBe(true);
	});

	it('filters checks with --checks option', async () => {
		const evaluator = createBinaryChecksEvaluator({
			nodeTypes: mockNodeTypes,
			checks: ['has_nodes', 'has_trigger'],
		});
		const workflow = { name: 'test', nodes: [], connections: {} };
		const feedback = await evaluator.evaluate(workflow, { prompt: 'test' });
		expect(feedback.length).toBe(2);
		expect(feedback.map((f) => f.metric).sort()).toEqual(['has_nodes', 'has_trigger']);
	});

	it('throws when all check names in filter are invalid', () => {
		expect(() =>
			createBinaryChecksEvaluator({
				nodeTypes: mockNodeTypes,
				checks: ['nonexistent_check'],
			}),
		).toThrow('No valid checks after filtering');
	});

	it('warns but continues when some check names are unrecognized', async () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
		const evaluator = createBinaryChecksEvaluator({
			nodeTypes: mockNodeTypes,
			checks: ['has_nodes', 'nonexistent'],
		});
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('nonexistent'));
		warnSpy.mockRestore();

		const workflow = { name: 'test', nodes: [], connections: {} };
		const feedback = await evaluator.evaluate(workflow, { prompt: 'test' });
		expect(feedback.length).toBe(1);
		expect(feedback[0].metric).toBe('has_nodes');
	});
});
