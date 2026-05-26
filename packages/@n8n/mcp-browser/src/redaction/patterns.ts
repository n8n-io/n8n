export interface SecretPattern {
	slug: string;
	pattern: RegExp;
}

const PEM_PRIVATE_KEY =
	/-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----|-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/;

export const BUILTIN_PATTERNS: SecretPattern[] = [
	{
		slug: 'openssh_private_key',
		pattern:
			/-----BEGIN OPENSSH PRIVATE KEY-----[\s\S]*?-----END OPENSSH PRIVATE KEY-----|-----BEGIN OPENSSH PRIVATE KEY-----/,
	},
	{ slug: 'pem_private_key', pattern: PEM_PRIVATE_KEY },
	{ slug: 'anthropic_api_key', pattern: /sk-ant-api\d{2}-[A-Za-z0-9_-]{80,}/ },
	{ slug: 'anthropic_admin_key', pattern: /sk-ant-admin\d{2}-[A-Za-z0-9_-]{80,}/ },
	{ slug: 'openai_api_key', pattern: /sk-proj-[A-Za-z0-9_-]{40,}/ },
	{ slug: 'openai_legacy_api_key', pattern: /sk-[A-Za-z0-9]{48}/ },
	{ slug: 'huggingface_token', pattern: /hf_[A-Za-z0-9]{34,}/ },
	{ slug: 'google_api_key', pattern: /AIza[0-9A-Za-z_-]{35}/ },
	{ slug: 'aws_access_key_id', pattern: /(?:AKIA|ASIA)[A-Z0-9]{16}/ },
	{ slug: 'azure_ad_client_secret', pattern: /[A-Za-z0-9_-]{3,}~[A-Za-z0-9_-]{31,}/ },
	{ slug: 'github_pat', pattern: /ghp_[A-Za-z0-9]{36}/ },
	{ slug: 'github_fine_grained_pat', pattern: /github_pat_[A-Za-z0-9_]{22,}/ },
	{ slug: 'github_oauth', pattern: /gho_[A-Za-z0-9]{36}/ },
	{ slug: 'github_app_token', pattern: /ghu_[A-Za-z0-9]{36}/ },
	{ slug: 'github_refresh_token', pattern: /ghr_[A-Za-z0-9]{36}/ },
	{ slug: 'gitlab_pat', pattern: /glpat-[A-Za-z0-9_-]{20,}/ },
	{ slug: 'slack_bot_token', pattern: /xoxb-\d{10,13}-\d{10,13}-[A-Za-z0-9]{20,}/ },
	{ slug: 'slack_user_token', pattern: /xoxp-\d{10,13}-\d{10,13}-\d{10,13}-[A-Za-z0-9]{10,}/ },
	{
		slug: 'slack_webhook_url',
		pattern: /https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/_-]{30,}/,
	},
	{ slug: 'twilio_api_key_sid', pattern: /SK[0-9a-fA-F]{32}/ },
	{ slug: 'twilio_account_sid', pattern: /AC[0-9a-fA-F]{32}/ },
	{ slug: 'stripe_secret_key', pattern: /sk_(?:live|test)_[A-Za-z0-9]{20,}/ },
	{ slug: 'square_access_token', pattern: /sq0atp-[A-Za-z0-9_-]{22,}/ },
	{ slug: 'npm_token', pattern: /npm_[A-Za-z0-9]{36,}/ },
	{ slug: 'pypi_token', pattern: /pypi-AgEIcHlwaS5vcmc[A-Za-z0-9_-]{20,}/ },
	{ slug: 'sentry_user_token', pattern: /sntryu_[A-Za-z0-9_-]{32,}/ },
	{ slug: 'grafana_api_key', pattern: /eyJrIjoi[A-Za-z0-9_-]{30,}/ },
	{ slug: 'jwt', pattern: /eyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/ },
];
