import { weekdayCadenceValidator } from './weekday-cadence-validator';
import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext } from '../types';

function createMockNode(
	type: string,
	name: string,
	parameters: Record<string, unknown>,
): NodeInstance<string, string, unknown> {
	return {
		type,
		name,
		version: '1',
		config: { parameters },
	} as NodeInstance<string, string, unknown>;
}

function createGraphNode(node: NodeInstance<string, string, unknown>): GraphNode {
	return { instance: node, connections: new Map() };
}

function createCtx(): PluginContext {
	return { nodes: new Map(), workflowId: 'test', workflowName: 'Test', settings: {} };
}

describe('weekdayCadenceValidator', () => {
	it('has correct id', () => {
		expect(weekdayCadenceValidator.id).toBe('core:weekday-cadence');
	});

	it('flags $now.weekday equality in IF conditions', () => {
		const node = createMockNode('n8n-nodes-base.if', 'Is Monday?', {
			conditions: {
				conditions: [
					{
						leftValue: '={{ $now.weekday === 1 }}',
						rightValue: true,
						operator: { type: 'boolean', operation: 'true', singleValue: true },
					},
				],
			},
		});
		const issues = weekdayCadenceValidator.validateNode(node, createGraphNode(node), createCtx());
		expect(issues).toContainEqual(expect.objectContaining({ code: 'WEEKDAY_DIGEST_CADENCE' }));
	});

	it('flags DateTime.now().weekday in Code', () => {
		const node = createMockNode('n8n-nodes-base.code', 'Gate Digest', {
			jsCode: 'if (DateTime.now().weekday === 5) return $input.all();\nreturn [];',
		});
		const issues = weekdayCadenceValidator.validateNode(node, createGraphNode(node), createCtx());
		expect(issues).toContainEqual(expect.objectContaining({ code: 'WEEKDAY_DIGEST_CADENCE' }));
	});

	it('allows schedule-driven expressions without weekday equality', () => {
		const node = createMockNode('n8n-nodes-base.set', 'Window', {
			assignments: {
				assignments: [{ name: 'day', value: '={{ $now.toFormat("cccc") }}', type: 'string' }],
			},
		});
		expect(weekdayCadenceValidator.validateNode(node, createGraphNode(node), createCtx())).toEqual(
			[],
		);
	});
});
