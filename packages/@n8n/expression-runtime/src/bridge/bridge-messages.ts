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
 * The full set of messages the bridge will accept. Discriminator is `type`.
 *
 * Use `.strict()` on each member so unknown fields are rejected rather than
 * silently ignored — this catches typos in the runtime stubs and keeps the
 * protocol surface tight.
 */
export const bridgeMessageSchema = z.discriminatedUnion('type', [getNodeFirstMessage]);

export type BridgeMessage = z.infer<typeof bridgeMessageSchema>;
