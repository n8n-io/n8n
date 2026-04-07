import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { documentation } from './index';
import { TechniqueDescription, type WorkflowTechniqueType } from './techniques';

export function createGetBestPracticesTool() {
	return createTool({
		id: 'get-best-practices',
		description:
			'Get workflow building best practices and guidance for a specific technique. Pass "list" to see all available techniques and their descriptions.',
		inputSchema: z.object({
			technique: z
				.string()
				.describe(
					'The workflow technique to get guidance for (e.g. "chatbot", "scheduling", "triage"). Pass "list" to see all available techniques.',
				),
		}),
		outputSchema: z.object({
			technique: z.string(),
			documentation: z.string().optional(),
			availableTechniques: z
				.array(
					z.object({
						technique: z.string(),
						description: z.string(),
						hasDocumentation: z.boolean(),
					}),
				)
				.optional(),
			message: z.string(),
		}),
		// eslint-disable-next-line @typescript-eslint/require-await
		execute: async ({ technique }) => {
			// "list" mode: return all techniques with descriptions
			if (technique === 'list') {
				const availableTechniques = Object.entries(TechniqueDescription).map(
					([tech, description]) => ({
						technique: tech,
						description,
						hasDocumentation: documentation[tech as WorkflowTechniqueType] !== undefined,
					}),
				);

				return {
					technique: 'list',
					availableTechniques,
					message: `Found ${availableTechniques.length} techniques. ${availableTechniques.filter((t) => t.hasDocumentation).length} have detailed documentation.`,
				};
			}

			// Specific technique lookup
			const getDocFn = documentation[technique as WorkflowTechniqueType];
			if (!getDocFn) {
				// Check if it's a valid technique without docs
				const description = TechniqueDescription[technique as WorkflowTechniqueType];
				if (description) {
					return {
						technique,
						message: `Technique "${technique}" (${description}) exists but does not have detailed documentation yet. Use search-template-structures to find example workflows instead.`,
					};
				}

				return {
					technique,
					message: `Unknown technique "${technique}". Use technique "list" to see all available techniques.`,
				};
			}

			return {
				technique,
				documentation: getDocFn(),
				message: `Best practices documentation for "${technique}" retrieved successfully.`,
			};
		},
	});
}
