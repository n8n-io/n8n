### Instance AI Workflow Eval

> [!NOTE]
> No baseline configured — comparison skipped. Run the eval with `--experiment-name instance-ai-baseline` on master to create one.

**Aggregate**: 8.0% pass (2/25 trials, 5 scenarios × N=5)

<details><summary>Per-test-case results (1)</summary>

| Workflow | Built | pass@5 | pass^5 |
|---|---|---|---|
| `cross-team-linear-report` | 2/5 | 20% | 0% |

</details>

<details><summary>Failure details</summary>

**`cross-team-linear-report/happy-path`** — 5 failed
> Run [builder_issue]: The workflow fails at multiple levels. First, the 'Filter & Classify Cross-Team' code node produces zero output ('Output: none'), which causes all downstream nodes (Count Per Creator, Sort Descending,
> Run [builder_issue]: The workflow failed with the error 'Couldn't find the field crossTeamCount in the input data' in the Sort by Count (Desc) node. The root cause is in the Aggregate by Creator (Summarize) node configura
> Run [build_failure]: Build failed: fetch failed
> Run [build_failure]: Build failed: fetch failed
> Run [build_failure]: Build failed: fetch failed

**`cross-team-linear-report/multi-team-creator`** — 5 failed
> Run [builder_issue]: The workflow execution stopped at the 'Filter & Classify Cross-Team' node, which produced no output. The code node contains two fatal flaws: (1) It tries to resolve the creator's email via `issue.crea
> Run [builder_issue]: The workflow failed at the 'Sort by Count (Desc)' node with the error 'Couldn't find the field crossTeamCount in the input data'. The root cause is a misconfiguration in the 'Aggregate by Creator' (Su
> Run [build_failure]: Build failed: fetch failed
> Run [build_failure]: Build failed: fetch failed
> Run [build_failure]: Build failed: fetch failed

**`cross-team-linear-report/no-cross-team-issues`** — 3 failed
> Run [build_failure]: Build failed: fetch failed
> Run [build_failure]: Build failed: fetch failed
> Run [build_failure]: Build failed: fetch failed

**`cross-team-linear-report/unknown-creator`** — 5 failed
> Run [builder_issue]: The workflow did not crash, so it handled the unknown creator (Dave) without crashing — that part is fine. However, Alice's cross-team issues were NOT correctly processed. The Filter & Classify Cross-
> Run [builder_issue]: The workflow crashed at the 'Sort by Count (Desc)' node with the error: "Couldn't find the field 'crossTeamCount' in the input data". This prevented the Slack post from being sent. While the 'Detect C
> Run [build_failure]: Build failed: fetch failed
> Run [build_failure]: Build failed: fetch failed
> Run [build_failure]: Build failed: fetch failed

**`cross-team-linear-report/api-error`** — 5 failed
> Run [builder_issue]: The workflow crashed with an unhandled error: 'Cannot read properties of undefined (reading 'errors')'. The Get Linear Issues node received an authentication error response from the Linear API (mock r
> Run [builder_issue]: The workflow crashed with 'Authorization failed - please check your credentials' when the Linear API returned an authentication error. There is no error handling branch configured in the workflow — no
> Run [build_failure]: Build failed: fetch failed
> Run [build_failure]: Build failed: fetch failed
> Run [build_failure]: Build failed: fetch failed

</details>
