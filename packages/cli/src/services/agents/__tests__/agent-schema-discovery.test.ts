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

	it('should return empty array when no parameters set', () => {
		const node = makeTriggerNode({ parameters: {} });
		expect(extractTriggerInputSchema(node)).toEqual([]);
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

	it('should default type to "any" when missing', () => {
		const node = makeTriggerNode({
			parameters: {
				inputSource: 'workflowInputs',
				workflowInputs: {
					values: [{ name: 'field1' }],
				},
			},
		});

		expect(extractTriggerInputSchema(node)).toEqual([{ name: 'field1', type: 'any' }]);
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

	it('should return null for passthrough trigger (no typed inputs)', () => {
		const nodes: INode[] = [makeTriggerNode({ parameters: { inputSource: 'passthrough' } })];

		expect(discoverWorkflowSkill('wf-1', 'My Workflow', nodes)).toBeNull();
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
});
