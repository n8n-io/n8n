import { type AgentSkill } from '@n8n/api-types';

import type { AgentSkillRefs } from '../json-config/agent-document';

export function getMissingSkillIds(
	skillRefs: AgentSkillRefs,
	skills: Record<string, AgentSkill>,
): string[] {
	const refs = skillRefs ?? [];
	const seen = new Set<string>();
	const missing: string[] = [];

	for (const ref of refs) {
		if (ref.enabled === false) continue;
		if (seen.has(ref.id)) continue;
		seen.add(ref.id);
		if (!skills[ref.id]) missing.push(ref.id);
	}

	return missing;
}
