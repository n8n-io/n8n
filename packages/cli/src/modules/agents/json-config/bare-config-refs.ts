import type {
	AgentJsonConfig,
	AgentJsonToolConfig,
	ExportedAgentJsonConfig,
	ExportedAgentJsonToolConfig,
	ExportedAgentSkillConfig,
	ExportedAgentTaskConfig,
} from '@n8n/api-types';

type BareTaskRef = NonNullable<AgentJsonConfig['tasks']>[number];
type BareSkillRef = NonNullable<AgentJsonConfig['skills']>[number];
type BareCustomToolRef = Extract<AgentJsonToolConfig, { type: 'custom' }>;
type ExportedCustomToolRef = Extract<ExportedAgentJsonToolConfig, { type: 'custom' }>;

/**
 * Reduce exported config entries to the bare ref shape that the agent schema
 * column persists. Task, skill, and custom tool refs can carry an inline
 * definition body in exported agent JSON. The body lives in its own store
 * (the `agent_task_definition` table, the `skills` and `tools` columns). The
 * schema must never contain a copy of the body.
 */

export function toBareTaskRef(ref: ExportedAgentTaskConfig): BareTaskRef {
	return { type: ref.type, id: ref.id, enabled: ref.enabled };
}

export function toBareSkillRef(ref: ExportedAgentSkillConfig): BareSkillRef {
	return { type: ref.type, id: ref.id };
}

export function toBareCustomToolRef(ref: ExportedCustomToolRef): BareCustomToolRef {
	return {
		type: ref.type,
		id: ref.id,
		...(ref.requireApproval !== undefined ? { requireApproval: ref.requireApproval } : {}),
	};
}

/**
 * Make a copy of the config with every task, skill, and custom tool ref
 * reduced to its bare shape. Consumers can then compare or hash a config in
 * its bare form and in its inlined form, and get the same result.
 */
export function withBareConfigRefs(config: ExportedAgentJsonConfig): AgentJsonConfig {
	return {
		...config,
		...(config.tasks !== undefined ? { tasks: config.tasks.map(toBareTaskRef) } : {}),
		...(config.skills !== undefined ? { skills: config.skills.map(toBareSkillRef) } : {}),
		...(config.tools !== undefined
			? {
					tools: config.tools.map((ref) =>
						ref.type === 'custom' ? toBareCustomToolRef(ref) : ref,
					),
				}
			: {}),
	};
}
