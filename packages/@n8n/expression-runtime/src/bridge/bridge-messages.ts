/**
 * Schemas for messages the in-isolate runtime sends to the host via the
 * `callHost` typed-RPC dispatcher.
 *
 * The isolate is an untrusted source: anything that crosses the bridge must
 * be validated for shape and types at the boundary. We do that with zod
 * rather than relying on TypeScript discriminated unions, because TS types
 * are erased at runtime and contribute zero security.
 *
 * Each operation has its own schema. The dispatcher entry validates the
 * envelope against the discriminated union, throws on any deviation
 * (unknown `type`, missing/typo'd fields, wrong field types), and then
 * delegates to a handler that operates on the parsed (statically narrowed)
 * message.
 *
 * Each additional typed RPC lands as a new schema here plus a new `case`
 * in the bridge's dispatcher switch.
 */

import { z } from 'zod';

/**
 * `$('NodeName').first(branchIndex?, runIndex?)` — fetch the first item of
 * a named node's most recent execution data.
 */
export const getNodeFirstMessage = z
	.object({
		type: z.literal('getNodeFirst'),
		nodeName: z.string(),
		branchIndex: z.number().int().nonnegative().optional(),
		runIndex: z.number().int().nonnegative().optional(),
	})
	.strict();

/**
 * `$('NodeName').last(branchIndex?, runIndex?)` — fetch the last item of
 * a named node's most recent execution data.
 */
export const getNodeLastMessage = z
	.object({
		type: z.literal('getNodeLast'),
		nodeName: z.string(),
		branchIndex: z.number().int().nonnegative().optional(),
		runIndex: z.number().int().nonnegative().optional(),
	})
	.strict();

/**
 * `$('NodeName').all(branchIndex?, runIndex?)` — fetch every item of a
 * named node's most recent execution data as an array.
 */
export const getNodeAllMessage = z
	.object({
		type: z.literal('getNodeAll'),
		nodeName: z.string(),
		branchIndex: z.number().int().nonnegative().optional(),
		runIndex: z.number().int().nonnegative().optional(),
	})
	.strict();

/**
 * `$input.first()` — fetch the first item of the current node's input.
 * Host enforces zero arguments; the schema has no fields besides `type`.
 */
export const getInputFirstMessage = z.object({ type: z.literal('getInputFirst') }).strict();

/**
 * `$input.last()` — fetch the last item of the current node's input.
 */
export const getInputLastMessage = z.object({ type: z.literal('getInputLast') }).strict();

/**
 * `$input.all()` — fetch every item of the current node's input.
 */
export const getInputAllMessage = z.object({ type: z.literal('getInputAll') }).strict();

/**
 * `$items(nodeName?, outputIndex?, runIndex?)` — fetch the execution data of
 * a node by name (or the current node's input if `nodeName` is omitted).
 *
 * `runIndex` accepts negative values: the host uses `-1` as a sentinel for
 * "latest run" (see `WorkflowDataProxy.$items` —
 * `runIndex === undefined ? -1 : runIndex`). The schema uses
 * `z.number().int()` without `.nonnegative()` so expressions can pass `-1`
 * explicitly if they need to.
 */
export const getItemsMessage = z
	.object({
		type: z.literal('getItems'),
		nodeName: z.string().optional(),
		outputIndex: z.number().int().nonnegative().optional(),
		runIndex: z.number().int().optional(),
	})
	.strict();

/**
 * `$fromAI(name, description?, type?, defaultValue?)` — the AI-builder
 * placeholder accessor (aliases: `$fromAi`, `$fromai`).
 *
 * Two deliberate looseness points in this schema, both to preserve host
 * contract / parity:
 *
 * 1. `name` is `z.string().optional()` (not required) so a call missing
 *    the argument or passing an empty string reaches the host, which
 *    throws the user-friendly `ExpressionError("Add a key, e.g. $fromAI('placeholder_name')")`.
 *    Requiring it here would replace that error with a generic zod
 *    message. The host also validates the regex `[a-zA-Z0-9_-]{0,64}`;
 *    we don't pre-empt that either.
 * 2. `defaultValue` is `z.unknown()` because the host accepts any value
 *    as the fallback return (`handleFromAi` returns it directly via
 *    `??`). Structured-clone at the bridge boundary still prevents
 *    functions and other non-cloneable values from crossing.
 *
 * `description` and `type` are forwarded even though the host currently
 * ignores them (`_description`, `_type`), so the protocol matches the
 * documented call signature.
 */
export const fromAiMessage = z
	.object({
		type: z.literal('fromAi'),
		name: z.string().optional(),
		description: z.string().optional(),
		valueType: z.string().optional(),
		// `z.unknown()` already accepts `undefined`, so no `.optional()` needed.
		defaultValue: z.unknown(),
	})
	.strict();

/**
 * The full set of messages the bridge will accept. Discriminator is `type`.
 *
 * Use `.strict()` on each member so unknown fields are rejected rather than
 * silently ignored — this catches typos in the runtime stubs and keeps the
 * protocol surface tight.
 */
export const bridgeMessageSchema = z.discriminatedUnion('type', [
	getNodeFirstMessage,
	getNodeLastMessage,
	getNodeAllMessage,
	getInputFirstMessage,
	getInputLastMessage,
	getInputAllMessage,
	getItemsMessage,
	fromAiMessage,
]);

export type BridgeMessage = z.infer<typeof bridgeMessageSchema>;
