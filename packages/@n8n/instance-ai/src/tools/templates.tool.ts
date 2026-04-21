/**
 * Consolidated templates tool — search-structures + search-parameters + best-practices.
 */
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import { documentation } from './best-practices/index';
import { TechniqueDescription, type WorkflowTechniqueType } from './best-practices/techniques';
import { fetchWorkflowsFromTemplates } from './templates/template-api';
import { categories } from './templates/types';
import { mermaidStringify } from './utils/mermaid.utils';
import {
	collectNodeConfigurationsFromWorkflows,
	formatNodeConfigurationExamples,
} from './utils/node-configuration.utils';

// -- Action schemas -----------------------------------------------------------

const searchStructuresAction = z.object({
	action: z
		.literal('search-structures')
		.describe('Search templates and return mermaid diagrams showing workflow structure'),
	search: z.string().optional().describe('Free-text search query for templates'),
	category: z.enum(categories).optional().describe('Filter by template category'),
	rows: z
		.number()
		.min(1)
		.max(10)
		.optional()
		.describe('Number of templates to return (default: 5, max: 10)'),
});

const searchParametersAction = z.object({
	action: z
		.literal('search-parameters')
		.describe('Search templates and return node parameter configurations'),
	search: z.string().optional().describe('Free-text search query for templates'),
	category: z.enum(categories).optional().describe('Filter by template category'),
	rows: z
		.number()
		.min(1)
		.max(10)
		.optional()
		.describe('Number of templates to return (default: 5, max: 10)'),
	nodeType: z
		.string()
		.optional()
		.describe(
			'Filter to show configurations for a specific node type only (e.g. "n8n-nodes-base.telegram")',
		),
});

const bestPracticesAction = z.object({
	action: z
		.literal('best-practices')
		.describe('Get workflow building best practices for a specific technique'),
	technique: z
		.string()
		.describe(
			'The workflow technique to get guidance for (e.g. "chatbot", "scheduling", "triage"). Pass "list" to see all available techniques.',
		),
});

const inputSchema = sanitizeInputSchema(
	z.discriminatedUnion('action', [
		searchStructuresAction,
		searchParametersAction,
		bestPracticesAction,
	]),
);

type Input = z.infer<typeof inputSchema>;

// -- Handlers -----------------------------------------------------------------

async function handleSearchStructures(input: Extract<Input, { action: 'search-structures' }>) {
	const result = await fetchWorkflowsFromTemplates({
		search: input.search,
		category: input.category,
		rows: input.rows,
	});

	const examples = result.workflows.map((wf) => ({
		name: wf.name,
		description: wf.description,
		mermaid: mermaidStringify(wf, { includeNodeParameters: false }),
	}));

	return {
		examples,
		totalResults: result.totalFound,
	};
}

async function handleSearchParameters(input: Extract<Input, { action: 'search-parameters' }>) {
	const result = await fetchWorkflowsFromTemplates({
		search: input.search,
		category: input.category,
		rows: input.rows,
	});

	const allConfigurations = collectNodeConfigurationsFromWorkflows(result.workflows);

	// Filter by nodeType if specified
	let filteredConfigurations = allConfigurations;
	if (input.nodeType) {
		const matching = allConfigurations[input.nodeType];
		filteredConfigurations = matching ? { [input.nodeType]: matching } : {};
	}

	// Format as readable text
	const nodeTypes = Object.keys(filteredConfigurations);
	const formattedParts = nodeTypes.map((nt) =>
		formatNodeConfigurationExamples(nt, filteredConfigurations[nt], undefined, 3),
	);

	return {
		configurations: filteredConfigurations,
		nodeTypes,
		totalTemplatesSearched: result.totalFound,
		formatted: formattedParts.join('\n\n'),
	};
}

// eslint-disable-next-line @typescript-eslint/require-await
async function handleBestPractices(input: Extract<Input, { action: 'best-practices' }>) {
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
				message: `Technique "${technique}" (${description}) exists but does not have detailed documentation yet. Use the templates tool with the search-structures action to find example workflows instead.`,
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

// -- Tool factory -------------------------------------------------------------

export function createTemplatesTool() {
	return createTool({
		id: 'templates',
		description: 'Search n8n workflow templates or get best practices.',
		inputSchema,
		execute: async (input: Input) => {
			switch (input.action) {
				case 'search-structures':
					return await handleSearchStructures(input);
				case 'search-parameters':
					return await handleSearchParameters(input);
				case 'best-practices':
					return await handleBestPractices(input);
			}
		},
	});
}
