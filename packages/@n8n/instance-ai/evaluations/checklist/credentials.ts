// Credential fixtures for eval seeding.
//
// External service credentials (Slack, GitHub, etc.) require real tokens
// via environment variables. If the env var is not set, the credential
// is skipped. Generic HTTP credentials use placeholder values.
//
// POST /rest/credentials takes raw values — n8n encrypts them server-side.

export interface CredentialFixture {
	type: string;
	name: string;
	/** Env var that must contain the real token. If unset, credential is skipped. */
	envVar?: string;
	data: () => Record<string, unknown> | undefined;
}

export const EVAL_CREDENTIALS: CredentialFixture[] = [
	// -- External service credentials (require real tokens) --
	{
		type: 'slackApi',
		name: 'Eval — Slack API',
		envVar: 'EVAL_SLACK_ACCESS_TOKEN',
		data: () => {
			const token = process.env.EVAL_SLACK_ACCESS_TOKEN;
			if (!token) return undefined;
			return { accessToken: token };
		},
	},
	{
		type: 'notionApi',
		name: 'Eval — Notion API',
		envVar: 'EVAL_NOTION_API_KEY',
		data: () => {
			const key = process.env.EVAL_NOTION_API_KEY;
			if (!key) return undefined;
			return { apiKey: key };
		},
	},
	{
		type: 'githubApi',
		name: 'Eval — GitHub API',
		envVar: 'EVAL_GITHUB_ACCESS_TOKEN',
		data: () => {
			const token = process.env.EVAL_GITHUB_ACCESS_TOKEN;
			if (!token) return undefined;
			return { accessToken: token };
		},
	},
	{
		type: 'gmailOAuth2Api',
		name: 'Eval — Gmail',
		envVar: 'EVAL_GMAIL_ACCESS_TOKEN',
		data: () => {
			const token = process.env.EVAL_GMAIL_ACCESS_TOKEN;
			if (!token) return undefined;
			return { oauthTokenData: { access_token: token } };
		},
	},
	{
		type: 'microsoftTeamsOAuth2Api',
		name: 'Eval — Microsoft Teams',
		envVar: 'EVAL_TEAMS_ACCESS_TOKEN',
		data: () => {
			const token = process.env.EVAL_TEAMS_ACCESS_TOKEN;
			if (!token) return undefined;
			return { scope: 'openid', oauthTokenData: { access_token: token } };
		},
	},

	// -- Generic HTTP credentials (no real token needed) --
	{
		type: 'httpHeaderAuth',
		name: 'Eval — HTTP Header Auth',
		data: () => ({ name: 'Authorization', value: 'Bearer eval-placeholder' }),
	},
	{
		type: 'httpBasicAuth',
		name: 'Eval — HTTP Basic Auth',
		data: () => ({ user: 'eval-user', password: 'eval-pass' }),
	},
];
