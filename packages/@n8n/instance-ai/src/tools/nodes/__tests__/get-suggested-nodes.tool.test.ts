import {
	createGetSuggestedNodesTool,
	getSuggestedNodesInputSchema,
} from '../get-suggested-nodes.tool';
import { categoryList, suggestedNodesData } from '../suggested-nodes-data';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface SuggestedNodesResult {
	results: Array<{
		category: string;
		description: string;
		patternHint: string;
		suggestedNodes: Array<{ name: string; note?: string }>;
	}>;
	unknownCategories: string[];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('get-suggested-nodes tool', () => {
	const tool = createGetSuggestedNodesTool();

	describe('schema validation', () => {
		it('accepts an array with 1 category', () => {
			const result = getSuggestedNodesInputSchema.safeParse({ categories: ['chatbot'] });
			expect(result.success).toBe(true);
		});

		it('accepts an array with up to 3 categories', () => {
			const result = getSuggestedNodesInputSchema.safeParse({
				categories: ['chatbot', 'scheduling', 'triage'],
			});
			expect(result.success).toBe(true);
		});

		it('rejects an empty categories array', () => {
			const result = getSuggestedNodesInputSchema.safeParse({ categories: [] });
			expect(result.success).toBe(false);
		});

		it('rejects more than 3 categories', () => {
			const result = getSuggestedNodesInputSchema.safeParse({
				categories: ['chatbot', 'scheduling', 'triage', 'notification'],
			});
			expect(result.success).toBe(false);
		});

		it('rejects missing categories field', () => {
			const result = getSuggestedNodesInputSchema.safeParse({});
			expect(result.success).toBe(false);
		});
	});

	describe('execute', () => {
		it('returns suggestions for a single known category', async () => {
			const result = (await tool.execute!(
				{ categories: ['chatbot'] },
				{} as never,
			)) as unknown as SuggestedNodesResult;

			expect(result.unknownCategories).toEqual([]);
			expect(result.results).toHaveLength(1);

			const chatbot = result.results[0];
			expect(chatbot.category).toBe('chatbot');
			expect(chatbot.description).toBe(suggestedNodesData.chatbot.description);
			expect(chatbot.patternHint).toBe(suggestedNodesData.chatbot.patternHint);
			expect(chatbot.suggestedNodes.length).toBe(suggestedNodesData.chatbot.nodes.length);
		});

		it('returns suggestions for multiple known categories', async () => {
			const result = (await tool.execute!(
				{ categories: ['scheduling', 'notification'] },
				{} as never,
			)) as unknown as SuggestedNodesResult;

			expect(result.unknownCategories).toEqual([]);
			expect(result.results).toHaveLength(2);
			expect(result.results[0].category).toBe('scheduling');
			expect(result.results[1].category).toBe('notification');
		});

		it('places unknown categories in unknownCategories array', async () => {
			const result = (await tool.execute!(
				{ categories: ['nonexistent_category'] },
				{} as never,
			)) as unknown as SuggestedNodesResult;

			expect(result.results).toEqual([]);
			expect(result.unknownCategories).toEqual(['nonexistent_category']);
		});

		it('handles a mix of known and unknown categories', async () => {
			const result = (await tool.execute!(
				{ categories: ['triage', 'unknown_cat'] },
				{} as never,
			)) as unknown as SuggestedNodesResult;

			expect(result.results).toHaveLength(1);
			expect(result.results[0].category).toBe('triage');
			expect(result.unknownCategories).toEqual(['unknown_cat']);
		});

		it('returns all unknown when every category is invalid', async () => {
			const result = (await tool.execute!(
				{ categories: ['fake1', 'fake2', 'fake3'] },
				{} as never,
			)) as unknown as SuggestedNodesResult;

			expect(result.results).toEqual([]);
			expect(result.unknownCategories).toEqual(['fake1', 'fake2', 'fake3']);
		});

		it('correctly maps node data including optional notes', async () => {
			const result = (await tool.execute!(
				{ categories: ['scheduling'] },
				{} as never,
			)) as unknown as SuggestedNodesResult;

			const scheduling = result.results[0];
			const waitNode = scheduling.suggestedNodes.find((n) => n.name === 'n8n-nodes-base.wait');
			expect(waitNode).toBeDefined();
			expect(waitNode!.note).toBe('Respect rate limits between API calls');

			const scheduleTrigger = scheduling.suggestedNodes.find(
				(n) => n.name === 'n8n-nodes-base.scheduleTrigger',
			);
			expect(scheduleTrigger).toBeDefined();
			expect(scheduleTrigger!.note).toBeUndefined();
		});

		it('covers every category in the categoryList', async () => {
			for (const cat of categoryList) {
				const result = (await tool.execute!(
					{ categories: [cat] },
					{} as never,
				)) as unknown as SuggestedNodesResult;

				expect(result.unknownCategories).toEqual([]);
				expect(result.results).toHaveLength(1);
				expect(result.results[0].category).toBe(cat);
				expect(result.results[0].suggestedNodes.length).toBeGreaterThan(0);
			}
		});
	});
});
