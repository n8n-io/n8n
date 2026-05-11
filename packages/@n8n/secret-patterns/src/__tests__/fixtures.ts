// Shared test fixtures for redaction tests.
//
// Each "secret" is a synthetic string that matches a built-in pattern's
// shape but is obviously fake. Each "non-secret" is a string that appears
// in normal traces and must NOT trigger redaction.

const ALPHANUM_93 = 'a'.repeat(93);
const ALPHANUM_74 = 'b'.repeat(74);
const ALPHANUM_48 = 'c'.repeat(48);
const ALPHANUM_36 = 'd'.repeat(36);
const ALPHANUM_82 = 'e'.repeat(82);
const ALPHANUM_70 = 'f'.repeat(70);

export const PEM_BODY = 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQ\nfakebase64bytes==';
export const OPENSSH_BODY = 'b3BlbnNzaC1rZXktdjEAAAAA\nfakebase64bytes==';

export const SECRET_FIXTURES: ReadonlyArray<{ slug: string; secret: string }> = [
	{
		slug: 'pem_private_key',
		secret: `-----BEGIN RSA PRIVATE KEY-----\n${PEM_BODY}\n-----END RSA PRIVATE KEY-----`,
	},
	{
		slug: 'openssh_private_key',
		secret: `-----BEGIN OPENSSH PRIVATE KEY-----\n${OPENSSH_BODY}\n-----END OPENSSH PRIVATE KEY-----`,
	},
	{ slug: 'anthropic_api_key', secret: `sk-ant-api03-${ALPHANUM_93}AA` },
	{ slug: 'anthropic_admin_key', secret: `sk-ant-admin01-${ALPHANUM_93}AA` },
	{ slug: 'openai_api_key', secret: `sk-proj-${ALPHANUM_74}` },
	{ slug: 'openai_legacy_api_key', secret: `sk-${ALPHANUM_48}` },
	{ slug: 'huggingface_token', secret: `hf_${'a'.repeat(34)}` },
	{ slug: 'google_api_key', secret: `AIza${'A'.repeat(35)}` },
	{ slug: 'aws_access_key_id', secret: `AKIA${'A'.repeat(16)}` },
	{ slug: 'azure_ad_client_secret', secret: `aaa1Q~${'a'.repeat(31)}` },
	{ slug: 'github_pat', secret: `ghp_${ALPHANUM_36}` },
	{ slug: 'github_fine_grained_pat', secret: `github_pat_${ALPHANUM_82}` },
	{ slug: 'github_oauth', secret: `gho_${ALPHANUM_36}` },
	{ slug: 'github_app_token', secret: `ghu_${ALPHANUM_36}` },
	{ slug: 'github_refresh_token', secret: `ghr_${ALPHANUM_36}` },
	{ slug: 'gitlab_pat', secret: `glpat-${'a'.repeat(20)}` },
	{ slug: 'slack_bot_token', secret: `xoxb-1111111111-1111111111-${'a'.repeat(24)}` },
	{ slug: 'slack_user_token', secret: `xoxp-1111111111-1111111111-1111111111-${'a'.repeat(12)}` },
	{ slug: 'slack_webhook_url', secret: `https://hooks.slack.com/services/${'A'.repeat(43)}` },
	{ slug: 'twilio_api_key_sid', secret: `SK${'0'.repeat(32)}` },
	{ slug: 'twilio_account_sid', secret: `AC${'0'.repeat(32)}` },
	{ slug: 'stripe_secret_key', secret: `sk_live_${'a'.repeat(20)}` },
	{ slug: 'square_access_token', secret: `sq0atp-${'a'.repeat(22)}` },
	{ slug: 'npm_token', secret: `npm_${ALPHANUM_36}` },
	{ slug: 'pypi_token', secret: `pypi-AgEIcHlwaS5vcmc${'a'.repeat(50)}` },
	{ slug: 'sentry_user_token', secret: `sntryu_${'0'.repeat(64)}` },
	{ slug: 'grafana_api_key', secret: `eyJrIjoi${ALPHANUM_70}` },
	{
		slug: 'jwt',
		secret: `eyJ${'a'.repeat(10)}.eyJ${'a'.repeat(10)}.${'a'.repeat(10)}`,
	},
];

export const NON_SECRETS: readonly string[] = [
	// UUID v4
	'request-id: 550e8400-e29b-41d4-a716-446655440000',
	// UUID v1
	'event-id: c232ab00-9414-11ec-b909-0242ac120002',
	// Git commit SHA (40-char hex)
	'commit a1b2c3d4e5f60718293a4b5c6d7e8f9012345678 by alice',
	// SHA-256 hex (64 chars)
	'integrity sha256-2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
	// MD5 (32-char hex)
	'etag: 5d41402abc4b2a76b9719d911017c592',
	// ISO timestamp
	'createdAt: 2026-05-11T10:30:00.000Z',
	// Generic URL
	'visit https://example.com/api/v1/users?id=42',
	// GitHub blob URL with full SHA
	'https://github.com/n8n-io/n8n/blob/a1b2c3d4e5f60718293a4b5c6d7e8f9012345678/AGENTS.md',
	// Long URL tracking params
	'https://example.com/?utm_source=newsletter&fbclid=IwAR0xQ8mN1kJyZpQrStUvWxYzAbCdEf',
	// Base64-encoded PNG header (data URL)
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4',
	// n8n workflow ID
	'workflowId=Wf1zM3yKlAbCdEfG status=success',
	// n8n execution ID (numeric)
	'execution 12345 completed',
	// File path
	'reading /Users/alice/.n8n/credentials/abc-def.json',
	// Tool / node name
	'invoking n8n-nodes-base.httpRequest with method=GET',
	// Email
	'notify bernhard.wittmann@n8n.io about the change',
	// Cron expression
	'schedule: "0 8 * * 1-5"',
	// AWS-prefix-look-alike with non-uppercase chars (breaks [A-Z2-7] body)
	'AKIA-this-is-not-an-aws-key',
	// `sk` token without the dash separator
	'sketches and renders',
	// Plain English with the word "key"
	'Press the Enter key to submit',
	// Long random hex (not prefix-anchored to anything we redact)
	'session=89abcdef0123456789abcdef0123456789abcdef',
	// Aria tree without secrets
	'group "Account" @e1\n  text "Bernhard" @e2\n  link "Sign out" @e3',
];
