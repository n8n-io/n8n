import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { ValidationError, ToolExecutionError } from '@/errors';
import { prompt } from '@/prompts/builder';
import { recommendations, formatRecommendation } from '@/prompts/shared/node-recommendations';
import { documentation } from '@/tools/best-practices';
import { createProgressReporter } from '@/tools/helpers/progress';
import { createSuccessResponse, createErrorResponse } from '@/tools/helpers/response';
import { WorkflowTechnique, type WorkflowTechniqueType } from '@/types/categorization';
import {
	type RecommendationCategoryType,
	RecommendationCategory,
} from '@/types/node-recommendations';
import type { BuilderToolBase } from '@/utils/stream-processor';

/**
 * Documentation type enum
 */
export const DocumentationType = {
	BEST_PRACTICES: 'best_practices',
	NODE_RECOMMENDATIONS: 'node_recommendations',
} as const;

/**
 * Schema for best practices request
 */
const bestPracticesRequestSchema = z.object({
	type: z.literal(DocumentationType.BEST_PRACTICES),
	techniques: z
		.array(z.nativeEnum(WorkflowTechnique))
		.min(1)
		.describe('Workflow techniques to get best practices for'),
});

/**
 * Schema for node recommendations request
 */
const nodeRecommendationsRequestSchema = z.object({
	type: z.literal(DocumentationType.NODE_RECOMMENDATIONS),
	categories: z
		.array(z.nativeEnum(RecommendationCategory))
		.min(1)
		.describe('Task categories to get node recommendations for'),
});

/**
 * Combined schema - array of documentation requests
 */
const getDocumentationSchema = z.object({
	requests: z
		.array(z.union([bestPracticesRequestSchema, nodeRecommendationsRequestSchema]))
		.min(1)
		.describe('Array of documentation requests to retrieve'),
});

/**
 * Format best practices documentation for multiple techniques
 */
function formatBestPractices(techniques: WorkflowTechniqueType[]): string {
	const foundDocs: string[] = [];

	for (const technique of techniques) {
		const doc = documentation[technique];
		if (doc) {
			foundDocs.push(doc.getDocumentation());
		}
	}

	if (foundDocs.length === 0) {
		return '';
	}

	return prompt().section('best_practices', foundDocs.join('\n---\n')).build();
}

/**
 * Format a single category with its recommendation
 * Uses the category name as the XML tag (e.g., <text_manipulation>)
 */
function formatCategory(category: RecommendationCategoryType, content: string): string {
	return prompt().section(category, content).build();
}

/**
 * Format node recommendations for multiple categories
 */
function formatNodeRecommendations(categories: RecommendationCategoryType[]): string {
	const foundRecs: string[] = [];

	for (const category of categories) {
		const rec = recommendations[category];
		if (rec) {
			foundRecs.push(formatCategory(category, formatRecommendation(rec.recommendation)));
		}
	}

	if (foundRecs.length === 0) {
		return '';
	}

	return prompt().section('node_recommendations', foundRecs.join('\n')).build();
}

export const GET_DOCUMENTATION_TOOL: BuilderToolBase = {
	toolName: 'get_documentation',
	displayTitle: 'Getting documentation',
};

/**
 * Factory function to create the get documentation tool
 */
export function createGetDocumentationTool() {
	const dynamicTool = tool(
		(input: unknown, config) => {
			const reporter = createProgressReporter(
				config,
				GET_DOCUMENTATION_TOOL.toolName,
				GET_DOCUMENTATION_TOOL.displayTitle,
			);

			try {
				const validatedInput = getDocumentationSchema.parse(input);
				const { requests } = validatedInput;

				reporter.start(validatedInput);
				reporter.progress(`Processing ${requests.length} documentation request(s)...`);

				const results: string[] = [];
				let bestPracticesContent: string | undefined;
				const allTechniques: WorkflowTechniqueType[] = [];

				for (const request of requests) {
					if (request.type === DocumentationType.BEST_PRACTICES) {
						const { techniques } = request;
						const availableDocs = techniques.filter((t) => documentation[t]);

						if (availableDocs.length > 0) {
							const content = formatBestPractices(techniques);
							results.push(content);
							bestPracticesContent = content;
							allTechniques.push(...techniques);
						}
					} else {
						const { categories } = request;
						const availableRecs = categories.filter((c) => recommendations[c]);

						if (availableRecs.length > 0) {
							results.push(formatNodeRecommendations(categories));
						}
					}
				}

				if (results.length === 0) {
					const message = 'No documentation available for the requested items.';
					reporter.complete({ requests: requests.length, found: 0 });
					return createSuccessResponse(config, message);
				}

				const message = results.join('\n\n');

				reporter.complete({ requests: requests.length, found: results.length });

				// Include state updates for best practices if retrieved
				const stateUpdates: Record<string, unknown> = {};
				if (bestPracticesContent) {
					stateUpdates.bestPractices = bestPracticesContent;
					stateUpdates.techniqueCategories = allTechniques;
				}

				return createSuccessResponse(
					config,
					message,
					Object.keys(stateUpdates).length > 0 ? stateUpdates : undefined,
				);
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
						toolName: GET_DOCUMENTATION_TOOL.toolName,
						cause: error instanceof Error ? error : undefined,
					},
				);
				reporter.error(toolError);
				return createErrorResponse(config, toolError);
			}
		},
		{
			name: GET_DOCUMENTATION_TOOL.toolName,
			description: `Retrieve documentation to guide workflow building.

TYPE: best_practices
Use when you need guidance on workflow patterns and implementation.
Requires: techniques array (workflow techniques to get practices for)
Returns: Best practices including recommended nodes, common pitfalls, performance tips.

TYPE: node_recommendations
Use when user wants AI capabilities but doesn't specify exact nodes/providers.
Requires: categories array (task categories to get recommendations for)
Returns: Default node recommendations with alternatives.

Do NOT use node_recommendations when:
- User explicitly names a provider (e.g., "use Claude", "with OpenAI", "using Gemini")
- User specifies exact node names

Available techniques for best_practices:
- trigger, loop, branch, subroutine, pagination, parallel_execution, error_handling, scheduling, rate_limiting, batch_processing, ai_agent, ai_chain, rag, data_transformation, http_request

Available categories for node_recommendations:
- text_manipulation: summarization, analysis, extraction, classification, chat
- image_generation: generate, analyze, edit images
- video_generation: create videos from text/images
- audio_generation: text-to-speech, transcription, translation`,
			schema: getDocumentationSchema,
		},
	);

	return {
		tool: dynamicTool,
		...GET_DOCUMENTATION_TOOL,
	};
}
