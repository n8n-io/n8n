import { createNode, createWorkflow } from '../../../__tests__/test-helpers';
import { removedNodeRules } from '../removed-nodes.rule';

describe('removed nodes rules', () => {
	it.each(removedNodeRules)(
		'detects $removedNodeType',
		async ({ rule: ruleClass, removedNodeType }) => {
			const rule = new ruleClass();
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Removed node', removedNodeType),
				createNode('HTTP Request', 'n8n-nodes-base.httpRequest'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result).toMatchObject({
				isAffected: true,
				issues: [{ nodeName: 'Removed node', level: 'error' }],
			});
		},
	);

	it.each(removedNodeRules)(
		'does not flag other node types for $removedNodeType',
		async ({ rule: ruleClass }) => {
			const rule = new ruleClass();
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('HTTP Request', 'n8n-nodes-base.httpRequest'),
			]);

			await expect(rule.detectWorkflow(workflow, nodesGroupedByType)).resolves.toEqual({
				isAffected: false,
				issues: [],
			});
		},
	);
});
