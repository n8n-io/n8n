import type { RedactionOptions, RedactionResult } from './redactor';
import { findMatchRanges, redactText } from './redactor';

/**
 * How many trailing characters to hold back before emitting.
 *
 * The cut-at-whitespace rule below already guarantees no *contiguous* token is
 * ever split across a chunk boundary (a segment always ends after whitespace,
 * so every word lands wholly on one side). That alone catches the dominant
 * leak — an echoed API key/JWT/token — at any holdback value.
 *
 * The holdback only adds margin for *multi-word* patterns (`Bearer <token>`,
 * `key = value`): it keeps the trailing context buffered long enough for such
 * a pattern to complete before it is emitted. Kept small so streaming output
 * stays responsive; a multi-word secret longer than this that lands exactly on
 * the emit boundary may not be caught (its contiguous value still is, via the
 * standalone secret patterns). Configurable via the constructor.
 */
const DEFAULT_HOLDBACK = 32;

const WHITESPACE = /\s/;

/**
 * Redacts secret/PII patterns from a *streamed* text channel where the text
 * arrives in arbitrary fragments. Per-channel state: construct one per logical
 * stream (e.g. one for `text-delta`, one for `reasoning-delta`).
 *
 * Guarantees no partial token is emitted across a chunk boundary: text is only
 * released up to the last whitespace at or before `length - holdback`, so any
 * contiguous token (or short multi-word pattern) stays buffered until it is
 * fully present. Call {@link flush} at end-of-stream to release the remainder.
 */
export class StreamingRedactor {
	private buffer = '';

	private readonly holdback: number;

	constructor(
		private readonly options: RedactionOptions = {},
		holdback: number = DEFAULT_HOLDBACK,
	) {
		this.holdback = Math.max(0, holdback);
	}

	/** Feed the next fragment; returns the redacted text safe to emit now. */
	push(delta: string): RedactionResult {
		this.buffer += delta;

		if (this.buffer.length <= this.holdback) {
			return { text: '', matches: [] };
		}

		// Cut at the last whitespace at or before the holdback boundary so a
		// token straddling the boundary stays whole in the buffer.
		const target = this.buffer.length - this.holdback;
		let cut = target;
		while (cut > 0 && !WHITESPACE.test(this.buffer[cut - 1])) {
			cut -= 1;
		}

		// Never emit through the middle of a complete match. A match with internal
		// whitespace (e.g. a spaced credit-card number) can straddle the cut; pull
		// the boundary back to its start so it stays buffered and is redacted whole.
		for (const [start, end] of findMatchRanges(this.buffer, this.options)) {
			if (start < cut && end > cut) cut = start;
		}

		if (cut === 0) {
			// No safe boundary yet — keep everything buffered.
			return { text: '', matches: [] };
		}

		const segment = this.buffer.slice(0, cut);
		this.buffer = this.buffer.slice(cut);
		return redactText(segment, this.options);
	}

	/** Release and redact any buffered remainder. Call once at end-of-stream. */
	flush(): RedactionResult {
		const remainder = this.buffer;
		this.buffer = '';
		if (!remainder) return { text: '', matches: [] };
		return redactText(remainder, this.options);
	}
}
