/**
 * OpenAI models with web search wrap inline citations in Unicode Private Use
 * Area control characters (e.g. `\uE200cite\uE202turn0search0\uE201`). The
 * ChatGPT UI renders these as source chips; a plain OpenAI-compatible client
 * (OpenWebUI, LibreChat) shows them raw as tofu boxes. Strip them from this
 * channel's output so those clients get clean text.
 *
 * Delimiters: `\uE200` starts an inline citation span, `\uE203` a navlist span,
 * `\uE201` ends a span, `\uE202` separates parts inside it.
 */
const SPAN_START = '\uE200';
const NAVLIST_START = '\uE203';
const SPAN_END = '\uE201';
const SEP = '\uE202';

/** A complete span from either start delimiter to the end delimiter. */
const COMPLETE_SPAN = /[\uE200\uE203][\s\S]*?\uE201/g;
/** Any orphan citation control char left after span removal. */
const ORPHAN_MARKERS = /[\uE200-\uE203]/g;

/** Removes every complete citation span and any orphan marker from `text`. */
export function stripCitationMarkers(text: string): string {
	// Guard on every marker, `\uE202` (SEP) included: an orphan separator with no
	// surrounding span still needs removal, so it must not short-circuit here.
	if (
		!text.includes(SPAN_START) &&
		!text.includes(NAVLIST_START) &&
		!text.includes(SPAN_END) &&
		!text.includes(SEP)
	) {
		return text;
	}
	return text.replace(COMPLETE_SPAN, '').replace(ORPHAN_MARKERS, '');
}

export interface CitationMarkerStripper {
	/** Strip complete spans in the delta; hold back a trailing partial span. */
	push(delta: string): string;
	/** Emit whatever is still buffered, stripping any unterminated span. */
	flush(): string;
}

/** Index of the earliest start delimiter at or after `from`, or -1 if none. */
function nextStart(text: string, from: number): number {
	const inline = text.indexOf(SPAN_START, from);
	const navlist = text.indexOf(NAVLIST_START, from);
	if (inline === -1) return navlist;
	if (navlist === -1) return inline;
	return Math.min(inline, navlist);
}

/**
 * Stateful stripper for streamed text. A citation span can straddle two
 * `text-delta` chunks, so a per-delta `stripCitationMarkers` would leak the
 * delimiters.
 *
 * Single-pass scanner: it tracks whether it is inside an open span and only
 * scans each new delta once, so cost stays linear even when a span never
 * closes. Text outside a span is emitted immediately with any orphan marker
 * removed; text inside an open span is buffered (not rescanned) until the end
 * delimiter arrives, then discarded. `flush()` treats a still-open span as
 * never a real citation and emits its inner text with the control chars gone.
 */
export function createCitationMarkerStripper(): CitationMarkerStripper {
	// Raw content of the currently open span, from its start delimiter onward.
	// Only appended to, never rescanned.
	let openSpan = '';
	let insideSpan = false;

	return {
		push(delta: string): string {
			let out = '';
			let i = 0;

			while (i < delta.length) {
				if (!insideSpan) {
					const start = nextStart(delta, i);
					if (start === -1) {
						// No span opens in the rest: emit it, stripping orphan markers.
						out += delta.slice(i).replace(ORPHAN_MARKERS, '');
						break;
					}
					out += delta.slice(i, start).replace(ORPHAN_MARKERS, '');
					insideSpan = true;
					openSpan = delta[start];
					i = start + 1;
				} else {
					const end = delta.indexOf(SPAN_END, i);
					if (end === -1) {
						// Span still open: buffer the tail and wait for the next delta.
						openSpan += delta.slice(i);
						break;
					}
					// Span closed: drop it wholesale and keep scanning after it.
					insideSpan = false;
					openSpan = '';
					i = end + 1;
				}
			}

			return out;
		},

		flush(): string {
			const out = insideSpan ? stripCitationMarkers(openSpan) : '';
			openSpan = '';
			insideSpan = false;
			return out;
		},
	};
}
