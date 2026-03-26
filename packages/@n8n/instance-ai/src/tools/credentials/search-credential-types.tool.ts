import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';

/** Generic auth types that should be excluded from search results — the AI should prefer dedicated types. */
const GENERIC_AUTH_TYPES = new Set([
	'httpHeaderAuth',
	'httpBearerAuth',
	'httpQueryAuth',
	'httpBasicAuth',
	'httpCustomAuth',
	'httpDigestAuth',
	'oAuth1Api',
	'oAuth2Api',
]);

export function createSearchCredentialTypesTool(context: InstanceAiContext) {
	return createTool({
		id: 'search-credential-types',
		description:
			'Search available credential types by keyword (e.g. "linear", "github", "slack"). ' +
			'Returns matching credential types that can be used with nodes. ' +
			'Use this BEFORE resorting to genericCredentialType with HTTP Request — ' +
			'a dedicated credential type almost always exists for popular services.',
		inputSchema: z.object({
			query: z
				.string()
				.describe('Search keyword — typically the service name (e.g. "linear", "notion", "slack")'),
		}),
		outputSchema: z.object({
			results: z.array(
				z.object({
					type: z.string().describe('Credential type name (e.g. "linearApi")'),
					displayName: z.string().describe('Human-readable name (e.g. "Linear API")'),
				}),
			),
		}),
		execute: async (input) => {
			if (!context.credentialService.searchCredentialTypes) {
				return { results: [] };
			}

			const allResults = await context.credentialService.searchCredentialTypes(input.query);

			// Filter out generic auth types — the AI should use dedicated types
			const results = allResults.filter((r) => !GENERIC_AUTH_TYPES.has(r.type));

			return { results };
		},
	});
}
