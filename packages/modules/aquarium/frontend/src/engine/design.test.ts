import type { WorkflowDesign } from '../aquarium.types';
import {
	analyzeWorkflow,
	hasErrorWorkflowSetting,
	MAINTAINABILITY_RULES,
	maintainabilityOf,
} from './design';

const node = (type: string, parameters: unknown = {}, disabled = false) => ({
	type: `n8n-nodes-base.${type}`,
	parameters,
	disabled,
});

const plain: WorkflowDesign = {
	nodeCount: 5,
	codeNodeCount: 0,
	branchNodeCount: 0,
	disabledNodeCount: 0,
	duplicateNodeCount: 0,
	subWorkflowCallCount: 0,
	waitNodeCount: 0,
	hasErrorWorkflow: false,
};

describe('analyzeWorkflow', () => {
	it('counts the build of a workflow', () => {
		const design = analyzeWorkflow([
			node('webhook', { path: 'a' }),
			node('code', { jsCode: 'return items;' }),
			node('code', { jsCode: 'return items;' }),
			node('if', { conditions: {} }),
			node('switch', { rules: 1 }),
			node('merge', { mode: 'append' }),
			node('set', { values: 1 }, true),
			node('executeWorkflow', { workflowId: 'x' }),
			node('wait', { amount: 1 }),
			node('slack', { operation: 'sendAndWait' }),
			node('stickyNote', { content: 'note' }),
		]);

		expect(design).toEqual({
			nodeCount: 10,
			codeNodeCount: 2,
			branchNodeCount: 3,
			disabledNodeCount: 1,
			duplicateNodeCount: 1,
			subWorkflowCallCount: 1,
			waitNodeCount: 2,
			hasErrorWorkflow: false,
		});
	});

	it('does not count nodes without parameters as copies', () => {
		const design = analyzeWorkflow([node('noOp'), node('noOp'), node('noOp', {})]);

		expect(design.duplicateNodeCount).toBe(0);
	});

	it('reads the error workflow from the settings', () => {
		expect(analyzeWorkflow([], { errorWorkflow: 'abc' }).hasErrorWorkflow).toBe(true);
	});
});

describe('hasErrorWorkflowSetting', () => {
	it.each([
		[{ errorWorkflow: 'abc' }, true],
		[{ errorWorkflow: 'DEFAULT' }, false],
		[{ errorWorkflow: '' }, false],
		[{}, false],
		[undefined, false],
	])('reads %j as %s', (settings, expected) => {
		expect(hasErrorWorkflowSetting(settings)).toBe(expected);
	});
});

describe('maintainabilityOf', () => {
	it('gives a small, plain workflow full marks', () => {
		expect(maintainabilityOf(plain)).toEqual({ score: 100, factors: [] });
	});

	it('takes points off for each factor, biggest first', () => {
		const report = maintainabilityOf({
			...plain,
			nodeCount: 30,
			codeNodeCount: 3,
			duplicateNodeCount: 2,
			disabledNodeCount: 1,
			branchNodeCount: 5,
		});

		// Ties keep the order of the rules.
		expect(report.factors).toEqual([
			{ id: 'size', penalty: 10, count: 30 },
			{ id: 'duplicates', penalty: 10, count: 2 },
			{ id: 'code', penalty: 8, count: 3 },
			{ id: 'branching', penalty: 4, count: 5 },
			{ id: 'disabled', penalty: 3, count: 1 },
		]);
		expect(report.score).toBe(100 - 35);
	});

	it('does not count size when the workflow calls sub-workflows', () => {
		const report = maintainabilityOf({ ...plain, nodeCount: 60, subWorkflowCallCount: 2 });

		expect(report.score).toBe(100);
	});

	it('caps each factor and never goes below 0', () => {
		const report = maintainabilityOf({
			...plain,
			nodeCount: 500,
			codeNodeCount: 50,
			duplicateNodeCount: 50,
			disabledNodeCount: 50,
			branchNodeCount: 50,
		});

		for (const factor of report.factors) {
			expect(factor.penalty).toBe(MAINTAINABILITY_RULES[factor.id].max);
		}
		expect(report.score).toBe(0);
	});
});
