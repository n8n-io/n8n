/**
 * Skill gotchas are one-line corrections in a skill's `## Gotchas` section.
 * Each line ends with `<!-- gotcha:<id> -->`. The marker is stripped before the
 * model sees the skill, so it costs no tokens.
 *
 * Every gotcha has a ledger entry that says which failure it fixes. To check if a
 * gotcha is still needed, run the evals with it removed:
 * `N8N_INSTANCE_AI_SKILL_ABLATE=<id>[,<id>…]` (or `*` for all gotchas). If the
 * pass rate does not drop beyond normal variance, delete the line and its entry.
 */

export interface SkillGotcha {
	/** Matches the `<!-- gotcha:<id> -->` marker in the skill. */
	id: string;
	/** The failure the line prevents, in one sentence. */
	fixes: string;
	/** The PR or commit that added the rule, or `unknown`. */
	origin: string;
	/** Eval cases that fail without the line. Empty means it was never ablated. */
	evalCases: string[];
}

const GOTCHA_MARKER = /[ \t]*<!-- gotcha:([a-z0-9-]+) -->/;
const GOTCHA_MARKER_GLOBAL = new RegExp(GOTCHA_MARKER.source, 'g');

/** The gotcha ids in a skill, in order. */
export function listGotchaIds(instructions: string): string[] {
	return [...instructions.matchAll(GOTCHA_MARKER_GLOBAL)].map((match) => match[1]);
}

export function parseAblatedGotchas(value: string | undefined): ReadonlySet<string> {
	return new Set(
		(value ?? '')
			.split(',')
			.map((id) => id.trim())
			.filter(Boolean),
	);
}

/** Removes ablated gotcha lines and strips the markers from the rest. */
export function applySkillGotchas(instructions: string, ablated: ReadonlySet<string>): string {
	if (!GOTCHA_MARKER.test(instructions)) return instructions;
	return instructions
		.split('\n')
		.filter((line) => {
			const id = GOTCHA_MARKER.exec(line)?.[1];
			return !id || !(ablated.has('*') || ablated.has(id));
		})
		.join('\n')
		.replace(GOTCHA_MARKER_GLOBAL, '');
}
