import { BUILTIN_PATTERNS } from '../patterns';
import { redactString, redactValue } from '../redact';
import { NON_SECRETS, OPENSSH_BODY, PEM_BODY, SECRET_FIXTURES } from './fixtures';

const ALPHANUM_36 = 'd'.repeat(36);
const ALPHANUM_93 = 'a'.repeat(93);

describe('BUILTIN_PATTERNS coverage', () => {
	it('test fixtures cover every shipped pattern', () => {
		const fixtureSlugs = new Set(SECRET_FIXTURES.map((f) => f.slug));
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
	it.each(SECRET_FIXTURES.map((f) => ({ ...f })))('redacts $slug', ({ slug, secret }) => {
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
		const outRecord = out as { error: Error };
		expect(outRecord.error).toBe(error);
	});

	it('caps recursion at depth 10', () => {
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
