import type { ProviderCatalog } from '../composables/useAgentApi';
import type { AgentJsonConfig } from '../types';
import { modelToString, parseModelString } from './model-string';

type MemoryWindowWarning = {
	role: 'observer' | 'reflector';
	reason: 'unknown' | 'exceeds';
	tokens?: number;
	context?: number;
};

/** Advisory estimates, not request limits: prompts, saved notes and output need extra space. */
export function getMemoryWindowWarnings(
	config: AgentJsonConfig | null,
	catalog: ProviderCatalog,
): MemoryWindowWarning[] {
	if (!config?.memory?.enabled || config.memory.observationalMemory?.enabled === false) return [];
	const memory = config.memory.observationalMemory;
	const modelWindow = (model: AgentJsonConfig['model']) => {
		const parsed = parseModelString(modelToString(model));
		const context = parsed && catalog[parsed.provider]?.models[parsed.name]?.limits?.context;
		return context && Number.isFinite(context) && context > 0 ? context : undefined;
	};
	const configuredCap = memory?.windowShares?.maxContextWindowTokens;
	// Match the SDK policy: an explicit cap selects shares; a fixed threshold replaces automatic shares.
	const usesShares = configuredCap !== undefined || memory?.observerThresholdTokens === undefined;
	const cap = configuredCap ?? (usesShares ? 200_000 : 0);
	const warnings = new Map<MemoryWindowWarning['role'], MemoryWindowWarning>();
	const models = [
		config.model,
		...Object.values(config.subAgents?.modelsByDifficulty ?? {}).flatMap((entry) =>
			entry ? [entry.model] : [],
		),
	];
	for (const model of models) {
		const mainWindow = modelWindow(model);
		const window = cap > 0 ? Math.min(mainWindow ?? cap, cap) : mainWindow;
		const batch = window === undefined ? undefined : Math.max(1, Math.floor(window * 0.6));
		const reflection =
			memory?.reflectorThresholdTokens ?? (usesShares && batch !== undefined ? batch : 60_000);
		for (const [role, tokens] of [
			['observer', batch],
			['reflector', reflection],
		] as const) {
			const context = modelWindow(memory?.[`${role}Model`]?.model ?? model);
			if (context === undefined || tokens === undefined) {
				if (!warnings.has(role)) warnings.set(role, { role, reason: 'unknown' });
			} else if (tokens >= context) {
				warnings.set(role, { role, reason: 'exceeds', tokens, context });
			}
		}
	}
	return [...warnings.values()];
}
