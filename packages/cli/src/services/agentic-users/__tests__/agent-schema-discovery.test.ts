import type { INode } from 'n8n-workflow';

import { discoverWorkflowSkill, extractTriggerInputSchema } from '../agent-schema-discovery';

const EXECUTE_WORKFLOW_TRIGGER_TYPE = 'n8n-nodes-base.executeWorkflowTrigger';

function makeTriggerNode(overrides: Partial<INode> = {}): INode {
	return {
		id: 'node-1',
		name: 'When Executed by Another Workflow',
		type: EXECUTE_WORKFLOW_TRIGGER_TYPE,
		typeVersion: 1.1,
		position: [0, 0],
		parameters: {},
		...overrides,
	};
}

describe('extractTriggerInputSchema', () => {
	it('should return empty array for passthrough mode', () => {
		const node = makeTriggerNode({
			parameters: { inputSource: 'passthrough' },
		});
		expect(extractTriggerInputSchema(node)).toEqual([]);
	});

	it('should return empty array when no parameters set (v1.1 defaults to workflowInputs but no fields)', () => {
		const node = makeTriggerNode({ parameters: {} });
		expect(extractTriggerInputSchema(node)).toEqual([]);
	});

	it('should return empty array for v1 node with no parameters (passthrough default)', () => {
		const node = makeTriggerNode({ typeVersion: 1, parameters: {} });
		expect(extractTriggerInputSchema(node)).toEqual([]);
	});

	it('should extract fields when inputSource is omitted (v1.1 default is workflowInputs)', () => {
		// n8n omits default parameter values from storage — v1.1 defaults to 'workflowInputs'
		const node = makeTriggerNode({
			parameters: {
				workflowInputs: {
					values: [{ name: 'projectId', type: 'string' }],
				},
			},
		});

		expect(extractTriggerInputSchema(node)).toEqual([{ name: 'projectId', type: 'string' }]);
	});

	it('should extract fields from workflowInputs mode', () => {
		const node = makeTriggerNode({
			parameters: {
				inputSource: 'workflowInputs',
				workflowInputs: {
					values: [
						{ name: 'projectId', type: 'string' },
						{ name: 'limit', type: 'number' },
					],
				},
			},
		});

		expect(extractTriggerInputSchema(node)).toEqual([
			{ name: 'projectId', type: 'string' },
			{ name: 'limit', type: 'number' },
		]);
	});

	it('should skip fields without names', () => {
		const node = makeTriggerNode({
			parameters: {
				inputSource: 'workflowInputs',
				workflowInputs: {
					values: [
						{ name: '', type: 'string' },
						{ name: 'valid', type: 'number' },
					],
				},
			},
		});

		expect(extractTriggerInputSchema(node)).toEqual([{ name: 'valid', type: 'number' }]);
	});

	it('should default type to "string" when missing (matches node definition default)', () => {
		const node = makeTriggerNode({
			parameters: {
				inputSource: 'workflowInputs',
				workflowInputs: {
					values: [{ name: 'field1' }],
				},
			},
		});

		expect(extractTriggerInputSchema(node)).toEqual([{ name: 'field1', type: 'string' }]);
	});

	it('should extract fields from jsonExample mode', () => {
		const node = makeTriggerNode({
			parameters: {
				inputSource: 'jsonExample',
				jsonExample: JSON.stringify({
					name: 'test',
					count: 42,
					active: true,
					tags: ['a', 'b'],
					config: { key: 'val' },
					nullable: null,
				}),
			},
		});

		const result = extractTriggerInputSchema(node);
		expect(result).toEqual([
			{ name: 'name', type: 'string' },
			{ name: 'count', type: 'number' },
			{ name: 'active', type: 'boolean' },
			{ name: 'tags', type: 'array' },
			{ name: 'config', type: 'object' },
			{ name: 'nullable', type: 'any' },
		]);
	});

	it('should return empty array for invalid JSON example', () => {
		const node = makeTriggerNode({
			parameters: {
				inputSource: 'jsonExample',
				jsonExample: 'not valid json{{{',
			},
		});

		expect(extractTriggerInputSchema(node)).toEqual([]);
	});

	it('should return empty array for empty JSON example', () => {
		const node = makeTriggerNode({
			parameters: {
				inputSource: 'jsonExample',
				jsonExample: '',
			},
		});

		expect(extractTriggerInputSchema(node)).toEqual([]);
	});
});

describe('discoverWorkflowSkill', () => {
	it('should return null for workflow without execute workflow trigger', () => {
		const nodes: INode[] = [
			{
				id: 'n1',
				name: 'Manual Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
		];

		expect(discoverWorkflowSkill('wf-1', 'My Workflow', nodes)).toBeNull();
	});

	it('should return null for disabled execute workflow trigger', () => {
		const nodes: INode[] = [
			makeTriggerNode({
				disabled: true,
				parameters: {
					inputSource: 'workflowInputs',
					workflowInputs: { values: [{ name: 'field', type: 'string' }] },
				},
			}),
		];

		expect(discoverWorkflowSkill('wf-1', 'My Workflow', nodes)).toBeNull();
	});

	it('should return skill with empty inputs for passthrough trigger', () => {
		const nodes: INode[] = [makeTriggerNode({ parameters: { inputSource: 'passthrough' } })];

		expect(discoverWorkflowSkill('wf-1', 'My Workflow', nodes)).toEqual({
			workflowId: 'wf-1',
			workflowName: 'My Workflow',
			inputs: [],
		});
	});

	it('should return skill with inputs for typed trigger', () => {
		const nodes: INode[] = [
			makeTriggerNode({
				parameters: {
					inputSource: 'workflowInputs',
					workflowInputs: {
						values: [
							{ name: 'channel', type: 'string' },
							{ name: 'message', type: 'string' },
						],
					},
				},
			}),
		];

		const result = discoverWorkflowSkill('wf-1', 'Send Slack', nodes);
		expect(result).toEqual({
			workflowId: 'wf-1',
			workflowName: 'Send Slack',
			inputs: [
				{ name: 'channel', type: 'string' },
				{ name: 'message', type: 'string' },
			],
		});
	});

	it('should return skill when inputSource is omitted (v1.1 default)', () => {
		// Real-world case: n8n omits default parameter values from storage
		const nodes: INode[] = [
			makeTriggerNode({
				parameters: {
					workflowInputs: {
						values: [{ name: 'test', type: 'string' }],
					},
				},
			}),
		];

		const result = discoverWorkflowSkill('wf-1', 'Sub Workflow', nodes);
		expect(result).toEqual({
			workflowId: 'wf-1',
			workflowName: 'Sub Workflow',
			inputs: [{ name: 'test', type: 'string' }],
		});
	});
});
