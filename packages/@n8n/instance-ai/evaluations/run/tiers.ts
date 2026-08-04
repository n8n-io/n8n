// ---------------------------------------------------------------------------
// Gated tiers — the only tier names that carry behavior.
//
// Tiers themselves are deliberately free-form: a case opts into any grouping
// via its `datasets` field, `--tier <name>` filters by it, and the name flows
// to LangSmith as an example split. There is no tier registry on purpose —
// a catalog nothing enforces would only drift. The single piece of tier
// knowledge the harness carries is which tiers assert the absolute pass@k
// green bar (comparison/gate.ts) instead of a baseline comparison; declare
// those here.
// ---------------------------------------------------------------------------

/** Tiers whose runs assert the absolute gate instead of comparing to a baseline. */
export const GATED_TIER_NAMES: ReadonlySet<string> = new Set(['pr']);
