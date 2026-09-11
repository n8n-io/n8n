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

/** A complete span from either start delimiter to the end delimiter. */
const COMPLETE_SPAN = /[\uE200\uE203][\s\S]*?\uE201/g;
/** Any orphan citation control char left after span removal. */
const ORPHAN_MARKERS = /[\uE200-\uE203]/g;

/** Removes every complete citation span and any orphan marker from `text`. */
export function stripCitationMarkers(text: string): string {
	if (!text.includes(SPAN_START) && !text.includes(NAVLIST_START) && !text.includes(SPAN_END)) {
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

/**
 * Stateful stripper for streamed text. A citation span can straddle two
 * `text-delta` chunks, so a per-delta `stripCitationMarkers` would leak the
 * delimiters. This buffers from the first unterminated start delimiter onward
 * and only emits text it knows is outside a span.
 */
export function createCitationMarkerStripper(): CitationMarkerStripper {
	let buffer = '';

	return {
		push(delta: string): string {
			buffer = (buffer + delta).replace(COMPLETE_SPAN, '');

			// Earliest still-open start delimiter. Text before it is outside any
			// span and safe to emit; hold the rest until its end delimiter arrives.
			const starts = [buffer.indexOf(SPAN_START), buffer.indexOf(NAVLIST_START)].filter(
				(i) => i !== -1,
			);
			if (starts.length === 0) {
				const out = buffer;
				buffer = '';
				return out;
			}

			const openStart = Math.min(...starts);
			const out = buffer.slice(0, openStart);
			buffer = buffer.slice(openStart);
			return out;
		},

		flush(): string {
			const out = stripCitationMarkers(buffer);
			buffer = '';
			return out;
		},
	};
}
