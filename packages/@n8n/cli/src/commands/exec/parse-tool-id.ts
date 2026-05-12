/**
 * Parsed representation of a tool id.
 *
 * Mirrors the parser used by the MCP `n8n_execute_tool` handler so the CLI can
 * accept the same dot-segmented identifiers (e.g. `slack.message.send`) as the
 * MCP tool surface.
 */
export interface ParsedToolId {
	nodeType: string;
	resource?: string;
	operation?: string;
}

/**
 * Known node-package prefixes. When an id begins with one of these, we treat
 * the next segment as the node name and the remainder as resource/operation.
 */
const KNOWN_NODE_PACKAGE_PREFIXES = ['n8n-nodes-base', '@n8n/n8n-nodes-langchain'] as const;

/**
 * Fallback package prefix used when the caller passes a bare node name like
 * `slack` instead of `n8n-nodes-base.slack`.
 */
const DEFAULT_NODE_PACKAGE_PREFIX = 'n8n-nodes-base';

/**
 * Parse a tool id of the form `<nodeType>.<resource>.<operation>` into its
 * pieces. Unlike the MCP-side parser this does not consult the node catalog
 * — the CLI has no access to the runtime registry, so it relies purely on the
 * known package-prefix heuristic and a "first segment is the node name"
 * fallback. This is sufficient for the common case (`slack.message.send`,
 * `set.json`, `@n8n/n8n-nodes-langchain.agent.run`, ...).
 */
export function parseToolId(id: string): ParsedToolId {
	if (!id) {
		throw new Error('Tool id must be a non-empty string');
	}

	// Step 1: known package prefix on the raw id.
	for (const prefix of KNOWN_NODE_PACKAGE_PREFIXES) {
		const withDot = `${prefix}.`;
		if (id.startsWith(withDot)) {
			const rest = id.slice(withDot.length);
			const segments = rest.split('.');
			if (segments.length === 0 || segments[0] === '') {
				throw new Error(`Invalid tool id "${id}": missing node name after package prefix`);
			}
			const nodeType = `${prefix}.${segments[0]}`;
			return parsedFromTrailing(nodeType, segments.slice(1));
		}
	}

	// Step 2: assume first segment is the node name, prefix with the default
	// package, treat trailing segments as resource/operation.
	const segments = id.split('.');
	if (segments.length === 0 || segments[0] === '') {
		throw new Error(`Invalid tool id "${id}": empty node name`);
	}
	const nodeType = `${DEFAULT_NODE_PACKAGE_PREFIX}.${segments[0]}`;
	return parsedFromTrailing(nodeType, segments.slice(1));
}

function parsedFromTrailing(nodeType: string, trailing: string[]): ParsedToolId {
	if (trailing.length === 0) {
		return { nodeType };
	}
	if (trailing.length === 1) {
		return { nodeType, operation: trailing[0] };
	}
	// 2+ remaining segments: first is resource, second is operation. Extra
	// trailing segments are dropped (no node uses sub-operations today).
	return { nodeType, resource: trailing[0], operation: trailing[1] };
}

/**
 * Parse a `--param key=value` flag into a `{ key, value }` tuple. The value is
 * always passed through as a string — for typed inputs use `--input @file.json`.
 */
export function parseParamFlag(raw: string): { key: string; value: string } {
	const idx = raw.indexOf('=');
	if (idx <= 0) {
		throw new Error(`Invalid --param "${raw}": expected "key=value"`);
	}
	const key = raw.slice(0, idx);
	const value = raw.slice(idx + 1);
	return { key, value };
}
