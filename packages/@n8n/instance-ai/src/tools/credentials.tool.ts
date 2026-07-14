/**
 * Consolidated credentials tool — list, get, delete, search-types, setup, test.
 */
import { Tool } from '@n8n/agents';
import {
	credentialRequestSchema,
	instanceAiConfirmationSeveritySchema,
	TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE,
	type InstanceAiCredentialSetupHint,
} from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import type { InstanceAiContext } from '../types';
import { CREDENTIALS_TOOL_ID } from './tool-ids';

// ── Constants ──────────────────────────────────────────────────────────────

export { CREDENTIALS_TOOL_ID };

const DEFAULT_LIMIT = 50;

/** Generic auth types that should be excluded from search results — the AI should prefer dedicated types. */
const GENERIC_AUTH_TYPES = new Set([
	'httpHeaderAuth',
	'httpBearerAuth',
	'httpQueryAuth',
	'httpBasicAuth',
	'httpCustomAuth',
	'httpTemplatedCustomAuth',
	'httpDigestAuth',
	'oAuth1Api',
	'oAuth2Api',
]);

// ── Shared fields (single source of truth for fields used across actions) ───

const credentialIdField = z.string().describe('Credential ID');

/** Model-facing schema for the Templated Custom Auth creation recipe. */
export const setupHintField = z
	.object({
		template: z
			.object({
				headers: z.record(z.string()).optional(),
				qs: z.record(z.string()).optional(),
				body: z.record(z.unknown()).optional(),
			})
			.describe(
				'The authentication parts of the request exactly as the service documents them, with `{{placeholder}}` markers where the user\'s values go — e.g. headers: { "Authorization": "Key {{api_key}}" }. Statics (header names, version literals) are written verbatim. NEVER include a real secret value.',
			),
		placeholders: z
			.array(
				z.object({
					name: z.string().describe('Marker name used in the template as {{name}}'),
					title: z.string().describe('Input label shown to the user (e.g. "API key")'),
					info: z.string().optional().describe('Where/how the user obtains this value'),
					type: z
						.enum(['password', 'plain'])
						.optional()
						.describe('Defaults to password (masked input)'),
				}),
			)
			.min(1)
			.describe('One entry per {{marker}} in the template — every marker must be described here.'),
		docsUrl: z
			.string()
			.optional()
			.describe(
				"URL of the page where the user obtains the secret (the provider's API-keys / tokens page).",
			),
		suggestedName: z
			.string()
			.optional()
			.describe(
				'Display name for the created credential, also used as the setup card title ("Set up {suggestedName}"). Name it after the service, user-facing — e.g. "fal.ai API Key", not the generic type name.',
			),
		testUrl: z
			.string()
			.optional()
			.describe(
				"Endpoint that answers an authenticated GET, used to verify the credential on save and on later retests. Prefer a cheap documented read endpoint (e.g. the provider's /v1/me). Omit when the provider documents none.",
			),
		acceptedStatusCodes: z
			.array(z.number().int())
			.max(10)
			.optional()
			.describe(
				"Only for services documented to answer 401/403 to a plain authenticated GET even when the credential is valid (e.g. auth scoped to POST): list those codes so the auth probe doesn't misread them as rejection. Omit for normal services — codes other than 401/403 never fail the probe.",
			),
	})
	.describe(
		`Recipe for creating a "${TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE}" credential so the user only has to paste their secret(s) — the rest is pre-filled. Provide it whenever the service has no dedicated credential type and its auth is expressible as header/query/body values; ground it in the provider's documentation, never guess the format.`,
	);

const TEMPLATE_MARKER_REGEX = /\{\{\s*([\w.-]+)\s*\}\}/g;

/**
 * A recipe whose template and placeholders disagree can't render a usable
 * setup form — collect the problems so the model corrects the recipe instead
 * of the card silently degrading.
 */
export function findSetupHintProblems(hint: InstanceAiCredentialSetupHint): string[] {
	const markers = new Set<string>();
	const collect = (value: unknown): void => {
		if (typeof value === 'string') {
			for (const match of value.matchAll(TEMPLATE_MARKER_REGEX)) markers.add(match[1]);
			return;
		}
		if (Array.isArray(value)) {
			value.forEach(collect);
			return;
		}
		if (typeof value === 'object' && value !== null) {
			Object.values(value).forEach(collect);
		}
	};
	collect(hint.template);

	const problems: string[] = [];
	if (markers.size === 0) {
		problems.push('the template contains no {{placeholder}} marker');
	}
	const defined = new Set(hint.placeholders.map((placeholder) => placeholder.name));
	for (const marker of markers) {
		if (!defined.has(marker)) problems.push(`marker {{${marker}}} has no placeholders entry`);
	}
	for (const name of defined) {
		if (!markers.has(name)) problems.push(`placeholder "${name}" is never used in the template`);
	}
	return problems;
}

export const INVALID_SETUP_HINT_MESSAGE =
	'Each setup hint must be a secret-free template whose {{marker}}s match its placeholders one-to-one. Fix the recipe (or omit it entirely) and retry.';

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
				setupHint: setupHintField.optional(),
			}),
		)
		.describe('List of credentials to set up'),
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

const CREDENTIAL_ACTION_SCHEMAS = {
	list: listAction,
	get: getAction,
	delete: deleteAction,
	'search-types': searchTypesAction,
	setup: setupAction,
	test: testAction,
} as const;

export type CredentialAction = keyof typeof CREDENTIAL_ACTION_SCHEMAS;
type CredentialActionSchema = z.ZodDiscriminatedUnionOption<'action'>;

export interface CredentialsToolOptions {
	allowedActions?: readonly CredentialAction[];
	descriptionPrefix?: string;
	descriptionSuffix?: string;
}

const CREDENTIAL_ACTION_ORDER = [
	'list',
	'get',
	'delete',
	'search-types',
	'setup',
	'test',
] as const satisfies readonly CredentialAction[];

const CREDENTIAL_ACTION_LABELS = {
	list: 'list',
	get: 'get',
	delete: 'delete',
	'search-types': 'search available types',
	setup: 'set up new credentials',
	test: 'test connections',
} satisfies Record<CredentialAction, string>;

function getCredentialActions(options: CredentialsToolOptions): CredentialAction[] {
	if (!options.allowedActions) return [...CREDENTIAL_ACTION_ORDER];

	const allowedActions = new Set(options.allowedActions);
	return CREDENTIAL_ACTION_ORDER.filter((action) => allowedActions.has(action));
}

function createCredentialInputSchema(actions: readonly CredentialAction[]) {
	const actionSchemas: CredentialActionSchema[] = actions.map(
		(action) => CREDENTIAL_ACTION_SCHEMAS[action],
	);

	if (actionSchemas.length === 0) {
		throw new Error('Credentials tool requires at least one allowed action');
	}

	if (actionSchemas.length === 1) {
		return sanitizeInputSchema(actionSchemas[0]);
	}

	return sanitizeInputSchema(
		z.discriminatedUnion(
			'action',
			actionSchemas as [
				CredentialActionSchema,
				CredentialActionSchema,
				...CredentialActionSchema[],
			],
		),
	);
}

type Input =
	| z.infer<typeof listAction>
	| z.infer<typeof getAction>
	| z.infer<typeof deleteAction>
	| z.infer<typeof searchTypesAction>
	| z.infer<typeof setupAction>
	| z.infer<typeof testAction>;

function buildInputSchema(options: CredentialsToolOptions) {
	return createCredentialInputSchema(getCredentialActions(options));
}

function formatActionList(actions: readonly CredentialAction[]): string {
	const labels = actions.map((action) => CREDENTIAL_ACTION_LABELS[action]);
	if (labels.length <= 2) return labels.join(' and ');

	const lastLabel = labels[labels.length - 1];
	return `${labels.slice(0, -1).join(', ')}, and ${lastLabel}`;
}

function getToolDescription(options: CredentialsToolOptions): string {
	const actionList = formatActionList(getCredentialActions(options));
	const description = `${options.descriptionPrefix ?? 'Manage credentials'} — ${actionList}.`;
	const builderSuffix =
		'Use list, get, search-types, and test for credential metadata and connection checks during workflow building.';

	return options.descriptionSuffix
		? `${description} ${options.descriptionSuffix}`
		: `${description} ${builderSuffix}`;
}

// ── Suspend / resume schemas (superset covering delete + setup) ────────────

const suspendSchema = z.object({
	requestId: z.string(),
	message: z.string(),
	severity: instanceAiConfirmationSeveritySchema,
	credentialRequests: z.array(credentialRequestSchema).optional(),
	projectId: z.string().optional(),
	credentialFlow: z.object({ stage: z.enum(['generic', 'finalize']) }).optional(),
});

const resumeSchema = z.object({
	approved: z.boolean(),
	credentials: z.record(z.string()).optional(),
	autoSetup: z.object({ credentialType: z.string() }).optional(),
});

interface CredentialToolContext {
	resumeData: z.infer<typeof resumeSchema> | undefined;
	suspend: (payload: z.infer<typeof suspendSchema>) => Promise<never>;
}

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
	ctx: CredentialToolContext,
) {
	const resumeData = ctx.resumeData;

	if (context.permissions?.deleteCredential === 'blocked') {
		return { success: false, denied: true, reason: 'Action blocked by admin' };
	}

	const needsApproval = context.permissions?.deleteCredential !== 'always_allow';

	// State 1: First call — suspend for confirmation (unless always_allow)
	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		return await ctx.suspend({
			requestId: nanoid(),
			message: `Delete ${input.credentialName ?? input.credentialId}`,
			severity: 'destructive' as const,
		});
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

	if (results.length === 0) {
		return {
			results,
			guidance: `No dedicated credential type matches. If the service's auth fits header/query/body values, use "${TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE}" and provide a credentialHints recipe during setup (see the workflow-builder skill); fall back to other generic types only for what a template cannot express (digest, OAuth flows).`,
		};
	}

	return { results };
}

async function handleSetup(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'setup' }>,
	ctx: CredentialToolContext,
) {
	const resumeData = ctx.resumeData;
	const isFinalize = input.credentialFlow?.stage === 'finalize';

	if (!input.credentials || input.credentials.length === 0) {
		return {
			error: 'missing_credentials',
			message:
				'The `credentials` array is required for the setup action. Pass an array of { credentialType, reason?, suggestedName? } entries describing each credential to set up.',
		};
	}

	// State 1: First call — look up existing credentials per type and suspend
	if (resumeData === undefined || resumeData === null) {
		const hintProblems = input.credentials.flatMap(
			(req: { credentialType: string; setupHint?: InstanceAiCredentialSetupHint }) => {
				if (!req.setupHint) return [];
				const problems = findSetupHintProblems(req.setupHint);
				if (req.credentialType !== TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE) {
					problems.push(`setupHint is only supported for ${TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE}`);
				}
				return problems.map((problem) => `${req.credentialType}: ${problem}`);
			},
		);
		if (hintProblems.length > 0) {
			return {
				error: 'invalid_setup_hint',
				message: INVALID_SETUP_HINT_MESSAGE,
				problems: hintProblems,
			};
		}

		const credentialRequests = await Promise.all(
			input.credentials.map(
				async (req: {
					credentialType: string;
					reason?: string;
					suggestedName?: string;
					setupHint?: InstanceAiCredentialSetupHint;
				}) => {
					const existing = await context.credentialService.list({
						type: req.credentialType,
						...(context.projectId ? { projectId: context.projectId } : {}),
					});
					return {
						credentialType: req.credentialType,
						reason: req.reason ?? `Required for ${req.credentialType}`,
						existingCredentials: existing.map((c) => ({ id: c.id, name: c.name })),
						...(req.suggestedName ? { suggestedName: req.suggestedName } : {}),
						...(req.setupHint ? { setupHint: req.setupHint } : {}),
					};
				},
			),
		);

		const typeNames = input.credentials
			.map((c: { credentialType: string }) => c.credentialType)
			.join(', ');
		return await ctx.suspend({
			requestId: nanoid(),
			message: isFinalize
				? `Your workflow is verified. Add credentials to make it production-ready: ${typeNames}`
				: input.credentials.length === 1
					? `Select or create a ${typeNames} credential`
					: `Select or create credentials: ${typeNames}`,
			severity: 'info' as const,
			credentialRequests,
			...(context.projectId ? { projectId: context.projectId } : {}),
			...(input.credentialFlow ? { credentialFlow: input.credentialFlow } : {}),
		});
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

export function createCredentialsTool(
	context: InstanceAiContext,
	options: CredentialsToolOptions = {},
) {
	const inputSchema = buildInputSchema(options);

	return new Tool(CREDENTIALS_TOOL_ID)
		.description(getToolDescription(options))
		.input(inputSchema)
		.suspend(suspendSchema)
		.resume(resumeSchema)
		.handler(async (input, ctx) => {
			const parsedInput = inputSchema.parse(input) as Input;
			switch (parsedInput.action) {
				case 'list':
					return await handleList(context, parsedInput);
				case 'get':
					return await handleGet(context, parsedInput);
				case 'delete':
					return await handleDelete(context, parsedInput, ctx);
				case 'search-types':
					return await handleSearchTypes(context, parsedInput);
				case 'setup':
					return await handleSetup(context, parsedInput, ctx);
				case 'test':
					return await handleTest(context, parsedInput);
			}
		})
		.build();
}
