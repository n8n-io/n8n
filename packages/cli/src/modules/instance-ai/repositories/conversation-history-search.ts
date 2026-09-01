/**
 * Shared pieces of the conversation-history search, consumed by both the
 * thread and the message repository, so the escaping rules and the row-match
 * predicate live in one place. Repositories take the raw query string and
 * build the `LIKE` pattern themselves — nothing outside the persistence layer
 * knows the pattern syntax.
 */

/**
 * `LIKE ... ESCAPE` character. Backslash is deliberately avoided: MySQL parses
 * backslash escapes inside string literals, so `ESCAPE '\'` is a syntax error
 * there, while the MySQL-correct `ESCAPE '\\'` is a two-character string under
 * Postgres' standard_conforming_strings and therefore rejected. `!` needs no
 * literal escaping in any supported dialect.
 */
export const LIKE_ESCAPE_CHAR = '!';

/**
 * Prefilter for assistant rows carrying an ask-user tool call. Tool results are
 * not separate rows — a call and its answers live in one `tool-call` block on
 * the assistant row — so this marker is what makes them findable.
 */
export const ASK_USER_CONTENT_MARKER = '%"toolName":"ask-user"%';

const LIKE_SPECIALS = new RegExp(`[${LIKE_ESCAPE_CHAR}%_]`, 'g');

/** Neutralize the wildcards a user query may contain so it matches literally. */
function escapeLikePattern(value: string): string {
	return value.replace(LIKE_SPECIALS, `${LIKE_ESCAPE_CHAR}$&`);
}

/** `%…%` pattern for a case-insensitive `LOWER(col) LIKE :pattern` match. */
export function buildSearchLikePattern(query: string): string {
	return `%${escapeLikePattern(query.toLowerCase())}%`;
}

/**
 * Rows `get-messages` can show — window counts should mean visible messages,
 * not storage rows, or a tool-heavy turn eats the whole window with rows the
 * reader never sees. Visible: user rows, assistant rows without tool calls
 * (the turn-ending reply — the loop only continues on tool calls), and
 * ask-user rows (mid-turn, but they carry the user's own answers). Inside
 * serialized JSON the unescaped `"type":"tool-call"` pair can only be block
 * structure — quotes inside text blocks are escaped — so the markers are
 * structural, not textual.
 *
 * Coarse layer only: rows recognizable as invisible just after parsing (e.g.
 * auto-follow-ups, unanswered ask-user rows) pass it and are dropped by the
 * service post-window, so a window can come back slightly short.
 *
 * Expects `:askUserMarker`, `:toolCallMarker` and `:invalidToolCallMarker` to
 * be set on the query builder.
 */
export function buildVisibleRowCondition(alias: string): string {
	return (
		`(${alias}.role = 'user'` +
		` OR (${alias}.content NOT LIKE :toolCallMarker AND ${alias}.content NOT LIKE :invalidToolCallMarker)` +
		` OR ${alias}.content LIKE :askUserMarker)`
	);
}

/**
 * Content part types that mark an assistant row as mid-turn tool activity.
 * Single source for the SQL markers below and the service's JSON-level
 * re-check (`hasToolActivity`), so the two visibility layers cannot drift.
 */
export const TOOL_CALL_PART_TYPES: readonly string[] = ['tool-call', 'invalid-tool-call'];

export const VISIBLE_ROW_MARKERS = {
	askUserMarker: ASK_USER_CONTENT_MARKER,
	toolCallMarker: `%"type":"${TOOL_CALL_PART_TYPES[0]}"%`,
	invalidToolCallMarker: `%"type":"${TOOL_CALL_PART_TYPES[1]}"%`,
};

/**
 * Message rows whose serialized JSON can carry the search term: user turns, and
 * assistant turns holding an ask-user tool call. Matching the term against
 * serialized JSON also hits keys and tool payloads, so this is only a
 * prefilter — the service re-checks each candidate against the extracted text.
 *
 * Expects `:pattern` and `:askUserMarker` to be set on the query builder.
 */
export function buildMessageMatchCondition(alias: string): string {
	return (
		`((${alias}.role = 'user' AND LOWER(${alias}.content) LIKE :pattern ESCAPE '${LIKE_ESCAPE_CHAR}')` +
		` OR (${alias}.role = 'assistant' AND ${alias}.content LIKE :askUserMarker` +
		` AND LOWER(${alias}.content) LIKE :pattern ESCAPE '${LIKE_ESCAPE_CHAR}'))`
	);
}
