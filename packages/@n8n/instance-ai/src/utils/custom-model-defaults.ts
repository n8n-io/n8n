import defaultsJson from './custom-model-defaults.json';

/** Mirrors OpenAI-compatible reasoning effort values used by `@n8n/agents`. */
export type CustomModelReasoningEffort =
	| 'none'
	| 'minimal'
	| 'low'
	| 'medium'
	| 'high'
	| 'xhigh'
	| 'max';

export type CustomModelExperimentDefaults = {
	reasoningEffort?: CustomModelReasoningEffort;
	supportsStructuredOutputs?: boolean;
};

type CustomModelDefaultEntry = {
	match: string;
	reasoningEffort?: CustomModelReasoningEffort;
	supportsStructuredOutputs?: boolean;
};

const CUSTOM_MODEL_DEFAULTS = defaultsJson.defaults as CustomModelDefaultEntry[];

const REASONING_EFFORTS = new Set<string>([
	'none',
	'minimal',
	'low',
	'medium',
	'high',
	'xhigh',
	'max',
]);

export function parseReasoningEffort(
	value: string | undefined,
): CustomModelReasoningEffort | undefined {
	const trimmed = value?.trim().toLowerCase();
	if (!trimmed) return undefined;
	return REASONING_EFFORTS.has(trimmed) ? (trimmed as CustomModelReasoningEffort) : undefined;
}

export function parseSupportsStructuredOutputs(value: string | undefined): boolean | undefined {
	const trimmed = value?.trim().toLowerCase();
	if (!trimmed) return undefined;
	if (trimmed === 'true' || trimmed === '1') return true;
	if (trimmed === 'false' || trimmed === '0') return false;
	return undefined;
}

/**
 * Resolve optional custom/* experiment knobs.
 * Explicit overrides win; otherwise the first case-insensitive substring match
 * in the shared model map is used. Unresolved fields stay undefined so callers
 * can omit them from the request.
 */
export function resolveCustomModelExperimentDefaults(
	modelId: string,
	overrides: CustomModelExperimentDefaults = {},
): CustomModelExperimentDefaults {
	const matched = CUSTOM_MODEL_DEFAULTS.find((entry) =>
		modelId.toLowerCase().includes(entry.match.toLowerCase()),
	);

	const reasoningEffort = overrides.reasoningEffort ?? matched?.reasoningEffort;
	const supportsStructuredOutputs =
		overrides.supportsStructuredOutputs ?? matched?.supportsStructuredOutputs;

	return {
		...(reasoningEffort !== undefined ? { reasoningEffort } : {}),
		...(supportsStructuredOutputs !== undefined ? { supportsStructuredOutputs } : {}),
	};
}

/**
 * Env → map → omit. Used by apply-thinking and model-config resolution so both
 * knobs share one path. Workflow inputs only need to set the env vars when
 * overriding; they should not re-implement the map lookup.
 */
export function resolveCustomModelExperimentDefaultsFromEnv(
	modelId: string,
	envOverrides: {
		reasoningEffort?: string;
		supportsStructuredOutputs?: string;
	} = {},
): CustomModelExperimentDefaults {
	return resolveCustomModelExperimentDefaults(modelId, {
		reasoningEffort: parseReasoningEffort(
			envOverrides.reasoningEffort ?? process.env.N8N_INSTANCE_AI_REASONING_EFFORT,
		),
		supportsStructuredOutputs: parseSupportsStructuredOutputs(
			envOverrides.supportsStructuredOutputs ??
				process.env.N8N_INSTANCE_AI_SUPPORTS_STRUCTURED_OUTPUTS,
		),
	});
}
