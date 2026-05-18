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
		expect(redactString(`key=${ANTHROPIC}`)).toBe('key=[REDACTED:anthropic_api_key]');
		expect(redactString(`token=${GITHUB}`)).toBe('token=[REDACTED:github_pat]');
	});

	it.each(FIXTURES)('redacts $slug', ({ slug, secret }) => {
		expect(redactString(`before ${secret} after`)).toBe(`before [REDACTED:${slug}] after`);
	});

	it('redacts multiple different patterns in one string', () => {
		expect(redactString(`anthropic=${ANTHROPIC} github=${GITHUB}`)).toBe(
			'anthropic=[REDACTED:anthropic_api_key] github=[REDACTED:github_pat]',
		);
	});

	it('preserves aria-tree refs around redacted values', () => {
		expect(redactString(`button "Copy ${ANTHROPIC}" [ref=e42]`)).toBe(
			'button "Copy [REDACTED:anthropic_api_key]" [ref=e42]',
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
			text: JSON.stringify({ result: '[REDACTED:anthropic_api_key]' }),
		});
		expect(result.structuredContent).toEqual({ result: '[REDACTED:anthropic_api_key]' });
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
		expect(result.content[1]).toEqual({ type: 'text', text: '[REDACTED:anthropic_api_key]' });
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
			entries: [{ text: '[REDACTED:anthropic_api_key]' }, { text: 'safe' }],
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
		expect(walk.leak).toBe('[REDACTED:anthropic_api_key]');
	});
});
