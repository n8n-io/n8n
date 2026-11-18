# MCP as the Assistant's tool layer: eval results

**TL;DR:** The concept holds; the regressions are implementation gaps, not
protocol limits. The Assistant ran the whole suite with discovery, reads,
lifecycle, building and the sandbox served by the instance MCP server, and
built workflows of the same quality as native (builder-attributed failures
11.9% vs 14.7%). It scored **-2.4 pp** overall against the baseline, and every
structural regression traces to one of three things the PoC left out or did
half-way: the post-build verification loop, credential binding in the build
result, and the Assistant's own process guidance (switched off with the native
skill). None of them needs a protocol feature that MCP lacks.

Spec, capability matrix and per-milestone findings:
[`.agents/specs/mcp-shared-tool-layer.md`](../../../.agents/specs/mcp-shared-tool-layer.md).

## What ran

- Branch `poc/mcp-shared-tool-layer`: the Assistant is a real MCP client of
  the instance server (in-process, protocol `2026-07-28`). 20 native tools are
  replaced by server tools; approvals go over `input_required` elicitation; the
  sandbox is exposed as workspace tools.
- Full LangTracer `baseline` suite, 389 cases x 3 iterations (1167 builds,
  90 min, Sonnet 4.6), compared with the LangSmith baseline
  `instance-ai-baseline-13/07` on the 349 units both have. PR tier (11 cases
  x 3) separately.
- LangSmith experiments: `ci-poc_mcp-shared-tool-layer-90119af-57b1395e`
  (N=3) and `ci-poc_mcp-shared-tool-layer-7357512-cc478cc8` (N=1).

## Numbers

| shared units (349) | PoC N=3 | baseline N=10 | delta |
|---|---|---|---|
| aggregate pass rate | 86.4% (CI 84.2-88.4) | 88.8% (CI 87.7-89.8) | -2.4 pp |
| scenario units, executed workflows (117) | 85.8% | 79.2% | +6.5 pp |
| expectation units, judged behaviour (232) | 86.7% | 93.7% | -6.9 pp |
| failures observed vs expected under baseline rates | 142 vs 117 | | z = 3.8 (real) |

Verdicts: 290 stable, 19 watch, 24 hard regressions, 7 soft, 9 improvements.
PR tier: 37 of 38 units green. Run-to-run stability: a second full run (N=1)
agrees within +0.7 pp, with no regressions between the two.

Caveat: the baseline is from **July**. Master has moved since; the scenario
gain and the 9 improvements are units at 0/10 in July that master fixed
later. The honest control is a same-day master run with the same settings.

## Where the -6.9 pp on judged behaviour comes from

19 of the 24 hard regressions are 0/3 against 9-10/10: structural, not noise.

| theme | units | what happened | nature | fix |
|---|---|---|---|---|
| No verification loop | 11 hard | "The agent ran a verification of the built workflow" is 0/3 everywhere. The native build result carries `postBuildFlow` (verify, setup, publish disclosure); the server's save result does not, and the skill that follows it is off | **PoC gap.** Tool results can carry next-step instructions in any client; the verify tool can live on the server | Put verify on the server; let save results carry the post-build flow |
| Credentials in the build | 5 hard, 2 soft | The native build lists candidate credentials and binds a sole match. Over MCP the agent told the user the Slack credential was missing although one existed | **PoC gap** (server build result) | Return candidates and the binding outcome from `create_workflow_from_code` / `build_workflow` |
| Guidance drift | 3 hard, 3 soft | Clarify before building (`notification-router` 0/3 vs 10/10), do not re-ask deferred values, inspect an expression before editing it. All rules live in the `workflow-builder` skill, which the PoC gated off | **Design finding, cheap fix.** MCP `instructions` is one flat string for every client; the Assistant's conversational policy does not belong to a tool server. Keep the skill, pointing at server tool names | Re-enable a trimmed skill |
| Knowledge-base guardrail | 6 (one case) | `voice-agent-crm-backend`: expressions read `arguments`, which the sandbox blocks; the native path used a Code node per a guardrail doc the skill points to | same as above | same |
| Wrong project | fixed | Server create tools default to the personal project; 26% of builds were rebuilt into the right one. The bridge now injects the thread's `projectId` | **The protocol has no session scope**; the client injects it, like `workspaceKey` | done |
| Unexplained | 3 scenarios | `flight-status-change-alert`, `product-page-agent-question-tool`, `trading-bot-http-array-normalization` | unknown | read the transcripts |

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

The shared tool layer is viable: the hard parts (schema fidelity, typed
outputs, approvals with session grants, the sandbox over tools) all worked
under a full eval. The regressions are a to-do list, not a verdict. Before
deciding:

1. Run master full/N=1 as a fresh control.
2. Close the three gaps above (verify loop, credential binding, skill back on)
   and re-run. If the delta goes to about 0, the concept is proven at parity.
   If the verification and credential items do not close, that is the real
   cost of the design.
