import type { AgentJsonConfig } from './agent-json-config.schema';
import type { AgentTaskConfig } from './agent-task.schema';
import type { AgentSkill } from './types';

/**
 * Bodies that a config only refers to, keyed by the id their ref uses. Skills
 * are persisted on the agent's `skills` column and tasks in
 * `agent_task_definition`, so neither travels with `agent.schema` by default.
 */
export type AgentRefDefinitions = {
	skills: Record<string, AgentSkill>;
	tasks: Record<string, AgentTaskConfig>;
};

function withDefinition<Ref extends { id: string }, Definition>(
	ref: Ref,
	definition: Definition | undefined,
): Ref {
	return definition === undefined ? ref : { ...ref, definition };
}

/**
 * Inline skill and task bodies into their config refs, so the result stands on
 * its own — every ref carries the body it points at instead of only an id that
 * means nothing outside the owning agent. A ref whose body is missing is left
 * as-is rather than dropped.
 */
export function inlineRefDefinitions(
	config: AgentJsonConfig,
	definitions: AgentRefDefinitions,
): AgentJsonConfig {
	return {
		...config,
		...(config.skills && {
			skills: config.skills.map((ref) => withDefinition(ref, definitions.skills[ref.id])),
		}),
		...(config.tasks && {
			tasks: config.tasks.map((ref) => withDefinition(ref, definitions.tasks[ref.id])),
		}),
	};
}

/**
 * Split inlined bodies back out of their refs. Inverse of
 * `inlineRefDefinitions`: the returned config is refs-only — the shape
 * `agent.schema` persists — and the bodies are handed back for their own
 * stores.
 */
export function extractRefDefinitions(config: AgentJsonConfig): {
	config: AgentJsonConfig;
	definitions: AgentRefDefinitions;
} {
	const definitions: AgentRefDefinitions = { skills: {}, tasks: {} };

	const skills = config.skills?.map(({ definition, ...ref }) => {
		if (definition) definitions.skills[ref.id] = definition;
		return ref;
	});
	const tasks = config.tasks?.map(({ definition, ...ref }) => {
		if (definition) definitions.tasks[ref.id] = definition;
		return ref;
	});

	return {
		config: {
			...config,
			...(skills && { skills }),
			...(tasks && { tasks }),
		},
		definitions,
	};
}
