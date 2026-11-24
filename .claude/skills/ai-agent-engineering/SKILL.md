---
name: ai-agent-engineering
description: Design, build, evaluate and secure AI agents and agentic workflows (LLM + context + tools). Use when the user wants to create an agent, an assistant, an automation with an LLM, a RAG system, agent memory, multi-agent orchestration, MCP tools, or asks why an agent is unreliable, too expensive, loops, or forgets. Also for "agent IA", "assistant automatisé", "workflow IA", "agent WhatsApp", "chatbot". Distilled from Microsoft "AI Agents for Beginners" (MIT) and Bojie Li "AI Agents in Depth" (Apache-2.0).
---

# AI agent engineering

Core formula: **Agent = LLM (reasoning) + context (what it sees) + tools (what it can do)**.
With a fixed model, the main lever is the context and the tools, and above all the
**harness**: the checks, limits and recovery paths built around the model. Model quality
is a commodity; the harness is what makes an agent reliable.

## 1. Decide if an agent is needed

Go up this ladder only as far as the task needs. Each step adds unpredictability.

1. **One prompt.** Classification, rewriting, extraction.
2. **Fixed workflow.** Known steps in a known order (n8n, Activepieces, a script). Most
   business automations stop here.
3. **Autonomous agent.** The steps depend on what the agent discovers.
4. **Multi-agent.** Only when a second agent brings information the first cannot get:
   code execution results, a visual check, an independent source. Test first that the
   gain pays for the extra tokens.

## 2. The agent loop

```text
read context → decide → call a tool → append the result → repeat → stop
```

Always set: a maximum number of iterations, a token or cost budget, and a stop condition
that can be checked. Agents get stuck repeating the same tool call.

## 3. Context engineering

- **Stable prefix** (system prompt + tool definitions) first, the growing history after.
  Do not edit the prefix during a run: it breaks the prompt cache and raises cost.
- **Progressive disclosure.** Show a short catalogue, load the detail on demand (this is
  how skills work). Keep fewer than about 30 tools visible at once; select the rest by
  retrieval over tool descriptions.
- **Status bar.** Keep a short, updated "where we are" block (goal, done, next) so a long
  task does not drift.
- **Compression.** Summarise old turns, but keep decisions, constraints, failures and
  sources.

Four context failures and their fix:

| Failure | Sign | Fix |
|---|---|---|
| Poisoning | A wrong fact enters the context and is reused | Validate facts with a real source before storing them; restart a clean thread |
| Distraction | Long history, the agent repeats itself | Summarise, keep only what the current request needs |
| Confusion | Too many tools, wrong tool called | Smaller tool loadout chosen per task |
| Clash | Old and new instructions conflict | Remove or explicitly override the old one; use a scratchpad |

## 4. Tools

- Prefer a few general tools (shell, file, HTTP, code) over many narrow ones. Make a
  dedicated tool only for permissions, complex parameters, very frequent calls or
  platform differences.
- Read-only tools (search, read, fetch): paginate, truncate explicitly, cache, run in
  parallel.
- Tools that act (pay, send, delete, publish): approval before, validation after,
  idempotent where possible.
- MCP connects external tools in one standard way; A2A connects agents of different
  organisations. Both widen the trust boundary: review descriptions and versions, isolate
  credentials, make sure the parameters shown to the model are the ones executed.

## 5. Memory and knowledge

- **User memory:** read relevant memories → extract candidates in the background →
  check source and policy → write. Never store an unverified fact.
- **Knowledge base (RAG):** chunk → dense + keyword retrieval → fuse → rerank → generate.
  Measure recall@k before tuning the prompt. Keep a short structured overview always in
  context, fetch details on demand.
- Every write needs a source, a date, a conflict check and a privacy check.

## 6. Five patterns to reuse

1. **Proposer-Reviewer.** The reviewer runs in a separate context and judges the
   artifact (test output, rendered page, call arguments), not the reasoning. A model does
   not reliably review itself.
2. **Progressive disclosure.** Catalogue first, details on demand.
3. **Append-only.** Add state, do not rewrite it: cacheable, replayable, auditable.
4. **Boundary set + retention set.** Test each change on the cases it should fix AND on
   the cases it must not break.
5. **Minimal, reversible diff.** Small changes with their origin, each one revertible.

## 7. Planning and multi-agent

- Break the goal into sub-tasks with structured output (JSON with fixed fields), then
  re-plan after each result.
- Shared context keeps details but grows and causes role inertia. Isolated contexts need
  an explicit handoff package: goal, inputs, constraints, acceptance criteria.
- Known failures: shared-resource conflicts, error cascades, identical agents making the
  same mistake, loops that stop too early or never. Use budgets, cancellation, diverse
  sources and independent checks.

## 8. Evaluation

- Define success first. `pass@k` = at least one success in k tries; `pass^k` = success
  every time in k tries (the one that matters for production).
- Verifiers, from strongest to weakest: deterministic check (tests, schema, exact value)
  → checklist → rubric + LLM judge → pairwise comparison.
- Build a regression set from real failures. Report a confidence interval: a 2-point
  gain on 50 tasks is usually noise.
- In production, trace every run (spans per LLM and tool call) and track latency, cost
  per run, error rate, explicit feedback and implicit feedback (rephrasing, retries).

## 9. Security (design it from the start)

| Threat | Mitigation |
|---|---|
| Prompt injection (instructions hidden in inputs, pages, files) | Treat tool output as data; filter inputs; limit turns; reviewer on risky actions |
| Access to critical systems | Least privilege, per-task credentials, authentication |
| Resource overload / cost attacks | Rate limits, budgets, turn limits |
| Knowledge-base poisoning | Restricted write access, regular verification of sources |
| Cascading errors | Sandbox (container), retries with limits, fallbacks |

Human-in-the-loop for anything irreversible: payments, messages to customers,
deletions, publication. Keep an audit trail of what was approved and executed.

## 10. Improving over time

Record evidence online; prepare and test changes offline; release gradually; keep a
rollback. Prefer changing knowledge, prompts, skills or code before fine-tuning a model.
Fine-tuning order when it is really needed: more data/capability (mid-training) → stable
format (SFT) → strategy (RL, only when some attempts already succeed).

## Checklist before shipping an agent

- [ ] Simplest level of the ladder that does the job
- [ ] Iteration, cost and time limits; clear stop condition
- [ ] Tools least-privilege; approval on irreversible actions
- [ ] Evaluation set with real cases + regression cases, with a confidence interval
- [ ] Tracing, cost and error monitoring, user feedback
- [ ] Fallback when the model or a tool is down

## Scheduled agents on Cloudflare Workers (distilled from santmun/crear-agente, MIT)

A cheap way to run a small agent every day without a server or a Claude session:
- A Worker with a `scheduled()` handler and a cron in `wrangler.jsonc` (`"triggers": {"crons": ["0 14 * * *"]}`,
  UTC). Free tier is enough for a daily job.
- State in a Durable Object (Cloudflare Agents SDK, `agents` package: `class X extends Agent`), so the agent
  remembers what it already sent (for example items already summarised) and does not repeat itself.
- Secrets with `wrangler secret put NAME`, never in `wrangler.jsonc`; a `/run` endpoint to trigger by hand
  and `/state` to inspect.
- Pipeline = fragments: fetch (RSS, a website, Apify for social networks) -> LLM summary -> save (Notion)
  -> notify (Pushover push). The repo uses OpenAI `gpt-4o-mini`; with Claude use `claude-haiku-5-5`
  (see the claude-api skill).
- Choose it over GitHub Actions only when the job must run often (every few minutes), answer HTTP calls,
  or keep state; for one daily job in a repository, a scheduled GitHub workflow is simpler.
