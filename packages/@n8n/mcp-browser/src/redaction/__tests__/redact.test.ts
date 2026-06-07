import type { CallToolResult } from '../../types';
import { BUILTIN_PATTERNS } from '../patterns';
import { findRegexSecretHits, redactCallToolResult, redactString } from '../redact';

const ANTHROPIC = `sk-ant-api03-${'a'.repeat(93)}AA`;
const GITHUB = `ghp_${'b'.repeat(36)}`;

const FIXTURES: Array<{ slug: string; secret: string }> = [
	{
		slug: 'pem_private_key',
		secret:
			'-----BEGIN RSA PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSj\n-----END RSA PRIVATE KEY-----',
	},
	{
		slug: 'openssh_private_key',
		secret:
			'-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAA\n-----END OPENSSH PRIVATE KEY-----',
	},
	{ slug: 'anthropic_api_key', secret: ANTHROPIC },
	{ slug: 'anthropic_admin_key', secret: `sk-ant-admin01-${'c'.repeat(93)}AA` },
	{ slug: 'openai_api_key', secret: `sk-proj-${'d'.repeat(74)}` },
	{ slug: 'openai_legacy_api_key', secret: `sk-${'e'.repeat(48)}` },
	{ slug: 'huggingface_token', secret: `hf_${'f'.repeat(34)}` },
	{ slug: 'google_api_key', secret: `AIza${'A'.repeat(35)}` },
	{ slug: 'aws_access_key_id', secret: `AKIA${'A'.repeat(16)}` },
	{ slug: 'azure_ad_client_secret', secret: `aaa1Q~${'a'.repeat(31)}` },
	{ slug: 'github_pat', secret: GITHUB },
	{ slug: 'github_fine_grained_pat', secret: `github_pat_${'g'.repeat(82)}` },
	{ slug: 'github_oauth', secret: `gho_${'h'.repeat(36)}` },
	{ slug: 'github_app_token', secret: `ghu_${'i'.repeat(36)}` },
	{ slug: 'github_refresh_token', secret: `ghr_${'j'.repeat(36)}` },
	{ slug: 'gitlab_pat', secret: `glpat-${'k'.repeat(20)}` },
	{ slug: 'slack_bot_token', secret: `xoxb-1111111111-1111111111-${'l'.repeat(24)}` },
	{ slug: 'slack_user_token', secret: `xoxp-1111111111-1111111111-1111111111-${'m'.repeat(12)}` },
	{ slug: 'slack_webhook_url', secret: `https://hooks.slack.com/services/${'N'.repeat(43)}` },
	{ slug: 'twilio_api_key_sid', secret: `SK${'0'.repeat(32)}` },
	{ slug: 'twilio_account_sid', secret: `AC${'1'.repeat(32)}` },
	{ slug: 'stripe_secret_key', secret: `sk_live_${'o'.repeat(20)}` },
	{ slug: 'square_access_token', secret: `sq0atp-${'p'.repeat(22)}` },
	{ slug: 'npm_token', secret: `npm_${'q'.repeat(36)}` },
	{ slug: 'pypi_token', secret: `pypi-AgEIcHlwaS5vcmc${'r'.repeat(50)}` },
	{ slug: 'sentry_user_token', secret: `sntryu_${'s'.repeat(64)}` },
	{ slug: 'grafana_api_key', secret: `eyJrIjoi${'t'.repeat(70)}` },
	{ slug: 'jwt', secret: `eyJ${'u'.repeat(10)}.eyJ${'v'.repeat(10)}.${'w'.repeat(10)}` },

	// AI providers
	{ slug: 'openai_service_account_key', secret: `sk-svcacct-${'a'.repeat(40)}` },
	{ slug: 'groq_api_key', secret: `gsk_${'b'.repeat(52)}` },
	{ slug: 'perplexity_api_key', secret: `pplx-${'c'.repeat(48)}` },
	{ slug: 'xai_api_key', secret: `xai-${'d'.repeat(80)}` },
	{ slug: 'fireworks_api_key', secret: `fw_${'e'.repeat(24)}` },
	{ slug: 'replicate_api_token', secret: `r8_${'f'.repeat(37)}` },
	{ slug: 'langsmith_api_key_v1', secret: `ls__${'a'.repeat(32)}` },
	{
		slug: 'langsmith_api_key_v2',
		secret: `lsv2_pt_${'a'.repeat(40)}_${'b'.repeat(16)}`,
	},

	// Cloud / infra
	{ slug: 'google_oauth_client_secret', secret: `GOCSPX-${'g'.repeat(30)}` },
	{ slug: 'digitalocean_pat', secret: `dop_v1_${'a'.repeat(64)}` },
	{ slug: 'digitalocean_oauth_token', secret: `doo_v1_${'b'.repeat(64)}` },
	{ slug: 'digitalocean_refresh_token', secret: `dor_v1_${'c'.repeat(64)}` },
	{ slug: 'hashicorp_vault_service_token', secret: `hvs.${'h'.repeat(95)}` },
	{ slug: 'hashicorp_vault_batch_token', secret: `hvb.${'i'.repeat(95)}` },
	{ slug: 'pulumi_access_token', secret: `pul-${'a'.repeat(40)}` },
	{
		slug: 'terraform_cloud_api_token',
		secret: `${'a'.repeat(14)}.atlasv1.${'b'.repeat(65)}`,
	},
	{ slug: 'databricks_pat', secret: `dapi${'a'.repeat(32)}` },
	{ slug: 'doppler_token', secret: `dp.pt.${'z'.repeat(43)}` },

	// Source / CI
	{ slug: 'gitlab_pipeline_trigger_token', secret: `glptt-${'a'.repeat(40)}` },
	{ slug: 'gitlab_runner_registration_token', secret: `GR1348941${'b'.repeat(25)}` },
	{ slug: 'gitlab_feed_token', secret: `glft-${'c'.repeat(25)}` },
	{ slug: 'clojars_token', secret: `CLOJARS_${'d'.repeat(60)}` },
	{ slug: 'readme_api_key', secret: `rdme_${'e'.repeat(70)}` },

	// Messaging / social
	{
		slug: 'discord_bot_token',
		secret: `M${'a'.repeat(23)}.${'b'.repeat(6)}.${'c'.repeat(30)}`,
	},
	{ slug: 'telegram_bot_token', secret: `123456789:A${'a'.repeat(34)}` },
	{ slug: 'twitter_bearer_token', secret: `${'A'.repeat(21)}${'b'.repeat(80)}` },
	{ slug: 'facebook_access_token', secret: `EAACEdEose0cBA${'x'.repeat(40)}` },

	// Payments / commerce
	{ slug: 'shopify_access_token', secret: `shpat_${'a'.repeat(32)}` },
	{ slug: 'shopify_custom_access_token', secret: `shpca_${'b'.repeat(32)}` },
	{ slug: 'shopify_private_app_token', secret: `shppa_${'c'.repeat(32)}` },
	{ slug: 'shopify_shared_secret', secret: `shpss_${'d'.repeat(32)}` },

	// SaaS / dev tools
	{ slug: 'atlassian_api_token', secret: `ATATT3x${'a'.repeat(185)}` },
	{ slug: 'sendgrid_api_key', secret: `SG.${'a'.repeat(22)}.${'b'.repeat(43)}` },
	{ slug: 'mailgun_api_key', secret: `key-${'a'.repeat(32)}` },
	{ slug: 'mailchimp_api_key', secret: `${'a'.repeat(32)}-us12` },
	{ slug: 'postman_api_key', secret: `PMAK-${'a'.repeat(24)}-${'b'.repeat(34)}` },
	{ slug: 'linear_api_key', secret: `lin_api_${'a'.repeat(40)}` },
	{ slug: 'notion_integration_token', secret: `secret_${'a'.repeat(43)}` },
	{ slug: 'figma_pat', secret: `figd_${'a'.repeat(40)}` },
	{ slug: 'dropbox_long_lived_token', secret: `sl.${'a'.repeat(135)}` },
];

describe('BUILTIN_PATTERNS coverage', () => {
	it('has a fixture for every shipped pattern', () => {
		expect(FIXTURES.map((fixture) => fixture.slug).sort()).toEqual(
			BUILTIN_PATTERNS.map((pattern) => pattern.slug).sort(),
		);
	});

	it('keeps pattern slugs unique', () => {
		const slugs = BUILTIN_PATTERNS.map((pattern) => pattern.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
	});
});

describe('redactString', () => {
	it('redacts issuer-shaped secrets', () => {
		expect(redactString(`key=${ANTHROPIC}`)).toBe('key=[REDACTED:anthropic_api_key:1]');
		expect(redactString(`token=${GITHUB}`)).toBe('token=[REDACTED:github_pat:1]');
	});

	it.each(FIXTURES)('redacts $slug', ({ slug, secret }) => {
		expect(redactString(`before ${secret} after`)).toBe(`before [REDACTED:${slug}:1] after`);
	});

	it('redacts multiple different patterns in one string', () => {
		expect(redactString(`anthropic=${ANTHROPIC} github=${GITHUB}`)).toBe(
			'anthropic=[REDACTED:anthropic_api_key:1] github=[REDACTED:github_pat:2]',
		);
	});

	it('uses the same number for repeated occurrences of the same secret', () => {
		expect(redactString(`${ANTHROPIC} ${ANTHROPIC}`)).toBe(
			'[REDACTED:anthropic_api_key:1] [REDACTED:anthropic_api_key:1]',
		);
	});

	it('preserves aria-tree refs around redacted values', () => {
		expect(redactString(`button "Copy ${ANTHROPIC}" [ref=e42]`)).toBe(
			'button "Copy [REDACTED:anthropic_api_key:1]" [ref=e42]',
		);
	});

	it('does not redact common browser trace strings', () => {
		const input = 'commit a1b2c3d4e5f60718293a4b5c6d7e8f9012345678 by alice';
		expect(redactString(input)).toBe(input);
	});

	it.each([
		'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4',
		'https://example.com/?utm_source=newsletter&fbclid=IwAR0xQ8mN1kJyZpQrStUvWxYzAbCdEf',
		'Press the Enter key to submit',
		'group "Account" [ref=e1]\n  text "Bernhard" [ref=e2]\n  link "Sign out" [ref=e3]',
		// Bare 32-char hex string (no recognisable provider prefix) must not
		// be redacted by any of the new rules.
		'hash=0123456789abcdef0123456789abcdef',
		// UUID shape — Heroku/Cloudflare-like — intentionally not matched.
		'request-id: 550e8400-e29b-41d4-a716-446655440000',
		// Long base64 chunk inside a data URL preview — must remain intact.
		'src="data:application/octet-stream;base64,QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVowMTIzNDU2Nzg5Kys="',
	])('does not falsely redact %j', (input) => {
		expect(redactString(input)).toBe(input);
	});
});

describe('findRegexSecretHits', () => {
	it('dedupes matches by type and value', () => {
		expect(findRegexSecretHits(`${ANTHROPIC} ${ANTHROPIC}`)).toEqual([
			{ type: 'anthropic_api_key', value: ANTHROPIC },
		]);
	});
});

describe('redactCallToolResult', () => {
	it('redacts both text content and structured content', () => {
		const result: CallToolResult = {
			content: [{ type: 'text', text: JSON.stringify({ result: ANTHROPIC }) }],
			structuredContent: { result: ANTHROPIC },
		};

		redactCallToolResult(result);

		expect(result.content[0]).toEqual({
			type: 'text',
			text: JSON.stringify({ result: '[REDACTED:anthropic_api_key:1]' }),
		});
		expect(result.structuredContent).toEqual({ result: '[REDACTED:anthropic_api_key:1]' });
	});

	it('uses one numbering scope across text content and structured content', () => {
		const result: CallToolResult = {
			content: [{ type: 'text', text: `anthropic=${ANTHROPIC}` }],
			structuredContent: { github: GITHUB, repeated: ANTHROPIC },
		};

		redactCallToolResult(result);

		expect(result.content[0]).toEqual({
			type: 'text',
			text: 'anthropic=[REDACTED:anthropic_api_key:1]',
		});
		expect(result.structuredContent).toEqual({
			github: '[REDACTED:github_pat:2]',
			repeated: '[REDACTED:anthropic_api_key:1]',
		});
	});

	it('leaves image content blocks untouched', () => {
		const result: CallToolResult = {
			content: [
				{ type: 'image', data: ANTHROPIC, mimeType: 'image/png' },
				{ type: 'text', text: ANTHROPIC },
			],
		};

		redactCallToolResult(result);

		expect(result.content[0]).toEqual({ type: 'image', data: ANTHROPIC, mimeType: 'image/png' });
		expect(result.content[1]).toEqual({ type: 'text', text: '[REDACTED:anthropic_api_key:1]' });
	});

	it('redacts nested plain object and array values', () => {
		const result: CallToolResult = {
			content: [{ type: 'text', text: '{}' }],
			structuredContent: {
				entries: [{ text: ANTHROPIC }, { text: 'safe' }],
			},
		};

		redactCallToolResult(result);

		expect(result.structuredContent).toEqual({
			entries: [{ text: '[REDACTED:anthropic_api_key:1]' }, { text: 'safe' }],
		});
	});

	it('does not recurse into class instances', () => {
		const error = new Error(ANTHROPIC);
		const result: CallToolResult = {
			content: [{ type: 'text', text: '{}' }],
			structuredContent: { error },
		};

		redactCallToolResult(result);

		expect((result.structuredContent as { error: Error }).error).toBe(error);
		expect(error.message).toBe(ANTHROPIC);
	});

	it('redacts deeply nested plain object values', () => {
		type Chain = { a?: Chain; leak?: string };
		const root: Chain = {};
		let current = root;
		for (let i = 0; i < 12; i++) {
			current.a = {};
			current = current.a;
		}
		current.leak = ANTHROPIC;

		const result: CallToolResult = {
			content: [{ type: 'text', text: '{}' }],
			structuredContent: root as Record<string, unknown>,
		};

		redactCallToolResult(result);

		let walk = result.structuredContent as Chain;
		for (let i = 0; i < 12; i++) walk = walk.a!;
		expect(walk.leak).toBe('[REDACTED:anthropic_api_key:1]');
	});
});
