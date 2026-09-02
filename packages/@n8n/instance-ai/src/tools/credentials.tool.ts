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
import {
	buildChatModelProviderHint,
	isChatModelProviderCredentialType,
} from './nodes/preferred-chat-model';
import { CREDENTIALS_TOOL_ID } from './tool-ids';
import {
	GENERIC_AUTH_CREDENTIAL_TYPES,
	N8N_CONNECT_DISPLAY_NAME,
} from './workflows/credential-utils';

// ── Constants ──────────────────────────────────────────────────────────────

export { CREDENTIALS_TOOL_ID };

const DEFAULT_LIMIT = 50;

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
					info: z
						.string()
						.optional()
						.describe(
							'Optional one-line clarification of the value itself — its format or which of the provider\'s tokens it is (e.g. "Starts with tvly-"). NEVER where to obtain it: the user asks the AI Assistant for that. No URLs or domains.',
						),
					type: z
						.enum(['password', 'plain'])
						.optional()
						.describe('Defaults to password (masked input)'),
					optional: z
						.boolean()
						.optional()
						.describe(
							'Set true only when the service documents the value as optional (e.g. an org/region qualifier) — the user may leave it empty, and template entries referencing an empty optional placeholder are omitted from the request. Omit for anything required to authenticate.',
						),
				}),
			)
			.min(1)
			.describe('One entry per {{marker}} in the template — every marker must be described here.'),
		docsUrl: z
			.string()
			.optional()
			.describe(
				'Direct URL of the provider page where the user creates/copies the secret (e.g. https://replicate.com/account/api-tokens). Not shown in the form — the AI help thread uses it to send the user to the exact page, so it must come from a fetched page, never constructed. NOT the API reference documentation.',
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
				"Side-effect-free endpoint that answers an authenticated GET, used to verify the credential on save and on later retests. Prefer a documented account/profile/me-style endpoint; when the provider has none, use another documented read-only GET that rejects invalid keys (usage, quota, list/discovery). Never a resource or action URL, never anything that can trigger billable work, never one of the workflow's own endpoints. Omit only when the provider documents no such endpoint.",
			),
		// acceptedStatusCodes is deliberately NOT model-facing: models pad it
		// regardless of instructions, and a padded [401] blinds the probe to real
		// rejections. The credential's own field stays user-editable.
	})
	.describe(
		`Recipe for creating a "${TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE}" credential so the user only has to paste their secret(s) — the rest is pre-filled. Provide it whenever the service has no dedicated credential type and its auth is expressible as header/query/body values; ground it in the provider's documentation, never guess the format.`,
	);

/**
 * Plain generic auth types a Templated Custom Auth template can fully express
 * (basic auth is excluded: base64-encoding the user/password pair is beyond a
 * template). Creating a NEW credential of one of these on an HTTP Request node
 * is steered to the templated type instead.
 */
export const TEMPLATABLE_PLAIN_AUTH_TYPES = new Set([
	'httpBearerAuth',
	'httpHeaderAuth',
	'httpQueryAuth',
	'httpCustomAuth',
]);

const TEMPLATE_MARKER_REGEX = /\{\{\s*([\w.-]+)\s*\}\}/g;

// Navigation belongs in docsUrl, so info must not carry URLs — including
// schemeless domains ("app.tavily.com/home"), which slip past a scheme-only
// check. TLD heuristic; a false positive costs one retriable correction.
const INFO_LINK_REGEX =
	/https?:\/\/|www\.|\b[\w-]+(?:\.[\w-]+)*\.(?:com|io|ai|dev|app|net|org|co|run|sh|cloud)\b/i;

/**
 * Reduce a (possibly expression-typed) URL to a comparable `origin + pathname`
 * prefix: strips the `=` expression marker, cuts at the first `{{`, drops the
 * query string and trailing slashes. Returns undefined for non-http values.
 */
function normalizeUrlForComparison(raw: unknown): string | undefined {
	if (typeof raw !== 'string') return undefined;
	const plain = (raw.startsWith('=') ? raw.slice(1) : raw).split('{{')[0].trim();
	if (!/^https?:\/\//i.test(plain)) return undefined;
	try {
		const url = new URL(plain);
		return `${url.origin}${url.pathname}`.replace(/\/+$/, '');
	} catch {
		return undefined;
	}
}

function extractHttpOrigin(raw: unknown): string | undefined {
	if (typeof raw !== 'string') return undefined;
	try {
		const url = new URL(raw);
		return url.protocol === 'http:' || url.protocol === 'https:' ? url.origin : undefined;
	} catch {
		return undefined;
	}
}

export function findSetupHintTestUrlOriginProblem(
	hint: InstanceAiCredentialSetupHint,
	serviceOrigin: string,
): string | undefined {
	if (hint.testUrl === undefined) return undefined;
	const testOrigin = extractHttpOrigin(hint.testUrl);
	if (!testOrigin) {
		return `testUrl "${hint.testUrl}" is not an absolute HTTP URL — omit testUrl if no documented read-only endpoint is available`;
	}
	if (testOrigin !== serviceOrigin) {
		return `testUrl origin "${testOrigin}" does not match the workflow service origin "${serviceOrigin}" — use a documented read-only endpoint on the workflow service or omit testUrl`;
	}
	return undefined;
}

/**
 * Collect recipe problems so the model corrects them instead of the card
 * silently degrading. `nodeUrls` additionally rejects a testUrl pointing at
 * one of the workflow's own endpoints — the probe GETs it, so that yields a
 * meaningless verdict at best and a billable request at worst.
 */
export function findSetupHintProblems(
	hint: InstanceAiCredentialSetupHint,
	options: { nodeUrls?: unknown[] } = {},
): string[] {
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
	for (const placeholder of hint.placeholders) {
		if (INFO_LINK_REGEX.test(placeholder.info ?? '')) {
			problems.push(
				`placeholder "${placeholder.name}" mentions a URL or domain in its info — keep info to the value itself (its format, or which of the provider's tokens it is); the user asks the AI Assistant where to get it`,
			);
		}
	}
	// The type defaults to password, so this only trips recipes that explicitly
	// mark every input plain — which would render every secret in cleartext.
	if (
		hint.placeholders.length > 0 &&
		hint.placeholders.every((placeholder) => placeholder.type === 'plain')
	) {
		problems.push(
			'every placeholder is plain — at least one must be a password (masked) input; omit type or use "password" for the secret',
		);
	}
	// A duplicate name silently collapses in the defined-Set below, and the form
	// keeps the last def — so a masked def followed by a plain one would render
	// the secret in cleartext. Require exactly one def per marker.
	const defined = new Set<string>();
	for (const placeholder of hint.placeholders) {
		if (defined.has(placeholder.name)) {
			problems.push(
				`placeholder "${placeholder.name}" is defined more than once — each {{marker}} needs exactly one definition`,
			);
		}
		defined.add(placeholder.name);
	}
	for (const marker of markers) {
		if (!defined.has(marker)) problems.push(`marker {{${marker}}} has no placeholders entry`);
	}
	for (const name of defined) {
		if (!markers.has(name)) problems.push(`placeholder "${name}" is never used in the template`);
	}
	const normalizedTestUrl = normalizeUrlForComparison(hint.testUrl);
	if (normalizedTestUrl) {
		const collision = (options.nodeUrls ?? [])
			.map(normalizeUrlForComparison)
			.some((nodeUrl) => nodeUrl !== undefined && nodeUrl === normalizedTestUrl);
		if (collision) {
			problems.push(
				`testUrl "${hint.testUrl}" is one of the workflow's own endpoints — the probe sends a GET, so it must be a separate documented read-only endpoint (account/usage/list); omit testUrl if the provider documents none`,
			);
		}
	}
	return problems;
}

export const INVALID_SETUP_HINT_MESSAGE =
	'Each setup hint must be a secret-free template whose {{marker}}s match its placeholders one-to-one. Fix the recipe (or omit it entirely) and retry.';

/**
 * Registered type names often diverge from credential class names, and a
 * made-up name sails through to a setup card the frontend cannot render.
 * Resolve which requested types are unknown so setup fails fast with a
 * corrective error instead. Types are trusted as-is when the service doesn't
 * expose the lookup.
 */
async function findUnknownCredentialTypes(
	context: InstanceAiContext,
	credentialTypes: string[],
): Promise<string[]> {
	const service = context.credentialService;
	if (!service.credentialTypeExists) return [];

	const unknown: string[] = [];
	for (const credentialType of new Set(credentialTypes)) {
		// The templated type is created from the setupHint recipe, not looked up.
		if (credentialType === TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE) continue;
		try {
			if (!(await service.credentialTypeExists(credentialType))) {
				unknown.push(credentialType);
			}
		} catch {
			// Existence lookup failing is a soft signal — don't block setup on it.
		}
	}
	return unknown;
}

/**
 * Search queries for near-matches of an unknown type, most to least specific:
 * the name itself, the name without its OAuth2/Api suffix, and the leading
 * lowercase run (the service part of a camelCase name).
 */
function deriveTypeSuggestionQueries(credentialType: string): string[] {
	const queries = [credentialType];
	const withoutSuffix = credentialType.replace(/(?:OAuth2(?:Api)?|Api)$/, '');
	if (withoutSuffix && !queries.includes(withoutSuffix)) queries.push(withoutSuffix);
	const service = /^[a-z0-9]+/.exec(credentialType)?.[0];
	if (service && !queries.includes(service)) queries.push(service);
	return queries;
}

const MAX_TYPE_SUGGESTIONS = 5;

async function suggestCredentialTypes(
	context: InstanceAiContext,
	credentialType: string,
): Promise<Array<{ type: string; displayName: string }>> {
	const service = context.credentialService;
	if (!service.searchCredentialTypes) return [];

	for (const query of deriveTypeSuggestionQueries(credentialType)) {
		try {
			const results = (await service.searchCredentialTypes(query)).filter(
				(result) => !GENERIC_AUTH_CREDENTIAL_TYPES.has(result.type),
			);
			if (results.length > 0) return results.slice(0, MAX_TYPE_SUGGESTIONS);
		} catch {
			// Try the next, broader query.
		}
	}
	return [];
}

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
		.optional()
		.describe(
			'Search keyword — typically the service name (e.g. "linear", "notion", "slack"). Optional when `gatewayCreditsOnly` is set.',
		),
	gatewayCreditsOnly: z
		.boolean()
		.optional()
		.describe(
			'When true, ignore `query` and return every credential type supported by Gateway credits. Use to answer "which credential types support Gateway credits?".',
		),
});

const standaloneSetupHintField = setupHintField.omit({ testUrl: true });

const setupAction = z.object({
	action: z
		.literal('setup')
		.describe(
			'Open the credential setup card for the user to create or select credentials. The card is only visible while this call is pending — any returned result means the interaction already finished. A `success` result with a `credentials` map means setup is complete (a sole service-scoped credential may have been auto-selected with no user action, unless the entry set `preferNew`; generic auth types always need an explicit Continue): confirm the credentials are ready and do not tell the user a card is open or that they must authorize.',
		),
	credentials: z
		.array(
			z.object({
				credentialType: z
					.string()
					.describe(
						'n8n credential type name (e.g. "slackApi", "gmailOAuth2"). Must be the registered type name, which can differ from the credential class name — verify with action "search-types" when unsure.',
					),
				reason: z.string().optional().describe('Why this credential is needed (shown to user)'),
				suggestedName: z
					.string()
					.optional()
					.describe(
						'Suggested display name for the credential (e.g. "Linear API key"). Pre-fills the name field when creating a new credential.',
					),
				preferNew: z
					.boolean()
					.optional()
					.describe(
						'Set ONLY when the user explicitly asked to create a new credential of this type ("create a new Slack credential"). The card then opens with nothing preselected instead of offering the most recent existing credential — existing ones stay listed in case the user changes their mind.',
					),
				setupHint: standaloneSetupHintField.optional(),
			}),
		)
		.describe('List of credentials to set up'),
	requireUserSelection: z
		.boolean()
		.optional()
		.describe(
			'Set true only for standalone setup when the user explicitly asks to create a new, separate, or different credential, or explicitly asks to see the setup card or choose a credential even if one already exists. Keeps the card open for an explicit user choice instead of automatically accepting a sole existing credential. Omit otherwise.',
		),
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
	const browserSetupSuffix =
		'When `credentials(action="setup")` returns `needsBrowserSetup=true`, load `credential-setup-with-computer-use`, then use Computer Use `browser_*` tools directly.';

	return options.descriptionSuffix
		? `${description} ${options.descriptionSuffix} ${browserSetupSuffix}`
		: `${description} ${builderSuffix} ${browserSetupSuffix}`;
}

// ── Suspend / resume schemas (superset covering delete + setup) ────────────

const suspendSchema = z.object({
	requestId: z.string(),
	message: z.string(),
	severity: instanceAiConfirmationSeveritySchema,
	credentialRequests: z.array(credentialRequestSchema).optional(),
	projectId: z.string().optional(),
	requireUserSelection: z.boolean().optional(),
	credentialFlow: z.object({ stage: z.enum(['generic', 'finalize']) }).optional(),
});

export const credentialsResumeSchema = z.object({
	approved: z.boolean(),
	credentials: z.record(z.string()).optional(),
	autoSetup: z.object({ credentialType: z.string(), attemptId: z.string().optional() }).optional(),
});

interface CredentialToolContext {
	resumeData: z.infer<typeof credentialsResumeSchema> | undefined;
	suspend: (payload: z.infer<typeof suspendSchema>) => Promise<never>;
}

// ── Handlers ───────────────────────────────────────────────────────────────

interface StoredCredentialListItem {
	id: string;
	name: string;
	type: string;
}

interface AiGatewayManagedListItem {
	id: null;
	name: string;
	type: string;
	__aiGatewayManaged: true;
}

async function handleList(context: InstanceAiContext, input: Extract<Input, { action: 'list' }>) {
	const storedCredentials = await context.credentialService.list({
		type: input.type,
	});

	// An empty LLM-provider lookup is the moment the builder locks in a default
	// provider — surface the LLM credentials the user does have so it prefers
	// those (or asks) instead.
	let chatModelProviderHint: string | undefined;
	if (
		input.type &&
		storedCredentials.length === 0 &&
		isChatModelProviderCredentialType(input.type)
	) {
		try {
			const allStored = await context.credentialService.list({});
			chatModelProviderHint = buildChatModelProviderHint(input.type, allStored);
		} catch {
			// Soft signal — the primary (empty) listing still returns.
		}
	}

	// When the caller filters by type, prepend the synthetic n8n Connect
	// managed entry if the AI Gateway covers that credential type. This is
	// the LLM's primary awareness signal that a zero-config credential is
	// available. Section D's setup service auto-applies the entry through a
	// separate path (rule 3); this listing is informational.
	const items: Array<StoredCredentialListItem | AiGatewayManagedListItem> = [];
	if (input.type && context.credentialService.isAiGatewayCredentialType) {
		try {
			const supported = await context.credentialService.isAiGatewayCredentialType(input.type);
			if (supported) {
				items.push({
					id: null,
					name: N8N_CONNECT_DISPLAY_NAME,
					type: input.type,
					__aiGatewayManaged: true,
				});
			}
		} catch {
			// Gateway lookup failing is a soft signal — omit the managed entry
			// and continue with stored credentials only.
		}
	}
	for (const c of storedCredentials) items.push({ id: c.id, name: c.name, type: c.type });

	const filtered = input.name
		? items.filter((c) => c.name.toLowerCase().includes(input.name!.toLowerCase()))
		: items;

	const total = filtered.length;
	const offset = input.offset ?? 0;
	const limit = input.limit ?? DEFAULT_LIMIT;
	const page = filtered.slice(offset, offset + limit);
	const hasMore = offset + page.length < total;

	const truncatedWithoutNarrowing = hasMore && !input.name && !input.type;

	// Mutually exclusive: the provider hint requires a type filter, the
	// truncation hint requires none.
	const hint =
		chatModelProviderHint ??
		(truncatedWithoutNarrowing
			? `Showing ${page.length} of ${total} credentials. Pass \`name\` (substring) or \`type\` to narrow the search before concluding a user-named credential doesn't exist, or use \`offset\` to paginate.`
			: undefined);

	return {
		credentials: page.map((c) =>
			c.id === null
				? { id: c.id, name: c.name, type: c.type, __aiGatewayManaged: c.__aiGatewayManaged }
				: { id: c.id, name: c.name, type: c.type },
		),
		total,
		hasMore,
		...(hint ? { hint } : {}),
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
	// Enumerate n8n Connect–supported types regardless of query.
	if (input.gatewayCreditsOnly) {
		const types = (await context.credentialService.listAiGatewayCredentialTypes?.()) ?? [];
		return { results: types.map((type) => ({ type, gatewayCredits: true })) };
	}

	if (!context.credentialService.searchCredentialTypes) {
		return { results: [] };
	}

	if (!input.query) {
		return {
			results: [],
			error: 'A `query` is required for search-types unless `gatewayCreditsOnly` is set.',
		};
	}

	const allResults = await context.credentialService.searchCredentialTypes(input.query);

	// Filter out generic auth types — the AI should use dedicated types
	const results = allResults.filter((r) => !GENERIC_AUTH_CREDENTIAL_TYPES.has(r.type));

	if (results.length === 0) {
		return {
			results,
			guidance: `No dedicated credential type matches. If the service's auth fits header/query/body values, use "${TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE}" and provide a credentialHints recipe during setup (see the workflow-builder skill). This includes bearer tokens: when the provider documents \`Authorization: Bearer <token>\`, do NOT use httpBearerAuth — template it as {"headers":{"Authorization":"Bearer {{api_key}}"}}. Fall back to other generic types for what a template cannot express (basic auth's base64 pair, digest, OAuth flows) — or when the user explicitly asks for a specific plain type: an explicit user choice wins (setup accepts it with allowPlainGenericAuth: true).`,
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
		const unknownTypes = await findUnknownCredentialTypes(
			context,
			input.credentials.map((req: { credentialType: string }) => req.credentialType),
		);
		if (unknownTypes.length > 0) {
			const suggestions: Record<string, Array<{ type: string; displayName: string }>> = {};
			for (const credentialType of unknownTypes) {
				const matches = await suggestCredentialTypes(context, credentialType);
				if (matches.length > 0) suggestions[credentialType] = matches;
			}
			return {
				error: 'unknown_credential_type',
				message: `No credential type named ${unknownTypes
					.map((type) => `"${type}"`)
					.join(
						', ',
					)} is registered on this instance. Type names can differ from credential class names. Pick the exact type from the suggestions, or find it with credentials(action: "search-types"), then retry.`,
				...(Object.keys(suggestions).length > 0 ? { suggestions } : {}),
			};
		}

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
					preferNew?: boolean;
					setupHint?: InstanceAiCredentialSetupHint;
				}) => {
					// This card has no node context to match candidates by service, so
					// offer none (fail closed) rather than another service's key.
					const existing =
						req.credentialType === TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE
							? []
							: await context.credentialService.list({
									type: req.credentialType,
									...(context.projectId ? { projectId: context.projectId } : {}),
								});
					return {
						credentialType: req.credentialType,
						reason: req.reason ?? `Required for ${req.credentialType}`,
						existingCredentials: existing.map((c) => ({ id: c.id, name: c.name })),
						...(req.suggestedName ? { suggestedName: req.suggestedName } : {}),
						...(req.preferNew ? { preferNew: true } : {}),
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
			...(input.requireUserSelection === true ? { requireUserSelection: true } : {}),
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
		const { credentialType, attemptId } = resumeData.autoSetup;
		context.browserCredentialSetup?.markPending(credentialType, attemptId);
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
	const selectedCredentials = resumeData.credentials ?? {};
	const hasSelections = Object.keys(selectedCredentials).length > 0;
	return {
		success: true,
		credentials: selectedCredentials,
		message: hasSelections
			? 'Credential setup is complete — the credentials in the map above are selected and ready to use. The setup card is no longer open and no user action (such as OAuth authorization) is needed; confirm the outcome to the user.'
			: 'The setup interaction finished without any credential selected. The setup card is no longer open — do not tell the user a card is open or waiting; report the outcome and ask how they want to proceed.',
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
		.resume(credentialsResumeSchema)
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
