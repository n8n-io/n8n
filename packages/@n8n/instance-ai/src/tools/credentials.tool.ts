/**
 * Consolidated credentials tool — list, get, delete, search-types, setup, test.
 */
import { createTool } from '@mastra/core/tools';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import type { InstanceAiContext } from '../types';

// ── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 50;

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

// ── Shared fields (single source of truth for fields used across actions) ───

const credentialIdField = z.string().describe('Credential ID');

// ── Action schemas ─────────────────────────────────────────────────────────

const listAction = z.object({
	action: z
		.literal('list')
		.describe(
			`List credentials accessible to the current user. Results are paginated (default ${DEFAULT_LIMIT}, max 200) and include \`total\` + \`hasMore\`; when looking up a user-named credential, pass \`name\` (substring) or \`type\` for targeted lookup instead of scanning the default page.`,
		),
	type: z.string().optional().describe('Filter by credential type (e.g. "notionApi")'),
	name: z
		.string()
		.optional()
		.describe(
			'Filter by credential name (case-insensitive substring). Use for targeted lookup when the user named a specific credential — prefer this over paging through results.',
		),
	limit: z
		.number()
		.int()
		.min(1)
		.max(200)
		.optional()
		.describe(
			`Max credentials to return (default ${DEFAULT_LIMIT}, max 200). Use with offset to paginate.`,
		),
	offset: z
		.number()
		.int()
		.min(0)
		.optional()
		.describe('Number of credentials to skip (default 0). Use with limit to paginate.'),
});

const getAction = z.object({
	action: z.literal('get').describe('Get credential metadata by ID'),
	credentialId: credentialIdField,
});

const deleteAction = z.object({
	action: z.literal('delete').describe('Permanently delete a credential by ID'),
	credentialId: credentialIdField,
	credentialName: z
		.string()
		.optional()
		.describe('Name of the credential (for confirmation message)'),
});

const searchTypesAction = z.object({
	action: z.literal('search-types').describe('Search available credential types by keyword'),
	query: z
		.string()
		.describe('Search keyword — typically the service name (e.g. "linear", "notion", "slack")'),
});

const setupAction = z.object({
	action: z
		.literal('setup')
		.describe('Open the credential setup UI for the user to create or select credentials'),
	credentials: z
		.array(
			z.object({
				credentialType: z
					.string()
					.describe('n8n credential type name (e.g. "slackApi", "gmailOAuth2Api")'),
				reason: z.string().optional().describe('Why this credential is needed (shown to user)'),
				suggestedName: z
					.string()
					.optional()
					.describe(
						'Suggested display name for the credential (e.g. "Linear API key"). Pre-fills the name field when creating a new credential.',
					),
			}),
		)
		.describe('List of credentials to set up'),
	projectId: z
		.string()
		.optional()
		.describe('Project ID to scope credential creation to. Defaults to personal project.'),
	credentialFlow: z
		.object({
			stage: z.enum(['generic', 'finalize']),
		})
		.optional()
		.describe(
			'Credential flow stage. "finalize" renders post-verification picker with "Apply credentials" / "Later" buttons.',
		),
});

const testAction = z.object({
	action: z
		.literal('test')
		.describe('Test whether a credential is valid and can connect to its service'),
	credentialId: credentialIdField,
});

const inputSchema = sanitizeInputSchema(
	z.discriminatedUnion('action', [
		listAction,
		getAction,
		deleteAction,
		searchTypesAction,
		setupAction,
		testAction,
	]),
);

type Input = z.infer<typeof inputSchema>;

// ── Suspend / resume schemas (superset covering delete + setup) ────────────

const suspendSchema = z.object({
	requestId: z.string(),
	message: z.string(),
	severity: instanceAiConfirmationSeveritySchema,
	credentialRequests: z
		.array(
			z.object({
				credentialType: z.string(),
				reason: z.string(),
				existingCredentials: z.array(z.object({ id: z.string(), name: z.string() })),
				suggestedName: z.string().optional(),
			}),
		)
		.optional(),
	projectId: z.string().optional(),
	credentialFlow: z.object({ stage: z.enum(['generic', 'finalize']) }).optional(),
});

const resumeSchema = z.object({
	approved: z.boolean(),
	credentials: z.record(z.string()).optional(),
	autoSetup: z.object({ credentialType: z.string() }).optional(),
});

// ── Handlers ───────────────────────────────────────────────────────────────

async function handleList(context: InstanceAiContext, input: Extract<Input, { action: 'list' }>) {
	const allCredentials = await context.credentialService.list({
		type: input.type,
	});

	const filtered = input.name
		? allCredentials.filter((c) => c.name.toLowerCase().includes(input.name!.toLowerCase()))
		: allCredentials;

	const total = filtered.length;
	const offset = input.offset ?? 0;
	const limit = input.limit ?? DEFAULT_LIMIT;
	const page = filtered.slice(offset, offset + limit);
	const hasMore = offset + page.length < total;

	const truncatedWithoutNarrowing = hasMore && !input.name && !input.type;

	return {
		credentials: page.map(({ id, name, type }) => ({ id, name, type })),
		total,
		hasMore,
		...(truncatedWithoutNarrowing
			? {
					hint: `Showing ${page.length} of ${total} credentials. Pass \`name\` (substring) or \`type\` to narrow the search before concluding a user-named credential doesn't exist, or use \`offset\` to paginate.`,
				}
			: {}),
	};
}

async function handleGet(context: InstanceAiContext, input: Extract<Input, { action: 'get' }>) {
	return await context.credentialService.get(input.credentialId);
}

async function handleDelete(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'delete' }>,
	ctx: { agent?: { resumeData?: unknown; suspend?: unknown } },
) {
	const resumeData = ctx?.agent?.resumeData as z.infer<typeof resumeSchema> | undefined;
	const suspend = ctx?.agent?.suspend as ((payload: unknown) => Promise<void>) | undefined;

	if (context.permissions?.deleteCredential === 'blocked') {
		return { success: false, denied: true, reason: 'Action blocked by admin' };
	}

	const needsApproval = context.permissions?.deleteCredential !== 'always_allow';

	// State 1: First call — suspend for confirmation (unless always_allow)
	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		await suspend?.({
			requestId: nanoid(),
			message: `Delete credential "${input.credentialName ?? input.credentialId}"? This cannot be undone.`,
			severity: 'destructive' as const,
		});
		// suspend() never resolves — this line is unreachable but satisfies the type checker
		return { success: false };
	}

	// State 2: Denied
	if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
		return { success: false, denied: true, reason: 'User denied the action' };
	}

	// State 3: Approved or always_allow — execute
	await context.credentialService.delete(input.credentialId);
	return { success: true };
}

async function handleSearchTypes(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'search-types' }>,
) {
	if (!context.credentialService.searchCredentialTypes) {
		return { results: [] };
	}

	const allResults = await context.credentialService.searchCredentialTypes(input.query);

	// Filter out generic auth types — the AI should use dedicated types
	const results = allResults.filter((r) => !GENERIC_AUTH_TYPES.has(r.type));

	return { results };
}

async function handleSetup(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'setup' }>,
	ctx: { agent?: { resumeData?: unknown; suspend?: unknown } },
) {
	const resumeData = ctx?.agent?.resumeData as z.infer<typeof resumeSchema> | undefined;
	const suspend = ctx?.agent?.suspend as ((payload: unknown) => Promise<void>) | undefined;
	const isFinalize = input.credentialFlow?.stage === 'finalize';

	// State 1: First call — look up existing credentials per type and suspend
	if (resumeData === undefined || resumeData === null) {
		const credentialRequests = await Promise.all(
			input.credentials.map(
				async (req: { credentialType: string; reason?: string; suggestedName?: string }) => {
					const existing = await context.credentialService.list({ type: req.credentialType });
					return {
						credentialType: req.credentialType,
						reason: req.reason ?? `Required for ${req.credentialType}`,
						existingCredentials: existing.map((c) => ({ id: c.id, name: c.name })),
						...(req.suggestedName ? { suggestedName: req.suggestedName } : {}),
					};
				},
			),
		);

		const typeNames = input.credentials
			.map((c: { credentialType: string }) => c.credentialType)
			.join(', ');
		await suspend?.({
			requestId: nanoid(),
			message: isFinalize
				? `Your workflow is verified. Add credentials to make it production-ready: ${typeNames}`
				: input.credentials.length === 1
					? `Select or create a ${typeNames} credential`
					: `Select or create credentials: ${typeNames}`,
			severity: 'info' as const,
			credentialRequests,
			...(input.projectId ? { projectId: input.projectId } : {}),
			...(input.credentialFlow ? { credentialFlow: input.credentialFlow } : {}),
		});
		// suspend() never resolves
		return { success: false };
	}

	// State 2: Not approved — user clicked "Later" / skipped.
	if (!resumeData.approved) {
		return {
			success: true,
			deferred: true,
			reason:
				'User skipped credential setup for now. Continue without credentials and let the user set them up later.',
		};
	}

	// State 4: User requested automatic browser-assisted setup
	if (resumeData.autoSetup) {
		const { credentialType } = resumeData.autoSetup;
		const docsUrl =
			(await context.credentialService.getDocumentationUrl?.(credentialType)) ?? undefined;
		const requiredFields =
			(await context.credentialService.getCredentialFields?.(credentialType)) ?? undefined;
		return {
			success: false,
			needsBrowserSetup: true,
			credentialType,
			docsUrl,
			requiredFields,
		};
	}

	// State 5: Approved with credential selections
	return {
		success: true,
		credentials: resumeData.credentials,
	};
}

async function handleTest(context: InstanceAiContext, input: Extract<Input, { action: 'test' }>) {
	try {
		return await context.credentialService.test(input.credentialId);
	} catch (error) {
		return {
			success: false,
			message: error instanceof Error ? error.message : 'Credential test failed',
		};
	}
}

// ── Tool factory ───────────────────────────────────────────────────────────

export function createCredentialsTool(context: InstanceAiContext) {
	return createTool({
		id: 'credentials',
		description:
			'Manage credentials — list, get, delete, search available types, set up new credentials, and test connections.',
		inputSchema,
		suspendSchema,
		resumeSchema,
		execute: async (input: Input, ctx) => {
			switch (input.action) {
				case 'list':
					return await handleList(context, input);
				case 'get':
					return await handleGet(context, input);
				case 'delete':
					return await handleDelete(context, input, ctx);
				case 'search-types':
					return await handleSearchTypes(context, input);
				case 'setup':
					return await handleSetup(context, input, ctx);
				case 'test':
					return await handleTest(context, input);
			}
		},
	});
}
