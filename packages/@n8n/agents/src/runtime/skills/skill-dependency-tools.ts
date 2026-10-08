import type { AgentRuntimeConfig } from '../../types/runtime/agent-runtime';

/**
 * Move the deferred tools that a registered skill depends on into the
 * always-active toolset. Loading them only when the skill activates would
 * change the tool list mid-conversation. Anthropic renders tools first, so
 * that change rewrites the whole cached prompt.
 */
export function activateSkillDependencyTools(config: AgentRuntimeConfig): AgentRuntimeConfig {
	const deferredTools = config.deferredTools ?? [];
	const dependencyNames = new Set(
		config.skillSource?.registry.skills.flatMap((skill) => skill.dependencies?.tools ?? []),
	);
	const dependencyTools = deferredTools.filter((tool) => dependencyNames.has(tool.name));
	if (dependencyTools.length === 0) return config;

	return {
		...config,
		tools: [...(config.tools ?? []), ...dependencyTools],
		deferredTools: deferredTools.filter((tool) => !dependencyNames.has(tool.name)),
	};
}
