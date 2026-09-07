/**
 * Arbitrary JSON payload, mirroring `JsonValue`/`JsonObject` from `n8n-workflow`.
 * We redefine it here rather than import it: the engine intentionally has no
 * dependency on `n8n-workflow`.
 *
 * TODO(CAT-3798): consolidate locally-redefined types like this into a shared,
 * dependency-light common lib where appropriate.
 */
export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };
