/**
 * Templates tool — exposes best-practices guidance for n8n workflow techniques.
 */
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import { documentation } from './best-practices/index';
import { TechniqueDescription, type WorkflowTechniqueType } from './best-practices/techniques';

const inputSchema = sanitizeInputSchema(
	z.object({
		action: z
			.literal('best-practices')
			.describe('Get workflow building best practices for a specific technique'),
		technique: z
			.string()
			.describe(
				'The workflow technique to get guidance for (e.g. "chatbot", "scheduling", "triage"). Pass "list" to see all available techniques.',
			),
	}),
);

type Input = z.infer<typeof inputSchema>;

// eslint-disable-next-line @typescript-eslint/require-await
async function handleBestPractices(input: Input) {
	const { technique } = input;

	// "list" mode: return all techniques with descriptions
	if (technique === 'list') {
		const availableTechniques = Object.entries(TechniqueDescription).map(([tech, description]) => ({
			technique: tech,
			description,
			hasDocumentation: documentation[tech as WorkflowTechniqueType] !== undefined,
		}));

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
				message: `Technique "${technique}" (${description}) does not have detailed documentation yet — proceed with general n8n knowledge.`,
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
}

export function createTemplatesTool() {
	return createTool({
		id: 'templates',
		description: 'Get best practices guidance for n8n workflow techniques.',
		inputSchema,
		execute: handleBestPractices,
	});
}
