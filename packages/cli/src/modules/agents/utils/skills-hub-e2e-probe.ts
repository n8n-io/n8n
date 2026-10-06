import type { AgentJsonConfig, AgentSkill } from '@n8n/api-types';
import { appendFileSync } from 'node:fs';

import { getConfiguredSkillSource } from '../json-config/from-json-config';

/**
 * E2E test instrumentation for the skills hub prototype. When
 * N8N_SKILLS_HUB_E2E_PROBE names a file, every runtime build appends the
 * model-facing skill payload (catalog prompt and load_skill output) to it.
 * The probe only reads; it never changes the runtime.
 */
export async function recordSkillsHubProbe(params: {
	agentId: string;
	runType: string;
	runtimeProfile: string;
	config: AgentJsonConfig;
	skills: Record<string, AgentSkill>;
}): Promise<void> {
	const target = process.env.N8N_SKILLS_HUB_E2E_PROBE;
	if (!target) return;

	const record: Record<string, unknown> = {
		ts: new Date().toISOString(),
		agentId: params.agentId,
		agentName: params.config.name,
		runType: params.runType,
		runtimeProfile: params.runtimeProfile,
		refs: params.config.skills ?? [],
	};
	try {
		const { createRuntimeSkillRegistry, createSkillLoadTool, renderSkillCatalogPrompt } =
			await import('@n8n/agents');
		const source = getConfiguredSkillSource(
			params.config.skills ?? [],
			params.skills,
			createRuntimeSkillRegistry,
		);
		const loadTool = createSkillLoadTool(source);
		const load = async (input: Record<string, string>) =>
			await loadTool.handler?.(input, {} as never);
		record.skillsHash = source.registry.skillsHash;
		record.catalog = renderSkillCatalogPrompt(source.registry);
		const loads: unknown[] = [];
		for (const entry of source.registry.skills) {
			const files: unknown[] = [];
			for (const file of entry.linkedFiles.references) {
				files.push({
					path: file.path,
					output: await load({ skillId: entry.id, filePath: file.path }),
				});
			}
			const runtimeSkill = await source.loadSkill(entry.id);
			loads.push({
				id: entry.id,
				name: entry.name,
				allowedTools: runtimeSkill?.allowedTools ?? null,
				main: await load({ skillId: entry.id }),
				files,
			});
		}
		record.loads = loads;
	} catch (error) {
		record.error = error instanceof Error ? error.message : String(error);
	}
	appendFileSync(target, `${JSON.stringify(record)}\n`);
}
