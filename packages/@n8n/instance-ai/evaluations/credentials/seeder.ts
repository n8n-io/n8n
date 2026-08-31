// ---------------------------------------------------------------------------
// Per-test-case credential creation for evaluation runs
//
// Test cases declare the credentials their build should see (`credentials` in
// the case JSON). Declared credentials are created for real with a placeholder
// token — set EVAL_*_ACCESS_TOKEN to substitute a real one — and the build
// thread's credential view is pinned to exactly the created set, so concurrent
// cases never observe each other's credentials.
//
// POST /rest/credentials takes raw values -- n8n encrypts them server-side.
// ---------------------------------------------------------------------------

import type { InstanceAiCredentialSetupHint } from '@n8n/api-types';

import type { N8nClient } from '../clients/n8n-client';
import type { EvalLogger } from '../harness/logger';
import type { TestCaseCredential } from '../types';

interface CredentialTemplate {
	defaultName: string;
	envVar?: string;
	buildData: (token: string) => Record<string, unknown>;
}

// Stand-in token for mocked runs; overridden per service by EVAL_*_ACCESS_TOKEN.
const PLACEHOLDER_TOKEN = 'eval-placeholder';

const CREDENTIAL_TEMPLATES: Record<string, CredentialTemplate> = {
	slackApi: {
		defaultName: '[eval] Slack',
		envVar: 'EVAL_SLACK_ACCESS_TOKEN',
		buildData: (token) => ({ accessToken: token }),
	},
	notionApi: {
		defaultName: '[eval] Notion',
		envVar: 'EVAL_NOTION_API_KEY',
		buildData: (key) => ({ apiKey: key }),
	},
	githubApi: {
		defaultName: '[eval] GitHub',
		envVar: 'EVAL_GITHUB_ACCESS_TOKEN',
		buildData: (token) => ({ accessToken: token }),
	},
	gmailOAuth2: {
		defaultName: '[eval] Gmail',
		envVar: 'EVAL_GMAIL_ACCESS_TOKEN',
		buildData: (token) => ({ oauthTokenData: { access_token: token } }),
	},
	googleDriveOAuth2Api: {
		defaultName: '[eval] Google Drive',
		envVar: 'EVAL_GOOGLE_DRIVE_ACCESS_TOKEN',
		buildData: (token) => ({ oauthTokenData: { access_token: token } }),
	},
	googleSheetsOAuth2Api: {
		defaultName: '[eval] Google Sheets',
		envVar: 'EVAL_GOOGLE_SHEETS_ACCESS_TOKEN',
		buildData: (token) => ({ oauthTokenData: { access_token: token } }),
	},
	// MCP-registry-synthesized credential types (agent MCP servers). Creating
	// them requires the backend to run with the `mcp-registry` module enabled;
	// placeholder tokens are fine — agent eval runs mock the MCP wire.
	linearMcpOAuth2Api: {
		defaultName: '[eval] Linear MCP',
		envVar: 'EVAL_LINEAR_MCP_ACCESS_TOKEN',
		buildData: (token) => ({ oauthTokenData: { access_token: token } }),
	},
	notionMcpOAuth2Api: {
		defaultName: '[eval] Notion MCP',
		envVar: 'EVAL_NOTION_MCP_ACCESS_TOKEN',
		buildData: (token) => ({ oauthTokenData: { access_token: token } }),
	},
	microsoftTeamsOAuth2Api: {
		defaultName: '[eval] Teams',
		envVar: 'EVAL_TEAMS_ACCESS_TOKEN',
		buildData: (token) => ({
			scope: 'openid',
			oauthTokenData: { access_token: token },
		}),
	},
	whatsAppTriggerApi: {
		defaultName: '[eval] WhatsApp OAuth account',
		buildData: () => ({ clientId: 'eval-client-id', clientSecret: 'eval-client-secret' }),
	},
	googlePalmApi: {
		defaultName: '[eval] Google Gemini',
		envVar: 'EVAL_GEMINI_API_KEY',
		buildData: (key) => ({
			host: 'https://generativelanguage.googleapis.com',
			apiKey: key,
		}),
	},
	httpHeaderAuth: {
		defaultName: '[eval] HTTP Header',
		buildData: () => ({ name: 'Authorization', value: 'Bearer eval-placeholder' }),
	},
	httpBearerAuth: {
		defaultName: '[eval] HTTP Bearer',
		buildData: (token) => ({ token }),
	},
	httpBasicAuth: {
		defaultName: '[eval] HTTP Basic',
		buildData: () => ({ user: 'eval-user', password: 'eval-pass' }),
	},
	openAiApi: {
		defaultName: '[eval] OpenAI',
		envVar: 'EVAL_OPENAI_API_KEY',
		buildData: (key) => ({ apiKey: key }),
	},
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Types a test case may declare — the case-file schema validates against this. */
export const SUPPORTED_CREDENTIAL_TYPES: ReadonlySet<string> = new Set(
	Object.keys(CREDENTIAL_TEMPLATES),
);

export interface CreatedCredential {
	id: string;
	name: string;
	type: string;
}

/**
 * Create a single credential of the given type. Throws on an unknown type and
 * on creation failure — callers decide what a failure means for their flow
 * (declared-credential seeding fails the build; a mid-run "create" decision
 * falls back to decline, see `user-proxy/tools.ts`).
 *
 * `usedNames` de-dupes display names across calls that share it (e.g. every
 * declared credential in one `createDeclaredCredentials` batch) by appending
 * `#2`, `#3`, ... — pass a fresh `Map` for an unrelated, independent batch.
 */
export async function createOneCredential(
	client: N8nClient,
	credentialType: string,
	name: string | undefined,
	usedNames: Map<string, number>,
	options?: {
		logger?: EvalLogger;
		setupHint?: InstanceAiCredentialSetupHint;
		/** Seed with no field values, modelling a credential the user saved empty. */
		blank?: boolean;
	},
): Promise<CreatedCredential> {
	if (credentialType === 'httpTemplatedCustomAuth') {
		return await createTemplatedCustomAuthCredential(client, name, usedNames, options);
	}

	const template = CREDENTIAL_TEMPLATES[credentialType];
	if (!template) {
		throw new Error(
			`No credential template for type "${credentialType}" — add one to evaluations/credentials/seeder.ts`,
		);
	}

	const base = name ?? template.defaultName;
	const count = (usedNames.get(base) ?? 0) + 1;
	usedNames.set(base, count);
	const resolvedName = count > 1 ? `${base} #${count}` : base;

	const envToken = template.envVar ? process.env[template.envVar] : undefined;
	const token = envToken ?? PLACEHOLDER_TOKEN;
	options?.logger?.verbose(
		`  Creating credential ${resolvedName} (${credentialType})${options.blank ? ' [blank]' : ''}`,
	);
	// No retry: a credential POST isn't idempotent, so retrying after a lost response would orphan a duplicate we never capture for cleanup.
	const { id } = await client.createCredential(
		resolvedName,
		credentialType,
		options?.blank ? {} : template.buildData(token),
	);
	return { id, name: resolvedName, type: credentialType };
}

/**
 * Mint an `httpTemplatedCustomAuth` ("Simplified Custom Auth") credential from
 * a setup card's recipe. Unlike the 14 types above, this type has no fixed
 * field shape — the AI builder researches it at runtime per service — so there
 * is no `CREDENTIAL_TEMPLATES` entry to look up; the recipe carried on
 * `options.setupHint` is the only source of the data to persist.
 */
async function createTemplatedCustomAuthCredential(
	client: N8nClient,
	name: string | undefined,
	usedNames: Map<string, number>,
	options?: { logger?: EvalLogger; setupHint?: InstanceAiCredentialSetupHint },
): Promise<CreatedCredential> {
	const hint = options?.setupHint;
	if (!hint) {
		throw new Error(
			'No setupHint for credential type "httpTemplatedCustomAuth" — this type has no static ' +
				'template in evaluations/credentials/seeder.ts (its field shape only exists once a ' +
				'real setup card proposes a recipe mid-conversation), so a case cannot declare it as ' +
				'a static credential at load time.',
		);
	}

	const base = name ?? hint.suggestedName ?? '[eval] Simplified Custom Auth';
	const count = (usedNames.get(base) ?? 0) + 1;
	usedNames.set(base, count);
	const resolvedName = count > 1 ? `${base} #${count}` : base;

	if (!hint.serviceHost) {
		options?.logger?.warn(
			`httpTemplatedCustomAuth credential "${resolvedName}" created with no serviceHost — ` +
				'it will not be offered to any node',
		);
	}

	// `template`, `placeholderDefs`, `placeholderValues` and `acceptedStatusCodes`
	// all persist as JSON strings on this credential type, even though the recipe
	// types some of them as objects/arrays — see HttpTemplatedCustomAuth.credentials.ts.
	const placeholderValues = Object.fromEntries(
		hint.placeholders.map((placeholder) => [placeholder.name, PLACEHOLDER_TOKEN]),
	);

	options?.logger?.verbose(`  Creating credential ${resolvedName} (httpTemplatedCustomAuth)`);
	const { id } = await client.createCredential(resolvedName, 'httpTemplatedCustomAuth', {
		template: JSON.stringify(hint.template),
		placeholderDefs: JSON.stringify(hint.placeholders),
		placeholderValues: JSON.stringify(placeholderValues),
		serviceHost: hint.serviceHost ?? '',
		docsUrl: hint.docsUrl ?? '',
		testUrl: hint.testUrl ?? '',
		acceptedStatusCodes: hint.acceptedStatusCodes ? JSON.stringify(hint.acceptedStatusCodes) : '',
	});
	return { id, name: resolvedName, type: 'httpTemplatedCustomAuth' };
}

/**
 * Create the credentials a test case declares. Throws on unknown types and on
 * creation failures — declared credentials are load-bearing for the case's
 * expectations, so a partial set must fail the build rather than skew it.
 *
 * `onCreated` fires per credential as it is created (not only on full
 * success), so the caller can register every ID for cleanup even when a later
 * creation throws.
 *
 * `nameCounts` defaults to a fresh, call-scoped `Map` — pass one in (and reuse
 * it for a later `createOneCredential` call, e.g. `UserProxyLlm`'s mid-run
 * credential creation) so a credential created mid-run doesn't collide on
 * display name with one declared and seeded here (both would otherwise be
 * "[eval] Slack" with no `#2` suffix, since the counters wouldn't know about
 * each other — see TRUST-349 PR review).
 */
export async function createDeclaredCredentials(
	client: N8nClient,
	declared: TestCaseCredential[],
	options?: {
		onCreated?: (id: string) => void;
		logger?: EvalLogger;
		nameCounts?: Map<string, number>;
	},
): Promise<CreatedCredential[]> {
	const logger = options?.logger;
	const created: CreatedCredential[] = [];
	const nameCounts = options?.nameCounts ?? new Map<string, number>();

	for (const decl of declared) {
		const cred = await createOneCredential(client, decl.type, decl.name, nameCounts, {
			logger,
			...(decl.blank ? { blank: true } : {}),
		});
		options?.onCreated?.(cred.id);
		created.push(cred);
	}

	return created;
}

/**
 * Best-effort cleanup of created credentials after an evaluation run.
 */
export async function cleanupCredentials(
	client: N8nClient,
	credentialIds: string[],
): Promise<void> {
	for (const id of credentialIds) {
		try {
			await client.deleteCredential(id);
		} catch {
			// Best-effort cleanup
		}
	}
}
