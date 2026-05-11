// ---------------------------------------------------------------------------
// Streaming redactor for delta-by-delta text input (LLM token streams).
//
// Why a streaming variant exists: a single secret can span multiple chunks
// (a 108-char Anthropic key is several tokens). Running `redactString` on
// each chunk in isolation would miss the secret entirely because no single
// chunk contains a complete match.
//
// Strategy:
//   1. Accumulate incoming text in an internal buffer.
//   2. On every `feed()`, run the full pattern set against the buffer and
//      replace any complete matches with `[REDACTED:<slug>]`.
//   3. Compute a safe-to-emit prefix: anywhere up to the leftmost remaining
//      issuer-prefix sentinel (or, when none is present, hold back a small
//      tail in case a prefix straddles the chunk boundary).
//   4. Emit that prefix; retain the rest for the next feed.
//
// A retained prefix may turn out to be a false alarm (e.g. the model
// includes `sk-ant-` in a documentation snippet). To bound the latency cost
// of such false alarms, the buffer is capped: if it grows past
// `maxBufferChars` without a match, the oldest content is released even if
// a sentinel is still in the held window. In practice this only triggers
// on very long responses with stray issuer-prefix-shaped substrings.
// ---------------------------------------------------------------------------

import { BUILTIN_PATTERNS } from './patterns';
import { redactionMarker } from './redact';

export interface StreamingRedactorHit {
	slug: string;
}

export interface StreamingRedactorChunk {
	emit: string;
	hits: StreamingRedactorHit[];
}

interface StreamingRedactorOptions {
	/**
	 * Hard cap on retained buffer size in characters. Past this size, the
	 * oldest content is released even if an issuer-prefix sentinel is still
	 * in the held window. Default 4096 — fits realistic JWTs and long Slack
	 * webhook URLs with slack.
	 */
	maxBufferChars?: number;
}

/** Compiled global-flagged copies of `BUILTIN_PATTERNS` for replacement. */
const GLOBAL_PATTERNS: ReadonlyArray<{ slug: string; regex: RegExp }> = BUILTIN_PATTERNS.map(
	(p) => ({
		slug: p.slug,
		regex: new RegExp(
			p.pattern.source,
			p.pattern.flags.includes('g') ? p.pattern.flags : `${p.pattern.flags}g`,
		),
	}),
);

// Sentinel covering the literal start of every pattern in BUILTIN_PATTERNS.
// Used to decide which trailing portion of the buffer must be retained
// because it could still grow into a complete match.
//
// Notes on coverage:
// - Anthropic/OpenAI/Stripe all begin with `sk-` or `sk_`; including those
//   short prefixes handles the longer subspecies (`sk-ant-`, `sk-proj-`).
// - Azure AD client secrets have no fixed literal prefix; the distinctive
//   `\dQ~` infix is used instead and the held window is offset back 3 chars
//   to capture the 3 preceding chars demanded by the pattern.
// - Slack webhook URLs are anchored on `hooks.slack.com`.
const PREFIX_SENTINEL_SOURCE = [
	'-----BEGIN ',
	'sk-',
	'sk_',
	'rk_',
	'hf_',
	'AIza',
	'A3T',
	'AKIA',
	'ASIA',
	'ABIA',
	'ACCA',
	'ghp_',
	'gho_',
	'ghu_',
	'ghs_',
	'ghr_',
	'github_pat_',
	'glpat-',
	'xox[abepr]-',
	'SK',
	'AC',
	'EAAA',
	'sq0atp-',
	'npm_',
	'pypi-AgEIcHlwaS5vcmc',
	'sntryu_',
	'eyJ',
	'https?://hooks\\.slack\\.com',
	'\\dQ~',
].join('|');

const PREFIX_SENTINEL = new RegExp(PREFIX_SENTINEL_SOURCE, 'g');

/** Max prefix literal length (for tail-hold when no sentinel matches). */
const MAX_PREFIX_LEN = 32;

/** Azure AD client secrets require 3 chars before the `\dQ~` infix. */
const AZURE_PREFIX_LEN_BEFORE_INFIX = 3;

/** Default buffer cap — releases held content past this size to bound latency. */
const DEFAULT_MAX_BUFFER = 4096;

/**
 * Larger cap applied while a multi-line block sentinel (`-----BEGIN `) is
 * in flight without its matching END footer. Sized to comfortably fit a
 * 16 384-bit RSA key or an OpenSSH key with substantial comment metadata,
 * so the END footer can still anchor the redaction match.
 */
const BLOCK_MAX_BUFFER = 65536;

/**
 * Pattern slugs whose regex falls back to header-only redaction when the
 * END footer is missing. During streaming `feed()`, that fallback would
 * fire as soon as `-----BEGIN ` arrived and let subsequent body bytes
 * stream out unredacted; we suppress them until either END arrives or the
 * stream is flushed.
 */
const BLOCK_FALLBACK_SLUGS: ReadonlySet<string> = new Set([
	'pem_private_key',
	'openssh_private_key',
]);

export class StreamingRedactor {
	private buffer = '';

	private readonly maxBufferChars: number;

	constructor(options: StreamingRedactorOptions = {}) {
		this.maxBufferChars = options.maxBufferChars ?? DEFAULT_MAX_BUFFER;
	}

	/**
	 * Append a chunk of text. Returns the safe-to-emit prefix plus any
	 * pattern hits that fired during this call.
	 */
	feed(chunk: string): StreamingRedactorChunk {
		this.buffer += chunk;

		const hits = this.replaceMatchesInPlace({ allowBlockFallback: false });

		// Find the leftmost still-active sentinel position. Anything before
		// it is provably free of in-flight secrets and can be emitted.
		let holdFrom = this.findSentinelHoldPosition();

		// Bounded-latency safeguard: never hold more than maxBufferChars,
		// unless an unterminated multi-line block (`-----BEGIN ` without a
		// matching END) is in flight — those need a larger cap to keep the
		// BEGIN line in the buffer until the END footer arrives to anchor
		// the redaction.
		if (this.buffer.length - holdFrom > this.maxBufferChars) {
			const heldSlice = this.buffer.slice(holdFrom);
			const inBlock =
				heldSlice.startsWith('-----BEGIN ') && !/-----END [A-Z ]*-----/.test(heldSlice);
			const effectiveCap = inBlock ? BLOCK_MAX_BUFFER : this.maxBufferChars;
			if (this.buffer.length - holdFrom > effectiveCap) {
				holdFrom = this.buffer.length - effectiveCap;
			}
		}

		const emit = this.buffer.slice(0, holdFrom);
		this.buffer = this.buffer.slice(holdFrom);
		return { emit, hits };
	}

	/**
	 * End-of-stream flush. Runs one final whole-buffer redact pass (no more
	 * input is coming, so `\b` anchors at end-of-string are guaranteed) and
	 * returns whatever remains.
	 */
	flush(): StreamingRedactorChunk {
		const hits = this.replaceMatchesInPlace({ allowBlockFallback: true });
		const emit = this.buffer;
		this.buffer = '';
		return { emit, hits };
	}

	private replaceMatchesInPlace(opts: {
		allowBlockFallback: boolean;
	}): StreamingRedactorHit[] {
		const hasUnterminatedBlock =
			!opts.allowBlockFallback &&
			/-----BEGIN /.test(this.buffer) &&
			!/-----END [A-Z ]*-----/.test(this.buffer);
		const hits: StreamingRedactorHit[] = [];
		for (const { slug, regex } of GLOBAL_PATTERNS) {
			if (hasUnterminatedBlock && BLOCK_FALLBACK_SLUGS.has(slug)) {
				// The pattern would match the BEGIN line alone via its
				// optional END group and let subsequent body bytes leak.
				// Wait for END to arrive or for flush().
				continue;
			}
			regex.lastIndex = 0;
			if (!regex.test(this.buffer)) continue;
			regex.lastIndex = 0;
			this.buffer = this.buffer.replace(regex, () => {
				hits.push({ slug });
				return redactionMarker(slug);
			});
		}
		return hits;
	}

	/**
	 * The leftmost position in the buffer from which content must be held
	 * back. Heuristic:
	 *   - If any issuer-prefix sentinel is present, the leftmost one wins.
	 *   - Otherwise, hold the last `MAX_PREFIX_LEN - 1` chars in case a
	 *     prefix straddles the boundary with the next feed.
	 */
	private findSentinelHoldPosition(): number {
		PREFIX_SENTINEL.lastIndex = 0;
		const match = PREFIX_SENTINEL.exec(this.buffer);
		if (match !== null) {
			const isAzureInfix = match[0].length === 3 && match[0].endsWith('Q~');
			if (isAzureInfix) {
				return Math.max(0, match.index - AZURE_PREFIX_LEN_BEFORE_INFIX);
			}
			return match.index;
		}
		return Math.max(0, this.buffer.length - (MAX_PREFIX_LEN - 1));
	}
}
