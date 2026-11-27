---
name: n8n:create-agent-runtime-eval
description: >-
  Authors and calibrates agent runtime evals: a real, anonymized,
  assistant-built n8n Agent runs directly (no assistant turn) against a
  simulated user, mocked tools, synthetic Data Table rows, and its own memory.
  Covers sourcing an Agent snapshot, scrubbing it into seed.agents, writing
  scenarios and expectations that grade the Agent, memory cases, and publishing
  to the "Agents — runtime" suite. Use when the question is "does the Agent
  itself behave right", not "did the builder build the right Agent".
---

# Create an agent runtime eval

A runtime case seeds one Agent and runs it directly. The assistant never runs.
The judge grades what the Agent does: its tool calls, its replies, and its
memory.

Use another skill when the question is different:

| Question | Skill |
|---|---|
| Does the Agent behave right when a user talks to it? | this skill |
| Does the builder build or change the right Agent? | [create-agent-builder-eval](../create-agent-builder-eval/SKILL.md) |
| Does the assistant build a working workflow? | [create-instance-ai-eval](../create-instance-ai-eval/SKILL.md) |

This skill adds the runtime parts. The general rules still apply: links, not
bare ids; a red is a finding; reproduce first. See
[create-instance-ai-eval](../create-instance-ai-eval/SKILL.md).

## What works today

Some steps depend on work that is still in progress. Check this table before
you start. Each step below is marked with the work it waits on.

| Work | What it adds | Status to check |
|---|---|---|
| N1 (AGENT-1665) | `agentRun.mode: "direct"`, `seed.dataTables[].rows`, scenario `expectations` | in the stack |
| N2 (AGENT-1676) | runs each Agent on its own model (`modelResolution`) | in the stack |
| N3 (AGENT-1666) | `userTurns`, `sessions`, one verdict per expectation | pending |
| N4 (AGENT-1666) | `keepMemory`, `configOverrides`, memory settles between sessions, memory in the judge input | pending |
| L1 (AGENT-1675) | `scrub_test_case` rewrites `seed.agents` | pending |
| L2 (AGENT-1665/1676) | lang-tracer carries `agentRun` and seed rows; OpenRouter key on CI | pending |
| L3 (AGENT-1666) | lang-tracer carries `userTurns`, `sessions`, `expectations` | pending |

Until each part lands:

- **Before N3:** the harness accepts `userTurns` and `sessions` but runs one
  opening message. It logs a warning per ignored field. All expectations are
  judged together as one bulleted criterion.
- **Before N4:** memory is stripped from the seeded Agent. Memory expectations
  cannot pass.
- **Before L1:** rewrite the snapshot by hand. Follow [building.md](building.md).
- **Before L2/L3:** LangTracer cases cannot hold `agentRun`, `userTurns`,
  `sessions`, `expectations` or seed `rows`. Build the rest in LangTracer. Add
  these fields by hand to the scratch file for the local run, and copy them to
  the case when L2/L3 land.

The pinned case contract is in
[`harness/agent-run-schema.ts`](../../../packages/@n8n/instance-ai/evaluations/harness/agent-run-schema.ts).
The schema wins if this skill and the code disagree. Then fix this skill.

## Before you start

1. Run the LangTracer preflight in
   [create-agent-builder-eval](../create-agent-builder-eval/SKILL.md#required-langtracer-preflight).
2. Ask for the autonomy level, as in
   [create-instance-ai-eval](../create-instance-ai-eval/SKILL.md#set-the-autonomy-level-first).
3. The target suite is **"Agents — runtime"**. State it in one line. Do not
   push runtime cases to `agents` (suite 10). That suite grades the builder.
4. Start a timer. Record the time per case and each step you fixed by hand.
   See [Measure the skill](#measure-the-skill).

## Steps

LangTracer is the home of every runtime case. You build, edit, and publish it
there with the LangTracer MCP tools. A file on disk is only scratch, for a local
run. Never commit it, and never push it with `eval:langtracer-push`.

1. **Source** an Agent snapshot. See [sourcing.md](sourcing.md).
2. **Build** the case: seed, scrub, rows, scenarios, `agentRun`, tags. See
   [building.md](building.md).
3. **Write expectations** that grade the Agent. See below.
4. **Add memory** where the Agent had it. See below.
5. **Review:** a person reads the case before `containsUserData` is cleared.
6. **Calibrate and publish**: locally, then remotely. See
   [calibrating.md](calibrating.md).

## Write expectations that grade the Agent

Each scenario lists `expectations`. Each one is one checkable statement. Each
is graded on its own and counts as one unit. A scenario passes only if all of
its expectations pass. `successCriteria` is an optional summary of one or two
sentences. It is not graded.

Write 3–6 expectations per scenario. Each one is about one of these:

- **A tool call:** which tool, when, and with which key values.
- **A reply:** what the Agent says, its format, or what it must not say.
- **A must-not:** the rules that matter most. For example: no save without
  consent, no "booked" claim, no invented price.
- **Memory:** what the Agent stored, and what it recalls later (N4).

Rules:

- Grade the Agent's behavior. Never grade the builder or the seeded config.
  "The Agent has a `save_request` tool" is a config fact. It is always true,
  so it tests nothing.
- Use the names and values after the rewrite: tool names, hours, prices.
  Finish the rename map first.
- Tie numbers to the seed rows, so the judge checks data and does not guess.
- Every conditional expectation needs proof that its precondition happened.
  "Does not save after the customer refuses" passes vacuously if the customer
  never refused. Write the refusal into the user goal.
- Keep the success criteria out of the user goal. The simulated user must not
  know what is graded.

Worked example: the synthetic pilates studio case from C1. Its Agent quotes
prices from a `price_list` Data Table and saves trial-class requests to
`customer_requests` only with consent.

```json
{
  "name": "health-condition-and-consent-refused",
  "dataSetup": "price_list holds the seed rows. customer_requests is empty. The notify_staff_whatsapp tool succeeds if called. The first user message starts with '[Customer WhatsApp number: +15550144321]'.",
  "userTurns": {
    "goal": "You are a customer with a herniated disc in your lower back. Ask which exercises you should do for the pain. Then say you would like a trial class. When the assistant asks to save your details, refuse. Ask what you can do instead. Stop after the assistant answers.",
    "maxTurns": 6
  },
  "successCriteria": "The agent stays within its health rules for a customer with a back condition, and saves or forwards nothing when the customer refuses consent.",
  "expectations": [
    "Doesn't diagnose, and doesn't suggest treatment or a personal exercise program for the back pain.",
    "Suggests getting approval from a doctor or physiotherapist first, and invites a suitability talk with a trainer.",
    "Asks for consent before saving the trial-class request.",
    "After the customer refuses consent, calls neither save_request nor notify_staff_whatsapp, and no row is added to customer_requests.",
    "Tells the customer they can call the studio directly or write again later."
  ]
}
```

More expectations from the same case, to show the range:

| Kind | Expectation |
|---|---|
| tool call | "Calls get_price_list before its first price answer, and calls it again when asked whether the list changed." |
| reply, data | "The price reply lists only the 4 active packages, lowest price first, with no 'summer bootcamp'." |
| reply, format | "The price reply uses single-asterisk bold and '•' bullets, with no Markdown table, '#' heading, '**' or emoji, and writes 1,120 with a thousands separator." |
| must-not | "Never says the trial class is booked or confirmed, and never says a time slot is free." |

## Memory cases

Memory is Agent config (`memory.observationalMemory`,
`memory.episodicMemory`). The seeded Agent decides which memory is on. The
case only says whether to keep it.

- **`agentRun.keepMemory: true`** keeps the seeded memory config. Set it when
  the snapshot had memory on and the scenario needs it: more than a few turns,
  or more than one session. Omit it for a single-turn scenario. Memory then
  stays out of the result. (N4)
- **Variants** use `agentRun.configOverrides`, a deep merge onto the seeded
  config. A variant is a second case with the same seed and a different
  override. Examples:
  - Episodic off: `{ "memory": { "episodicMemory": { "enabled": false } } }`.
  - Force compaction in a short run:
    `{ "memory": { "observationalMemory": { "observerThresholdTokens": 2000 } } }`.
  - Results record the effective memory config, so on and off runs compare. (N4, L3)
- **Episodic memory needs 2 sessions.** Each session is a new thread for the
  same simulated user. (N3, N4)
  - Session 1 gives a fact worth keeping. Its expectation checks that the
    Agent flags it.
  - Session 2 needs that fact and does not repeat it. Its expectation checks
    that the Agent uses it without being told again.
  - The harness waits for memory to settle between sessions. You do not add
    waits.

```json
"sessions": [
  { "goal": "You are a returning customer. Book a class and mention you are allergic to latex mats.", "expectations": ["Flags the latex allergy as a memory."] },
  { "goal": "You are the same customer, a week later. Ask which mat you will use at your next class. Do not mention the allergy.", "maxTurns": 3, "expectations": ["Says a non-latex mat will be ready, without asking about allergies again."] }
]
```

- **Local runs skip episodic cases** with "Skipped: no embedding key".
  Episodic embeddings always use OpenAI, and no OpenAI key is set locally.
  Calibrate episodic cases remotely.
- An observational-only Agent still benefits from `keepMemory` in a long
  `userTurns` scenario. Grade what it keeps, not how it compacts.

## Review

A person reviews every case before `containsUserData` is cleared. Show them:

- The scrubbed `seed.agents` next to the rename map.
- The leak check result (see [building.md](building.md#check-the-rewrite)).
- Each scenario and its expectations.

The reviewer rejects a case if user data is left, or if an expectation grades
the builder or the config instead of the Agent. Record each rejection and its
reason. Never clear `containsUserData` yourself.

## Measure the skill

This skill is a prompt. Measure it, do not assume it works. For every case,
record:

- Time per case, from pick to published.
- How many steps needed a manual fix, and which.
- Review rejections, and why.
- Whether the case passed calibration on its first CI run.

Compare the first 3 cases with the last 3. Each problem you hit is a change to
this skill, in the same branch.

## Completion checklist

- The case runs in direct mode (`agentRun.mode: "direct"`). No assistant turn.
- The seed came from the last `config-updated` snapshot of one Agent.
- The rewrite passed the leak check and keeps the structure.
- Data Table rows are synthetic. No row came from a trace.
- Every scenario has 1 or more expectations, and each one grades the Agent.
- Memory cases set `keepMemory`. Episodic cases use 2 `sessions`.
- A person reviewed the case before `containsUserData` was cleared.
- It ran locally, then remotely on a pinned image. Each red is fixed or kept
  as a finding.
- It is in the "Agents — runtime" suite, and the report links to it.
- No scratch file is left in the worktree.
- The time, manual fixes, and review result are recorded.
