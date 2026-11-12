import { createNode, createWorkflow } from '../../../__tests__/test-helpers';
import {
	ConvertToFromBinaryDataRemovedRule,
	directNodeReplacementRules,
} from '../removed-nodes-with-replacements.rule';

describe('removed nodes with replacements rules', () => {
	describe('ConvertToFromBinaryDataRemovedRule', () => {
		it('lets the Assistant fix the node', () => {
			expect(new ConvertToFromBinaryDataRemovedRule().getMetadata().assistant).toBe('fix');
		});

		it('names a replacement operation for each mode and option', async () => {
			const recommendations = await new ConvertToFromBinaryDataRemovedRule().getRecommendations([]);
			const descriptions = recommendations.map(({ description }) => description);

			expect(descriptions).toEqual([
				expect.stringMatching(/Binary to JSON with Set All Data on.*Extract From JSON\./),
				expect.stringMatching(
					/Binary to JSON with Set All Data off.*Move File to Base64 String if Keep As Base64 is on, Extract From JSON if JSON Parse is on, or else Extract From Text File/,
				),
				expect.stringMatching(
					/JSON to Binary with Convert All Data on.*Convert to JSON.*Each Item to Separate File/,
				),
				expect.stringMatching(
					/JSON to Binary with Convert All Data off.*Move Base64 String to File if Data Is Base64 is on, or else Convert to Text File/,
				),
				expect.stringContaining('the old node skipped the item'),
			]);
		});
	});

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
