# MCP as the Assistant's tool layer: eval results

**TL;DR:** The concept holds. Against a same-day master control on the full
suite, the Assistant over MCP scores **-1.4 pp** (87.9% vs 89.3%, confidence
intervals overlap), and the only systematic regression is one missing piece:
the post-build **verification loop** (23 judged units at 0/3 where master
passes, against 3 the other way). Everything else that looked like a
regression against the July baseline also fails on today's master, or is
balanced noise. The verification loop is a PoC gap, not a protocol limit:
nothing in MCP prevents the server's save result from carrying the post-build
flow, or the verify tool from living on the server. Close it and the PoC is at
parity.

Spec, capability matrix and per-milestone findings:
[`.agents/specs/mcp-shared-tool-layer.md`](../../../.agents/specs/mcp-shared-tool-layer.md).

## What ran

- Branch `poc/mcp-shared-tool-layer`: the Assistant is a real MCP client of
  the instance server (in-process, protocol `2026-07-28`). 20 native tools are
  replaced by server tools; approvals go over `input_required` elicitation; the
  sandbox is exposed as workspace tools.
- Full LangTracer `baseline` suite, 389 cases, Sonnet 4.6. PoC at `90119af`
  with 3 iterations (1167 builds, 90 min); master `a80147a` the same day with
  1 iteration (32 min) as the control; the July LangSmith baseline
  `instance-ai-baseline-13/07` (10 iterations, 349 shared units) as a second
  reference. PR tier (11 cases x 3) separately.
- LangSmith experiments: `ci-poc_mcp-shared-tool-layer-90119af-57b1395e`,
  `ci-master-a80147a-0c474204`, `ci-poc_mcp-shared-tool-layer-7357512-cc478cc8`
  (an earlier N=1 PoC run; +0.7 pp between the two PoC runs, so the PoC is
  stable run to run).

## Numbers

Full suite, PoC N=3 against master N=1, 1867 shared units:

| | PoC | master | delta |
|---|---|---|---|
| aggregate pass rate | 87.9% (CI 87.0-88.7) | 89.3% (CI 87.8-90.6) | -1.4 pp |
| scenario units, executed workflows (351) | 79.5% | 81.5% | -1.9 pp |
| expectation units, judged behaviour (1516) | 89.9% | 91.1% | -1.2 pp |
| units master passed and the PoC failed 3/3 | 54 | | |
| units master failed and the PoC passed 3/3 | 44 | | |

The 54 against 44 is mostly symmetric noise (master has one trial per unit).
By theme it is not:

| theme | PoC 0/3, master pass | PoC 3/3, master fail |
|---|---|---|
| verification loop | **23** | 3 |
| other judged behaviour | 14 | 19 |
| executed scenarios | 8 | 9 |
| asking and clarifying | 5 | 2 |
| credentials | 3 | 8 |
| publishing | 1 | 3 |

Against the July baseline (349 shared units) the PoC is -2.4 pp (86.4% vs
88.8%) with 24 hard regressions. 15 of the 31 regressions also fail on
today's master (the whole "credentials offered during the build" group, and
`notification-router`), so they are drift between July and now, not the PoC.
PR tier: 37 of 38 units green.

## The one regression: no verification loop

"The agent ran a verification of the built workflow" and everything that
depends on it (mocked verification before credentials, both branches
verified, re-verify after a swap, verify before publishing, the honest
"simulated" wording) is 0/3 across 23 units that master passes. The native
build result carries `postBuildFlow` (verify, setup, publish disclosure); the
server's save result does not, and the `workflow-builder` skill that follows
it is gated off while the server builds. `verification_gap` attribution:
1.5% of PoC runs.

Nature: **PoC gap.** Tool results can carry next-step instructions for any
client, and verification can be a server tool. Fix: put verify on the server
and let `create_workflow_from_code` / `build_workflow` return the post-build
flow; or keep a trimmed client skill that drives it.

Fixing these 23 units alone brings the PoC to about 89.1%, i.e. parity with
master.

## Smaller findings

- **Guidance drift.** The PoC gated off the `workflow-builder` skill, so its
  rules (clarify before building when a choice changes topology, do not re-ask
  deferred values, inspect an expression before editing it) did not reach the
  model. `notification-router` is 0/9 on the PoC across three runs; master
  failed it once in one trial, so the signal is weaker than it first looked.
  MCP `instructions` is one flat string for every client; the Assistant's
  conversational policy belongs in a client skill that names server tools.
- **Wrong project (fixed).** Server create tools default to the personal
  project; 26% of PoC builds were rebuilt into the conversation's project
  before the bridge started injecting the thread's `projectId`. After the
  fix: 0 of 1153. It cost a rebuild each, not scores.
- **Build quality.** Scenario pass 79.5% vs 81.5% and builder-attributed
  failures 11.9% vs 8.0%: slightly worse, inside the noise of one master
  trial, but worth re-checking once the verification loop is back (several
  scenario failures are workflows the agent never ran).

## What the protocol does not carry (none of it caused a regression)

- **No session or thread state.** Workspace key, current project, session
  grants, thread ownership of a workflow: all injected or kept by the client.
  It works; each one is a bridge special case.
- **No namespaces.** Native and server tool names collide; an explicit
  replacement list handles it.
- **Per-resource exposure policy (`availableInMCP`)** is a third-party concept;
  the first-party Assistant needs a trusted caller marker (done in-process).
- **Confirmation only for modern clients** (`input_required` plus
  elicitation); 2025-era clients get no approval card.
- **Guidance is a flat string.** Tool contracts travel; the Assistant's process
  and reference material do not. They stay a client skill.

## Recommendation

The shared tool layer is viable: schema fidelity, typed outputs, approvals
with session grants, and the sandbox over tools all held under a full eval,
and the gap to master is one feature, not a pattern. Next: bring the
verification loop onto the server (or keep a trimmed client skill), re-enable
the skill's process rules, and re-run full/N=3 against a master N=3 control.
Parity there is the go signal; a remaining gap would be the real cost of the
design.
