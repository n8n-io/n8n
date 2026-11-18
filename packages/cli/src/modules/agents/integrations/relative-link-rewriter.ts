/**
 * Makes relative markdown links absolute in a stream of text. An agent writes
 * `[Flow](/workflow/1)` for the n8n editor. A chat platform resolves a relative
 * link against its own host, so the link must carry the instance URL.
 *
 * Text arrives in pieces. A piece can end inside the `](/` marker, so the
 * rewriter holds back a short tail until the next piece decides it.
 */
export interface RelativeLinkRewriter {
	/** Takes a piece of text. Returns the text that is safe to send now. */
	write(piece: string): string;
	/** Returns the text that the rewriter still holds. Call it when the text ends. */
	flush(): string;
}

// `](/` that is not `](//`: the link target is a path on this instance.
const RELATIVE_LINK = /\]\(\/(?!\/)/g;
// A tail that can still become `](/` once more text arrives.
const PARTIAL_MARKER = /\](?:\(\/?)?$/;

export function createRelativeLinkRewriter(instanceBaseUrl: string): RelativeLinkRewriter {
	const base = instanceBaseUrl.replace(/\/+$/, '');
	let held = '';

	const rewrite = (text: string) => text.replace(RELATIVE_LINK, `](${base}/`);

	return {
		write(piece) {
			const text = held + piece;
			const tail = PARTIAL_MARKER.exec(text)?.[0] ?? '';
			held = tail;
			return rewrite(text.slice(0, text.length - tail.length));
		},
		flush() {
			const text = held;
			held = '';
			return rewrite(text);
		},
	};
}
