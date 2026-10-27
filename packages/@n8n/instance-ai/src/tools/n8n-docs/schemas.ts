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
			'Docs lookup query. Include product area, service, task. Optional when credential or node context given.',
		),
	intent: intentSchema.optional().describe('Kind of n8n docs answer needed.'),
	credentialType: z
		.string()
		.optional()
		.describe(
			'n8n credential type name, e.g. "gmailOAuth2". Always pass for auth questions (scopes, permissions, setup steps): tool resolves that type\'s own docs page from it, no URL lookup needed first.',
		),
	credentialDisplayName: z
		.string()
		.optional()
		.describe('Human-readable credential name, e.g. "Gmail OAuth2 API".'),
	documentationUrl: z
		.string()
		.url()
		.optional()
		.describe('Known n8n docs URL from credential or node metadata.'),
	nodeType: z.string().optional().describe('n8n node type name, e.g. "n8n-nodes-base.gmail".'),
};

const maxContentLengthField = z
	.number()
	.int()
	.positive()
	.max(MAX_CONTENT_LENGTH)
	.default(DEFAULT_MAX_CONTENT_LENGTH)
	.optional()
	.describe(`Max content length in characters (default ${DEFAULT_MAX_CONTENT_LENGTH}).`);

const lookupAction = z.object({
	action: z
		.literal('lookup')
		.describe(
			'Search n8n docs registry, read best matching markdown pages, return source material. When answering from returned documents, end with Source or Sources using returned page titles and URLs.',
		),
	...sharedLookupFields,
	oauthRedirectUrl: z
		.string()
		.optional()
		.describe('OAuth redirect URL currently shown in n8n credential modal.'),
	maxPages: z
		.number()
		.int()
		.min(1)
		.max(MAX_PAGES)
		.default(DEFAULT_MAX_PAGES)
		.optional()
		.describe(`Max docs pages to read (default ${DEFAULT_MAX_PAGES}, max ${MAX_PAGES}).`),
	maxContentLength: maxContentLengthField,
});

const searchAction = z.object({
	action: z.literal('search').describe('Search n8n docs registry without reading pages.'),
	...sharedLookupFields,
	maxResults: z
		.number()
		.int()
		.min(1)
		.max(MAX_RESULTS)
		.default(DEFAULT_MAX_RESULTS)
		.optional()
		.describe(
			`Max registry matches to return (default ${DEFAULT_MAX_RESULTS}, max ${MAX_RESULTS}).`,
		),
});

const readAction = z.object({
	action: z
		.literal('read')
		.describe(
			'Read one n8n docs markdown page from registry. When answering from returned document, end with Source using returned page title and URL.',
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
