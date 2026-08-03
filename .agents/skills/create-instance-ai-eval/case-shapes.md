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

All three omit one detail for brevity that the real, calibrated versions
include: a `processExpectations` entry acknowledging the placeholder-token
connection-test failure as expected (see the note right below) — a full case
must include that or it will fail on a correct build for the wrong reason.

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
a real token is the wrong fix. What differs is whether the *connection test*
against that placeholder is allowed to fail, and that depends on where the
credential came from:

- **Declared in `credentials[]`** (pre-seeded, never touched by the user during
  the build) — the product runs a real connection test and reports a genuine
  "Invalid access token" failure. Phrase `processExpectations` to assert the
  agent reports that honestly (doesn't claim success, doesn't go silent), not
  that the token works:

  ```json
  "Harness note: a connection-test failure (invalid access token) is expected here since the credential uses a placeholder token. The agent reported that failure honestly — it did not claim the Slack integration was fully working, and did not silently ignore or hide the failure."
  ```

- **Created by the simulated user on an engaged setup card** — the test resolves
  as **passing** by default, because the product won't apply a card whose
  credential failed one. Do **not** assert a connection-test failure for these;
  such an assertion reds on every correct build. See "Credential validity"
  below for how to script a card-created credential that deliberately does not
  authenticate.

**`auto` is reachable but inert** — the product genuinely rebuilds the agent
and returns `needsBrowserSetup:true`, but this harness has no Computer Use
tools attached, so the conversation stalls afterward (expected, not a bug).
Keep any case scripting `auto` a local smoke test, never part of the gated
suite — it will time out.

### Credential validity: a set-up credential works by default

The product will not apply a setup card whose credential fails its connection
test — the frontend's `isCredentialComplete` returns `isCredentialTestedOk`, so
Apply stays disabled until the test passes. **"The user completed the setup
card" therefore implies "the credential authenticates."** A seeded credential
carries a placeholder token and would fail for real, so the harness resolves
the connection test as successful for credentials it creates on an engaged
card. Without that, every such case would model a state a real user cannot
reach.

Mechanically: the proxy lists the types it set up in `workingCredentialTypes`,
the harness registers those credential ids on the thread
(`bypassCredentialTest` on the eval allowlist endpoint), and the credential
adapter resolves their test as successful without contacting the provider. The
token is untouched — only the test result is synthesized, and only for
credentials that case created. Nothing changes about "no stored provider
credentials".

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
For a credential that was already broken *before* the conversation, declare it
in `credentials[]` instead of setting it up on a card.

**Non-vacuity for these cases is deterministic, not judged.** A bypassed test is
deliberately indistinguishable from a real pass in everything the agent sees —
any hint would make it hedge, which is the behaviour such a case exists to rule
out. So the judge cannot tell whether the bypass fired; check the run's
`credential-test-bypassed` proxy decision stat instead (it appears in the
`[proxy: ...]` segment of the build log line). On a mixed card, the count is the
assertion: two credentials with one scripted invalid should show exactly `1`.

---

## Seeded cases (start mid-conversation)

A seeded case restores prior history into the build thread *before* the live
turn, so the eval drives only the turn under test. Use it to reproduce a real
situation — a conversation up to some point, then a message that should trigger
(or correct) a behaviour.

Pick the lightest mode that fits:

| Situation | Mode | Pairs with |
|---|---|---|
| Reproduce a real conversation (common case) | `seed.mode: "replay"` — fetch + reconstruct its LangSmith trace at run time; nothing committed | supplies its own live turn (omit `conversation`) |
| Prior work already exists (a workflow to repair) | `seed.mode: "inline"` — prior messages + the workflows they reference, in the case body | a normal `conversation` for the live turn |
| Prelude is just "what was discussed" (no tool calls, no workflows) | `seed.mode: "inline"` with `{role, text}` shorthand messages | a normal `conversation` for the live turn |
| Shallow 2–3 turn prelude where the agent's live replies matter | none — a plain multi-turn `conversation` re-drives it live | — |

Both modes are implemented and wired (`harness/conversation-seed.ts` +
`harness/langsmith-seed.ts`, threaded through the runner). The literals match
lang-tracer's `metadata.seed` verbatim, so nothing translates between the repos.

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

### Which mode — and when to avoid `replay`

Default to a **synthetic** case (an authored prompt + director script, or an
`inline` seed prelude): it's durable, carries no real user
data, never expires, and you control the setup exactly. Reach for **`replay`** only when
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

### `mode: "replay"` — reproduce a real conversation

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
- **Can't be pushed to a lang-tracer suite either.** The case-write API has no
  `seed` field, so `eval:langtracer-push` silently lists any seeded case under
  `skipped:`. Combined with the don't-commit rule above, a `replay` case has **no
  durable home by design** — the durable artifact is always the synthetic case you
  derive from it. (An `inline` seed carries no thread dependency and can't be
  pushed either, so — unlike a normal case — it's the one exception to the skill's
  "push, don't commit the JSON" rule: it lives as a committed artifact.)

### `mode: "inline"` — durable synthetic fixture

For a **synthetic, sanitised** seed pinned in git (never a real user's
conversation): author the prior messages, plus the workflows they reference, in
the case body (schema in
[`harness/conversation-seed.ts`](../../../packages/@n8n/instance-ai/evaluations/harness/conversation-seed.ts)
— `messages` + optional `workflows` + `dataTables`). Real conversations belong in
`replay`, which keeps their content out of the repo.

Two constraints that bite: a workflow `id` must be ≥8 characters (the id remap
refuses shorter ones), and a seeded `build-workflow` tool call's
`output.workflowId` must match the seeded workflow's `id` — otherwise the remap
separates them and the agent can't find the workflow it should act on.

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
in one array; a full envelope keeps its authored `createdAt` — **unless any message
in the array is in the FUTURE**, in which case the whole sequence is restamped onto
ascending pre-live slots (a future stamp would sort a seeded turn after the live
turn, and moving only that one entry would reorder it against the array the
transcript is graded from). A near-miss (say
`text: 123`) is deliberately **not** expanded — it fails at load instead of
becoming a message the transcript builder would silently drop.
