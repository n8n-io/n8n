import { RUNTIME_SKILL_NAME_PATTERN } from '@n8n/agents';

const MAX_SKILLS_LOGGED = 50;

// Skills that ship inside a plugin are namespaced by the plugin, so an
// identifier may optionally carry a `<plugin>:` prefix (e.g. `n8n-skills:`).
const PLUGIN_PREFIX = 'n8n-skills';
const PLUGIN_PREFIXED_NAME_PATTERN = new RegExp(`^${PLUGIN_PREFIX}:[a-z0-9][a-z0-9._-]{0,63}$`);

/** Shared description for the `skillsUsed` parameter across workflow-builder tools. */
export const SKILLS_USED_DESCRIPTION =
	'Names of n8n skills used by the MCP client to produce this workflow call. Accepts lowercase kebab-case identifiers, optionally with a plugin prefix (e.g. `n8n-skills:workflow-builder`). Server-side normalization will trim, lowercase, dedupe, and drop entries that are not valid skill identifiers.';

function isValidSkillIdentifier(normalized: string): boolean {
	return (
		RUNTIME_SKILL_NAME_PATTERN.test(normalized) || PLUGIN_PREFIXED_NAME_PATTERN.test(normalized)
	);
}

export function sanitizeSkillsUsed(input: unknown): string[] | undefined {
	if (!Array.isArray(input)) return undefined;

	const seen = new Set<string>();
	const out: string[] = [];

	for (const raw of input) {
		if (typeof raw !== 'string') continue;
		const normalized = raw.trim().toLowerCase();
		if (!isValidSkillIdentifier(normalized)) continue;
		if (seen.has(normalized)) continue;
		seen.add(normalized);
		out.push(normalized);
		if (out.length >= MAX_SKILLS_LOGGED) break;
	}

	return out.length > 0 ? out : undefined;
}
