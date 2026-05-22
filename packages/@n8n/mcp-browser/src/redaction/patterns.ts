// Secret-redaction regexes for MCP browser tool output.
//
// Patterns are adapted from the gitleaks default ruleset
// (https://github.com/gitleaks/gitleaks/blob/master/config/gitleaks.toml).
// We only port rules that match a distinctive, prefix-anchored token shape so
// each regex is precise on its own — gitleaks' two-stage "keyword + regex"
// matcher is not reproduced here. Rules that rely on keyword proximity
// (Datadog, Cloudflare global key, Algolia, Heroku, CircleCI, generic
// 32-hex/UUID shapes) are intentionally omitted to avoid false positives on
// arbitrary page content.

export interface SecretPattern {
	slug: string;
	pattern: RegExp;
}

const PEM_PRIVATE_KEY =
	/-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----|-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/;

export const BUILTIN_PATTERNS: SecretPattern[] = [
	// --- Keys / certificates ---
	{
		slug: 'openssh_private_key',
		pattern:
			/-----BEGIN OPENSSH PRIVATE KEY-----[\s\S]*?-----END OPENSSH PRIVATE KEY-----|-----BEGIN OPENSSH PRIVATE KEY-----/,
	},
	{ slug: 'pem_private_key', pattern: PEM_PRIVATE_KEY },

	// --- AI providers ---
	{ slug: 'anthropic_api_key', pattern: /sk-ant-api\d{2}-[A-Za-z0-9_-]{80,}/ },
	{ slug: 'anthropic_admin_key', pattern: /sk-ant-admin\d{2}-[A-Za-z0-9_-]{80,}/ },
	{ slug: 'openai_api_key', pattern: /sk-proj-[A-Za-z0-9_-]{40,}/ },
	{ slug: 'openai_service_account_key', pattern: /sk-svcacct-[A-Za-z0-9_-]{20,}/ },
	{ slug: 'openai_legacy_api_key', pattern: /sk-[A-Za-z0-9]{48}/ },
	{ slug: 'huggingface_token', pattern: /hf_[A-Za-z0-9]{34,}/ },
	{ slug: 'groq_api_key', pattern: /gsk_[A-Za-z0-9]{52}/ },
	{ slug: 'perplexity_api_key', pattern: /pplx-[A-Za-z0-9]{48,}/ },
	{ slug: 'xai_api_key', pattern: /xai-[A-Za-z0-9]{80}/ },
	{ slug: 'fireworks_api_key', pattern: /fw_[A-Za-z0-9]{24,}/ },
	{ slug: 'replicate_api_token', pattern: /r8_[A-Za-z0-9]{37,}/ },
	{ slug: 'langsmith_api_key_v1', pattern: /ls__[a-f0-9]{32}/ },
	{ slug: 'langsmith_api_key_v2', pattern: /lsv2_(?:pt|sk)_[a-f0-9]{40}_[a-f0-9]{16}/ },

	// --- Cloud / infra ---
	{ slug: 'google_api_key', pattern: /AIza[0-9A-Za-z_-]{35}/ },
	{ slug: 'google_oauth_client_secret', pattern: /GOCSPX-[A-Za-z0-9_-]{28,}/ },
	{ slug: 'aws_access_key_id', pattern: /(?:AKIA|ASIA)[A-Z0-9]{16}/ },
	{ slug: 'azure_ad_client_secret', pattern: /[A-Za-z0-9_-]{3,}~[A-Za-z0-9_-]{31,}/ },
	{ slug: 'digitalocean_pat', pattern: /dop_v1_[a-f0-9]{64}/ },
	{ slug: 'digitalocean_oauth_token', pattern: /doo_v1_[a-f0-9]{64}/ },
	{ slug: 'digitalocean_refresh_token', pattern: /dor_v1_[a-f0-9]{64}/ },
	{ slug: 'hashicorp_vault_service_token', pattern: /hvs\.[A-Za-z0-9_-]{90,}/ },
	{ slug: 'hashicorp_vault_batch_token', pattern: /hvb\.[A-Za-z0-9_-]{90,}/ },
	{ slug: 'pulumi_access_token', pattern: /pul-[a-f0-9]{40}/ },
	{ slug: 'terraform_cloud_api_token', pattern: /[A-Za-z0-9]{14}\.atlasv1\.[A-Za-z0-9_-]{60,}/ },
	{ slug: 'databricks_pat', pattern: /dapi[a-h0-9]{32}(?:-\d)?/ },
	{ slug: 'doppler_token', pattern: /dp\.pt\.[A-Za-z0-9]{43}/ },

	// --- Source / CI ---
	{ slug: 'github_pat', pattern: /ghp_[A-Za-z0-9]{36}/ },
	{ slug: 'github_fine_grained_pat', pattern: /github_pat_[A-Za-z0-9_]{22,}/ },
	{ slug: 'github_oauth', pattern: /gho_[A-Za-z0-9]{36}/ },
	{ slug: 'github_app_token', pattern: /ghu_[A-Za-z0-9]{36}/ },
	{ slug: 'github_refresh_token', pattern: /ghr_[A-Za-z0-9]{36}/ },
	{ slug: 'gitlab_pat', pattern: /glpat-[A-Za-z0-9_-]{20,}/ },
	{ slug: 'gitlab_pipeline_trigger_token', pattern: /glptt-[0-9a-f]{40}/ },
	{ slug: 'gitlab_runner_registration_token', pattern: /GR1348941[A-Za-z0-9_-]{20,}/ },
	{ slug: 'gitlab_feed_token', pattern: /glft-[A-Za-z0-9_-]{20,}/ },
	{ slug: 'clojars_token', pattern: /CLOJARS_[A-Za-z0-9]{60}/ },
	{ slug: 'readme_api_key', pattern: /rdme_[A-Za-z0-9]{70}/ },

	// --- Messaging / social ---
	{ slug: 'slack_bot_token', pattern: /xoxb-\d{10,13}-\d{10,13}-[A-Za-z0-9]{20,}/ },
	{ slug: 'slack_user_token', pattern: /xoxp-\d{10,13}-\d{10,13}-\d{10,13}-[A-Za-z0-9]{10,}/ },
	{
		slug: 'slack_webhook_url',
		pattern: /https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/_-]{30,}/,
	},
	// `discord_bot_token` must precede `jwt`: both shapes can match the same
	// string (three base64url segments separated by `.`), and we want the more
	// specific provider slug to win when both apply.
	{
		slug: 'discord_bot_token',
		pattern: /[MN][A-Za-z0-9_-]{23}\.[A-Za-z0-9_-]{6,7}\.[A-Za-z0-9_-]{27,38}/,
	},
	{ slug: 'telegram_bot_token', pattern: /\b\d{5,16}:A[A-Za-z0-9_-]{34}\b/ },
	{ slug: 'twitter_bearer_token', pattern: /AAAAAAAAAAAAAAAAAAAAA[A-Za-z0-9%]{35,}/ },
	{ slug: 'facebook_access_token', pattern: /EAACEdEose0cBA[A-Za-z0-9]+/ },

	// --- Payments / commerce ---
	{ slug: 'twilio_api_key_sid', pattern: /SK[0-9a-fA-F]{32}/ },
	{ slug: 'twilio_account_sid', pattern: /AC[0-9a-fA-F]{32}/ },
	{ slug: 'stripe_secret_key', pattern: /sk_(?:live|test)_[A-Za-z0-9]{20,}/ },
	{ slug: 'square_access_token', pattern: /sq0atp-[A-Za-z0-9_-]{22,}/ },
	{ slug: 'shopify_access_token', pattern: /shpat_[a-fA-F0-9]{32}/ },
	{ slug: 'shopify_custom_access_token', pattern: /shpca_[a-fA-F0-9]{32}/ },
	{ slug: 'shopify_private_app_token', pattern: /shppa_[a-fA-F0-9]{32}/ },
	{ slug: 'shopify_shared_secret', pattern: /shpss_[a-fA-F0-9]{32}/ },

	// --- SaaS / dev tools ---
	{ slug: 'npm_token', pattern: /npm_[A-Za-z0-9]{36,}/ },
	{ slug: 'pypi_token', pattern: /pypi-AgEIcHlwaS5vcmc[A-Za-z0-9_-]{20,}/ },
	{ slug: 'sentry_user_token', pattern: /sntryu_[A-Za-z0-9_-]{32,}/ },
	{ slug: 'grafana_api_key', pattern: /eyJrIjoi[A-Za-z0-9_-]{30,}/ },
	{ slug: 'atlassian_api_token', pattern: /ATATT3x[A-Za-z0-9_=-]{180,}/ },
	{ slug: 'sendgrid_api_key', pattern: /SG\.[A-Za-z0-9_-]{16,32}\.[A-Za-z0-9_-]{16,64}/ },
	{ slug: 'mailgun_api_key', pattern: /key-[a-f0-9]{32}/ },
	{ slug: 'mailchimp_api_key', pattern: /[a-f0-9]{32}-us\d{1,2}/ },
	{ slug: 'postman_api_key', pattern: /PMAK-[a-f0-9]{24}-[a-f0-9]{34}/ },
	{ slug: 'linear_api_key', pattern: /lin_api_[A-Za-z0-9]{40}/ },
	{ slug: 'notion_integration_token', pattern: /secret_[A-Za-z0-9]{43}/ },
	{ slug: 'figma_pat', pattern: /figd_[A-Za-z0-9_-]{40,}/ },
	{ slug: 'dropbox_long_lived_token', pattern: /sl\.[A-Za-z0-9_-]{130,}/ },

	// --- Generic ---
	// Must come after `discord_bot_token` so that token shape is labelled with
	// the more specific provider slug.
	{ slug: 'jwt', pattern: /eyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/ },
];
