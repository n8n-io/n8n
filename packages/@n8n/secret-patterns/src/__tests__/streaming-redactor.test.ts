import { StreamingRedactor } from '../streaming-redactor';
import { NON_SECRETS, SECRET_FIXTURES } from './fixtures';

const ALPHANUM_93 = 'a'.repeat(93);
const ALPHANUM_36 = 'd'.repeat(36);

/**
 * Feed a string into a fresh redactor as a single chunk, flush, and return
 * the concatenated emitted output plus all observed hits.
 */
function runSingleChunk(input: string): { emit: string; hitSlugs: string[] } {
	const r = new StreamingRedactor();
	const fed = r.feed(input);
	const flushed = r.flush();
	return {
		emit: fed.emit + flushed.emit,
		hitSlugs: [...fed.hits, ...flushed.hits].map((h) => h.slug),
	};
}

/**
 * Feed a string into a fresh redactor split at a given offset (two chunks),
 * flush, and return the concatenated emitted output plus all observed hits.
 */
function runSplitChunks(input: string, splitAt: number): { emit: string; hitSlugs: string[] } {
	const r = new StreamingRedactor();
	const first = r.feed(input.slice(0, splitAt));
	const second = r.feed(input.slice(splitAt));
	const flushed = r.flush();
	return {
		emit: first.emit + second.emit + flushed.emit,
		hitSlugs: [...first.hits, ...second.hits, ...flushed.hits].map((h) => h.slug),
	};
}

describe('StreamingRedactor — true positives', () => {
	it.each(SECRET_FIXTURES.map((f) => ({ ...f })))(
		'redacts $slug in a single chunk',
		({ slug, secret }) => {
			const { emit, hitSlugs } = runSingleChunk(`prefix ${secret} suffix`);
			expect(emit).toBe(`prefix [REDACTED:${slug}] suffix`);
			expect(hitSlugs).toContain(slug);
		},
	);

	it('redacts an Anthropic key split across two chunks at every offset', () => {
		const secret = `sk-ant-api03-${ALPHANUM_93}AA`;
		const input = `before ${secret} after`;
		for (let splitAt = 0; splitAt <= input.length; splitAt++) {
			const { emit, hitSlugs } = runSplitChunks(input, splitAt);
			expect(emit).toBe('before [REDACTED:anthropic_api_key] after');
			expect(hitSlugs).toContain('anthropic_api_key');
			// No prefix of the secret ever leaks via the emitted prefix.
			expect(emit).not.toContain('sk-ant-');
		}
	});

	it('redacts a GitHub PAT split across three chunks', () => {
		const secret = `ghp_${ALPHANUM_36}`;
		const r = new StreamingRedactor();
		const out1 = r.feed('your token is ');
		const out2 = r.feed(secret.slice(0, 10));
		const out3 = r.feed(secret.slice(10));
		const flushed = r.flush();
		const combined = out1.emit + out2.emit + out3.emit + flushed.emit;
		expect(combined).toBe('your token is [REDACTED:github_pat]');
		expect([...out1.hits, ...out2.hits, ...out3.hits, ...flushed.hits].map((h) => h.slug)).toEqual([
			'github_pat',
		]);
	});

	it('handles multiple secrets in one stream', () => {
		const ghp = `ghp_${ALPHANUM_36}`;
		const sk = `sk-ant-api03-${ALPHANUM_93}AA`;
		const { emit, hitSlugs } = runSingleChunk(`one ${ghp} two ${sk} three`);
		expect(emit).toBe('one [REDACTED:github_pat] two [REDACTED:anthropic_api_key] three');
		expect(new Set(hitSlugs)).toEqual(new Set(['github_pat', 'anthropic_api_key']));
	});

	it('continues redacting after a hit', () => {
		const ghp = `ghp_${ALPHANUM_36}`;
		const r = new StreamingRedactor();
		const a = r.feed(`first key ${ghp}`);
		const b = r.feed(` then ${ghp} done`);
		const f = r.flush();
		expect(a.emit + b.emit + f.emit).toBe(
			'first key [REDACTED:github_pat] then [REDACTED:github_pat] done',
		);
		expect(a.hits.length + b.hits.length + f.hits.length).toBe(2);
	});

	it('emits an exact PEM private key block in one go', () => {
		const block =
			'-----BEGIN RSA PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQ\n-----END RSA PRIVATE KEY-----';
		const { emit, hitSlugs } = runSingleChunk(`leading\n${block}\ntrailing`);
		expect(emit).toBe('leading\n[REDACTED:pem_private_key]\ntrailing');
		expect(emit).not.toContain('MIIEvQ');
		expect(hitSlugs).toContain('pem_private_key');
	});
});

describe('StreamingRedactor — false positives', () => {
	it.each(NON_SECRETS.map((s) => [s]))('passes %j through unchanged (single chunk)', (input) => {
		const { emit, hitSlugs } = runSingleChunk(input);
		expect(emit).toBe(input);
		expect(hitSlugs).toEqual([]);
	});

	it('passes a non-secret through unchanged when split at every offset', () => {
		// Use the longest non-secret with structurally diverse content to
		// stress the cross-chunk boundary detection.
		const input =
			'commit a1b2c3d4e5f60718293a4b5c6d7e8f9012345678 at 2026-05-11T10:30:00Z (utm_source=foo) https://github.com/n8n-io/n8n/blob/master/AGENTS.md';
		for (let splitAt = 0; splitAt <= input.length; splitAt++) {
			const { emit, hitSlugs } = runSplitChunks(input, splitAt);
			expect(emit).toBe(input);
			expect(hitSlugs).toEqual([]);
		}
	});

	it('passes the redaction marker through verbatim (idempotency)', () => {
		const input = 'value=[REDACTED:github_pat] continues';
		const { emit, hitSlugs } = runSingleChunk(input);
		expect(emit).toBe(input);
		expect(hitSlugs).toEqual([]);
	});
});

describe('StreamingRedactor — streaming mechanics', () => {
	it('emits incrementally for long clean text', () => {
		const r = new StreamingRedactor();
		const a = r.feed('A'.repeat(1024));
		expect(a.emit.length).toBeGreaterThan(0);
		const b = r.feed('B'.repeat(1024));
		expect(b.emit.length).toBeGreaterThan(0);
		const f = r.flush();
		expect(a.emit + b.emit + f.emit).toBe('A'.repeat(1024) + 'B'.repeat(1024));
	});

	it('releases content past the buffer cap even with a stale prefix sentinel', () => {
		const r = new StreamingRedactor({ maxBufferChars: 256 });
		// Stale `sk-` prefix that never completes a real OpenAI/Anthropic key.
		const stale = 'sk-marketing-update-from-the-team-';
		const filler = 'X'.repeat(1024);
		const a = r.feed(stale + filler);
		const f = r.flush();
		expect(a.emit + f.emit).toBe(stale + filler);
		// The cap forces emission even though `sk-` is technically a sentinel.
		expect(a.emit.length).toBeGreaterThan(0);
	});

	it('flush returns remaining buffered text', () => {
		const r = new StreamingRedactor();
		const a = r.feed('tail-shaped fragment');
		expect(a.emit).not.toBe('tail-shaped fragment');
		const f = r.flush();
		expect(a.emit + f.emit).toBe('tail-shaped fragment');
	});

	it('empty feed returns empty emit and no hits', () => {
		const r = new StreamingRedactor();
		const a = r.feed('');
		expect(a.emit).toBe('');
		expect(a.hits).toEqual([]);
	});

	it('redacts a PEM block whose body exceeds maxBufferChars (streamed)', () => {
		// Body sized well past the default 4096 cap to mimic a 4096-bit RSA
		// key. Without the block-aware cap, the BEGIN line would scroll out
		// of the retained buffer before the END footer arrived, and the
		// body would leak through unredacted.
		const body = 'A'.repeat(8000);
		const block = `-----BEGIN RSA PRIVATE KEY-----\n${body}\n-----END RSA PRIVATE KEY-----`;
		const input = `before\n${block}\nafter`;

		const r = new StreamingRedactor();
		let emitted = '';
		const allHits: string[] = [];
		for (let i = 0; i < input.length; i += 50) {
			const out = r.feed(input.slice(i, i + 50));
			emitted += out.emit;
			for (const h of out.hits) allHits.push(h.slug);
		}
		const flushed = r.flush();
		emitted += flushed.emit;
		for (const h of flushed.hits) allHits.push(h.slug);

		expect(emitted).toBe('before\n[REDACTED:pem_private_key]\nafter');
		expect(emitted).not.toContain('AAA');
		expect(allHits).toContain('pem_private_key');
	});

	it('releases content past the block cap when an unterminated BEGIN never completes', () => {
		// A stray `-----BEGIN ` line followed by non-key filler longer than
		// the block cap. The redactor must eventually emit content so the
		// stream does not stall indefinitely on a false alarm.
		const r = new StreamingRedactor({ maxBufferChars: 128 });
		const stray = '-----BEGIN A NOTE FROM THE MODEL-----\n';
		const filler = 'X'.repeat(80000);
		const out = r.feed(stray + filler);
		const flushed = r.flush();
		expect(out.emit.length + flushed.emit.length).toBe(stray.length + filler.length);
		expect(out.emit + flushed.emit).toBe(stray + filler);
		// Cap was breached, so some emission happened during feed.
		expect(out.emit.length).toBeGreaterThan(0);
	});
});
