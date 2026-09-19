import { describe, expect, it } from 'vitest';

import { NodeRegistry } from '../catalog/node-registry';
import { compileWorkflow } from '../compiler/compile';
import { field } from '../expressions/expression';
import { workflowIrSchema } from '../ir/schema';
import {
	describePathCoverage,
	enumerateExecutionPaths,
	pathCoverage,
} from '../paths/enumerate-paths';

const registry = new NodeRegistry();

const ir = workflowIrSchema.parse({
	id: 'wf',
	name: 'Router',
	triggers: [
		{
			id: 'webhook',
			kind: 'trigger',
			triggerKind: 'webhook',
			label: 'Webhook',
			operation: { operationId: 'webhook.trigger' },
			params: { method: 'POST', path: 'x' },
		},
	],
	steps: [
		{
			id: 'validate',
			kind: 'validate',
			label: 'Validate',
			rules: [{ field: ['body', 'email'], rule: 'required' }],
			onInvalid: 'respond_400',
		},
		{
			id: 'upsert',
			kind: 'action',
			label: 'Upsert',
			operation: { operationId: 'hubspot.contact.upsert' },
			params: { email: 'x' },
		},
		{
			id: 'is-new',
			kind: 'branch',
			label: 'Is New?',
			condition: { op: 'is_true', left: field('upsert', 'isNew') },
			then: [
				{
					id: 'notify',
					kind: 'action',
					label: 'Notify',
					operation: { operationId: 'slack.message.post' },
					params: { channel: '#a', text: 'x' },
				},
			],
			else: [],
		},
		{ id: 'respond', kind: 'respond', label: 'Respond', status: 200, body: {} },
	],
});

describe('enumerateExecutionPaths', () => {
	const { workflow } = compileWorkflow(ir, registry);
	const paths = enumerateExecutionPaths(workflow);

	it('enumerates one path per combination of branch decisions', () => {
		expect(paths.map((path) => path.id).sort()).toEqual(
			[
				'Webhook > Validate=false',
				'Webhook > Validate=true > Is New?=false',
				'Webhook > Validate=true > Is New?=true',
			].sort(),
		);
		const newPath = paths.find((path) => path.id.endsWith('Is New?=true'));
		expect(newPath?.nodes).toEqual([
			'Webhook',
			'Validate',
			'Upsert',
			'Is New?',
			'Notify',
			'Respond',
		]);
		expect(paths.find((path) => path.id.endsWith('Validate=false'))?.end).toBe('Respond 400');
	});

	it('measures coverage from executed node sets', () => {
		const coverage = pathCoverage(paths, [
			new Set(['Webhook', 'Validate', 'Upsert', 'Is New?', 'Respond']),
		]);
		expect(coverage.covered).toBe(1);
		expect(coverage.uncovered.map((entry) => entry.firstMissingNode).sort()).toEqual([
			'Notify',
			'Respond 400',
		]);
		expect(describePathCoverage(coverage)).toContain('1/3 execution paths exercised');
	});

	it('follows loops once', () => {
		const loop = workflowIrSchema.parse({
			id: 'loop',
			name: 'Loop',
			triggers: [
				{
					id: 'manual',
					kind: 'trigger',
					triggerKind: 'manual',
					operation: { operationId: 'manual.trigger' },
					params: {},
				},
			],
			steps: [
				{
					id: 'map',
					kind: 'map',
					batchSize: 2,
					steps: [
						{
							id: 'call',
							kind: 'action',
							operation: { operationId: 'http.request' },
							params: { url: 'https://x' },
						},
					],
				},
				{ id: 'after', kind: 'noop' },
			],
		});
		const loopPaths = enumerateExecutionPaths(compileWorkflow(loop, registry).workflow);
		expect(loopPaths.map((path) => path.id).sort()).toEqual(
			['Manual trigger > Loop Over Items=done', 'Manual trigger > Loop Over Items=loop'].sort(),
		);
	});
});
