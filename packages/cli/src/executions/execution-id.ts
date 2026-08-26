/**
 * A data-plane execution id: a uuidv7 minted by `@n8n/engine`. Tagged so a raw
 * `string` cannot reach a function that only handles engine 2.0 executions —
 * {@link isExecutionIdV2} is the only way to obtain one without a cast.
 */
export type ExecutionIdV2 = string & { readonly __brand: 'ExecutionIdV2' };

// The version nibble is deliberately unrestricted: engine ids are uuidv7, so a
// regex that pins it to 1-5 rejects every one of them.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Narrows a raw route param to a v2 id. The shape of the id is enough to pick the
 * backend — a v1 id is numeric, a v2 id is a UUID — so no lookup table is needed.
 */
export const isExecutionIdV2 = (id: string): id is ExecutionIdV2 => UUID.test(id);
