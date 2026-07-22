// ---------------------------------------------------------------------------
// Tier registry — the single table of known eval tiers (TRUST-261 extension
// point). A tier is a logical grouping cases opt into via their `datasets`
// field; `--tier <name>` selects it and it propagates to LangSmith as an
// example split.
//
// Adding a tier: add a row here (set `gated` only if the tier asserts an
// absolute green bar instead of a baseline comparison), give your cases the
// tier in `datasets` (or push with `eval:langtracer-push --tier`), and point
// the CI workflow at `--tier <name>`. Nothing else to wire.
// ---------------------------------------------------------------------------

export interface TierInfo {
	/** Gated tiers assert an absolute pass@k green bar (comparison/gate.ts)
	 *  instead of comparing against the latest baseline experiment. */
	gated: boolean;
	description: string;
}

export const TIERS = {
	pr: { gated: true, description: 'Curated PR gate — absolute green bar, no baseline comparison.' },
	full: { gated: false, description: 'Every case (the `datasets` default).' },
	mcp: { gated: false, description: 'Workflows built via `claude` + MCP lanes (--build-via-mcp).' },
	agents: { gated: false, description: 'First-class agent build/execution cases.' },
	behaviour: { gated: false, description: 'Conversation-behaviour cases (expectation-graded).' },
} as const satisfies Record<string, TierInfo>;

/** Names of tiers asserting the absolute gate — derived so gate policy lives
 *  in exactly one row of the table above. */
export const GATED_TIER_NAMES: ReadonlySet<string> = new Set(
	Object.entries(TIERS)
		.filter(([, tier]) => tier.gated)
		.map(([name]) => name),
);
