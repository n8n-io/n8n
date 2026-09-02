/**
 * Wording for a retired node type.
 *
 * A node with `hidden: true` stays usable — the SDK builds it, and validation
 * reports it as informational only. But the builder must see that the node is
 * retired before it writes the node into a workflow. Type generation puts this
 * sentence in the definition header, and workflow validation puts it in a
 * warning, so both places read the same. The node's `builderHint.searchHint`
 * names the replacement node.
 */
export const NODE_DEPRECATION_NOTICE =
	'This node type is retired. Do not use it in a new workflow. Read the builder hint in its type definition for the node to use instead.';
