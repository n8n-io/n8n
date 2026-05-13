# Seed n8n instance

`seedInstance.mjs` fills a local n8n instance with a realistic-looking spread of
projects, workflows, credentials, and data tables via the **public API**. The
resulting dependency graph is designed to render like a real org's automation
estate: dense intra-team clusters, sparse cross-team bridges through shared
utility projects, a few legacy "trenchcoat" projects sitting off to the side,
and one central data table that everything reaches through a proxy workflow.

Useful for demos, perf testing, visual QA of the workflow dependency graph, and
poking at the workflow-index module with non-trivial input.

## Quick start

```sh
N8N_API_KEY="<a public-api JWT for an owner/admin>" \
  node bin/seedInstance/seedInstance.mjs
```

Targets `http://localhost:5678` by default. The script is **destructive by
default**: it deletes its own prior output (anything tagged `[seed]`) and any
team projects whose names match the current taxonomy plus orphans from older
runs. Personal-project entities that don't match the seed prefix are left
alone, as are the n8n-default `My project` team projects.

### Environment variables

| Var | Default | Purpose |
| --- | --- | --- |
| `N8N_API_KEY` | (required) | Public-API JWT. Must have owner or admin scopes. |
| `N8N_BASE_URL` | `http://localhost:5678` | n8n instance to seed. |
| `CLEAR` | `true` | Set to `false` to additive-seed without wiping prior `[seed]` data. |

Runtime is ~30–45 s for a default run (~500 workflows, ~30 projects).

## What it creates

**Projects** (30 team projects + your existing personal):

- **2 utility projects** — `Shared Platform` (technical plumbing: Audit
  Logger, Slack Alerts Dispatcher, Sentry Error Forwarder, …) and
  `Org Utilities` (business helpers: Tenant Resolver, Vault Reader, Feature
  Flag Resolver, …). These are the hub workflows the rest of the org calls
  into.
- **25 community projects** organised into 5 themed communities of 5 projects
  each: Revenue, Customer, Engineering, Operations, Knowledge.
- **3 trenchcoat projects** — Legacy Migrations, Skunkworks, Founder's
  Workflows. Smaller, internally split into 2-3 disjoint sub-systems (e.g.
  `[HR System]`, `[Old Billing]`, `[Acme Acquisition]`), and almost entirely
  detached from the rest of the org. They model accreted legacy state.

**Credentials** (~110):
- Two per project max (random recipes: Notion, Slack, Postgres, GitHub, …).
- Plus **5 global credentials** living in the utility projects (Production
  Slack Webhook, Datadog API, GitHub platform bot, OpenAI production,
  Vault read-only).

**Data tables** (~15–20):
- One per ~55% of projects, with 5–20 sample rows.
- Plus one **central data table** `seed_customers` in `Org Utilities` that
  the entire org reaches through a single proxy workflow.

**Workflows** (~500), built in four phases:
- **Phase 0** — Utility lynchpin workflows in `Shared Platform` and
  `Org Utilities`, plus the Customers Proxy.
- **Phase 1** — Leaf workflows in every project, no sub-calls.
- **Phase 2** — Parent workflows with sub-workflow refs. Community projects
  pick own/sibling/lynchpin; trenchcoats pick within their internal group.
- **Phase 3** — Data-table consumer workflows (one per project DT).
- **Phase 4** — Cross-project data-table proxies for ~6 non-utility DTs.

## Two non-obvious architectural rules

1. **`DataTable` nodes can only point at tables in their own project.** Cross-
   project access goes through a proxy workflow. The `customersProxy` in
   `Org Utilities` is the only workflow with a direct `DataTable` node on
   the central table; everyone else calls the proxy via `ExecuteWorkflow`.
   Phase 4 generalises this pattern to ~6 other data tables.

2. **Per-project external-ref budgets.** Each community project is capped at
   2–5 distinct external workflow refs and 5–10 external credential refs,
   tracked across all phases. About a third of community projects opt out of
   utility refs entirely (some of those go fully self-contained — no
   external refs of any kind). Trenchcoats and utility projects are exempt.

## Tunable knobs

All knobs live at the top of `seedInstance.mjs`. The ones that change the
shape of the graph the most:

| Constant | Effect |
| --- | --- |
| `COMMUNITIES` | Project taxonomy. Add/remove communities or projects. |
| `TRENCHCOAT_PROJECTS` + `TRENCHCOAT_GROUPS` | Legacy projects and their internal subsystems. |
| `UTILITY_WORKFLOW_THEMES` | Lynchpin workflow names per utility project. |
| `LYNCHPIN_CRED_RECIPES` | The 5 global credentials. |
| `UTILITY_REF_PROB` (0.6) | Per-workflow probability of including a utility ref. |
| `CENTRAL_DT_REF_PROB` (0.08) | Per-workflow probability of calling the Customers Proxy (indirect central-DT use). |
| `ORG_UTIL_DIRECT_DT_PROB` (0.5) | Per-workflow probability that an Org Utilities phase-0 workflow gets a direct DataTable node on the central table. |
| `EXT_WF_REF_BUDGET` / `EXT_CRED_REF_BUDGET` | Per-project distinct-ref caps. |
| `NON_UTILITY_USING_TARGET` (9) | How many community projects opt out of utility refs. |
| `SELF_CONTAINED_PROJECT_PROB` | Subset of the opt-out projects that go fully siloed. |
| `sampleWorkflowCount()` | Power-law-ish size buckets per project kind. |

`SUBWF_PROB_OWN`/`_SIBLING`/`_LYNCHPIN` (in `pickCommunitySubWf`) govern how
parent workflows route sub-calls.

## Verifying a run

The dependency-graph endpoint is the canonical view of what the seed
produced. It includes both the community structure and the central-DT proxy
pattern:

```sh
curl -s "$N8N_BASE_URL/api/v1/workflows/dependency-graph?format=dot" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" | sfdp -Tsvg -Goverlap=prism > graph.svg
```

`sfdp`/`fdp` (Graphviz force-directed layouts) reveal the cluster topology
better than the default hierarchical `dot` layout.

Counts via API:

```sh
for path in workflows projects credentials data-tables; do
  echo -n "$path: "
  curl -s "$N8N_BASE_URL/api/v1/$path?limit=1" \
    -H "X-N8N-API-KEY: $N8N_API_KEY" | jq -r '.data | length'
done
```

Key numbers a default run should land near:
- ~500 workflows, 30 team projects, ~110 credentials, ~15 data tables
- ~45% of workflows reference a utility workflow
- ~5–10% of workflows reach the central data table (2–4 direct refs from
  workflows inside Org Utilities — Customers Proxy plus a few service
  workflows like Region Router or Feature Flag Resolver — and the rest via
  `ExecuteWorkflow` into the proxy)
- 20 of 29 non-utility projects use utility workflows
- 0 direct cross-project DataTable references (architectural invariant)

## Re-running and cleanup

The clear step is greedy: any workflow / credential / data-table with the
`[seed]` (or `seed_` for data tables) prefix is deleted, plus any team
project owning a `[seed]`-prefixed entity, plus any orphan team project from
an earlier run that doesn't match the current `PROJECT_NAMES` list and is
empty and not named `My project`.

To remove all seeded data without reseeding:

```sh
N8N_API_KEY=… CLEAR=true node bin/seedInstance/seedInstance.mjs --abort-after-clear
```

That flag isn't implemented today — if you want clear-only, kill the script
with `^C` after the "Clear done." log line.

## Adding new behaviour

Adding a new shape of workflow usually means three places:

1. A constant or recipe at the top of the file (theme name, cred type, …).
2. A change inside `workflowNodes()` if it needs a new node type.
3. A phase change (or new phase) inside `main()` that calls `createWf()`.

`applyOrgUtilityRefs()` is the central hook for "every workflow should
sometimes touch X". Phase 4 (`/* cross-project data-table proxies */`) is
the template for "select a few entities, give each its own consumer
fan-out".

## Known limitations

- Trenchcoat phase-3 (data-table consumer) workflows don't carry an internal
  group label, so they show up as ungrouped within their trenchcoat project.
  Minor visual artifact only.
- The `[seed] X: [group] Y N` naming convention is what powers the
  group-aware visualisation. Renaming a workflow externally severs the
  link the analyser uses to group it.
- No protection against running against a non-local instance. **Don't point
  it at a shared/production n8n** — the clear step will delete everything
  prefixed `[seed]` regardless of who created it.
