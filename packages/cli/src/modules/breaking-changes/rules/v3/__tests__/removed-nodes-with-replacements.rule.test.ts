import { createNode, createWorkflow } from '../../../__tests__/test-helpers';
import { directNodeReplacementRules } from '../removed-nodes-with-replacements.rule';

describe('removed nodes with replacements rules', () => {
	it.each(directNodeReplacementRules)(
		'detects $removedNodeType and provides a replacement recommendation',
		async ({ rule: ruleClass, removedNodeType }) => {
			const rule = new ruleClass();
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Removed node', removedNodeType),
			]);

			const [recommendation] = await rule.getRecommendations([]);
			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(recommendation.action).toMatch(/^Replace with /);
			expect(recommendation.description).not.toMatch(removedNodeType);
			expect(result).toMatchObject({
				isAffected: true,
				issues: [
					{
						title: expect.not.stringContaining(removedNodeType),
						description: expect.stringContaining(recommendation.description),
						level: 'error',
					},
				],
			});
		},
	);
});
