import type { ToolMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { Command } from '@langchain/langgraph';

import { createGetNodeRecommendationsTool } from '@/tools/get-node-recommendations.tool';
import { RecommendationCategory } from '@/types/recommendation-category';

/**
 * Helper to extract the message content from a Command response
 */
function getMessageContent(command: Command): string {
	const update = command.update as { messages: ToolMessage[] };
	return update.messages[0].content as string;
}

describe('get_node_recommendations tool', () => {
	const mockConfig: RunnableConfig = {
		callbacks: [],
		toolCall: { id: 'test-tool-call-id', name: 'get_node_recommendations' },
	} as RunnableConfig;

	describe('createGetNodeRecommendationsTool', () => {
		it('should create a tool with correct name and metadata', () => {
			const result = createGetNodeRecommendationsTool();

			expect(result.toolName).toBe('get_node_recommendations');
			expect(result.displayTitle).toBe('Getting node recommendations');
			expect(result.tool.name).toBe('get_node_recommendations');
		});

		it('should have a description that explains when to use the tool', () => {
			const result = createGetNodeRecommendationsTool();

			expect(result.tool.description).toContain('default node recommendations');
			expect(result.tool.description).toContain("don't specify exact nodes");
		});
	});

	describe('tool execution', () => {
		it('should return recommendations for text_manipulation category', async () => {
			const { tool } = createGetNodeRecommendationsTool();

			const command = (await tool.invoke(
				{ categories: [RecommendationCategory.TEXT_MANIPULATION] },
				mockConfig,
			)) as Command;
			const result = getMessageContent(command);

			expect(result).toContain('<node_recommendations>');
			expect(result).toContain('<category name="text_manipulation">');
			expect(result).toContain('@n8n/n8n-nodes-langchain.agent');
			expect(result).toContain('@n8n/n8n-nodes-langchain.lmChatOpenAi');
			expect(result).toContain('</node_recommendations>');
		});

		it('should return recommendations for image_generation category', async () => {
			const { tool } = createGetNodeRecommendationsTool();

			const command = (await tool.invoke(
				{ categories: [RecommendationCategory.IMAGE_GENERATION] },
				mockConfig,
			)) as Command;
			const result = getMessageContent(command);

			expect(result).toContain('<node_recommendations>');
			expect(result).toContain('<category name="image_generation">');
			expect(result).toContain('@n8n/n8n-nodes-langchain.openAi');
			expect(result).toContain('Generate an Image');
			expect(result).toContain('Analyze Image');
		});

		it('should return recommendations for video_generation category', async () => {
			const { tool } = createGetNodeRecommendationsTool();

			const command = (await tool.invoke(
				{ categories: [RecommendationCategory.VIDEO_GENERATION] },
				mockConfig,
			)) as Command;
			const result = getMessageContent(command);

			expect(result).toContain('<node_recommendations>');
			expect(result).toContain('<category name="video_generation">');
			expect(result).toContain('@n8n/n8n-nodes-langchain.openAi');
			expect(result).toContain('Generate a Video');
		});

		it('should return recommendations for audio_generation category', async () => {
			const { tool } = createGetNodeRecommendationsTool();

			const command = (await tool.invoke(
				{ categories: [RecommendationCategory.AUDIO_GENERATION] },
				mockConfig,
			)) as Command;
			const result = getMessageContent(command);

			expect(result).toContain('<node_recommendations>');
			expect(result).toContain('<category name="audio_generation">');
			expect(result).toContain('@n8n/n8n-nodes-langchain.openAi');
			expect(result).toContain('Transcribe a Recording');
			expect(result).toContain('Generate Audio');
		});

		it('should return recommendations for multiple categories', async () => {
			const { tool } = createGetNodeRecommendationsTool();

			const command = (await tool.invoke(
				{
					categories: [
						RecommendationCategory.TEXT_MANIPULATION,
						RecommendationCategory.IMAGE_GENERATION,
					],
				},
				mockConfig,
			)) as Command;
			const result = getMessageContent(command);

			expect(result).toContain('<node_recommendations>');
			expect(result).toContain('<category name="text_manipulation">');
			expect(result).toContain('<category name="image_generation">');
			expect(result).toContain('</node_recommendations>');
		});

		it('should include provider alternatives in recommendations', async () => {
			const { tool } = createGetNodeRecommendationsTool();

			const command = (await tool.invoke(
				{ categories: [RecommendationCategory.TEXT_MANIPULATION] },
				mockConfig,
			)) as Command;
			const result = getMessageContent(command);

			expect(result).toContain('<provider_alternatives>');
			expect(result).toContain('Anthropic');
			expect(result).toContain('lmChatAnthropic');
			expect(result).toContain('Gemini');
			expect(result).toContain('lmChatGoogleGemini');
		});
	});
});
