import { describe, expect, it } from 'vitest';

import { expr, field, input } from '../expressions/expression';
import { validateBundleIr, validateWorkflowIr } from '../ir/validate-ir';
import type { WorkflowIR } from '../ir/schema';

function baseWorkflow(overrides: Partial<WorkflowIR> = {}): WorkflowIR {
	return {
		id: 'wf',
		name: 'Test',
		triggers: [
			{
				id: 'trigger',
				kind: 'trigger',
				triggerKind: 'webhook',
				operation: { operationId: 'webhook.trigger' },
				params: {},
			},
		],
		steps: [],
		errorPolicy: 'fail_workflow',
		settings: { executionOrder: 'v1' },
		patternIds: [],
		...overrides,
	};
}

describe('validateWorkflowIr', () => {
	it('accepts references to earlier steps', () => {
		const workflow = baseWorkflow({
			steps: [
				{
					id: 'a',
					kind: 'transform',
					fields: { email: expr(field('trigger', 'body', 'email')) },
					includeInput: false,
				},
				{ id: 'b', kind: 'respond', status: 200, body: { email: expr(field('a', 'email')) } },
			],
		});
		expect(validateWorkflowIr(workflow)).toEqual([]);
	});

	it('rejects duplicate ids and forward references', () => {
		const workflow = baseWorkflow({
			steps: [
				{ id: 'a', kind: 'transform', fields: { x: expr(field('b', 'y')) }, includeInput: false },
				{ id: 'a', kind: 'transform', fields: { y: expr(input('z')) }, includeInput: false },
			],
		});
		const codes = validateWorkflowIr(workflow).map((issue) => issue.code);
		expect(codes).toContain('duplicate_step_id');
		expect(codes).toContain('unknown_step_reference');
	});

	it('rejects respond steps without a webhook trigger', () => {
		const workflow = baseWorkflow({
			triggers: [
				{
					id: 't',
					kind: 'trigger',
					triggerKind: 'schedule',
					operation: { operationId: 'schedule.trigger' },
					params: {},
				},
			],
			steps: [{ id: 'r', kind: 'respond', status: 200, body: {} }],
		});
		expect(validateWorkflowIr(workflow).map((issue) => issue.code)).toEqual([
			'respond_without_webhook',
		]);
	});

	it('does not let a later step depend on one arm of a branch', () => {
		const workflow = baseWorkflow({
			steps: [
				{
					id: 'branch',
					kind: 'branch',
					condition: { op: 'exists', left: input('x') },
					then: [{ id: 'only-then', kind: 'transform', fields: { a: 1 }, includeInput: true }],
					else: [],
				},
				{
					id: 'after',
					kind: 'transform',
					fields: { b: expr(field('only-then', 'a')) },
					includeInput: true,
				},
			],
		});
		expect(validateWorkflowIr(workflow).map((issue) => issue.code)).toEqual([
			'unreachable_step_reference',
		]);
	});

	it('lets steps after a joined parallel reference every branch', () => {
		const workflow = baseWorkflow({
			steps: [
				{
					id: 'par',
					kind: 'parallel',
					join: 'all',
					branches: [
						[{ id: 'left', kind: 'transform', fields: { a: 1 }, includeInput: true }],
						[{ id: 'right', kind: 'transform', fields: { b: 2 }, includeInput: true }],
					],
				},
				{
					id: 'after',
					kind: 'transform',
					fields: { c: expr(field('right', 'b')) },
					includeInput: true,
				},
			],
		});
		expect(validateWorkflowIr(workflow)).toEqual([]);
	});
});

describe('validateBundleIr', () => {
	it('detects unknown and circular workflow calls', () => {
		const a = baseWorkflow({
			id: 'a',
			steps: [{ id: 'call', kind: 'call_workflow', workflowRef: 'b', inputs: {}, wait: true }],
		});
		const b = baseWorkflow({
			id: 'b',
			steps: [{ id: 'call', kind: 'call_workflow', workflowRef: 'a', inputs: {}, wait: true }],
		});
		const codes = validateBundleIr({
			workflows: [a, b],
			dependencies: [{ from: 'a', to: 'zzz', kind: 'call' }],
		}).map((issue) => issue.code);
		expect(codes).toContain('circular_workflow_dependency');
		expect(codes).toContain('unknown_workflow_reference');
	});
});
