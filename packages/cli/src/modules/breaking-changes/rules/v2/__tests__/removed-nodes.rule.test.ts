import { createNode, createWorkflow } from '../../../__tests__/test-helpers';
import { BreakingChangeCategory } from '../../../types';
import { RemovedNodesRule } from '../removed-nodes.rule';

describe('RemovedNodesRule', () => {
	let rule: RemovedNodesRule;

	beforeEach(() => {
		jest.clearAllMocks();
		rule = new RemovedNodesRule();
	});

	describe('getMetadata()', () => {
		it('should return correct metadata', () => {
			const metadata = rule.getMetadata();

			expect(metadata).toMatchObject({
				version: 'v2',
				title: 'Removed Deprecated Nodes',
				description: 'Several deprecated nodes have been removed and will no longer work',
				category: BreakingChangeCategory.workflow,
				severity: 'low',
			});
		});
	});

	describe('getRecommendations()', () => {
		it('should return recommendations', async () => {
			const recommendations = await rule.getRecommendations([]);

			expect(recommendations).toHaveLength(1);
			expect(recommendations[0]).toMatchObject({
				action: 'Update affected workflows',
				description: 'Replace removed nodes with their updated versions or alternatives',
			});
		});
	});

	describe('detectWorkflow()', () => {
		it('should return no issues when no removed nodes are found', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('NotDeleted', 'n8n-nodes-base.not-deleted'),
			]);
			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result).toEqual({
				isAffected: false,
				issues: [],
			});
		});

		it.each([
			{
				nodeName: 'Spontit',
				nodeType: 'n8n-nodes-base.spontit',
			},
			{
				nodeName: 'CrowdDev',
				nodeType: 'n8n-nodes-base.crowdDev',
			},
			{
				nodeName: 'Kitemaker',
				nodeType: 'n8n-nodes-base.kitemaker',
			},
		])('should detect removed node: %s', async ({ nodeName, nodeType }) => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode(nodeName, nodeType),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].title).toBe(
				`Node '${nodeType}' with name '${nodeName}' has been removed`,
			);
			expect(result.issues[0].description).toBe(
				`The node type '${nodeType}' is no longer available. Please replace it with an alternative.`,
			);
			expect(result.issues[0].level).toBe('error');
		});

		it('should detect multiple removed nodes in the same workflow', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Spontit', 'n8n-nodes-base.spontit'),
				createNode('CrowdDev', 'n8n-nodes-base.crowdDev'),
				createNode('HTTP', 'n8n-nodes-base.httpRequest'), // Not removed
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.issues).toHaveLength(2);
			expect(result.issues).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						title: "Node 'n8n-nodes-base.spontit' with name 'Spontit' has been removed",
					}),
					expect.objectContaining({
						title: "Node 'n8n-nodes-base.crowdDev' with name 'CrowdDev' has been removed",
					}),
				]),
			);
		});
	});
});
