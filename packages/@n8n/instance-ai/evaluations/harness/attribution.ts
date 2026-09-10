// ---------------------------------------------------------------------------
// Failure attribution — the cross-repo vocabulary (TRUST-375)
//
// The harness is the only place that knows which phase failed, what the model
// provider returned, whether the lane was healthy and whether a judge produced
// a verdict. So the harness decides the attribution and writes it to
// `eval-results.json`; lang-tracer stores what we send verbatim and overrides
// it only with cross-unit evidence one CLI process cannot have (many runners
// failing at once ⇒ provider outage).
//
// Before this, lang-tracer re-derived attribution from our `failureCategory`
// string in a hardcoded translation table between two vocabularies that were
// never agreed on. `failureCategory` still ships unchanged — pinned older
// harness commits emit it and lang-tracer's legacy map still reads it — but it
// is no longer how the meaning travels.
// ---------------------------------------------------------------------------

/**
 * Who owns a failed graded unit. Deliberately the SAME four names the verifier
 * prompt already defines, so the enum the LLM picks from and the enum we store
 * are one vocabulary rather than two that need translating — which is how the
 * old contract drifted. The harness-code categories (`build_failure`,
 * `verification_failure`, `expectations_failed`) fold into these.
 */
export const EVAL_ATTRIBUTIONS = [
	/** The agent built it wrong — including "runs as built, misses the criteria". */
	'builder_issue',
	/** The eval mock/fixture layer served data the scenario did not describe. */
	'mock_issue',
	/** The eval framework failed the test rather than the test failing: no
	 *  trigger content delivered, seed table missing, provider outage, transport
	 *  error, budget abort, runner crash. Not a product signal. */
	'framework_issue',
	/** We could not measure: verifier returned nothing, judge died, unit ungraded. */
	'verification_gap',
] as const;

export type EvalAttribution = (typeof EVAL_ATTRIBUTIONS)[number];

export function isEvalAttribution(value: unknown): value is EvalAttribution {
	return EVAL_ATTRIBUTIONS.includes(value as EvalAttribution);
}

/**
 * The categories the LLM verifier picks from, as spelled out in
 * `system-prompts/mock-execution-verify.ts`. Identical to `EVAL_ATTRIBUTIONS`
 * on purpose — kept as its own name so the prompt's enum has a code-side
 * counterpart that fails a test when the two drift.
 */
export const VERIFIER_CATEGORIES = EVAL_ATTRIBUTIONS;

/**
 * Attribution for a category the LLM verifier chose — an identity map, since
 * the two enums are now the same list.
 *
 * Anything off-enum — including a failing verdict it left uncategorised, which
 * `checklist/verifier.ts` back-fills as `verification_failure` — is the
 * builder's. That is the verifier prompt's own stance: "a workflow that runs as
 * built but doesn't meet the success criteria is a builder_issue — the builder
 * owns satisfying the scenario as written; there is no separate 'legitimate
 * failure' category."
 */
export function attributionFromVerifierCategory(category: string | undefined): EvalAttribution {
	return isEvalAttribution(category) ? category : 'builder_issue';
}

/**
 * Attribution for one verified scenario. Shared by the workflow and agent
 * paths, which decide this identically and must not drift: a verifier that
 * produced no verdict at all means we never measured, so the run is unowned
 * (`verification_gap`) rather than a failure of the thing under test.
 */
export function attributionForScenario(outcome: {
	passed: boolean;
	incomplete: boolean;
	failureCategory: string | undefined;
}): EvalAttribution | undefined {
	if (outcome.passed) return undefined;
	if (outcome.incomplete) return 'verification_gap';
	return attributionFromVerifierCategory(outcome.failureCategory);
}

/**
 * Attribution for one author-written build expectation.
 *
 * The expectations judge emits only `pass` + `reason`, so this is a policy, not
 * a mapping: an expectation the agent missed is a builder miss (same stance as
 * the verifier prompt), and an ungraded one is unmeasured. `infraFailed` covers
 * the build that never produced anything to judge — a provider outage or a
 * transport/seeding failure — where neither of those is true.
 */
export function attributionForExpectation(
	verdict: { pass: boolean; incomplete?: boolean },
	infraFailed = false,
): EvalAttribution | undefined {
	if (verdict.pass) return undefined;
	if (infraFailed) return 'framework_issue';
	return verdict.incomplete ? 'verification_gap' : 'builder_issue';
}
