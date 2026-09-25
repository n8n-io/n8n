# Preference mining spike

[CONTEXT-153](https://linear.app/n8n/issue/CONTEXT-153)

The lab runs inside n8n. Select a project to compare preference mining approaches
on that project's data. The lab does not change workflows or save preferences.

## Run the lab

Install workspace dependencies. Build the shared packages. Use the normal local
backend and editor commands. Add `preference-mining` to `N8N_ENABLED_MODULES` in
the backend environment. Preserve other enabled modules if you already set this
variable.

For example, in separate terminals:

```sh
N8N_ENABLED_MODULES=preference-mining pnpm dev:be
```

```sh
pnpm dev:fe:editor
```

Open a project in n8n. Select the **Preference mining** project tab. The route is
`/projects/<projectId>/preference-mining` on your editor origin. The page includes
a project selector. The API uses the selected project ID for every source read.

1. Select a project with existing workflows.
2. Select the approaches to compare. **Usage only** is selected by default.
3. For agent approaches, check the displayed n8n Assistant model.
   Select **Claude Sonnet 5** to compare a cheaper model on the same Anthropic connection.
4. Select **Run comparison**.
5. Select an approach card. Read its preferences. Expand **View evidence** for sources.
6. Open **Recall preview**. Enter a request to compare full context with recalled preferences.
7. Open **Run details** to inspect metrics, source limits, and the extraction trace.

The backend runs models through `Agent` from `@n8n/agents`. It uses structured
outputs. `InstanceAiModelService.resolveAgentModelConfig` supplies the same model
configuration as n8n Assistant. This includes the provider, environment settings,
user or instance connection, and proxy transport. The lab does not decrypt a
separate project credential to configure its agent. The selected model must
support structured outputs.

The model selector applies to one lab run. It does not change Assistant settings.
Sonnet requires an Anthropic Assistant connection. The resolver keeps the same
credentials and proxy transport. The run records the selected model and its rates.
Under **Run settings**, set the maximum output tokens for each model call.
The default is 16,384. A higher limit can increase cost and latency. The run records
this limit.

The deterministic approaches work without a model. Agent approaches require an
enabled, configured n8n Assistant and the `instanceAi:message` scope. The run export
records the resolved model ID. It never includes model credentials or headers.
The lab does not substitute sample model responses.

The lab reuses the Assistant model connection. It does not run an Assistant chat
or claim Gateway credits through `InstanceAiCreditService`. Add that accounting
before using this spike in a deployment that charges Gateway credits.

## Approaches

| Approach | Input and method | Output |
| --- | --- | --- |
| Baseline | No mining | Empty preference context |
| Node usage | Call `getNodeTypeUsage` with the selected project. Compare distinct workflow counts within node groups. | Supported node choices with share, margin, and workflow IDs |
| Credential usage | Count credential references in readable, non-archived project workflows. Group by credential type and node type. | Credential choices with the same support rules. No agent call. |
| Workflow extraction | Extract bounded candidates from each workflow. Consolidate supported groups in model batches. | Repeated patterns with exact source quotes |
| Thread memory | Read the user's own AIA threads in the project. Capture user-stated preferences in order. Deduplicate and reflect after each thread. | Preferences with a memory timeline |
| Combined | Combine all four source approaches. Prefer explicit thread evidence, then workflow evidence, then usage. | A shared preference set. Conflicting choices at equal priority abstain. |

Protocol 2 bounds each extraction to 12 candidates. Each workflow receives only
catalog dimensions for its node types and credential references. Candidate
content, values, and quotes have schema length limits. Exact key, value, context,
and folder groups retain their full evidence. Consolidation receives at most
8 supported groups per call and 3 evidence examples per group. The final result
keeps all validated evidence, not only those examples.

Workflow checkpoints record completed sources, candidates, and consolidation
batches. A failed call does not erase this work. The model adapter retries only
the failed request, not the completed source calls. Partial results remain failed
and are not scored. Checkpoints expire with the run; they do not survive a server
restart. The run records its protocol, input hash, source IDs, and limits. Each
model call records its request hash and source ID. Compare hashes before treating
two model runs as a comparison on identical inputs.

The model catalog includes node groups, credential references, workflow folders,
naming rules, and scalar node parameters. The initial node groups cover team
notifications, issue tracking, and chat model providers. A usage preference is a
candidate. Usage alone does not prove intent.

The recall preview uses the SDK episodic-memory keyword ranker. It first applies
project, folder, and context filters. It compares all applicable preferences with
the top five recalled preferences. It does not build a workflow. Counts are not
accuracy scores.

Each preview tokenizes the preference text with the shared cl100k_base encoder.
This is a local estimate. Provider token counts can differ. The cost estimate
uses the Assistant model's recorded catalog input rate. It assumes uncached
input and one inclusion of the text. It excludes the request, system prompt,
wrappers, tools, recall calls, and output. It is not a total builder cost.

Mining usage comes from the SDK result, step callbacks, or structured-output
errors. The call ledger records the source of each measurement. It keeps cache
reads, cache writes, failure stages, and known cost subtotals. Missing usage stays
unknown at the call level. The aggregate marks incomplete coverage. Its token
counts include only reported usage. Failed or cancelled requests can still have
unreported usage. The combined row retains source costs even when a source
fails. The run total counts each source once.

Runs record the resolved model ID and models.dev pricing snapshot. When the SDK
does not return a cost, the lab uses its shared cache-aware cost function with
those rates. A missing rate or incomplete usage leaves the total cost unknown.
The known subtotal stays available. Catalog estimates are not provider invoices.

## Source and run limits

- Every route requires `workflow:read` in the selected project.
- Workflow reads also enforce user access. Archived workflows are excluded.
- Credential metadata comes from the intersection of user and project access.
  Global credentials can appear if the user can use them in this project.
  Usage counts only selected-project workflows. Credential values are not mined.
- Folder reads also require `folder:list` in the project.
- Thread reads require an enabled n8n Assistant and `instanceAi:message`.
  They also require both the selected project and the requesting user's ID.
  Shared threads and other members' conversations are excluded.
- Workflow scans stop at 100. Credential usage abstains if the scan is incomplete.
- Workflow extraction uses up to 30 workflows. It skips workflows larger than
  60,000 characters. The result reports skipped workflows.
- Thread extraction uses the 10 most recent threads and up to 10 recent user
  messages per thread. Messages over 20,000 characters are skipped. The page
  reports omitted history.
- The folder list stops at 500. Node usage abstains on truncated index results.
- Runs stop after 30 minutes. Each agent call has a 3-minute timeout.
  A provider failure, call timeout, or invalid structured response gets one retry.
  Cancellation and an exhausted output allowance do not retry.
  Validation diagnostics retain field paths and issue codes. They omit response values.
- Results are scoped to the user and project. They expire after 15 minutes.
  Restarting the backend removes them. Use a single backend process for this lab.

Source text is data, not agent instructions. Known secret patterns are masked
with the shared AI redaction helpers. Workflow pin data, execution data, and
credential values are excluded. Free text and workflow parameters can still
contain private data. Review the project before sending it to a model provider.

## CLI node-usage replay

The read-only node miner remains available for saved snapshots and MCP access:

```sh
pnpm spike:preferences --demo
pnpm spike:preferences --input /tmp/node-usage.json
pnpm spike:preferences --help
```

The former standalone HTTP demo has been removed. No server listens on port 4318.

## Replay all source combinations

Open **Run details** after a comparison finishes. Select **Download run data**.
The JSON file contains preferences, evidence, source limits, and model metrics.
Keep this file private. It can contain project data.

Run this command from `packages/cli`:

```sh
pnpm exec node scripts/preference-mining/replay.mjs --input /tmp/run.json --output /tmp/preference-report
```

The replay checks all 16 subsets of the four source miners. It checks each subset
in full-context and recall modes. Baseline is the empty subset. Combined is the
subset with all four miners. Missing or failed sources remain blocked.

Each completed source runs once in the lab. The replay reuses that output and
calls the existing merge function and SDK recall ranker. It does not call a model
or connect to the instance. It writes `matrix.json` and `matrix.md` with probe
results and source hashes. Do not add source costs across the combination rows.

The replay also writes token and input-cost estimates for each completed probe
and each retrieval mode. It uses the same estimator as the UI. Failed source
combinations keep their recorded mining costs but have no retrieval estimate.
For an older export without pricing, add `--refresh-pricing` to fetch current
catalog rates. The report records these rates and their resolution time. It does
not treat current catalog rates as historical invoice rates. Without pricing,
nonempty context costs stay unknown.

The 16 retrieval probes cover names, node IDs, broad contexts, unrelated requests,
explicit changes, and scope controls. Folder checks use every exported folder.
The checks measure retrieval of existing preferences. They do not prove user
intent or measure the quality of a generated workflow. Collect all four source
results to complete the matrix.

## Earlier evidence

Earlier workflow experiments used per-workflow extraction followed by
consolidation. They rebuilt a held-out workflow and tried new ambiguous requests.
Some cases improved. Some did not improve over the existing builder.

An earlier five-session episodic-memory experiment reported 10/10 preference
checks with memory and 3/10 without memory. It reported costs of $2.26 and $2.39.
These are historical results supplied for the spike. They are not results from
this implementation. The screenshot and experiment details are on CONTEXT-153.
