import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

declare const toolResultBrand: unique symbol;

/**
 * An MCP tool response that can only be produced by {@link successResult} or
 * {@link errorResult}. The brand makes the helpers the single sanctioned way to
 * build a response envelope: a hand-rolled `{ content, structuredContent }`
 * literal lacks the brand and fails to typecheck, so `structuredContent` can
 * never drift from the tool's declared `outputSchema`.
 */
export type McpToolResult = CallToolResult & { readonly [toolResultBrand]: true };

const brand = (result: CallToolResult): McpToolResult => result as McpToolResult;

// The self-check is dev/test-only so production never pays the validation cost.
const shouldSelfCheck = () => process.env.NODE_ENV !== 'production';

/**
 * Build a success envelope whose `structuredContent` is typed to the tool's
 * `outputSchema`. Outside production the data is validated against the schema
 * in strict mode (mirroring the `additionalProperties: false` the SDK
 * publishes), so any drift — a missing field or an undeclared extra one — fails
 * fast in dev/tests instead of surfacing as an opaque `-32602` in front of a
 * schema-enforcing client.
 *
 * The text `content` defaults to the JSON-serialized data. Pass `opts.text` for
 * doc/reference tools that want a human-readable body the model reads directly
 * while still publishing structured content for schema-enforcing clients.
 */
export function successResult<Shape extends z.ZodRawShape>(
	outputSchema: Shape,
	data: z.infer<z.ZodObject<Shape>>,
	opts?: { text?: string },
): McpToolResult {
	if (shouldSelfCheck()) {
		z.object(outputSchema).strict().parse(data);
	}
	return brand({
		content: [{ type: 'text', text: opts?.text ?? JSON.stringify(data, null, 2) }],
		structuredContent: data as Record<string, unknown>,
	});
}

/**
 * Build an error envelope. `structuredContent` is intentionally omitted: the
 * SDK skips output validation when `isError` is true, and schema-enforcing
 * clients only validate `structuredContent` when it is present — so an error
 * response can never trip the tool's `outputSchema`. The real message (plus an
 * optional hint) is carried in the text content the model reads.
 */
export function errorResult(message: string, opts?: { hint?: string }): McpToolResult {
	const text = opts?.hint ? `${message}\n\n${opts.hint}` : message;
	return brand({
		content: [{ type: 'text', text }],
		isError: true,
	});
}
