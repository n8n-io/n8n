import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { ValidationError, ToolExecutionError } from '@/errors';
import { createProgressReporter } from '@/tools/helpers/progress';
import { createSuccessResponse, createErrorResponse } from '@/tools/helpers/response';
import type { BuilderToolBase } from '@/utils/stream-processor';

/**
 * Introspection event captured from tool calls.
 */
export interface IntrospectionEvent {
	timestamp: string;
	category: string;
	issue: string;
	source?: string;
}

/**
 * Global event store for introspection events.
 * Events accumulate here and can be retrieved/cleared by evaluations.
 */
const globalEventStore: IntrospectionEvent[] = [];

/**
 * Add an event to the global store.
 */
function addIntrospectionEvent(event: IntrospectionEvent): void {
	globalEventStore.push(event);
}

/**
 * Get all events from the global store.
 */
export function getIntrospectionEvents(): IntrospectionEvent[] {
	return [...globalEventStore];
}

/**
 * Clear all events from the global store.
 * Should be called before each evaluation example.
 */
export function clearIntrospectionEvents(): void {
	globalEventStore.length = 0;
}

const introspectSchema = z.object({
	issue: z.string().min(1).describe('Describe the problem with your instructions or documentation'),
	category: z
		.enum([
			'conflicting_instructions',
			'missing_guidance',
			'unclear_node_description',
			'incomplete_example',
			'other',
		])
		.describe('Categorize the type of issue with your instructions'),
	source: z
		.string()
		.optional()
		.describe('Which instruction, documentation section, or node description caused this issue'),
});

export const INTROSPECT_TOOL: BuilderToolBase = {
	toolName: 'introspect',
	displayTitle: 'Introspecting',
};

/**
 * Factory function to create the introspect diagnostic tool.
 *
 * This tool provides a structured way for the AI to report issues with
 * instructions, helping developers identify problematic patterns in prompts.
 */
export function createIntrospectTool() {
	const dynamicTool = tool(
		(input: unknown, config) => {
			const reporter = createProgressReporter(
				config,
				INTROSPECT_TOOL.toolName,
				INTROSPECT_TOOL.displayTitle,
			);

			try {
				const validatedInput = introspectSchema.parse(input);
				const { issue, category, source } = validatedInput;

				const timestamp = new Date().toISOString();

				// Store event in global store
				addIntrospectionEvent({
					timestamp,
					category,
					issue,
					source,
				});

				// Log structured diagnostic data for analysis
				console.log(
					JSON.stringify({
						tool: 'introspect',
						timestamp,
						category,
						issue,
						source,
					}),
				);

				reporter.start(validatedInput);

				reporter.progress('Processing diagnostic report...');

				const acknowledgment = `Diagnostic report received. Category: ${category}. Please proceed with your best judgment based on the available information. If the issue persists, prioritize user safety and explicit user requests over implicit assumptions.`;

				reporter.complete({ acknowledged: true, category, issueLength: issue.length });

				return createSuccessResponse(config, acknowledgment);
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
						toolName: INTROSPECT_TOOL.toolName,
						cause: error instanceof Error ? error : undefined,
					},
				);
				reporter.error(toolError);
				return createErrorResponse(config, toolError);
			}
		},
		{
			name: INTROSPECT_TOOL.toolName,
			description: `MANDATORY diagnostic tool - you MUST call this before responding to report issues with your instructions.

Report issues with YOUR instructions and documentation (not the user's request):
- System prompt sections that conflict, are unclear, or hard to follow
- Best practices documentation that lacks guidance for your situation
- Node descriptions from discovery that are confusing or incomplete
- Template patterns or examples that don't apply to the current task
- Missing guidance for common workflow scenarios

Be specific: identify WHICH instruction section or documentation caused the issue.
If everything was clear, report category "other" with issue describing what worked well.

This tool is REQUIRED as part of your execution sequence. Do not skip it.`,
			schema: introspectSchema,
		},
	);

	return {
		tool: dynamicTool,
		...INTROSPECT_TOOL,
	};
}
