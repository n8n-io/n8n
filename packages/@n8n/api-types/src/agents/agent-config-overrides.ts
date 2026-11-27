import {
	AgentJsonConfigSchema,
	formatAgentConfigZodError,
	type AgentJsonConfig,
} from './agent-json-config.schema';

/** A partial Agent config, deep-merged onto a seeded one (eval variants, AGENT-1666). */
export type AgentConfigOverrides = Record<string, unknown>;

export type AgentConfigOverrideResult =
	| { success: true; config: AgentJsonConfig }
	| { success: false; error: string };

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Objects merge key by key; arrays and scalars replace. */
function deepMerge(base: unknown, override: unknown): unknown {
	if (!isPlainObject(base) || !isPlainObject(override)) return override;
	const merged: Record<string, unknown> = { ...base };
	for (const [key, value] of Object.entries(override)) {
		merged[key] = deepMerge(base[key], value);
	}
	return merged;
}

/** Dotted paths of override keys the parsed config dropped: not Agent config fields. */
function unknownOverridePaths(override: unknown, parsed: unknown, prefix = ''): string[] {
	if (!isPlainObject(override)) return [];
	return Object.entries(override).flatMap(([key, value]) => {
		const path = prefix ? `${prefix}.${key}` : key;
		const kept = isPlainObject(parsed) ? parsed[key] : undefined;
		if (kept === undefined && value !== undefined) return [path];
		return unknownOverridePaths(value, kept, path);
	});
}

/**
 * Deep-merge `overrides` onto an Agent config and validate the result against
 * the Agent JSON config schema. Without overrides, `config` is returned as
 * is (not re-validated). Fails on an invalid result and on override
 * keys the schema does not know (it would drop them silently).
 */
export function applyAgentConfigOverrides(
	config: AgentJsonConfig,
	overrides: AgentConfigOverrides | undefined,
): AgentConfigOverrideResult {
	// Without overrides the stored config runs as-is, as it always has.
	if (overrides === undefined) return { success: true, config };
	const parsed = AgentJsonConfigSchema.safeParse(deepMerge(config, overrides));
	if (!parsed.success) {
		return { success: false, error: formatAgentConfigZodError(parsed.error) };
	}
	const unknown = unknownOverridePaths(overrides, parsed.data);
	if (unknown.length > 0) {
		return { success: false, error: `Not Agent config fields: ${unknown.join(', ')}` };
	}
	return { success: true, config: parsed.data };
}
