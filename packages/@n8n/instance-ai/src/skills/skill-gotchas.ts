/**
 * Skill gotchas are one-line corrections for mistakes seen in real builds or
 * evals. They are not part of a skill body. While their skill is active, the
 * runtime retrieves the gotchas whose `appliesWhen` matches the current step
 * and adds them to the conversation (see `gotcha-notes.ts`).
 *
 * To check if a gotcha is still needed, run the evals with it removed:
 * `N8N_INSTANCE_AI_SKILL_ABLATE=<id>[,<id>…]` (or `*` for all gotchas). If the
 * pass rate does not drop beyond normal variance, delete the gotcha.
 */

export interface SkillGotcha {
	id: string;
	/** The correction the model sees. */
	text: string;
	/** The situation the gotcha is for, in one sentence. Retrieval embeds this text. */
	appliesWhen: string;
	/** The failure the gotcha prevents, in one sentence. */
	fixes: string;
	/** The PR or commit that added the rule, or `unknown`. */
	origin: string;
	/** Eval cases that fail without the gotcha. Empty means it was never ablated. */
	evalCases: string[];
}

export interface SkillGotchaSet {
	/** The skill that must be active for these gotchas to apply. */
	skillId: string;
	gotchas: readonly SkillGotcha[];
}

export function parseAblatedGotchas(value: string | undefined): ReadonlySet<string> {
	return new Set(
		(value ?? '')
			.split(',')
			.map((id) => id.trim())
			.filter(Boolean),
	);
}

export function isGotchaAblated(id: string, ablated: ReadonlySet<string>): boolean {
	return ablated.has('*') || ablated.has(id);
}
