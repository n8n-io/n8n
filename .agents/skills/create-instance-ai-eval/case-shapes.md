# Case shapes beyond the plain build

The [SKILL](SKILL.md) covers the **build** archetype. This file covers the other
three — **behaviour/process**, **credential**, **seeded** — plus the
director-note vocabulary multi-turn cases rely on. Field-level docs live in the
eval [README](../../../packages/@n8n/instance-ai/evaluations/README.md); this is
the opinionated *how* and the traps.

Example cases in the corpus get renamed and churned, so this file names as few
cases as possible — search the LangTracer suite by tag/field instead (the
`search_test_cases` MCP tool, or export the suite and grep). The one stable
pointer worth naming: **`applies-each-change-when-asked`** (in the
`baseline` suite) for a well-built director conversation.

The schema
([`harness/schema.ts`](../../../packages/@n8n/instance-ai/evaluations/harness/schema.ts))
enforces the rules you must respect:

- Seeding lives in **one** slot, `seed`, whose `mode` is `inline` or `replay` — so
  the modes are mutually exclusive by construction.
- A case needs a `conversation` **or** a `seed` with `mode: "replay"` (which
  supplies the live turn from the trace).
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
Tag them `behaviour` and search the suite for that tag for patterns.

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
  only works when the prompt leaves nothing the agent must ask about. Real sourced
  prompts are frequently terse ("i want to create a webhook", "convert a topic
  into a YouTube script") and almost always trigger a clarifying question —
  **default a terse sourced prompt to multi-turn** with a director note that
  pre-answers the setup/topology it omits.
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
4. **The proxy defers credentials by default.** A credential slot — whether on
   the standalone credential card (`credentialRequests`) or a workflow
   setup-wizard card (`setupRequests`, an entry with `credentialType`) — is
   auto-declined ("I'll set them up later") *unless* a director note governing
   that exact moment asks the user to engage — see "Engaging the
   credential-setup card" below. **The workflow setup wizard is the one that
   matters for a normal build**: live testing found the builder routes
   credential resolution through it during a workflow build, never through the
   standalone tool. The standalone tool is real and live-verified too (all
   three of `manual`/`auto`/`skip`), but only via a standalone credential-connect
   request with no build attached (e.g. "connect my Slack account now, before I
   build anything") — see the tool's own doc comment in `utils/user-proxy/tools.ts`
   for the captured shapes.

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

### Engaging the credential-setup card (TRUST-349)

By default the proxy defers any credential slot — standalone card
(`credentialRequests`) or workflow setup-wizard card (`setupRequests`, a
`credentialType` entry) — with an empty/no-op response. This happens **before
the LLM is even called** (`confirmation-payload.ts`'s `tryInfrastructureResponse`
for the standalone card; `deterministic.ts`'s credential-only-request check for
the wizard), so it's the same deterministic behavior for every case that
doesn't opt in.

To make the simulated user engage instead, add a director note that names the
credential/OAuth/connect vocabulary at the moment the card would appear
(matched by `hasCredentialEngagementDirection` in `utils/user-proxy/index.ts`):

```json
"conversation": [
  { "role": "user", "text": "Post a daily summary to Slack every morning at 9am." },
  { "role": "assistant", "text": "I'll need a Slack credential connected before I can post — I'll show you the setup card." },
  { "role": "user", "text": "[When the credential setup card for Slack appears, don't defer it — set up the credential now using the existing Slack credential shown on the card.]" }
]
```

**`manual` is one action that covers three cases**, driven entirely by how many
`existingCredentials` the resolved type's request carries — no separate
"create" action, the harness decides automatically:

| Existing candidates | What happens | Case setup |
|---|---|---|
| Zero | The harness **creates a real credential** (via the same per-type template `credentials/seeder.ts` uses for pre-run seeding) and selects the new id | Don't declare that type in `credentials[]` at all |
| One | Selected automatically, no disambiguation needed | Declare exactly one: `credentials: [{ "type": "slackApi" }]` |
| Two or more | The director note must name a specific one by its declared `name`; the proxy echoes it back to disambiguate | Declare 2+ with distinct `name`s, e.g. `credentials: [{ "type": "slackApi", "name": "Personal Slack" }, { "type": "slackApi", "name": "Team Slack" }]` |

Simplified examples of each (not committed in the repo — cases live in the
LangTracer suite once pushed, per "Push to a lang-tracer suite" in the parent
skill; these are illustrative, trimmed of the full calibrated wording):

**Zero existing — the harness creates one:**

```json
{
  "description": "Manual path, create variant: no Slack credential exists, so engaging must create one rather than select one.",
  "conversation": [
    { "role": "user", "text": "Post 'Standup reminder!' to Slack every weekday morning at 9am." },
    { "role": "assistant", "text": "I'll need a Slack credential connected before I can post — I'll show you the setup card." },
    { "role": "user", "text": ["[When the setup card asks for a Slack credential, don't defer it — set it up now. Confirm the assistant does not ask again which Slack credential to use once one was set up.]"] }
  ],
  "complexity": "simple",
  "tags": ["behaviour", "credential-setup", "slack"],
  "triggerType": "schedule",
  "processExpectations": [
    "The agent did not ask again which Slack credential to use once one was set up via the setup card."
  ],
  "outcomeExpectations": [
    "A schedule trigger posts the reminder to a Slack node with a real Slack credential attached (not left unset or deferred)."
  ]
}
```

**Two existing — must pick the one the director note names:**

```json
{
  "description": "Manual path, select variant: two Slack credentials declared so the assistant can't silently resolve which one to use.",
  "conversation": [
    { "role": "user", "text": "Post 'Standup reminder!' to Slack every weekday morning at 9am." },
    { "role": "assistant", "text": "I'll need a Slack credential connected before I can post — I'll show you the setup card." },
    { "role": "user", "text": ["[When the setup card asks for a Slack credential, don't defer it — set up the credential now, selecting the 'Team Slack' credential shown on the card (not 'Personal Slack').]"] }
  ],
  "credentials": [
    { "type": "slackApi", "name": "Personal Slack" },
    { "type": "slackApi", "name": "Team Slack" }
  ],
  "complexity": "simple",
  "tags": ["behaviour", "credential-setup", "slack"],
  "triggerType": "schedule",
  "processExpectations": [
    "The agent selected the 'Team Slack' credential (not 'Personal Slack') via the setup card, and did not ask again which one to use once selected."
  ],
  "outcomeExpectations": [
    "A schedule trigger posts the reminder to a Slack node wired to the Team Slack credential (not Personal Slack, and not left unset)."
  ]
}
```

**Three existing — proves disambiguation isn't hard-coded to "exactly two":**

```json
{
  "description": "Manual path, select-among-many variant: three same-type Slack credentials declared, not just two.",
  "conversation": [
    { "role": "user", "text": "Post 'Standup reminder!' to Slack every weekday morning at 9am." },
    { "role": "assistant", "text": "I'll need a Slack credential connected before I can post — I'll show you the setup card." },
    { "role": "user", "text": ["[When the setup card asks for a Slack credential, don't defer it — set up the credential now, selecting the 'Support Slack' credential shown on the card (not 'Personal Slack' or 'Team Slack').]"] }
  ],
  "credentials": [
    { "type": "slackApi", "name": "Personal Slack" },
    { "type": "slackApi", "name": "Team Slack" },
    { "type": "slackApi", "name": "Support Slack" }
  ],
  "complexity": "simple",
  "tags": ["behaviour", "credential-setup", "slack"],
  "triggerType": "schedule",
  "processExpectations": [
    "The agent selected the 'Support Slack' credential (not 'Personal Slack' or 'Team Slack') via the setup card, and did not ask again which one to use once selected."
  ],
  "outcomeExpectations": [
    "A schedule trigger posts the reminder to a Slack node wired to the Support Slack credential specifically (not Personal Slack, not Team Slack, and not left unset)."
  ]
}
```

All three are complete as written in one respect that earlier guidance got
wrong: none of them asserts anything about the credential's connection test.
Both routes a credential takes into a build now authenticate, so an expectation
acknowledging a connection-test failure reds every correct build — see
"Credential validity" below.

The wire shapes (verified live against both tools — `credentials.tool.ts`'s
`handleSetup` state machine and `workflows.tool.ts`'s setup-wizard equivalent):

| Director note asks for… | Proxy action | Resume payload | Tool result |
|---|---|---|---|
| Set up now (zero existing) | `manual` → harness creates a credential | `{kind:'credentialSelection', credentials:{type: newId}}` | credential attached, and its connection test resolves as passing by default — see "Credential validity" below |
| Select a specific one (2+ existing) | `manual` + `existingCredentialId` (standalone) or a matching id in `nodeCredentialsJson` (wizard) | `{kind:'credentialSelection', credentials:{type: id}}` | assistant should stop asking and proceed |
| Automatic/browser setup | `choose_credential_setup_option(auto)` — standalone tool only | `{kind:'credentialAutoSetup', credentialType}` | `{success:false, needsBrowserSetup:true, ...}` |
| Explicitly decline | `choose_credential_setup_option(skip)` (standalone) or dismiss the wizard card | `{kind:'approval', approved:false}` | `{success:true, deferred:true}` |
| (nothing — default) | *(short-circuited, no LLM call)* | empty/no-op | deferred |

**Every eval credential holds a placeholder token** unless you set the type's
`EVAL_*_ACCESS_TOKEN` env var (see "Credential cases" above). The parent
umbrella (TRUST-348) requires "no stored provider credentials in any phase," so
a real token is the wrong fix. Instead the harness resolves the *connection
test* as passing, the same way for both routes a credential can take into a
build:

- **Declared in `credentials[]`** — models a credential the user already has
  connected, so it authenticates.
- **Created by the simulated user on an engaged setup card** — authenticates
  too, since the product won't apply a card whose credential failed its test.

Do **not** assert a connection-test failure for either; such an assertion reds
on every correct build. See "Credential validity" below for how to script a
card-created credential that deliberately does not authenticate.

**`auto` is reachable but inert** — the product genuinely rebuilds the agent
and returns `needsBrowserSetup:true`, but this harness has no Computer Use
tools attached, so the conversation stalls afterward (expected, not a bug).
Keep any case scripting `auto` a local smoke test, never part of the gated
suite — it will time out.

### Credential validity: a credential works by default

The product will not apply a setup card whose credential fails its connection
test — the frontend's `isCredentialComplete` returns `isCredentialTestedOk`, so
Apply stays disabled until the test passes. **"The user completed the setup
card" therefore implies "the credential authenticates."** The same holds for a
credential declared in `credentials[]`: it stands for one the user connected
before the conversation started. Both carry a placeholder token that would fail
for real, so the harness resolves the test as successful for both — otherwise
every such case models a state a real user cannot reach.

Mechanically: the harness registers the case's seeded credential ids on the
thread up front, the proxy adds the ones it sets up mid-run (the types it lists
in `workingCredentialTypes`), both go on the same `bypassCredentialTest` list of
the eval allowlist endpoint, and the credential adapter resolves their test as
successful without contacting the provider. The token is untouched — only the
test result is synthesized, and only for credentials that case created. Nothing
changes about "no stored provider credentials".

**To script a credential that does NOT authenticate**, say so explicitly in the
direction, naming which one:

```
[Set both credentials up on the card. The Slack token you enter is a valid
 working one. The Notion token you enter is an old expired one that does NOT
 authenticate. Expect the Notion connection test to fail — that is intended.]
```

The proxy then omits that type, its test runs for real, and it fails. Note what
this models: not "the card was applied with a broken credential" (unreachable),
but a credential that stopped authenticating — expired, revoked, scope changed.
A card is currently the only way to get a failing credential: declaring one in
`credentials[]` gives you a working one.

**Non-vacuity for these cases is deterministic, not judged.** A bypassed test is
deliberately indistinguishable from a real pass in everything the agent sees —
any hint would make it hedge, which is the behaviour such a case exists to rule
out. So the judge cannot tell whether the bypass fired; check the run's
`credential-test-bypassed` proxy decision stat instead (it appears in the
`[proxy: ...]` segment of the build log line). On a mixed card, the count is the
assertion: two credentials with one scripted invalid should show exactly `1`.

---

## Seeded cases (start mid-conversation)

A seeded case puts prior history into the build thread *before* the live turn, so
the eval drives only the turn under test. Use it to set up the situation you want
to test — history up to some point, then a message that should trigger (or
correct) a behaviour.

Pick the lightest mode that fits:

| Situation | Mode | Pairs with |
|---|---|---|
| Prior work already exists (a workflow to repair, an agent to change) | `seed.mode: "inline"` — prior messages + the workflows/agents they reference, in the case body | a normal `conversation` for the live turn |
| Prelude is just "what was discussed" (no tool calls, no workflows) | `seed.mode: "inline"` with `{role, text}` shorthand messages | a normal `conversation` for the live turn |
| Shallow 2–3 turn prelude where the agent's live replies matter | none — a plain multi-turn `conversation` re-drives it live | — |
| Confirming a real failure locally, before authoring the case | `seed.mode: "replay"` — rebuilds a thread from its LangSmith trace at run time; nothing committed, expires with the trace | supplies its own live turn (omit `conversation`) |

Both modes are implemented and wired (`harness/conversation-seed.ts` +
`harness/langsmith-seed.ts`, threaded through the runner). The literals match
lang-tracer's `metadata.seed` verbatim, so nothing translates between the repos.

### What the seed does — and does not — exercise

**The seeded portion is replayed, not re-run.** The prior messages are written into
the thread as they stand (marked `seeded: true` so the judge and checks can tell
them apart), and the workflows, data tables and agents they reference are **created
on the instance** — so when the live turn runs, the agent sees the workspace the case
says it should. Data tables are created **schema-only, no rows**: row values are the
most sensitive thing a table holds, and they stay off the eval instance.

One thing the restore can't reproduce: the **sandbox is empty**. The agent re-reads
state from the database rather than editing source it "wrote", so a seeded case is
harder than the real turn was — never grade one on cost, turn count or
`messageBudget`.

The consequence to internalise: **nothing you assert can change what already
happened in the seeded turns** — the agent didn't produce them, it's only
reacting to them now. So target your expectations at the **live turn and
everything built or said after the seed**: what the agent does with the restored
state, how it responds to the triggering message, what the workflow looks like
after the correction. Asserting on the seeded prelude itself proves nothing.

### Which mode — and when to avoid `replay`

Default to a **synthetic** case (an authored prompt + director script, or an
`inline` seed prelude): it's durable, carries no real user
data, never expires, and you control the setup exactly. Reach for **`replay`** only when
the misbehaviour genuinely needs real prior context that's impractical to
synthesize — a long accumulated thread, specific built workflows/tables — **and**
the issue is in a *later* turn. (A turn-0 issue can't be isolated by seeding: it
lands inside the seed, so you'd bake the bug into the prelude.) Two standing
costs keep it a last resort, not a default:

- **Data handling.** A replay stands someone's own conversation up on the eval
  instance. The most sensitive parts are removed first — data-table row values are
  kept out and redacted from the history, node credentials stripped — but that pass
  can't be assumed exhaustive, so treat what comes back as potentially personal data
  and follow your team's data-handling policy. Cleanup deletes the thread, workflows
  and tables when the build finishes, though it is best-effort: a crashed run can
  leave them on the instance. Scrubbing the workflow into an `inline` seed is how the
  whole concern goes away for good.
- **Transience.** It depends on LangSmith trace retention (~14 days); the case
  stops running once the source trace ages out (tag it `seeded`, keep it out of
  `full`/`pr`).

If a plain prompt + director script can reproduce the situation, prefer that.

### `mode: "replay"` — rebuild a thread for a local run

```json
"seed": { "mode": "replay", "threadId": "<thread-id>", "project": "instance-ai" }
```

The case carries only the opaque **thread id** — no conversation content lands
in the repo. At run time the harness pulls the thread's runs from LangSmith,
reconstructs the message log, recreates the workflows/tables it built, and splits
at the **last user message**: everything before is the seed, that message is
sent live. `project` defaults to `instance-ai`. Optional `endpoint` pins a
US-tenant source host during the US→EU migration; optional `liveTurnRunId` pins
which user turn goes live.

- **Cross-workspace, zero config.** A production thread can be replayed in a staging
  eval — the harness enumerates the workspaces your `LANGSMITH_API_KEY` can reach
  and finds the one holding the thread. It only *reads* the source; the eval
  writes its own traces/datasets to its own workspace. What it rebuilds still lands
  on the eval instance, so the data-handling note above applies.
- **Continue past the live turn.** Add a `conversation` to keep driving after the
  trace's last message replays (first authored turn = expected assistant reply as
  proxy reference; subsequent `user` turns become follow-ups). Omit it to replay
  just the live turn and stop.
- **Transient — don't commit it, keep out of CI.** LangSmith base-tier traces
  retain ~14 days and threads can be deleted or pruned, so a committed `replay`
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
- **Can't be pushed to a lang-tracer suite either.** `eval:langtracer-push`
  refuses a `replay` case and lists it under `skipped:` — a suite is a durable
  home and this seed isn't. Combined with the don't-commit rule above, a `replay`
  case has **no durable home by design** — the durable artifact is always the
  synthetic case you derive from it. (An `inline` seed has no such problem: it
  pushes with the case and lives in the suite like any other.)

### `mode: "inline"` — durable synthetic fixture

For a **synthetic, sanitised** seed pinned in git (never a real user's
conversation): author the prior messages, plus the artifacts they reference, in
the case body (schema in
[`harness/conversation-seed.ts`](../../../packages/@n8n/instance-ai/evaluations/harness/conversation-seed.ts)
— `messages` + optional `workflows`, `dataTables` and `agents`). Real
conversations belong in `replay`, which keeps their content out of the repo.

Two constraints that bite: an artifact `id` must be ≥8 characters (the id remap
refuses shorter ones), and a seeded `build-workflow` tool call's
`output.workflowId` must match the seeded workflow's `id` — otherwise the remap
separates them and the agent can't find the workflow it should act on. The same
applies to a seeded `build-agent` result's `output.agentId`.

The seed sits in the case body, not a sibling file, so it travels with the case
whether it comes off disk, out of a LangTracer suite, or from a dispatched case
body.

#### `{role, text}` shorthand — a prose prelude

When the prelude is just "what was discussed" — no tool calls, no workflows —
write a message as `{role, text}` and the schema expands it to a full envelope:

```json
"seed": {
  "mode": "inline",
  "messages": [
    { "role": "user", "text": "We agreed: digests go to #growth, daily at 9am." },
    { "role": "assistant", "text": "Noted — #growth, daily at 9am." }
  ]
}
```

`text` also takes an array of lines (newline-joined), like a `conversation` turn.
The expansion stamps `createdAt` itself — ascending, in the past — so a shorthand
message can't order *after* the live turn. Shorthand and full envelopes mix freely
in one array; a full envelope keeps its authored `createdAt` — **unless the authored
stamps don't already ascend and sit in the past**, in which case the whole sequence
is restamped onto ascending pre-live slots. A future stamp would sort a seeded turn
after the live turn, and a non-ascending sequence (a shorthand turn appended after
later-stamped envelopes, say) would present the history in an order the graded
transcript never had; restamping only the offending entry would reorder it against
the array the transcript is graded from. A near-miss (say
`text: 123`) is deliberately **not** expanded — it fails at load instead of
becoming a message the transcript builder would silently drop.

#### `agents` — "here's an agent you already built, now change it"

An n8n **Agent** is not a workflow, so it has its own slot: a project-scoped
resource with a config *plus authored skill bodies*. Declare it and the restore
creates it at its pinned id in the thread's project, with its skills, before the
live turn:

```json
"seed": {
  "mode": "inline",
  "messages": [ /* … the turn that built it … */ ],
  "agents": [
    {
      "id": "AgEnT12345678901",
      "config": {
        "name": "Support Triage",
        "model": "anthropic/claude-sonnet-4-5",
        "instructions": "Triage inbound support tickets.",
        "skills": [{ "type": "skill", "id": "skill_1" }]
      },
      "skills": {
        "skill_1": {
          "name": "Triage rules",
          "description": "How tickets are sorted",
          "instructions": "Label each ticket by severity…"
        }
      }
    }
  ]
}
```

`config` and `skills` are the exact shapes `GET …/agents/v2/:id/config` and
`…/skills` return, so you can author a seed from an agent you built by hand: build
it on a dev instance, fetch both, scrub, paste. Things worth knowing:

- **The thread is bound to the seeded agent**, exactly as the conversation that
  built it would have left it, so the live turn's `build-agent` call continues
  that agent directly. Without the binding the call is rejected (`Unknown
  agentRef`) and the model recovers from the agent id in its seeded history —
  measured at 3/3 runs recovering correctly, but it burns a turn, and the
  rejection message offers "create a new agent" as its first option.
- **Names are not uniquified and leftovers are not evicted**, unlike seeded
  workflows. An agent is addressed by id, so a same-named copy can't misdirect the
  live turn; the name is also woven through skill prose, where a rename would
  rewrite instructions the case grades.
- **Grade the agent, not a workflow.** The agent's config + skills render into the
  judge context, so `outcomeExpectations` cover them. Assert on the *change* the
  live turn makes — and assert the untouched parts survive, which is how you catch
  a rebuild-from-scratch masquerading as an edit.
- **Skill bodies are prose — scrub them like conversation content, not like
  config.** A skill carries far more free text than a workflow does: instructions
  and `references[]` are whole markdown documents, and they routinely name real
  teams, customers, internal tools, ticket queues, Slack channels and escalation
  contacts. Rewrite them into neutral equivalents (`Acme Corp`, `#support`) rather
  than trimming, and reread the full body — a workflow-shaped scan of names and
  ids will miss a paragraph.
- **Skill ids must match**: every `config.skills[].id` needs an entry in the
  `skills` map, or the agent renders with a dangling reference.
- **Two agents can't share an addressing key.** Names are slugified to address the
  agent (`Support Bot` and `support-bot` both become `support-bot`), so a seed
  whose agent names differ only by case, spacing or punctuation is refused rather
  than silently dropping one from the registry.
- **Credential ids are blanked on restore**, the agent counterpart of stripping a
  seed workflow's node credentials. An id from the instance you authored on
  addresses nothing here, so you can paste a fetched config as-is and the restore
  empties them. The seeded agent therefore arrives unconfigured for credentials —
  fine for grading its config and skills, but it is not runnable as seeded.
  Declare what the live turn should see in the case's own `credentials[]`.
- **Requires the agents module.** A seeded agent restore fails loudly (as a
  framework issue) on an instance where agents are disabled, rather than running
  the case unseeded.
#### Which opening shape — the agent is handed the workflow, or it has to find it

Two real conversations look the same in a case file but test different things, and
picking wrong makes the case harder than reality.

**Handed it.** The user is looking at a workflow and opens the assistant: "why is
this failing?", "add error handling". They never name it — the editor sends the
workflow along as a resource reference and the agent resolves it by **id**. Declare
that with `attach` on the opening turn:

```json
"conversation": [
  { "role": "user", "text": "why is this failing?", "attach": { "workflow": "wKk3RmT9xQ2bVn7L" } }
],
"seed": {
  "mode": "inline",
  "messages": [ … ],
  "workflows": [ { "id": "wKk3RmT9xQ2bVn7L", "name": "Batch loop", … } ]
}
```

The id is the one the **seed declares**; the harness swaps in the per-run id, so you
track nothing. Only the opening turn may carry `attach` (an attachment is a hand-off,
not something a user re-sends), and it must name a workflow the inline seed declares —
both are refused at load rather than ignored.

**The opening often has no text at all** — the user opens the assistant on a workflow
and waits for it to speak first. Keep `"text": ""` when that's what happened; it's the
faithful shape, and openings with no user text jumped from 1% to 31% of the corpus when
the editor hand-off shipped, so it is not an edge case. Note that an empty text is
valid *only* alongside `attach`: the chat API rejects a message that is empty with
nothing attached ("Either message or attachments must be provided"), so the two stand
or fall together.

**Has to find it.** The user refers to the workflow in words: by name ("the Wait node
in *Generate leads* failed") or loosely ("the batch image workflow"). No `attach` —
finding it *is* part of what the case tests. This also works when the seeded history
already shows the agent building it, since the id is in its own record.

Get this wrong in the "handed it" direction — omit `attach` on a conversation that
really had one — and the agent has to guess from prose that deliberately names
nothing. It will list workflows and pick, or ask which one, and you will score a
clarification failure the real user never hit.

#### Before you ship a seeded case — three checks

1. **The defect still bites.** A seed whose workflow isn't broken any more makes the
   case a silent no-op that passes forever.
2. **Run it once with the seed removed. It must fail.** Copy the case, delete `seed`,
   run both. If the no-seed copy also passes, the seed isn't carrying the test. Name
   the copy so it doesn't share a `--filter` substring with the real case
   (`control-noseed-<slug>` works; `<slug>-noseed` would match both).
3. **The workflow's skeleton is untouched** if you scrubbed it from a real one: node
   types, versions and connection topology byte-identical, only string leaves moved.

Don't grade a seeded case on cost, turn count, `messageBudget`, or "fixed it in one
build". A seeded thread starts with an empty sandbox, so the agent re-reads the
workflow from the database and re-derives SDK source a real resumed session would
still have on disk. The bias is *harder* than reality, so those numbers read worse
for a reason that has nothing to do with the builder.
