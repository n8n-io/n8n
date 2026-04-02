import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

export const listProjectsInputSchema = z.object({});

export function createListProjectsTool(context: InstanceAiContext) {
	return createTool({
		id: 'list-projects',
		description:
			'List all projects accessible to the current user. Use this to discover project IDs before managing folders or organizing workflows within a project.',
		inputSchema: listProjectsInputSchema,
		outputSchema: z.object({
			projects: z.array(
				z.object({
					id: z.string(),
					name: z.string(),
					type: z.enum(['personal', 'team']),
				}),
			),
		}),
		execute: async () => {
			const projects = await context.workspaceService!.listProjects();
			return { projects };
		},
	});
}
