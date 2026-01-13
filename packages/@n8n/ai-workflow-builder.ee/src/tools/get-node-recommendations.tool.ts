import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { ValidationError, ToolExecutionError } from '@/errors';
import { createProgressReporter } from '@/tools/helpers/progress';
import { createSuccessResponse, createErrorResponse } from '@/tools/helpers/response';
import { recommendations } from '@/tools/node-recommendations';
import {
	RecommendationCategory,
	type RecommendationCategoryType,
} from '@/types/recommendation-category';
import type { BuilderToolBase } from '@/utils/stream-processor';

const getNodeRecommendationsSchema = z.object({
	categories: z
		.array(z.nativeEnum(RecommendationCategory))
		.min(1)
		.describe('List of task categories to get default node recommendations for'),
});

/**
 * Format node recommendations for multiple categories
 */
function formatRecommendations(categories: RecommendationCategoryType[]): string {
	const parts: string[] = [];
	const foundRecs: string[] = [];

	for (const category of categories) {
		const rec = recommendations[category];
		if (rec) {
			foundRecs.push(rec.getRecommendation());
		}
	}

	if (foundRecs.length > 0) {
		parts.push('<node_recommendations>');
		parts.push(foundRecs.join('\n'));
		parts.push('</node_recommendations>');
	}

	return parts.join('\n');
}

export const GET_NODE_RECOMMENDATIONS_TOOL: BuilderToolBase = {
	toolName: 'get_node_recommendations',
	displayTitle: 'Getting node recommendations',
};

/**
 * Factory function to create the get node recommendations tool
 */
export function createGetNodeRecommendationsTool() {
	const dynamicTool = tool(
		(input: unknown, config) => {
			const reporter = createProgressReporter(
				config,
				GET_NODE_RECOMMENDATIONS_TOOL.toolName,
				GET_NODE_RECOMMENDATIONS_TOOL.displayTitle,
			);

			try {
				const validatedInput = getNodeRecommendationsSchema.parse(input);
				const { categories } = validatedInput;

				reporter.start(validatedInput);

				reporter.progress(
					`Retrieving node recommendations for ${categories.length} category(s)...`,
				);

				// Get available recommendations
				const availableRecs = categories.filter((category) => recommendations[category]);

				if (availableRecs.length === 0) {
					const message = `No node recommendations available for the requested categories: ${categories.join(', ')}`;
					reporter.complete({ categories, found: 0 });
					return createSuccessResponse(config, message);
				}

				// Format the recommendations
				const message = formatRecommendations(categories);

				reporter.complete({
					categories,
					found: availableRecs.length,
					missing: categories.length - availableRecs.length,
				});

				return createSuccessResponse(config, message);
			} catch (error) {
				if (error instanceof z.ZodError) {
					const validationError = new ValidationError('Invalid input parameters', {
						extra: { errors: error.errors },
					});
					reporter.error(validationError);
					return createErrorResponse(config, validationError);
				}

				const toolError = new ToolExecutionError(
					error instanceof Error ? error.message : 'Unknown error occurred',
					{
						toolName: GET_NODE_RECOMMENDATIONS_TOOL.toolName,
						cause: error instanceof Error ? error : undefined,
					},
				);
				reporter.error(toolError);
				return createErrorResponse(config, toolError);
			}
		},
		{
			name: GET_NODE_RECOMMENDATIONS_TOOL.toolName,
			description: `Retrieve default node recommendations when users don't specify exact nodes or providers.

Use this tool when:
- User wants AI capabilities but doesn't specify exact nodes/providers
- User mentions generic tasks like "generate image", "transcribe audio", "analyze text"
- User mentions AI but no specific model (OpenAI, Anthropic, etc.)

Do NOT use this tool when:
- User explicitly names a provider (e.g., "use Claude", "with OpenAI", "using Gemini")
- User specifies exact node names
- Task doesn't involve AI/ML capabilities

Available categories:
- text_manipulation: summarization, analysis, extraction, classification, chat, content creation
- image_generation: generate, analyze, edit, describe images
- video_generation: create videos from text or images
- audio_generation: text-to-speech, transcription, translation`,
			schema: getNodeRecommendationsSchema,
		},
	);

	return {
		tool: dynamicTool,
		...GET_NODE_RECOMMENDATIONS_TOOL,
	};
}
