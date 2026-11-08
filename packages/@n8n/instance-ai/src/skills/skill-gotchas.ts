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

/**
 * The point in a conversation from which a gotcha can apply.
 * - `after-build`: a workflow was built, verified or run in this conversation.
 * - `editing`: the agent works on saved workflow code (fetched or built).
 */
export type GotchaPhase = 'after-build' | 'editing';

export interface SkillGotcha {
	id: string;
	/** Retrieval skips the gotcha until the conversation reaches this phase. Omit for any time. */
	phase?: GotchaPhase;
	/**
	 * Retrieval skips the gotcha until one of these strings appears in the
	 * user's messages or the agent's tool inputs, such as a node type
	 * (`n8n-nodes-base.gmailTrigger`) or a tag (`<workflow-test-request>`).
	 * Omit to allow it in any thread.
	 */
	requiresAny?: readonly string[];
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

/**
 * When retrieval scores a set.
 * - `every-step`: before each model call while the skill is active.
 * - `on-load`: only for the model call right after the agent loads the skill.
 *   Use it for skills that make one decision in that call, such as routing.
 */
export type GotchaDelivery = 'every-step' | 'on-load';

export interface SkillGotchaSet {
	/** The skill that must be active for these gotchas to apply. */
	skillId: string;
	/** Default: `every-step`. */
	delivery?: GotchaDelivery;
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
