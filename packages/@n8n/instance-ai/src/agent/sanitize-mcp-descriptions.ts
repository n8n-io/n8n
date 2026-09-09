/**
 * Bound and strip the natural-language text an MCP server supplies.
 *
 * Tool descriptions and input-schema field descriptions are copied straight
 * into the model's tool context, so the server that ships them can steer the
 * orchestrator or flood its context. Tool names are validated in
 * `mcp-tool-name-validation.ts` and schema shapes in `sanitize-mcp-schemas.ts`;
 * this module covers the free-text surface those two leave untouched.
 *
 * What comes off is text no renderer would show a person either: invisible
 * Unicode, control characters, and blank-line padding used to push the rest out
 * of view. HTML comments are left alone — nothing renders these descriptions as
 * HTML, so a comment is plain visible text here, and the untrusted-content
 * doctrine in the system prompt already covers text a server writes in the open.
 * Beyond that the text stands: a description has to stay useful enough to call
 * the tool with.
 */

import { isRecord } from '@n8n/utils/is-record';

import { stripInvisibleUnicode } from '../tools/web-research/sanitize-web-content';

/**
 * Headroom over the longest descriptions real servers ship, so the cap only
 * ever catches a flood. Measured against `mcp.notion.com` on 2026-08-20, the
 * known worst offender (AGENT-448): 28 tools, longest tool description 7,867
 * chars (`notion-update-page`), longest field description 1,199 chars
 * (`notion-create-comment`), 108,963 chars of tools/list in total.
 */
export const MCP_TOOL_DESCRIPTION_MAX_LENGTH = 16_384;
export const MCP_SCHEMA_DESCRIPTION_MAX_LENGTH = 4_096;

const TRUNCATION_MARKER = '… [truncated]';

/**
 * How much of a description the strip passes are handed, as a multiple of the
 * cap. They cost time linear in their input, and text past this window cannot
 * survive the cap anyway — only a description that is mostly strippable noise
 * loses anything it would otherwise have kept.
 */
const SCAN_LIMIT_FACTOR = 4;

/** C0/C1 control characters, keeping tab and newline. */
// eslint-disable-next-line no-control-regex -- stripping control characters is the point
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g;

/** JSON Schema keywords whose value is free text the model reads. */
const DESCRIPTION_KEYWORDS = new Set(['description', 'title']);

/** Reported when a cap actually clips text, so a wrongly-set cap is visible. */
export interface McpDescriptionTruncation {
	toolName?: string;
	path: string;
	/** Length of the text as the server sent it, before stripping. */
	originalLength: number;
	limit: number;
}

export type ReportTruncation = (truncation: McpDescriptionTruncation) => void;

interface SanitizeDescriptionContext {
	toolName?: string;
	path: string;
	report?: ReportTruncation;
}

/**
 * Strip invisible and control characters, collapse the blank-line padding used
 * to push text out of view, and cap the length.
 */
export function sanitizeMcpDescription(
	value: string,
	maxLength: number,
	context: SanitizeDescriptionContext = { path: '$' },
): string {
	// Bound the input first: a server can send megabytes here, and every pass
	// below walks whatever it is handed.
	const scanned = value.slice(0, maxLength * SCAN_LIMIT_FACTOR);

	const stripped = stripInvisibleUnicode(scanned.replace(/\r\n?/g, '\n'))
		.replace(CONTROL_CHARACTER_PATTERN, '')
		.replace(/\n{3,}/g, '\n\n')
		.trim();

	// A dropped tail counts as truncation even when what survived stripping fits.
	if (stripped.length <= maxLength && scanned.length === value.length) return stripped;

	context.report?.({
		toolName: context.toolName,
		path: context.path,
		originalLength: value.length,
		limit: maxLength,
	});
	// Drop a trailing high surrogate: slicing cuts UTF-16 code units, so a cap
	// landing mid-emoji would otherwise leave half a character behind.
	const clipped = stripped
		.slice(0, maxLength - TRUNCATION_MARKER.length)
		.replace(/[\uD800-\uDBFF]$/, '');
	return clipped.trimEnd() + TRUNCATION_MARKER;
}

/**
 * Sanitize every `description` / `title` in a raw JSON Schema, returning a new
 * tree. Call it after `assertMcpJsonSchemaWithinLimits`, which is what bounds
 * the recursion — a schema that got this far is depth- and node-capped.
 */
export function sanitizeMcpJsonSchemaDescriptions<T>(
	schema: T,
	context: SanitizeDescriptionContext = { path: '$' },
): T {
	return sanitizeJsonSchemaNode(schema, context) as T;
}

function sanitizeJsonSchemaNode(value: unknown, context: SanitizeDescriptionContext): unknown {
	if (Array.isArray(value)) {
		return value.map((item, index) =>
			sanitizeJsonSchemaNode(item, { ...context, path: `${context.path}[${index}]` }),
		);
	}
	if (!isRecord(value)) return value;

	// fromEntries rather than assignment so a `__proto__` key stays an own
	// property instead of reaching the prototype setter.
	return Object.fromEntries(
		Object.entries(value).map(([key, child]) => {
			const childContext = { ...context, path: `${context.path}.${key}` };
			return [
				key,
				DESCRIPTION_KEYWORDS.has(key) && typeof child === 'string'
					? sanitizeMcpDescription(child, MCP_SCHEMA_DESCRIPTION_MAX_LENGTH, childContext)
					: sanitizeJsonSchemaNode(child, childContext),
			];
		}),
	);
}
