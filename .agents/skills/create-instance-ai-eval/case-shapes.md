# Case shapes beyond the plain build

The [SKILL](SKILL.md) covers the **build** archetype. This file covers the other
three — **behaviour/process**, **credential**, **seeded** — plus the
director-note vocabulary multi-turn cases rely on. Field-level docs live in the
eval [README](../../../packages/@n8n/instance-ai/evaluations/README.md); this is
the opinionated *how* and the traps.

Example cases in the corpus get renamed and churned, so this file names as few
files as possible — prefer `grep`-ing the corpus by tag/field. The one stable
pointer worth naming: **`applies-each-change-when-asked`** for a well-built
director conversation.

The schema
([`schema.ts`](../../../packages/@n8n/instance-ai/evaluations/data/workflows/schema.ts))
enforces the rules you must respect:

- `seedFile`, `priorConversation`, `seedThread` are **mutually exclusive** — pick
  one seeding mode.
- A case needs a `conversation` **or** a `seedThread` (which supplies the live
  turn from the trace).
- A case needs **at least one** `executionScenario`, `processExpectation`, or
  `outcomeExpectation`.
- `buildExpectations` is a **forbidden key** (fails loudly) — it was split into
  `processExpectations` / `outcomeExpectations`.

---

## Behaviour / process cases (multi-turn director notes)

These test *how the agent converses*, not just what it builds: does it ask the
right clarifying question, avoid re-asking, honour a mid-build correction,
respect plan approval, batch bundled changes? They're graded by
`processExpectations` and are often **build-only** (no `executionScenarios`).
Tag them `behaviour` and grep that tag for patterns.

### How multi-turn works

Mode is chosen automatically from `conversation`:

- **Single-prompt (auto-approve):** one `user` turn, no `assistant` turns — the
  prompt is sent and every confirmation is auto-approved. Plain build cases.
  **Caveat: only *confirmations* are auto-approved — a genuine clarifying
  `ask-user` *question* is never answered**, so the build hangs until the
  per-iteration timeout and reports as `BUILD FAILED: Run timed out` with no
  scored result (nothing to grade). If a prompt is vague enough that the agent
  is likely to ask a setup/topology question before building (an unspecified
  data source, delivery channel, or one-vs-two-workflow split), author it
  **multi-turn** with a `[bracketed]` director note in turn 1 that pre-answers
  those questions so the agent proceeds to build. A single-prompt build case
  only works when the prompt leaves nothing the agent must ask about.
- **Multi-turn:** anything else. A **user-proxy LLM** plays the user — answers
  questions, audits the agent's plan against your script, and sends follow-ups
  (capped by `messageBudget`).

Rules that trip people up:

1. **`assistant` turns are *reference only* — never delivered to the builder.**
   They tell the proxy the expected flow. The load-bearing content is your
   `user` turns + director notes; lead with those.
2. **Don't fabricate assistant "done" turns to *sequence* refinements.** The
   proxy sees the whole script as soft context on every decision, so acks like
   "Got it / Updated" interleaved between user changes signal that work is
   already handled → it drops steps, reorders, or jumps to the end. Instead
   encode the ordering **inside one director note** and let the proxy send each
   change and wait for the build (this is exactly what
   `applies-each-change-when-asked` does — one bracketed, ordered list; a single
   opening reference ack is fine).
3. **`conversation[0]` is sent to the builder *raw*.** Never put a director note
   in the opening turn — it leaks verbatim into the build prompt. Notes belong
   only in the proxy-driven turns ([1]+).
4. **The proxy does not set credentials.** Verified against the proxy's action
   set (`utils/user-proxy/tools.ts`): there is no credential action, and
   `apply_setup_wizard` explicitly fills only non-credential params. Credentials
   are deferred ("I'll set them up later"). A case that needs a credential
   present must **declare** it (below), not expect the proxy to type one.

### Director-note vocabulary (`[bracketed]` in a `user` turn)

Text inside `[square brackets]` is a **director note** — how the user behaves at
that moment, never spoken verbatim. It overrides the proxy's default ("always
answer, inventing a plausible value"). The proxy's system prompt
([`utils/user-proxy/prompts.ts`](../../../packages/@n8n/instance-ai/evaluations/utils/user-proxy/prompts.ts))
recognises this vocabulary:

| To make the user… | Director note |
|---|---|
| Withhold a value until asked | `[Don't bring up the channel unless the agent asks where to post; then say 'Slack #growth.']` |
| Refuse and hold firm on re-ask | `[The user has no channel and won't provide one. If asked — question or setup card, even repeatedly — skip it; never invent one.]` |
| Dismiss a setup card / skip a value | `[When the setup card asks for the API base URL, dismiss it — the user hasn't decided yet.]` (proxy dismisses via `approve_or_reject(false)`) |
| Reject a plan that misses a requirement | `[When the agent shows its plan, reject it unless it sorts descending by count.]` |
| Iterate change-by-change, in order | `[Send each change below in order, waiting for the build after each; keep bundled changes in one message.]` |

The `text` of a turn may be an **array of strings** (joined with newlines) so a
long director note stays readable in JSON. A note governs only what it covers;
elsewhere the proxy answers every question with a plausible placeholder (mocks
make placeholders fine). Setup cards are filled via the wizard (`apply_setup_wizard`)
or dismissed — never answered as questions.

**Sanity rule:** a behaviour case is only worth shipping if its
`processExpectations` would *fail* on the misbehaviour you're guarding against.
If the agent could ignore your intent and still pass, the assertion is too loose.

---

## Credential cases

By default a build sees **no credentials**: the harness pins every build
thread's credential view to the case's declared set (empty unless declared), so
concurrent cases and whatever else lives on the instance can never leak in.

```json
"credentials": [{ "type": "slackApi" }]
```

Declared credentials are created for real before the build, the thread's view is
pinned to exactly that set, and they're deleted after the run. Tokens are a
placeholder by default; for a **live** token (verification runs for real instead
of mocked) set the type's `EVAL_*` env var — e.g. `EVAL_SLACK_ACCESS_TOKEN`,
`EVAL_NOTION_API_KEY`, `EVAL_GITHUB_ACCESS_TOKEN`, `EVAL_GMAIL_ACCESS_TOKEN`,
`EVAL_TEAMS_ACCESS_TOKEN`. `name` is optional (duplicates get a `#2` suffix).

Only a closed set of types is valid — declaring anything else fails at case-load
with a pointer to add a template. From
[`credentials/seeder.ts`](../../../packages/@n8n/instance-ai/evaluations/credentials/seeder.ts):
`slackApi`, `notionApi`, `githubApi`, `gmailOAuth2`,
`microsoftTeamsOAuth2Api`, `whatsAppTriggerApi`, `httpHeaderAuth`,
`httpBasicAuth`. Need another? Add a `CredentialTemplate` to `seeder.ts` (a
`defaultName`, optional `envVar`, and `buildData(token)`); that extends
`SUPPORTED_CREDENTIAL_TYPES`, which the schema validates against.

---

## Seeded cases (start mid-conversation)

A seeded case restores prior history into the build thread *before* the live
turn, so the eval drives only the turn under test. Use it to reproduce a real
situation — a conversation up to some point, then a message that should trigger
(or correct) a behaviour.

Pick the lightest mode that fits:

| Situation | Mode | Pairs with |
|---|---|---|
| Reproduce a real conversation (common case) | `seedThread` — fetch + reconstruct its LangSmith trace at run time; nothing committed | supplies its own live turn (omit `conversation`) |
| Prelude is just "what was discussed" (no tool calls, no workflows) | `priorConversation` — prose turns, authored inline | a normal `conversation` for the live turn |
| A synthetic/sanitised fixture you want durable in git | `seedFile` — a committed seed JSON (never real conversation data) | a normal `conversation` for the live turn |
| Shallow 2–3 turn prelude where the agent's live replies matter | none — a plain multi-turn `conversation` re-drives it live | — |

All three modes are implemented and wired (`harness/conversation-seed.ts` +
`harness/langsmith-seed.ts`, threaded through the runner).

### What the seed does — and does not — exercise

**The seeded portion is restored, not re-run.** The message log is written into
the thread verbatim (marked `seeded: true` so the judge and checks can tell it
apart), and the workflows and data tables the history references are **recreated
on the instance** — so when the live turn runs, the agent sees the same
workspace the original conversation left behind. Data tables are recreated
**schema-only, no rows** (row values are the most sensitive part of a trace and
are kept out of the eval instance).

The consequence to internalise: **nothing you assert can change what already
happened in the seeded turns** — the agent didn't produce them, it's only
reacting to them now. So target your expectations at the **live turn and
everything built or said after the seed**: what the agent does with the restored
state, how it responds to the triggering message, what the workflow looks like
after the correction. Asserting on the seeded prelude itself proves nothing.

### Which mode — and when to avoid seedThread

Default to a **synthetic** case (an authored prompt + director script, or a
`priorConversation` / `seedFile` prelude): it's durable, carries no real user
data, never expires, and you control the setup exactly. Reach for **`seedThread`** only when
the misbehaviour genuinely needs real prior context that's impractical to
synthesize — a long accumulated thread, specific built workflows/tables — **and**
the issue is in a *later* turn. (A turn-0 issue can't be isolated by seeding: it
lands inside the seed, so you'd bake the bug into the prelude.) Two standing
costs keep it a last resort, not a default:

- **Data handling.** It recreates a real conversation on the eval instance. The
  most sensitive content is scrubbed first — data-table row values are kept out
  and redacted from the restored history, node credentials stripped — but that
  isn't guaranteed exhaustive, so treat reproduced content as if it may carry
  user data and follow your team's data-handling policy.
- **Transience.** It depends on LangSmith trace retention (~14 days); the case
  stops running once the source trace ages out (tag it `seeded`, keep it out of
  `full`/`pr`).

If a plain prompt + director script can reproduce the situation, prefer that.

### `seedThread` — reproduce a real conversation

```json
"seedThread": { "threadId": "<thread-id>", "project": "instance-ai" }
```

The case carries only the opaque **thread id** — no conversation content lands
in the repo. At run time the harness pulls the thread's runs from LangSmith,
reconstructs the message log, recreates the workflows/tables it built, and splits
at the **last user message**: everything before is the seed, that message is
sent live. `project` defaults to `instance-ai`. Optional `endpoint` pins a
US-tenant source host during the US→EU migration; optional `liveTurnRunId` pins
which user turn goes live.

- **Cross-workspace, zero config.** A prod thread can be reproduced in a staging
  eval — the harness enumerates the workspaces your `LANGSMITH_API_KEY` can reach
  and finds the one holding the thread. It only *reads* the source; the eval
  writes its own traces/datasets to its own workspace. Reproducing a real thread
  recreates its conversation on the eval instance; the most sensitive content is
  scrubbed first (see the data-handling note above), and it's still worth
  handling per your team's data policy.
- **Continue past the live turn.** Add a `conversation` to keep driving after the
  trace's last message replays (first authored turn = expected assistant reply as
  proxy reference; subsequent `user` turns become follow-ups). Omit it to replay
  just the live turn and stop.
- **Transient — don't commit it, keep out of CI.** LangSmith base-tier traces
  retain ~14 days and threads can be deleted or pruned, so a committed `seedThread`
  case goes dead the moment its trace disappears. Treat it as a **local, throwaway
  reproduction**: don't commit it — run it to confirm the failure, then encode a
  durable synthetic case as the artifact. If you do keep one for a local run, tag
  it `seeded`, not `full`/`pr`; the resolver fails loudly when a trace has aged out.
- **Multi-workflow limitation.** Verification targets the primary created
  workflow (`workflowsCreated[0]`); if the live turn creates several, assert on
  the first or lean on `processExpectations`.
- **Only agent-built workflows are restored.** Reconstruction recreates workflows
  the agent *built* in-thread (a build event before the boundary) — not a workflow
  that pre-existed the conversation. So a debugging/diagnosis thread ("why does my
  HTTP node fail?"), where the agent only inspects or patches an existing workflow,
  seeds with **no workflow to inspect**. Reproduce the target workflow yourself
  (a synthetic case whose `executionScenarios` precondition builds the stand-in),
  or grade the live turn with `processExpectations` only.
- **Can't be pushed to a lang-tracer suite either.** The case-write API rejects
  every seeding mode (`seedThread` / `seedFile` / `priorConversation`), so
  `eval:langtracer-push` silently lists them under `skipped:`. Combined with the
  don't-commit rule above, a `seedThread` case has **no durable home by design** —
  the durable artifact is always the synthetic case you derive from it. (`seedFile`
  and `priorConversation` carry no thread dependency and can't be pushed either, so
  — unlike a normal case — they're the one exception to the skill's "push, don't
  commit the JSON" rule: they live as committed artifacts.)

### `priorConversation` — prose prelude

```json
"priorConversation": [
  { "role": "user", "text": "We agreed: digests go to #growth, daily at 9am." },
  { "role": "assistant", "text": "Noted — #growth, daily at 9am." }
]
```

Plain text only — no tool calls, no restored workflows. Paired with a normal
`conversation` for the live turn.

### `seedFile` — durable synthetic fixture

For a **synthetic, sanitised** fixture pinned in git (never a real user's
conversation): hand-author `data/workflows/seeds/<name>.seed.json` (schema in
[`harness/conversation-seed.ts`](../../../packages/@n8n/instance-ai/evaluations/harness/conversation-seed.ts)
— `messages` + optional `workflows` + `dataTables`) and point `seedFile` at it.
Real conversations belong in `seedThread`, which keeps their content out of the
repo.
