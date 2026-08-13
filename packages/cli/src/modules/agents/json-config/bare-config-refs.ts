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
 * Reduce exported config entries to the bare reference shape persisted on the
 * agent schema column. Task, skill, and custom tool refs may carry an inline
 * definition body in exported/imported agent JSON; the body lives in its own
 * store (`agent_task_definition` table, `skills`/`tools` columns) and must
 * never be duplicated into the schema.
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
 * A copy of the config with every task/skill/custom-tool ref reduced to its
 * bare shape. Lets consumers compare or hash configs independently of whether
 * definition bodies were inlined for export.
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
