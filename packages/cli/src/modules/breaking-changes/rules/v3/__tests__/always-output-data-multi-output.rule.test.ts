import type { INode, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes, UnexpectedError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { NodeTypes } from '@/node-types';

import { createNode, createWorkflow } from '../../../__tests__/test-helpers';
import { AlwaysOutputDataMultiOutputRule } from '../always-output-data-multi-output.rule';

const NODE_TYPE_OUTPUTS: Record<string, INodeTypeDescription['outputs']> = {
	'n8n-nodes-base.httpRequest': [NodeConnectionTypes.Main],
	'n8n-nodes-base.filter': [NodeConnectionTypes.Main],
	'n8n-nodes-base.if': [NodeConnectionTypes.Main, NodeConnectionTypes.Main],
	'n8n-nodes-base.compareDatasets': [
		{ type: NodeConnectionTypes.Main, displayName: 'In A only' },
		{ type: NodeConnectionTypes.Main, displayName: 'Same' },
		{ type: NodeConnectionTypes.Main, displayName: 'Different' },
		{ type: NodeConnectionTypes.Main, displayName: 'In B only' },
	],
	'n8n-nodes-base.switch': '={{ [] }}',
	'@n8n/n8n-nodes-langchain.memoryBufferWindow': [NodeConnectionTypes.AiMemory],
	'n8n-nodes-awesome-package.router': [NodeConnectionTypes.Main, NodeConnectionTypes.Main],
};

const nodeTypes = mock<NodeTypes>();
nodeTypes.getByNameAndVersion.mockImplementation((type) => {
	const outputs = NODE_TYPE_OUTPUTS[type];
	if (outputs === undefined) throw new UnexpectedError('Unknown node type');
	return { description: { outputs } } as INodeType;
});

const withAlwaysOutputData = (name: string, type: string): INode => ({
	...createNode(name, type),
	alwaysOutputData: true,
});

describe('AlwaysOutputDataMultiOutputRule', () => {
	const rule = new AlwaysOutputDataMultiOutputRule(nodeTypes);

	describe('detectWorkflow()', () => {
		it('should not flag single-output nodes even with Always Output Data on', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				withAlwaysOutputData('Filter', 'n8n-nodes-base.filter'),
				withAlwaysOutputData('HTTP', 'n8n-nodes-base.httpRequest'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(false);
			expect(result.issues).toHaveLength(0);
		});

		it('should not flag a multi-output node with Always Output Data off', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('If', 'n8n-nodes-base.if'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(false);
			expect(result.issues).toHaveLength(0);
		});

		it.each([
			['static outputs', 'n8n-nodes-base.if'],
			['static output configurations', 'n8n-nodes-base.compareDatasets'],
			['dynamic outputs', 'n8n-nodes-base.switch'],
		])('should flag a multi-output node (%s) with Always Output Data on', async (_, type) => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				withAlwaysOutputData('Node', type),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].level).toBe('warning');
			expect(result.issues[0].nodeName).toBe('Node');
		});

		it('should flag a multi-output community node with Always Output Data on', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				withAlwaysOutputData('Router', 'n8n-nodes-awesome-package.router'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].nodeName).toBe('Router');
		});

		it('should flag a single-output node with an error output and Always Output Data on', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				{
					...withAlwaysOutputData('HTTP', 'n8n-nodes-base.httpRequest'),
					onError: 'continueErrorOutput',
				},
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].nodeName).toBe('HTTP');
		});

		it('should not flag nodes without main outputs', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				withAlwaysOutputData('Memory', '@n8n/n8n-nodes-langchain.memoryBufferWindow'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(false);
			expect(result.issues).toHaveLength(0);
		});

		it('should not flag nodes whose type is not installed', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				withAlwaysOutputData('Uninstalled', 'n8n-nodes-uninstalled-package.gone'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(false);
			expect(result.issues).toHaveLength(0);
		});

		it('should flag only the multi-output nodes that have the setting on', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				withAlwaysOutputData('IfOn', 'n8n-nodes-base.if'),
				createNode('IfOff', 'n8n-nodes-base.if'),
				withAlwaysOutputData('SwitchOn', 'n8n-nodes-base.switch'),
				withAlwaysOutputData('FilterOn', 'n8n-nodes-base.filter'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(2);
			expect(result.issues.map((issue) => issue.nodeName).sort()).toEqual(['IfOn', 'SwitchOn']);
		});
	});

	describe('getRecommendations()', () => {
		it('should recommend reviewing nodes that use Always Output Data', async () => {
			const recommendations = await rule.getRecommendations([]);

			expect(recommendations).toHaveLength(1);
			expect(recommendations[0].action).toContain('Always Output Data');
		});
	});
});
