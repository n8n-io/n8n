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
 * Keys the eval restore binds, at any depth: credentials (`credential…`),
 * models (`model`, `…Model`), and `modelsByDifficulty`. Case-insensitive, as
 * lang-tracer checks them, so both sides refuse the same cases.
 */
function isRestoreBoundKey(key: string): boolean {
	return /^credential/i.test(key) || /model$/i.test(key) || /^modelsByDifficulty$/i.test(key);
}

/** Paths (`a.b`, `tools[0].c`) of override keys that name a credential or a
 *  model, inside objects and arrays. */
function restoreBoundOverridePaths(override: unknown, prefix = ''): string[] {
	if (Array.isArray(override)) {
		return override.flatMap((item, index) =>
			restoreBoundOverridePaths(item, `${prefix}[${String(index)}]`),
		);
	}
	if (!isPlainObject(override)) return [];
	return Object.entries(override).flatMap(([key, value]) => {
		const path = prefix ? `${prefix}.${key}` : key;
		return isRestoreBoundKey(key) ? [path] : restoreBoundOverridePaths(value, path);
	});
}

/**
 * The eval restore binds the seeded config's credentials to real ones and
 * resolves its models to ones the eval can run; an override is applied after
 * it, so a credential or model it names would skip both.
 */
function restoreBoundOverrideError(overrides: AgentConfigOverrides): string | undefined {
	const paths = restoreBoundOverridePaths(overrides);
	if (paths.length === 0) return undefined;
	return `Overrides cannot set credentials or models (${paths.join(', ')}): set them on the seeded Agent config and keep its memory with keepMemory`;
}

function mergeAndValidate(
	config: unknown,
	overrides: AgentConfigOverrides,
): AgentConfigOverrideResult {
	const boundError = restoreBoundOverrideError(overrides);
	if (boundError) return { success: false, error: boundError };
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

/**
 * Deep-merge `overrides` onto an Agent config and validate the result against
 * the Agent JSON config schema. Without overrides, `config` is returned as
 * is (not re-validated). Fails on an invalid result and on override keys the
 * schema does not know (it would drop them silently).
 */
export function applyAgentConfigOverrides(
	config: AgentJsonConfig,
	overrides: AgentConfigOverrides | undefined,
): AgentConfigOverrideResult {
	// Without overrides the stored config runs as-is, as it always has.
	if (overrides === undefined) return { success: true, config };
	return mergeAndValidate(config, overrides);
}

/** Why `overrides` do not give a valid Agent config, or undefined when they do.
 *  For a config not yet parsed, e.g. an eval case's seeded Agent. */
export function agentConfigOverrideError(
	config: unknown,
	overrides: AgentConfigOverrides,
): string | undefined {
	const result = mergeAndValidate(config, overrides);
	return result.success ? undefined : result.error;
}
