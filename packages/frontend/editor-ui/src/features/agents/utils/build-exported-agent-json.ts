import type {
	AgentJsonConfig,
	AgentSkill,
	AgentTaskDto,
	ExportedAgentJsonConfig,
} from '@n8n/api-types';

/** A ref whose definition body was absent from the export sources. */
export interface MissingExportDefinition {
	kind: 'task' | 'skill' | 'tool';
	id: string;
}

export interface ExportedAgentJsonResult {
	config: ExportedAgentJsonConfig;
	/**
	 * Refs that stayed bare because their body was missing. An import of this
	 * export drops these refs, so the caller must warn the user.
	 */
	missing: MissingExportDefinition[];
}

/**
 * Build the self-contained agent JSON for export. The function inlines the
 * definition body of each task, skill, and custom tool ref from data that the
 * builder already loaded. The import path recreates the definitions from
 * these inline bodies.
 */
export function buildExportedAgentJson(
	config: AgentJsonConfig,
	sources: {
		skills: Record<string, AgentSkill>;
		tools: Record<string, { code: string }>;
		tasks: AgentTaskDto[];
	},
): ExportedAgentJsonResult {
	const taskById = new Map(sources.tasks.map((task) => [task.id, task]));
	const missing: MissingExportDefinition[] = [];

	const exportedConfig: ExportedAgentJsonConfig = {
		...config,
		...(config.tasks !== undefined
			? {
					tasks: config.tasks.map((ref) => {
						const task = taskById.get(ref.id);
						if (!task) {
							missing.push({ kind: 'task', id: ref.id });
							return ref;
						}
						return {
							...ref,
							name: task.name,
							objective: task.objective,
							cronExpression: task.cronExpression,
						};
					}),
				}
			: {}),
		...(config.skills !== undefined
			? {
					skills: config.skills.map((ref) => {
						// Use an own-key lookup, so ids like "constructor" cannot
						// return prototype members.
						const body = Object.hasOwn(sources.skills, ref.id) ? sources.skills[ref.id] : undefined;
						if (!body) {
							missing.push({ kind: 'skill', id: ref.id });
							return ref;
						}
						return {
							...ref,
							name: body.name,
							description: body.description,
							instructions: body.instructions,
							...(body.allowedTools !== undefined ? { allowedTools: body.allowedTools } : {}),
							...(body.references !== undefined ? { references: body.references } : {}),
						};
					}),
				}
			: {}),
		...(config.tools !== undefined
			? {
					tools: config.tools.map((ref) => {
						if (ref.type !== 'custom') return ref;
						const stored = Object.hasOwn(sources.tools, ref.id) ? sources.tools[ref.id] : undefined;
						if (!stored) {
							missing.push({ kind: 'tool', id: ref.id });
							return ref;
						}
						// The export contains only the source code. The descriptor is
						// derived state, which the target instance compiles again in
						// its secure runtime.
						return { ...ref, code: stored.code };
					}),
				}
			: {}),
	};

	return { config: exportedConfig, missing };
}
