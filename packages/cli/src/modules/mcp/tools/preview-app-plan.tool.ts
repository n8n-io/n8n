import { appPlanSchema, renderWireframeDocument } from '@n8n/api-types';
import z from 'zod';

import type { ToolDefinition } from '../mcp.types';

const inputSchema = {
	name: z.string().trim().min(1).max(80).describe('Name of the app'),
	theme: z.enum(['light', 'dark', 'both']).optional().describe('Theme of the app'),
	plan: appPlanSchema.describe(
		'Screens and components of the app. For each component that shows data, name the data table or workflow it reads and how it aggregates. For each action, name the workflow it runs and what it does.',
	),
} satisfies z.ZodRawShape;

const outputSchema = {
	html: z.string().describe('The wireframe as an HTML document'),
	componentCount: z.number().int().describe('Number of planned components'),
} satisfies z.ZodRawShape;

/** Shows an app plan as an interactive wireframe in MCP clients that support MCP Apps. */
export const createPreviewAppPlanTool = (): ToolDefinition<typeof inputSchema> => ({
	name: 'preview_app_plan',
	config: {
		description:
			'Show the plan of an n8n App as a wireframe before you build it. The user sees each screen, and hovering a part shows the data or workflow behind it. Call it again with the changed plan when the user asks for a change.',
		inputSchema,
		outputSchema,
		annotations: {
			title: 'Preview App Plan',
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	// eslint-disable-next-line @typescript-eslint/require-await
	handler: async ({ name, theme, plan }) => {
		const html = renderWireframeDocument(plan, {}, { theme: theme ?? 'both' });
		const componentCount =
			(plan.nav ? 1 : 0) + plan.screens.reduce((sum, screen) => sum + screen.components.length, 0);
		const structuredContent = { html, componentCount };
		return {
			content: [
				{
					type: 'text',
					text: `Showing the wireframe of ${name} with ${componentCount} planned parts.`,
				},
			],
			structuredContent,
		};
	},
});
