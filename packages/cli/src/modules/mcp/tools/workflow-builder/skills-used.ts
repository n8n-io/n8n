import { RUNTIME_SKILL_NAME_PATTERN } from '@n8n/agents';

const MAX_SKILLS_LOGGED = 50;

export function sanitizeSkillsUsed(input: unknown): string[] | undefined {
	if (!Array.isArray(input)) return undefined;

	const seen = new Set<string>();
	const out: string[] = [];

	for (const raw of input) {
		if (typeof raw !== 'string') continue;
		const normalized = raw.trim().toLowerCase();
		if (!RUNTIME_SKILL_NAME_PATTERN.test(normalized)) continue;
		if (seen.has(normalized)) continue;
		seen.add(normalized);
		out.push(normalized);
		if (out.length >= MAX_SKILLS_LOGGED) break;
	}

	return out.length > 0 ? out : undefined;
}
