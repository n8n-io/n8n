/**
 * Wording for a retired node type.
 *
 * A node with `hidden: true` stays usable — the SDK builds it, and validation
 * reports it as informational only. But the builder must see that the node is
 * retired before it writes the node into a workflow.
 *
 * Most retired nodes name no replacement, so the notice must stay actionable
 * without one. Type generation emits the bare notice, because the node's
 * `builderHint.searchHint` is already a separate `@builderHint` line in the
 * same comment block. A validation warning has no second line, so it composes
 * the two with {@link nodeDeprecationMessage}.
 */
export const NODE_DEPRECATION_NOTICE =
	'This node type is retired. Do not use it in a new workflow.';

/** What the builder can still do when the node names no replacement. */
const NO_REPLACEMENT_ADVICE = 'Search for a supported node that does the same work.';

/** The notice, followed by the node's own replacement hint when it has one. */
export function nodeDeprecationMessage(searchHint?: string): string {
	const hint = searchHint?.trim() ?? '';
	return `${NODE_DEPRECATION_NOTICE} ${hint.length > 0 ? hint : NO_REPLACEMENT_ADVICE}`;
}
