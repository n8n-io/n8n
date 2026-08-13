import type {
	AgentJsonConfig,
	AgentSkill,
	AgentTaskDto,
	ExportedAgentJsonConfig,
} from '@n8n/api-types';

/**
 * Build the self-contained agent JSON for export: inline each task, skill,
 * and custom tool ref's definition body from the builder's already-loaded
 * data, mirroring how workflow export expands tag refs client-side. The
 * server stores and serves only bare refs; the import path recreates the
 * definitions from these inline bodies.
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
						// Own-key lookup only, so ids like "constructor" can't surface
						// prototype members.
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
						// Only the source code is exported; the descriptor is derived
						// state the importing instance recompiles in its secure runtime.
						return { ...ref, code: stored.code };
					}),
				}
			: {}),
	};
}
