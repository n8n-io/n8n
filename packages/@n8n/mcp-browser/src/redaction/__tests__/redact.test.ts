import type { CallToolResult } from '../../types';
import { BUILTIN_PATTERNS } from '../patterns';
import { redactCallToolResult, redactString, redactValue } from '../redact';

// Test fixtures — synthetic strings that match each pattern's shape but are
// obviously fake. None of these are real credentials. Each is sized to the
// minimum the regex requires, so the test fails loudly if a regex changes.
const ALPHANUM_93 = 'a'.repeat(93);
const ALPHANUM_74 = 'b'.repeat(74);
const ALPHANUM_48 = 'c'.repeat(48);
const ALPHANUM_36 = 'd'.repeat(36);
const ALPHANUM_82 = 'e'.repeat(82);
const ALPHANUM_70 = 'f'.repeat(70);

const PEM_BODY = 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQ\nfakebase64bytes==';
const OPENSSH_BODY = 'b3BlbnNzaC1rZXktdjEAAAAA\nfakebase64bytes==';

const FIXTURES: Array<{ slug: string; secret: string }> = [
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

describe('BUILTIN_PATTERNS coverage', () => {
	it('test fixtures cover every shipped pattern', () => {
		const fixtureSlugs = new Set(FIXTURES.map((f) => f.slug));
		const patternSlugs = BUILTIN_PATTERNS.map((p) => p.slug);
		for (const slug of patternSlugs) {
			expect(fixtureSlugs).toContain(slug);
		}
	});

	it('every slug is unique', () => {
		const slugs = BUILTIN_PATTERNS.map((p) => p.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
	});
});

describe('redactString', () => {
	it.each(FIXTURES)('redacts $slug', ({ slug, secret }) => {
		const out = redactString(`prefix ${secret} suffix`);
		expect(out).toBe(`prefix [REDACTED:${slug}] suffix`);
	});

	it('redacts multiple occurrences of the same pattern', () => {
		const secret = `ghp_${ALPHANUM_36}`;
		const out = redactString(`one ${secret} two ${secret} three`);
		expect(out).toBe('one [REDACTED:github_pat] two [REDACTED:github_pat] three');
	});

	it('redacts multiple distinct patterns in one string', () => {
		const ghp = `ghp_${ALPHANUM_36}`;
		const sk = `sk-ant-api03-${ALPHANUM_93}AA`;
		const out = redactString(`gh=${ghp} ant=${sk}`);
		expect(out).toBe('gh=[REDACTED:github_pat] ant=[REDACTED:anthropic_api_key]');
	});

	it('redacts the entire PEM private key block, not just the header', () => {
		const block = `-----BEGIN RSA PRIVATE KEY-----\n${PEM_BODY}\n-----END RSA PRIVATE KEY-----`;
		const out = redactString(`before\n${block}\nafter`);
		expect(out).toBe('before\n[REDACTED:pem_private_key]\nafter');
		expect(out).not.toContain('MIIEvQ');
		expect(out).not.toContain('-----END');
	});

	it('redacts the entire OpenSSH private key block, not just the header', () => {
		const block = `-----BEGIN OPENSSH PRIVATE KEY-----\n${OPENSSH_BODY}\n-----END OPENSSH PRIVATE KEY-----`;
		const out = redactString(`before\n${block}\nafter`);
		expect(out).toBe('before\n[REDACTED:openssh_private_key]\nafter');
		expect(out).not.toContain('b3BlbnNz');
		expect(out).not.toContain('-----END');
	});

	it('falls back to header-only redaction when the END footer is missing', () => {
		// Truncated/streamed key: BEGIN present, END not yet seen. Body still
		// flows through (we have no terminator), but the header marker is
		// replaced so the LLM at least sees a redaction signal.
		const truncated = `-----BEGIN RSA PRIVATE KEY-----\n${PEM_BODY}\n[continued...]`;
		const out = redactString(truncated);
		expect(out.startsWith('[REDACTED:pem_private_key]')).toBe(true);
	});

	it('redacts a Hugging Face token containing digits', () => {
		const token = `hf_${'a'.repeat(20)}0123456789${'a'.repeat(7)}`;
		const out = redactString(`api_key=${token}`);
		expect(out).toBe('api_key=[REDACTED:huggingface_token]');
	});

	it('preserves trailing element-refs in aria-tree text', () => {
		const sk = `sk-ant-api03-${ALPHANUM_93}AA`;
		const out = redactString(`button "Copy ${sk}" @e42`);
		expect(out).toBe('button "Copy [REDACTED:anthropic_api_key]" @e42');
	});

	it('returns the input unchanged when nothing matches', () => {
		const input = 'plain text with no secrets, navigated to https://example.com/page';
		expect(redactString(input)).toBe(input);
	});

	// False-positive guards. These strings appear in normal browser traces and
	// must not be redacted by the deterministic-prefix patterns. Add a case
	// here whenever a pattern change introduces a new FP class.
	const NON_SECRETS = [
		// Git commit SHA
		'commit a1b2c3d4e5f60718293a4b5c6d7e8f9012345678 by alice',
		// Base64-encoded PNG header (data URL)
		'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4',
		// Tracking parameters
		'https://example.com/?utm_source=newsletter&fbclid=IwAR0xQ8mN1kJyZpQrStUvWxYzAbCdEf',
		// Long random hex (not prefix-anchored to anything we redact)
		'session=89abcdef0123456789abcdef0123456789abcdef',
		// Aria tree without secrets
		'group "Account" @e1\n  text "Bernhard" @e2\n  link "Sign out" @e3',
		// Plain English with the word "key"
		'Press the Enter key to submit',
	];

	it.each(NON_SECRETS.map((s) => [s]))('does not falsely redact %j', (input) => {
		expect(redactString(input)).toBe(input);
	});
});

describe('redactValue', () => {
	it('returns primitives unchanged', () => {
		expect(redactValue(42)).toBe(42);
		expect(redactValue(true)).toBe(true);
		expect(redactValue(null)).toBeNull();
		expect(redactValue(undefined)).toBeUndefined();
	});

	it('redacts strings inside nested plain objects and arrays', () => {
		const ghp = `ghp_${ALPHANUM_36}`;
		const input = {
			outer: {
				items: [
					{ label: 'a', value: `key=${ghp}` },
					{ label: 'b', value: 'nothing here' },
				],
			},
		};
		expect(redactValue(input)).toEqual({
			outer: {
				items: [
					{ label: 'a', value: 'key=[REDACTED:github_pat]' },
					{ label: 'b', value: 'nothing here' },
				],
			},
		});
	});

	it('does not recurse into class instances', () => {
		const error = new Error('boom');
		const input = { error };
		const out = redactValue(input);
		expect(out).toEqual({ error });
		// Same Error reference — not a clone.
		const outRecord = out as { error: Error };
		expect(outRecord.error).toBe(error);
	});

	it('caps recursion at depth 10', () => {
		// Build a chain a.a.a... 12 deep with a secret at the bottom.
		type Chain = { a?: Chain; leak?: string };
		const ghp = `ghp_${ALPHANUM_36}`;
		const root: Chain = {};
		let cur: Chain = root;
		for (let i = 0; i < 11; i++) {
			cur.a = {};
			cur = cur.a;
		}
		cur.leak = ghp;

		const out = redactValue(root) as Chain;
		// Walk back down — the deeply-nested leak is past the depth cap so it
		// remains untouched. This is the documented tradeoff.
		let walk: Chain | undefined = out;
		for (let i = 0; i < 11 && walk; i++) walk = walk.a;
		expect(walk?.leak).toBe(ghp);
	});

	it('redacts strings stored at depth 10 or shallower', () => {
		type Chain = { a?: Chain; leak?: string };
		const ghp = `ghp_${ALPHANUM_36}`;
		const root: Chain = {};
		let cur: Chain = root;
		for (let i = 0; i < 8; i++) {
			cur.a = {};
			cur = cur.a;
		}
		cur.leak = ghp;
		const out = redactValue(root) as Chain;
		let walk: Chain | undefined = out;
		for (let i = 0; i < 8 && walk; i++) walk = walk.a;
		expect(walk?.leak).toBe('[REDACTED:github_pat]');
	});
});

describe('redactCallToolResult', () => {
	it('redacts text content blocks', () => {
		const ghp = `ghp_${ALPHANUM_36}`;
		const result: CallToolResult = {
			content: [
				{ type: 'text', text: `here is ${ghp}` },
				{ type: 'text', text: 'no secret here' },
			],
		};
		redactCallToolResult(result);
		expect(result.content[0]).toEqual({
			type: 'text',
			text: 'here is [REDACTED:github_pat]',
		});
		expect(result.content[1]).toEqual({ type: 'text', text: 'no secret here' });
	});

	it('redacts structuredContent', () => {
		const ghp = `ghp_${ALPHANUM_36}`;
		const result: CallToolResult = {
			content: [{ type: 'text', text: 'wrapper' }],
			structuredContent: { snapshot: `tree contains ${ghp}` },
		};
		redactCallToolResult(result);
		expect(result.structuredContent).toEqual({
			snapshot: 'tree contains [REDACTED:github_pat]',
		});
	});

	it('leaves image content blocks untouched', () => {
		const result: CallToolResult = {
			content: [
				{ type: 'image', data: 'iVBORw0KGgoAAAA', mimeType: 'image/png' },
				{ type: 'text', text: `metadata: ghp_${ALPHANUM_36}` },
			],
		};
		redactCallToolResult(result);
		expect(result.content[0]).toEqual({
			type: 'image',
			data: 'iVBORw0KGgoAAAA',
			mimeType: 'image/png',
		});
		expect(result.content[1]).toEqual({
			type: 'text',
			text: 'metadata: [REDACTED:github_pat]',
		});
	});

	it('preserves the isError flag', () => {
		const result: CallToolResult = {
			content: [{ type: 'text', text: 'oops' }],
			isError: true,
		};
		redactCallToolResult(result);
		expect(result.isError).toBe(true);
	});
});
