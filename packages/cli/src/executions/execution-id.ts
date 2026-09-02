/** Tagged so a v1 id cannot reach a function that only handles v2 executions. */
export type ExecutionIdV2 = string & { readonly __brand: 'ExecutionIdV2' };

// Version-agnostic: engine ids are uuidv7.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A v1 id is numeric and a v2 id is a UUID, so the shape alone picks the backend. */
export const isExecutionIdV2 = (id: string): id is ExecutionIdV2 => UUID.test(id);
