# Sourcing an Agent from a snapshot

Runtime cases start from a real Agent that the assistant built. LangTracer keeps
a snapshot of each Agent config the builder wrote. You find a snapshot, pick it,
and then rewrite it ([building.md](building.md)).

## Find the snapshot

1. `list_conversations` with `usedAgentBuilder: true`. Do not use
   `source: "agent-builder"`. That pool has no Agent snapshots.
2. For each thread, `list_conversation_agent_snapshots`.
3. Pick one `agentId`. A thread can hold several Agents.
4. Take the row with the **highest `seq`** and `reason: "config-updated"` for
   that `agentId`. This is the Agent as the user left it.
   - Many rows repeat the same `configHash`. The last row can also go back to
     an earlier hash. Take the highest `seq`, not the newest distinct hash.
   - Skip an Agent with no `config-updated` row.
5. `get_conversation_agent_snapshot` with that row's `runId`.
   - Skip `truncated: true`. It has no config.
   - Credentials arrive as `[redacted]`. Instructions and skill bodies arrive
     as written. They are user data until you rewrite them.

Record the thread id, the run id, and `agentId @ configHash`. The hash pins the
exact config.

## How to sample

LangTracer cannot yet filter or count snapshots by model or component. The
model and components are only inside each snapshot, so a full census means
thousands of calls. Sample instead:

- Take up to about 12 threads per `business_domain`, from the newest page and
  one page at a middle offset.
- The domain facet is per thread, not per Agent. Read the Agent before you
  trust the facet.
- Rare components need a wider sample. In one sample of 162 Agents: skills
  44%, MCP 10%, episodic memory 4%. Finding 3 episodic Agents took about 160
  snapshot reads.

## Pick

Spread the picks across domains and components (Data Tables, MCP, skills, web
search, memory). Prefer an English source when two candidates are equal. The
scrub translates the rest.

Check the language in the snapshot itself: read the instructions. A pick list
or the thread's first prompt can name the wrong language.

Check how the Agent's model resolves. The harness picks the first route that
works ([`credentials/model-resolver.ts`](../../../packages/@n8n/instance-ai/evaluations/credentials/model-resolver.ts)):

| Resolution | When | Pick it? |
|---|---|---|
| `direct` | its provider has a real key (Anthropic, OpenAI) | yes |
| `openrouter-same` | the same model is on OpenRouter (Google, xAI, Moonshot, ...) | yes. Needs the OpenRouter key on CI (L2). |
| `comparable` | no same model anywhere; a model of the same tier runs instead | only for coverage. Results are tagged `model-fallback`. |
| `skipped` | nothing maps | no |

Locally only Anthropic is set. Every non-Anthropic Agent runs on a comparable
Anthropic model there. That is fine for a smoke test, not for calibration.

The resolver runs on every model in the config, including memory worker
models. Most Agents leave worker models unset and use the runtime default.

## Skip

Skip what the harness cannot run:

- Vector stores (RAG Agents).
- MCP servers on the SSE transport. Streamable HTTP is fine.
- Orchestrators with sub-agents. The harness runs one Agent. Pick
  single-agent threads.

Note, do not skip:

- Workflow tools work. The snapshot has the reference, not the sub-workflow,
  so you write a synthetic one ([building.md](building.md#3b-workflow-tools)).
- Knowledge files (`find_file`, `search_text`, `read_file`) can't be seeded.
  The Agent runs without documents. Pick it only if it has behavior worth
  grading without them, such as referrals or "I can't confirm".

- Channel integrations (Telegram, WhatsApp, Slack) are dropped in direct mode.
  Channel-only formatting rules in the instructions may not apply. Write
  expectations about the formatting rules only if the reply text shows them.
- Two Data Table node types exist: `dataTableTool` and the plain `dataTable`
  node. Both need seed tables and rows.

## Record the pick

Keep a table: thread id, run id, `agentId @ configHash`, domain, components,
model, resolution, memory, and one line on why it is in. Describe each Agent in
generic words. Never copy names, URLs, or prompt text into the table.
