// Conservative slug shape matching the Claude Code skill naming convention
// (lowercase kebab-case, optional `namespace:name` form). Anything not matching
// is dropped before reaching telemetry, so free-form text the LLM may have
// stuffed into the field (PII, prompts, secrets) is filtered out.
const SKILL_NAME_PATTERN = /^[a-z][a-z0-9]*(?:[-:][a-z0-9]+)*$/;
const MAX_SKILLS_LOGGED = 50;
const MAX_SKILL_NAME_LENGTH = 128;

export function sanitizeSkillsUsed(input: unknown): string[] | undefined {
	if (!Array.isArray(input)) return undefined;

	const seen = new Set<string>();
	const out: string[] = [];

	for (const raw of input) {
		if (typeof raw !== 'string') continue;
		const normalized = raw.trim().toLowerCase();
		if (normalized.length === 0 || normalized.length > MAX_SKILL_NAME_LENGTH) continue;
		if (!SKILL_NAME_PATTERN.test(normalized)) continue;
		if (seen.has(normalized)) continue;
		seen.add(normalized);
		out.push(normalized);
		if (out.length >= MAX_SKILLS_LOGGED) break;
	}

	return out.length > 0 ? out : undefined;
}
