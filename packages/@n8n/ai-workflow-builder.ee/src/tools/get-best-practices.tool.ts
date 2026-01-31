/**
 * Get Best Practices Tool for Planning Agent
 *
 * Fetches technique-specific best practices documentation to help
 * the planning agent create better workflow plans.
 */

import { inspect } from 'node:util';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { documentation } from './best-practices';
import { TechniqueDescription, WorkflowTechnique } from '@/types/categorization';

/**
 * Debug logging helper
 */
function debugLog(message: string, data?: Record<string, unknown>): void {
	const timestamp = new Date().toISOString();
	const prefix = `[PLANNING-AGENT][${timestamp}][GET_BEST_PRACTICES]`;
	if (data) {
		const formatted = inspect(data, {
			depth: null,
			colors: true,
			maxStringLength: null,
			maxArrayLength: null,
			breakLength: 120,
		});
		console.log(`${prefix} ${message}\n${formatted}`);
	} else {
		console.log(`${prefix} ${message}`);
	}
}

/**
 * Get list of available techniques with their descriptions
 */
function getAvailableTechniques(): string {
	const techniques = Object.entries(TechniqueDescription)
		.map(([technique, description]) => {
			const hasDoc = documentation[technique as keyof typeof documentation] !== undefined;
			const status = hasDoc ? '(documentation available)' : '(no documentation yet)';
			return `- ${technique}: ${description} ${status}`;
		})
		.join('\n');

	return techniques;
}

/**
 * Create the get_best_practices tool for the planning agent
 */
export function createGetBestPracticesTool() {
	debugLog('Creating get_best_practices tool');

	return tool(
		async (input: { techniques: string[] }) => {
			debugLog('========== GET_BEST_PRACTICES TOOL INVOKED ==========');
			debugLog('Input', { techniques: input.techniques });

			const results: string[] = [];
			const notFound: string[] = [];

			for (const technique of input.techniques) {
				// Normalize the technique name (lowercase, handle variations)
				const normalizedTechnique = technique.toLowerCase().replace(/[_-]/g, '_');

				// Try to find the technique in our registry
				let doc = documentation[normalizedTechnique as keyof typeof documentation];

				// If not found by direct lookup, try to match against known techniques
				if (!doc) {
					for (const knownTechnique of Object.values(WorkflowTechnique)) {
						if (
							knownTechnique === normalizedTechnique ||
							knownTechnique.includes(normalizedTechnique) ||
							normalizedTechnique.includes(knownTechnique)
						) {
							doc = documentation[knownTechnique as keyof typeof documentation];
							break;
						}
					}
				}

				if (doc) {
					const docContent = doc.getDocumentation();
					results.push(`## ${technique.toUpperCase()}\n\n${docContent}`);
					debugLog(`Found documentation for technique: ${technique}`);
				} else {
					notFound.push(technique);
					debugLog(`No documentation found for technique: ${technique}`);
				}
			}

			let response = '';

			if (results.length > 0) {
				response += results.join('\n\n---\n\n');
			}

			if (notFound.length > 0) {
				response += `\n\n## Techniques Without Specific Documentation\n\n`;
				response += `The following techniques don't have specific best practices documentation yet: ${notFound.join(', ')}\n\n`;
				response += `Use general workflow design principles for these.`;
			}

			if (results.length === 0 && notFound.length === 0) {
				response = `No techniques were requested. Available techniques:\n\n${getAvailableTechniques()}`;
			}

			debugLog('Returning response', {
				foundCount: results.length,
				notFoundCount: notFound.length,
				responseLength: response.length,
			});
			debugLog('========== GET_BEST_PRACTICES TOOL COMPLETE ==========');

			return response;
		},
		{
			name: 'get_best_practices',
			description: `Get best practices documentation for specific workflow techniques. Use this after identifying which techniques apply to the user's request. Available techniques: ${Object.values(WorkflowTechnique).join(', ')}`,
			schema: z.object({
				techniques: z
					.array(z.string())
					.describe(
						'Array of workflow technique names (e.g., ["chatbot", "data_extraction", "notification"])',
					),
			}),
		},
	);
}
