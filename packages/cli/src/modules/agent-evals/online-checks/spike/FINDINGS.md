# Agent checks spike: findings (2026-10-29)

Question: can we generate useful checks from a real agent definition, and are
the judged verdicts on real chats right?

The examples below are made up. The spike data is real user data and stays out
of the repository.

## What ran

- **Data:** 20 real agents that users built with the Assistant in October 2026.
  - Read from LangTracer: the config snapshots and the chats in which the
    Assistant tested each agent.
  - 54 config versions in total.
  - 87 sessions with 95 turns:
    - 72 test chats, with the message and the reply only (no tool calls);
    - 15 recorded sessions with tool calls (11 preview, 3 web chat,
      1 workflow).
  - 4 Slack sessions were dropped because the export cut their transcripts.
- **Model:** `claude-sonnet-5-5` for the generator and the judge.
- **Code:**
  - `tool-profile.ts`, `tool-checks.ts`, `promise-checks.ts` and
    `judged-checks.ts` hold the checks. They are pure, with 54 unit tests.
  - `spike/run-spike.ts` runs the spike.
  - `spike/session-transcript.ts` rebuilds the timeline from the Assistant's
    session reads.
- **Review:** a second model rated every generated check and re-decided
  151 verdicts from the transcripts. This is not a human review yet.

## Cost

- **Generation:** one call for each config version, about 5,600 tokens in and
  900 out.
- **Judging:** about 2 calls for each session, about 2,650 tokens in and
  610 out. Each call holds 3 questions.

## Results

| Part | Result |
|---|---|
| Tool checks (code) | 9 of 9 failures were right and useful: failed runs, a broken fetch tool, a broken calendar connection |
| Promise checks (generated) | 97% worth keeping, 81% faithful to the quoted rule, 59% decidable from a chat in full |
| Judge: pass | 29 of 30 agreed |
| Judge: does not apply | 20 of 20 agreed |
| Judge: fail | 26 of 44 agreed. The other 18 were too harsh |
| Judge: unsure | 27 of 48 agreed. 16 of the others should be pass |
| Confirmed fails useful to the author | 25 of 26. 10 of them repeat a run failure or a broken connection |

About 16 fails show real agent behaviour that an author would want to see.
For example:

- The agent asked for permission before a web search, against its rules.
- The agent wrote text after the required last line.
- The agent said it had no tool for something it had a tool for.
- The agent claimed a table it never sent.

## What went wrong, and the fix for each

1. **The judge thinks the tool list is complete.**
   - The judge sees only the node, workflow and MCP tools.
   - Built-in web search, skills and knowledge are missing from the list. In
     5 cases the judge called a sourced answer "invented".
   - Fix: list every capability the agent has, including built-ins.
2. **Fails are too harsh: 41% of judged fails were wrong.**
   - Causes: check wording read too literally, and wording the author
     prescribed read as a false claim.
   - Fix: run a second pass on fails only before anyone sees them. Fails are
     few, so this costs little.
3. **Compound checks.**
   - One question bundles 2 to 7 rules, so a "no" does not say what broke.
   - Fix: one rule per check.
4. **Checks the agent cannot fail.**
   - Example: "Did it avoid writing to the sheet?" on an agent that can only
     read.
   - Fix: drop a check when the tool profile shows the agent cannot break the
     rule.
5. **The generator always fills the cap.**
   - 49 of 54 configs got exactly 5 checks.
   - The cap dropped important checks, and output-format rules were missed most
     often.
   - Fix: run a separate pass for format rules, and stop asking for "up to 5".
6. **Questions are always in English.**
   - Authors who wrote in Chinese, Vietnamese, Spanish, French or German got
     English questions.
   - Fix: write each question in the language of the instructions.
7. **The quote matcher rejects real quotes.**
   - Quotes with "..." or escaped characters fail to match.
   - Fix: match the parts around an ellipsis, and strip Markdown escapes.
8. **The tool sorter guesses too much.**
   - 8 of 20 agents read as "acts on its own" only because unknown names
     default to *acts*.
   - Wrong sorts:
     - `mark_as_read` sorts as reads, but it changes data.
     - `calculator`, `scrape` and `check_*` sort as acts, but they only read.
   - Only 4 of 64 tools ask for approval.
   - Fix: add words to the lists, and show "unknown" rather than claim a level.
9. **The empty-reply check fires for silent agents.**
   - Some agents are built to stay silent.
   - Fix: skip the check when the instructions allow an empty reply.
   - Group findings that share one cause, so that one failed run makes one
     card, not three.

## Inside a local n8n instance

- **Endpoint:** `POST /rest/projects/:projectId/agents/v2/:agentId/evals/online-checks`.
  - It is behind `101_agent_evals` and needs `agent:update`.
  - It runs `AgentOnlineChecksService`. The service reads the agent config with
    `AgentContextService.readArtifact`, then reads the recorded sessions. It
    runs the checks on `agent_execution.timeline` with the agent's own model
    and credential.
- **Test setup:**
  - Two made-up agents: an order help desk with a refund tool that needs
    approval, and a meeting booker.
  - Five workflow tools with fake data.
  - 14 preview sessions, driven through the chat API.

What the real timelines showed, which the spike data could not:

1. **A call that waits for approval is recorded as a failed call.** It has
   `success: false` and `endTime: 0`, followed by a `suspension`.
2. **A workflow tool that errors is recorded as `success: true`.** The error is
   `{ status: 'error' }` in the output. A check on `success` misses every real
   failure.
3. **One message from the person can span two executions.** The first stops
   for approval. The second resumes and starts with `hitl-response`.
4. **The agent has built-in tools that are not in its config:**
   `anthropic.tool_search` and `chat_context`. `chat_context` gives the agent
   the n8n user's name, and the order agent then refused to share orders
   with a "customer" whose name did not match.

Results after the fixes (all checks, all 14 sessions):

- **Correct catches:**
  - A calendar tool returned 503 (`tool_failed`).
  - A run failed with no reply (`empty_reply`).
  - Twice, the agent lost the earlier turns after a turn with tool calls
    (`base`). It said it could not see the request, although the request was
    in the chat. The cause is not checked yet.
  - The agent put its own reasoning ("Order belongs to Ana… Proceed.") into a
    reply (`base`).
- **Wrong or doubtful:**
  - Two sessions end on an approval that nobody answered. Our chat driver
    left them that way. They read as "no reply". Fix: a turn that ends on a
    pending approval waits for the person and is not a failure.
  - One "check the calendar before suggesting a time" fail is for "Monday at
    09:00 or later", which is a window and not a specific time.
- **Before the fixes**, the base check failed every correct refusal (another
  customer's order, the manager rule, a weekend slot). It now passes them,
  because it reads the instructions and counts "said clearly why not" as the
  job done.

## What this means for the design

- **The tool checks can ship first.** They are free, they were right every
  time, and they found the most useful problems.
- **The promise checks have the right content:** sends without approval, made-up
  data, privacy, and false "done" claims. Fixes 3 to 7 apply before a beginner
  sees them.
- **A judged fail needs a second pass before the user sees it.** A wrong "needs
  a look" card costs more trust than a missed one.
- **The base check needs the timeline.** In a test chat with no tool calls it
  cannot test "is everything it said true". It falls back to *unsure*, or to a
  guess from the tool list. The product reads `agent_execution.timeline`, so it
  has this data.
