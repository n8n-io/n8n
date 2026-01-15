import type { ToolMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { Command } from '@langchain/langgraph';

import { createGetDocumentationTool, DocumentationType } from '@/tools/get-documentation.tool';
import { WorkflowTechnique } from '@/types/categorization';
import { RecommendationCategory } from '@/types/node-recommendations';

/**
 * Helper to extract the message content from a Command response
 */
function getMessageContent(command: Command): string {
	const update = command.update as { messages: ToolMessage[] };
	return update.messages[0].content as string;
}

describe('get_documentation tool', () => {
	const mockConfig: RunnableConfig = {
		callbacks: [],
		toolCall: { id: 'test-tool-call-id', name: 'get_documentation' },
	} as RunnableConfig;

	describe('createGetDocumentationTool', () => {
		it('should create a tool with correct name and metadata', () => {
			const result = createGetDocumentationTool();

			expect(result.toolName).toBe('get_documentation');
			expect(result.displayTitle).toBe('Getting documentation');
			expect(result.tool.name).toBe('get_documentation');
		});

		it('should have a description that explains both documentation types', () => {
			const result = createGetDocumentationTool();

			expect(result.tool.description).toContain('best_practices');
			expect(result.tool.description).toContain('node_recommendations');
		});
	});

	describe('best_practices requests', () => {
		it('should return best practices for a single technique', async () => {
			const { tool } = createGetDocumentationTool();

			const command = await tool.invoke(
				{
					requests: [
						{
							type: DocumentationType.BEST_PRACTICES,
							techniques: [WorkflowTechnique.CHATBOT],
						},
					],
				},
				mockConfig,
			);
			const result = getMessageContent(command);

			expect(result).toContain('<best_practices>');
			expect(result).toContain('</best_practices>');
		});

		it('should return best practices for multiple techniques', async () => {
			const { tool } = createGetDocumentationTool();

			const command = await tool.invoke(
				{
					requests: [
						{
							type: DocumentationType.BEST_PRACTICES,
							techniques: [WorkflowTechnique.CHATBOT, WorkflowTechnique.TRIAGE],
						},
					],
				},
				mockConfig,
			);
			const result = getMessageContent(command);

			expect(result).toContain('<best_practices>');
		});
	});

	describe('node_recommendations requests', () => {
		it('should return recommendations for text_manipulation category', async () => {
			const { tool } = createGetDocumentationTool();

			const command = await tool.invoke(
				{
					requests: [
						{
							type: DocumentationType.NODE_RECOMMENDATIONS,
							categories: [RecommendationCategory.TEXT_MANIPULATION],
						},
					],
				},
				mockConfig,
			);
			const result = getMessageContent(command);

			expect(result).toContain('<node_recommendations>');
			expect(result).toContain('<text_manipulation>');
			expect(result).toContain('@n8n/n8n-nodes-langchain.agent');
			expect(result).toContain('</node_recommendations>');
		});

		it('should return recommendations for image_generation category', async () => {
			const { tool } = createGetDocumentationTool();

			const command = await tool.invoke(
				{
					requests: [
						{
							type: DocumentationType.NODE_RECOMMENDATIONS,
							categories: [RecommendationCategory.IMAGE_GENERATION],
						},
					],
				},
				mockConfig,
			);
			const result = getMessageContent(command);

			expect(result).toContain('<node_recommendations>');
			expect(result).toContain('<image_generation>');
			expect(result).toContain('@n8n/n8n-nodes-langchain.openAi');
		});

		it('should return recommendations for multiple categories', async () => {
			const { tool } = createGetDocumentationTool();

			const command = await tool.invoke(
				{
					requests: [
						{
							type: DocumentationType.NODE_RECOMMENDATIONS,
							categories: [
								RecommendationCategory.TEXT_MANIPULATION,
								RecommendationCategory.AUDIO_GENERATION,
							],
						},
					],
				},
				mockConfig,
			);
			const result = getMessageContent(command);

			expect(result).toContain('<node_recommendations>');
			expect(result).toContain('<text_manipulation>');
			expect(result).toContain('<audio_generation>');
		});

		it('should include connected nodes in recommendations', async () => {
			const { tool } = createGetDocumentationTool();

			const command = await tool.invoke(
				{
					requests: [
						{
							type: DocumentationType.NODE_RECOMMENDATIONS,
							categories: [RecommendationCategory.TEXT_MANIPULATION],
						},
					],
				},
				mockConfig,
			);
			const result = getMessageContent(command);

			expect(result).toContain('<connected_nodes>');
			expect(result).toContain('lmChatOpenAi');
			expect(result).toContain('ai_languageModel');
		});
	});

	describe('multiple requests', () => {
		it('should handle both best practices and node recommendations in one call', async () => {
			const { tool } = createGetDocumentationTool();

			const command = await tool.invoke(
				{
					requests: [
						{
							type: DocumentationType.BEST_PRACTICES,
							techniques: [WorkflowTechnique.CHATBOT],
						},
						{
							type: DocumentationType.NODE_RECOMMENDATIONS,
							categories: [RecommendationCategory.TEXT_MANIPULATION],
						},
					],
				},
				mockConfig,
			);
			const result = getMessageContent(command);

			expect(result).toContain('<best_practices>');
			expect(result).toContain('<node_recommendations>');
		});
	});

	describe('empty results', () => {
		it('should return a message when no documentation is available for requested techniques', async () => {
			const { tool } = createGetDocumentationTool();

			const command = await tool.invoke(
				{
					requests: [
						{
							type: DocumentationType.BEST_PRACTICES,
							// SCHEDULING has undefined documentation
							techniques: [WorkflowTechnique.SCHEDULING],
						},
					],
				},
				mockConfig,
			);
			const result = getMessageContent(command);

			expect(result).toBe('No documentation available for the requested items.');
			expect(result).not.toContain('<best_practices>');
		});
	});
});
