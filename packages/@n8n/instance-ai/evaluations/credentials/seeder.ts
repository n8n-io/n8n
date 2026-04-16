// ---------------------------------------------------------------------------
// Credential seeding and cleanup for evaluation runs
//
// External service credentials (Slack, GitHub, etc.) require real tokens
// via environment variables. If the env var is not set, the credential
// is skipped. Generic HTTP credentials use placeholder values and are
// always seeded.
//
// POST /rest/credentials takes raw values -- n8n encrypts them server-side.
// ---------------------------------------------------------------------------

import type { N8nClient } from '../clients/n8n-client';

// ---------------------------------------------------------------------------
// Config types
// ---------------------------------------------------------------------------

interface CredentialConfig {
	envVar: string;
	type: string;
	name: string;
	dataBuilder: (token: string) => Record<string, unknown>;
}

interface GenericCredentialConfig {
	type: string;
	name: string;
	data: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Credential definitions
// ---------------------------------------------------------------------------

const CREDENTIAL_CONFIGS: CredentialConfig[] = [
	{
		envVar: 'EVAL_SLACK_ACCESS_TOKEN',
		type: 'slackApi',
		name: '[eval] Slack',
		dataBuilder: (token) => ({ accessToken: token }),
	},
	{
		envVar: 'EVAL_NOTION_API_KEY',
		type: 'notionApi',
		name: '[eval] Notion',
		dataBuilder: (key) => ({ apiKey: key }),
	},
	{
		envVar: 'EVAL_GITHUB_ACCESS_TOKEN',
		type: 'githubApi',
		name: '[eval] GitHub',
		dataBuilder: (token) => ({ accessToken: token }),
	},
	{
		envVar: 'EVAL_GMAIL_ACCESS_TOKEN',
		type: 'gmailOAuth2Api',
		name: '[eval] Gmail',
		dataBuilder: (token) => ({ oauthTokenData: { access_token: token } }),
	},
	{
		envVar: 'EVAL_TEAMS_ACCESS_TOKEN',
		type: 'microsoftTeamsOAuth2Api',
		name: '[eval] Teams',
		dataBuilder: (token) => ({
			scope: 'openid',
			oauthTokenData: { access_token: token },
		}),
	},
];

const GENERIC_CREDENTIALS: GenericCredentialConfig[] = [
	{
		type: 'httpHeaderAuth',
		name: '[eval] HTTP Header',
		data: { name: 'Authorization', value: 'Bearer eval-placeholder' },
	},
	{
		type: 'httpBasicAuth',
		name: '[eval] HTTP Basic',
		data: { user: 'eval-user', password: 'eval-pass' },
	},
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface SeedResult {
	credentialIds: string[];
	seededTypes: string[];
}

/**
 * Seed credentials into the n8n instance for evaluation runs.
 *
 * For env-var-based configs, the credential is skipped if the env var is not
 * set. Generic credentials (HTTP Header, HTTP Basic) are always seeded.
 *
 * When `requiredTypes` is provided, only credentials matching those types are
 * seeded. When omitted, all available credentials are seeded.
 */
export async function seedCredentials(
	client: N8nClient,
	requiredTypes?: string[],
): Promise<SeedResult> {
	const credentialIds: string[] = [];
	const seededTypes: string[] = [];
	const typeFilter = requiredTypes ? new Set(requiredTypes) : undefined;

	// Seed env-var-based credentials
	for (const config of CREDENTIAL_CONFIGS) {
		if (typeFilter && !typeFilter.has(config.type)) continue;

		const token = process.env[config.envVar];
		if (!token) {
			console.log(`  Skipping ${config.name}: ${config.envVar} not set`);
			continue;
		}

		try {
			const data = config.dataBuilder(token);
			const { id } = await client.createCredential(config.name, config.type, data);
			credentialIds.push(id);
			seededTypes.push(config.type);
		} catch {
			// Non-fatal -- credential type may not exist on this n8n version
		}
	}

	// Always seed generic credentials
	for (const generic of GENERIC_CREDENTIALS) {
		if (typeFilter && !typeFilter.has(generic.type)) continue;

		try {
			const { id } = await client.createCredential(generic.name, generic.type, generic.data);
			credentialIds.push(id);
			seededTypes.push(generic.type);
		} catch {
			// Non-fatal
		}
	}

	return { credentialIds, seededTypes };
}

/**
 * Best-effort cleanup of seeded credentials after an evaluation run.
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
