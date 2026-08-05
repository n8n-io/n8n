import { z } from 'zod';

import { sanitizeInputSchema } from '../../agent/sanitize-mcp-schemas';

export const DEFAULT_MAX_PAGES = 3;
export const MAX_PAGES = 5;
export const DEFAULT_MAX_RESULTS = 8;
export const MAX_RESULTS = 20;
export const DEFAULT_MAX_CONTENT_LENGTH = 30_000;
export const MAX_CONTENT_LENGTH = 100_000;

const intentSchema = z.enum(['credential-setup', 'node-help', 'hosting', 'api', 'general']);

const sharedLookupFields = {
	query: z
		.string()
		.optional()
		.describe(
			'Docs lookup query. Include the product area, service, and task. Optional when credential or node context is provided.',
		),
	intent: intentSchema.optional().describe('The kind of n8n docs answer needed.'),
	credentialType: z
		.string()
		.optional()
		.describe('n8n credential type name, for example "gmailOAuth2Api".'),
	credentialDisplayName: z
		.string()
		.optional()
		.describe('Human-readable credential name, for example "Gmail OAuth2 API".'),
	documentationUrl: z
		.string()
		.url()
		.optional()
		.describe('Known n8n docs URL from credential or node metadata.'),
	nodeType: z
		.string()
		.optional()
		.describe('n8n node type name, for example "n8n-nodes-base.gmail".'),
};

const maxContentLengthField = z
	.number()
	.int()
	.positive()
	.max(MAX_CONTENT_LENGTH)
	.default(DEFAULT_MAX_CONTENT_LENGTH)
	.optional()
	.describe(`Maximum content length in characters (default ${DEFAULT_MAX_CONTENT_LENGTH}).`);

const lookupAction = z.object({
	action: z
		.literal('lookup')
		.describe(
			'Search the n8n docs registry, read the best matching markdown pages, and return source material. When answering from returned documents, end with Source or Sources using the returned page titles and URLs.',
		),
	...sharedLookupFields,
	oauthRedirectUrl: z
		.string()
		.optional()
		.describe('OAuth redirect URL currently shown in the n8n credential modal.'),
	maxPages: z
		.number()
		.int()
		.min(1)
		.max(MAX_PAGES)
		.default(DEFAULT_MAX_PAGES)
		.optional()
		.describe(`Maximum docs pages to read (default ${DEFAULT_MAX_PAGES}, max ${MAX_PAGES}).`),
	maxContentLength: maxContentLengthField,
});

const searchAction = z.object({
	action: z.literal('search').describe('Search the n8n docs registry without reading pages.'),
	...sharedLookupFields,
	maxResults: z
		.number()
		.int()
		.min(1)
		.max(MAX_RESULTS)
		.default(DEFAULT_MAX_RESULTS)
		.optional()
		.describe(
			`Maximum registry matches to return (default ${DEFAULT_MAX_RESULTS}, max ${MAX_RESULTS}).`,
		),
});

const readAction = z.object({
	action: z
		.literal('read')
		.describe(
			'Read one n8n docs markdown page from the registry. When answering from the returned document, end with Source using the returned page title and URL.',
		),
	url: z.string().url().describe('n8n docs page URL. Must resolve to a docs registry entry.'),
	maxContentLength: maxContentLengthField,
});

export const n8nDocsRuntimeInputSchema = z.discriminatedUnion('action', [
	lookupAction,
	searchAction,
	readAction,
]);

export const n8nDocsToolInputSchema = sanitizeInputSchema(n8nDocsRuntimeInputSchema);

export type N8nDocsInput = z.infer<typeof n8nDocsRuntimeInputSchema>;
export type N8nDocsLookupInput = Extract<N8nDocsInput, { action: 'lookup' }>;
export type N8nDocsSearchInput = Extract<N8nDocsInput, { action: 'search' }>;
export type N8nDocsReadInput = Extract<N8nDocsInput, { action: 'read' }>;
