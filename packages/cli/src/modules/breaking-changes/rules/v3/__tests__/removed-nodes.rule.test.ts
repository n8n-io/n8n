import { createNode, createWorkflow } from '../../../__tests__/test-helpers';
import { BreakingChangeCategory } from '../../../types';
import { RemovedNodesV3Rule } from '../removed-nodes.rule';

const removedNodeTypes = [
	'@n8n/n8n-nodes-langchain.documentGithubLoader',
	'@n8n/n8n-nodes-langchain.memoryMotorhead',
	'n8n-nodes-base.orbit',
	'@n8n/n8n-nodes-langchain.memoryZep',
	'@n8n/n8n-nodes-langchain.vectorStoreZep',
	'@n8n/n8n-nodes-langchain.vectorStoreZepInsert',
	'@n8n/n8n-nodes-langchain.vectorStoreZepLoad',
];

describe('RemovedNodesV3Rule', () => {
	let rule: RemovedNodesV3Rule;

	beforeEach(() => {
		rule = new RemovedNodesV3Rule();
	});

	it('returns the correct metadata and recommendation', async () => {
		expect(rule.getMetadata()).toMatchObject({
			version: 'v3',
			title: 'Removed nodes',
			description: 'Several nodes have been removed and will no longer work',
			category: BreakingChangeCategory.workflow,
			severity: 'low',
		});
		await expect(rule.getRecommendations([])).resolves.toEqual([
			{
				action: 'Update affected workflows',
				description: 'Replace removed nodes with their updated versions or alternatives',
			},
		]);
	});

	it('returns no issues when no removed nodes are found', async () => {
		const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
			createNode('Not removed', 'n8n-nodes-base.notRemoved'),
		]);

		await expect(rule.detectWorkflow(workflow, nodesGroupedByType)).resolves.toEqual({
			isAffected: false,
			issues: [],
		});
	});

	it.each(removedNodeTypes)('detects removed node type %s', async (nodeType) => {
		const nodeName = 'Removed node';
		const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
			createNode(nodeName, nodeType),
		]);

		const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

		expect(result).toMatchObject({
			isAffected: true,
			issues: [
				{
					title: `Node '${nodeType}' with name '${nodeName}' has been removed`,
					description: `The node type '${nodeType}' is no longer available. Please replace it with an alternative.`,
					level: 'error',
				},
			],
		});
	});

	it('detects multiple removed nodes in a workflow', async () => {
		const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
			createNode('Zep', '@n8n/n8n-nodes-langchain.memoryZep'),
			createNode('Orbit', 'n8n-nodes-base.orbit'),
			createNode('HTTP Request', 'n8n-nodes-base.httpRequest'),
		]);

		const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

		expect(result.isAffected).toBe(true);
		expect(result.issues).toHaveLength(2);
	});
});
