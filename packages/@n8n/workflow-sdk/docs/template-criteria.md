# Template helpfulness criteria

This rubric scores public n8n.io workflows for inclusion in `examples/manifest.json`,
the curated set the instance-ai builder agent grep over while building. The rubric —
not the resulting list — is the durable artifact: re-run `pnpm regenerate-examples`
against a fresh catalog to refresh picks. See `scripts/criteria.ts` for the
implementation; tune weights there.

## What "helpful" means

A template is helpful if it (a) reflects a real-world pattern the agent will be
asked to build, (b) is structurally clear enough to reason about, and (c) adds
something the rest of the set doesn't.

## Mechanical viability gate (drop on fail)

Hard filters applied before scoring. Anything failing here is dropped, regardless
of other signals.

| Filter | Rule | Stage |
|---|---|---|
| Published | `status == 'published'` | detail |
| Free | `purchaseUrl == null` AND (`price` is null/undefined OR `price <= 0`) | catalog |
| Size upper bound | `nodes.length <= 40` (list count is sparse) | catalog |
| Size full range | `workflow.nodes.length` in `[3, 40]` | detail |
| Verified author | `user.verified == true` | catalog |
| Has trigger | At least one node whose type identifies as a trigger | detail |

Verified-author and node-count filters drop ~30% of the catalog combined; the
trade-off is quality density over breadth.

## Scoring dimensions

Six dimensions sum to a relative total. Weights are numbers in `criteria.ts`; the
manifest entry records each dimension's score so picks stay reviewable.

| Dimension | Weight | Signal |
|---|---|---|
| **Real-world traction** | 20 | `log10(totalViews + 1)` + `log10(recentViews + 1)` |
| **Recency** | 20 | linear decay from 1.0 (≤90d since `updatedAt`) to 0.0 (≥2y) |
| **Pattern coverage (marginal)** | 35 | `1.0 / (1 + countInBucket(running_set))` — bucket = `(triggerType, primaryIntegration, hasAI, controlFlowKind)`; recomputed as each pick is accepted |
| **AI-agent relevance** | 0 | Folded into bucket key (`hasAI`); no extra weight. Diversity bucketing alone delivers ~50% AI representation. |
| **Structural clarity** | 15 | `+0.4` if median node has a non-default name (not `Edit Fields1`, `HTTP Request2`); `+0.3` if has ≥1 sticky note; `+0.3` if has ≥3 distinct node types |
| **Pedagogical density** | 5 | `min(1, distinctNodeTypes / nodeCount)` — favours patterns over repetition |

### Why coverage dominates (35)

Pattern coverage is the heaviest weight. The builder agent needs to grep
across many distinct shapes (trigger types, integration mixes, control flow
patterns), not 100 copies of "schedule → openAi → slack." Each pick's coverage
score recomputes after the running set updates, so popular-but-redundant
candidates lose ground.

### Why AI bias is 0

The catalog is already ~53% AI-rich. The bucket key includes `hasAI`, so
round-robin selection naturally gives AI workflows ~50% of slots. Adding an
explicit AI bonus on top would over-fit. If telemetry later shows the agent
under-uses AI templates, lift this weight.

### Why traction is `log10(views) + log10(recentViews)`

Views distribution is wildly skewed (median 1, max 780k). Log-scale compresses
the long tail into a usable range. Adding recent views (last 30d) catches
"currently popular" alongside "historically popular."

## Diversity bucket

`bucketKey(detail) = (triggerType, primaryIntegration, hasAI, controlFlowKind)`

- `triggerType` ∈ `{webhook, schedule, chatTrigger, formTrigger, manual, telegram, gmail, other}`
- `primaryIntegration` — vendor prefix of the most-frequent non-trigger node (e.g. `googleSheets`, `slack`, `openAi`, `telegram`)
- `hasAI` ∈ `{true, false}` — any `@n8n/n8n-nodes-langchain.*` node OR any `openAi`/`anthropic` chat model
- `controlFlowKind` ∈ `{linear, branching, loop, parallel}` — derived from connections: branching = ifElse/switch present, loop = splitInBatches present, parallel = ≥1 node with multiple downstream connections, else linear

Selection is a rescoring loop: each round picks the candidate with the highest
total after recomputing scores against the running set. The coverage term
(`1 / (1 + countInBucket)`) biases toward underrepresented buckets without
enforcing strict round-robin.

## Calibration

`pnpm criteria:calibrate` runs the rubric against `examples/_calibration.json`
(20–30 hand-tagged workflows) and reports:

- Spearman correlation between rubric rank and expert verdict
- Top disagreements with explanations

We tune weights until correlation ≥ 0.7 on the calibration set.

## Coverage check

`pnpm criteria:coverage` checks the candidate set against real builder prompts
in `packages/@n8n/instance-ai/evaluations/data/workflows/`. Coverage = % of eval
prompts where at least one template matches ≥2 keywords. Phase 1 ships at ≥70%.
