import type {
	AgentJsonConfig,
	AgentSkill,
	AgentTaskDto,
	ExportedAgentJsonConfig,
} from '@n8n/api-types';

/**
 * Build the self-contained agent JSON for export. The function inlines the
 * definition body of each task, skill, and custom tool ref from data that the
 * builder already loaded. The import path
 * recreates the definitions from these inline bodies.
 */
export function buildExportedAgentJson(
	config: AgentJsonConfig,
	sources: {
		skills: Record<string, AgentSkill>;
		tools: Record<string, { code: string }>;
		tasks: AgentTaskDto[];
	},
): ExportedAgentJsonConfig {
	const taskById = new Map(sources.tasks.map((task) => [task.id, task]));

	return {
		...config,
		...(config.tasks !== undefined
			? {
					tasks: config.tasks.map((ref) => {
						const task = taskById.get(ref.id);
						if (!task) return ref;
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
						if (!body) return ref;
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
						if (!stored) return ref;
						// The export contains only the source code. The descriptor is
						// derived state, which the target instance compiles again in
						// its secure runtime.
						return { ...ref, code: stored.code };
					}),
				}
			: {}),
	};
}
