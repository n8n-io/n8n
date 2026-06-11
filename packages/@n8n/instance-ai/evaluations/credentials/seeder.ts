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
	gmailOAuth2Api: {
		defaultName: '[eval] Gmail',
		envVar: 'EVAL_GMAIL_ACCESS_TOKEN',
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
	httpHeaderAuth: {
		defaultName: '[eval] HTTP Header',
		buildData: () => ({ name: 'Authorization', value: 'Bearer eval-placeholder' }),
	},
	httpBasicAuth: {
		defaultName: '[eval] HTTP Basic',
		buildData: () => ({ user: 'eval-user', password: 'eval-pass' }),
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

const CREATE_ATTEMPTS = 3;

/**
 * Create the credentials a test case declares. Throws on unknown types and on
 * creation failures — declared credentials are load-bearing for the case's
 * expectations, so a partial set must fail the build rather than skew it.
 *
 * `onCreated` fires per credential as it is created (not only on full
 * success), so the caller can register every ID for cleanup even when a later
 * creation throws.
 */
export async function createDeclaredCredentials(
	client: N8nClient,
	declared: TestCaseCredential[],
	options?: { onCreated?: (id: string) => void; logger?: EvalLogger },
): Promise<CreatedCredential[]> {
	const logger = options?.logger;
	const created: CreatedCredential[] = [];
	const nameCounts = new Map<string, number>();

	for (const decl of declared) {
		const template = CREDENTIAL_TEMPLATES[decl.type];
		if (!template) {
			throw new Error(
				`No credential template for type "${decl.type}" — add one to evaluations/credentials/seeder.ts`,
			);
		}

		const base = decl.name ?? template.defaultName;
		const count = (nameCounts.get(base) ?? 0) + 1;
		nameCounts.set(base, count);
		const name = count > 1 ? `${base} #${count}` : base;

		const envToken = template.envVar ? process.env[template.envVar] : undefined;
		const token = envToken ?? PLACEHOLDER_TOKEN;
		logger?.verbose(`  Creating credential ${name} (${decl.type})`);
		const id = await createWithRetry(client, name, decl.type, template.buildData(token), logger);
		options?.onCreated?.(id);
		created.push({ id, name, type: decl.type });
	}

	return created;
}

async function createWithRetry(
	client: N8nClient,
	name: string,
	type: string,
	data: Record<string, unknown>,
	logger?: EvalLogger,
): Promise<string> {
	for (let attempt = 1; ; attempt++) {
		try {
			const { id } = await client.createCredential(name, type, data);
			return id;
		} catch (error) {
			if (attempt >= CREATE_ATTEMPTS) throw error;
			logger?.verbose(
				`  Credential create attempt ${String(attempt)}/${String(CREATE_ATTEMPTS)} failed (${error instanceof Error ? error.message : String(error)}); retrying`,
			);
			await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
		}
	}
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
