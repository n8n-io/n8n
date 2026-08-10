import { z } from 'zod';

const customModelReasoningEffortSchema = z.enum([
	'none',
	'minimal',
	'low',
	'medium',
	'high',
	'xhigh',
	'max',
]);

export type CustomModelReasoningEffort = z.infer<typeof customModelReasoningEffortSchema>;

export type CustomModelExperimentDefaults = {
	reasoningEffort?: CustomModelReasoningEffort;
	supportsStructuredOutputs?: boolean;
};

const customModelDefaultEntrySchema = z
	.object({
		match: z.string().min(1),
		reasoningEffort: customModelReasoningEffortSchema.optional(),
		supportsStructuredOutputs: z.boolean().optional(),
	})
	.strict();

type CustomModelDefaultEntry = z.infer<typeof customModelDefaultEntrySchema>;

/**
 * Known custom/* model experiment defaults. First case-insensitive substring
 * match wins. Add entries here when a new custom model needs stable knobs.
 */
const CUSTOM_MODEL_DEFAULTS = [
	{
		match: 'kimi-k3',
		reasoningEffort: 'low',
		supportsStructuredOutputs: true,
	},
	{
		match: 'glm-5.2',
		reasoningEffort: 'medium',
		supportsStructuredOutputs: true,
	},
	{
		match: 'deepseek',
		supportsStructuredOutputs: true,
	},
] satisfies CustomModelDefaultEntry[];

export function parseReasoningEffort(
	value: string | undefined,
): CustomModelReasoningEffort | undefined {
	const trimmed = value?.trim().toLowerCase();
	if (!trimmed) return undefined;
	const parsed = customModelReasoningEffortSchema.safeParse(trimmed);
	return parsed.success ? parsed.data : undefined;
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

function warnInvalidEnvOverride(envName: string, value: string): void {
	console.warn(
		`[instance-ai] Ignoring invalid ${envName}="${value}"; falling back to custom model defaults map when available.`,
	);
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
	const reasoningEffortRaw =
		envOverrides.reasoningEffort ?? process.env.N8N_INSTANCE_AI_REASONING_EFFORT;
	const supportsStructuredOutputsRaw =
		envOverrides.supportsStructuredOutputs ??
		process.env.N8N_INSTANCE_AI_SUPPORTS_STRUCTURED_OUTPUTS;

	const reasoningEffort = parseReasoningEffort(reasoningEffortRaw);
	if (reasoningEffort === undefined && reasoningEffortRaw?.trim()) {
		warnInvalidEnvOverride('N8N_INSTANCE_AI_REASONING_EFFORT', reasoningEffortRaw);
	}

	const supportsStructuredOutputs = parseSupportsStructuredOutputs(supportsStructuredOutputsRaw);
	if (supportsStructuredOutputs === undefined && supportsStructuredOutputsRaw?.trim()) {
		warnInvalidEnvOverride(
			'N8N_INSTANCE_AI_SUPPORTS_STRUCTURED_OUTPUTS',
			supportsStructuredOutputsRaw,
		);
	}

	return resolveCustomModelExperimentDefaults(modelId, {
		reasoningEffort,
		supportsStructuredOutputs,
	});
}
