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
			expect(recommendations).toEqual([
				{
					action: 'Replace with Extract From File',
					description: expect.stringMatching(
						/Binary to JSON with Set All Data on, replace this node with Extract From File and select Extract From JSON\..*not at the root of the item/,
					),
				},
				{
					action: 'Replace with Extract From File',
					description: expect.stringMatching(
						/Binary to JSON with Set All Data off, replace this node with Extract From File\. Select Move File to Base64 String if Keep As Base64 is on, Extract From JSON if JSON Parse is on, or else Extract From Text File\..*set the Keep Source option to JSON/,
					),
				},
				{
					action: 'Replace with Convert to File',
					description: expect.stringMatching(
						/JSON to Binary with Convert All Data on, replace this node with Convert to File, select Convert to JSON, and set Mode to Each Item to Separate File\./,
					),
				},
				{
					action: 'Replace with Convert to File',
					description: expect.stringMatching(
						/JSON to Binary with Convert All Data off, replace this node with Convert to File\. Select Move Base64 String to File if Data Is Base64 is on, or else Convert to Text File\..*without the JSON quotes.*add a Merge node/,
					),
				},
				{
					action: 'Check items without the input field',
					description: expect.stringContaining(
						'the new node fails when the input field is missing, but the old node skipped the item',
					),
				},
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
