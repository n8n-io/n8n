import { type AgentJsonConfig, type AgentSkill } from '@n8n/api-types';

export function getMissingSkillIds(
	config: AgentJsonConfig | null,
	skills: Record<string, AgentSkill>,
): string[] {
	const refs = config?.skills ?? [];
	const seen = new Set<string>();
	const missing: string[] = [];

	for (const ref of refs) {
		if (seen.has(ref.id)) continue;
		seen.add(ref.id);
		if (!skills[ref.id]) missing.push(ref.id);
	}

	return missing;
}
