/**
 * Arbitrary JSON payload, mirroring `JsonValue`/`JsonObject` from `n8n-workflow`.
 *
 * We redefine it here rather than import it: the engine intentionally has no
 * dependency on `n8n-workflow`. Prefer this over `unknown` for values we
 * persist as `jsonb` — it documents "this is JSON" and stays assignable to
 * more specific shapes as they get introduced.
 */
export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };
