// Credential fixtures for eval seeding.
//
// Reuses the same shape as CredentialPayload from @n8n/backend-test-utils
// and credential data patterns from node integration tests.
//
// Seeded via POST /rest/credentials before eval runs so the agent
// can discover and attach them when building workflows.

export interface CredentialFixture {
	type: string;
	name: string;
	data: Record<string, unknown>;
}

export const EVAL_CREDENTIALS: CredentialFixture[] = [
	// -- API key credentials --
	{
		type: 'slackApi',
		name: 'Eval — Slack API',
		data: { accessToken: 'xoxb-eval-placeholder-token' },
	},
	{
		type: 'notionApi',
		name: 'Eval — Notion API',
		data: { apiKey: 'ntn_eval_placeholder_key' },
	},
	{
		type: 'githubApi',
		name: 'Eval — GitHub API',
		data: { accessToken: 'ghp_eval_placeholder_token' },
	},

	// -- OAuth credentials --
	{
		type: 'gmailOAuth2Api',
		name: 'Eval — Gmail',
		data: { oauthTokenData: { access_token: 'eval-placeholder-token' } },
	},
	{
		type: 'microsoftTeamsOAuth2Api',
		name: 'Eval — Microsoft Teams',
		data: {
			scope: 'openid',
			oauthTokenData: { access_token: 'eval-placeholder-token' },
		},
	},

	// -- Generic HTTP credentials --
	{
		type: 'httpHeaderAuth',
		name: 'Eval — HTTP Header Auth',
		data: { name: 'Authorization', value: 'Bearer eval-placeholder' },
	},
	{
		type: 'httpBasicAuth',
		name: 'Eval — HTTP Basic Auth',
		data: { user: 'eval-user', password: 'eval-pass' },
	},
];
