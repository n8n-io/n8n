import type { INode } from 'n8n-workflow';

import { createNode, createWorkflow } from '../../../__tests__/test-helpers';
import { AlwaysOutputDataMultiOutputRule } from '../always-output-data-multi-output.rule';

const withAlwaysOutputData = (name: string, type: string): INode => ({
	...createNode(name, type),
	alwaysOutputData: true,
});

describe('AlwaysOutputDataMultiOutputRule', () => {
	let rule: AlwaysOutputDataMultiOutputRule;

	beforeEach(() => {
		rule = new AlwaysOutputDataMultiOutputRule();
	});

	describe('detectWorkflow()', () => {
		it('should not be affected when there are no multi-output nodes', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				withAlwaysOutputData('HTTP', 'n8n-nodes-base.httpRequest'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(false);
			expect(result.issues).toHaveLength(0);
		});

		it('should not be affected when a multi-output node has Always Output Data off', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('If', 'n8n-nodes-base.if'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(false);
			expect(result.issues).toHaveLength(0);
		});

		it.each([
			['n8n-nodes-base.if'],
			['n8n-nodes-base.switch'],
			['n8n-nodes-base.compareDatasets'],
			['n8n-nodes-base.splitInBatches'],
			['n8n-nodes-base.dynamicCredentialCheck'],
			['@n8n/n8n-nodes-langchain.textClassifier'],
			['@n8n/n8n-nodes-langchain.sentimentAnalysis'],
			['@n8n/n8n-nodes-langchain.guardrails'],
		])('should detect %s with Always Output Data on', async (type) => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				withAlwaysOutputData('Node', type),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].level).toBe('warning');
			expect(result.issues[0].nodeName).toBe('Node');
		});

		it('should not flag single-output nodes even with Always Output Data on', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				withAlwaysOutputData('Filter', 'n8n-nodes-base.filter'),
				withAlwaysOutputData('HTTP', 'n8n-nodes-base.httpRequest'),
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
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(2);
			expect(result.issues.map((issue) => issue.nodeName).sort()).toEqual(['IfOn', 'SwitchOn']);
		});
	});

	describe('getRecommendations()', () => {
		it('should recommend turning off Always Output Data', async () => {
			const recommendations = await rule.getRecommendations([]);

			expect(recommendations).toHaveLength(1);
			expect(recommendations[0].action).toContain('Always Output Data');
		});
	});
});
