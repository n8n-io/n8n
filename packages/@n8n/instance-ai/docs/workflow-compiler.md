# Workflow Compiler

The workflow compiler is the build path behind `build-workflow`. It replaces
the skill-driven builder that wrote TypeScript SDK source in a sandbox. The
model no longer writes workflows. It chooses bounded options; deterministic
code builds, validates and saves the workflow.

> **The model chooses bounded semantic options. The compiler owns graph
> construction. The validator owns correctness.**

## Pipeline

```text
User request
     │
     ▼
Requirement extraction (deterministic)        src/workflow-compiler/requirements
     │
     ├── missing behavior → clarification
     ▼
Candidate retrieval (lexical, per action)     src/workflow-compiler/catalog
     │
     ▼
One batched decision wave (structured reads)  src/workflow-compiler/decision
     │
     ├── low confidence / none_of_these → clarification
     ▼
Operation-level completeness                  requirements/completeness.ts
     │
     ├── missing values → clarification
     ▼
Workflow IR (patterns + actions)              src/workflow-compiler/ir, patterns, modes/create.ts
     │
     ▼
IR validation → compile → static validation   ir/validate-ir.ts, compiler/, validation/
     │
     ▼
Execution paths + verification report         paths/enumerate-paths.ts, validation/report.ts
     │
     ▼
persist-workflow (credentials, approval, save, setup, verification plan)
```

Only the decision wave touches a model. Everything else is code, so the same
request with the same answers produces the same workflow.

## Modules

| Folder | Responsibility |
|---|---|
| `decision/` | `DecisionService` contract, `/v1/systemone` client, model-backed fallback, deterministic policy (`resolveChoice`, `resolveNoul`) |
| `requirements/` | Requirement state (`resolved` / `missing` / `ambiguous`), extraction from text, two-stage completeness, grouped clarification |
| `catalog/` | Versioned `NodeRegistry` (phase-1 operations with parameter paths), lexical candidate retrieval |
| `patterns/` | Reviewed, versioned expansions from a few inputs to IR (`webhook_request_response`, `crm_upsert_and_notify`, …) |
| `ir/` | Typed workflow IR (Zod) and semantic validation (ordering, reachability, workflow calls) |
| `expressions/` | Structural expressions compiled to `={{ }}` strings, with static reference checks |
| `compiler/` | Deterministic IR → n8n JSON: binding, wiring, conditions, retries, dead letters, layout, generator metadata |
| `validation/` | Structural, parameter, expression and contract validators; explicit `VerificationReport` |
| `paths/` | Execution-path enumeration and coverage (the verifier's "system-one" view of a workflow) |
| `modes/` | `create` (plan IR), `edit` (minimal patch set), `debug` (execution-evidence classifier) |
| `session/` | `GenerationSession`, status model, in-memory and thread-metadata stores |
| `service.ts` | `WorkflowCompilerService`: orchestration, clarification loop, diagnostics |

## Decisions

Decisions follow the structured-read contract: fixed questions, bounded
answers, probabilities per option, deterministic policy outside the model.

- Every operation choice includes `none_of_these`.
- `resolveChoice` acts at `confidence >= 0.8`, keeps a hint above `0.55`, and
  abstains otherwise. When the decision service is unavailable it falls back to
  the retrieval prior and abstains unless the prior is decisive.
- Confidence is evidence, never authorization. Saving, publishing and
  credential use go through the existing approval and permission flow.
- Every decision is logged on the session (`diagnostics.decisions`) with the
  schema version, backend, latency, answers and policy result.

Backends, in priority order:

1. `SystemOneDecisionClient` when `N8N_INSTANCE_AI_DECISION_URL` is set.
2. `ModelDecisionService` (the run's model answering the same bounded schema).
3. `NullDecisionService` (abstain; the compiler asks the user).

Thresholds are starting points. Calibrate them on a labeled set for the
deployed model and schema version before relying on them.

## Modes

**Create.** Requirements → decisions → IR → compile. Missing information is a
clarification, never a guess. Answers resume the same `sessionId`.

**Edit.** Classifies the change (add step, remove step, update parameter,
rename), resolves the target node (named, or one bounded decision when
ambiguous), and emits a `WorkflowPatch[]`. Unaffected nodes are untouched; the
patched workflow is revalidated.

**Debug.** Classifies the failed execution from its recorded error
(credential, transient, rate limit, expression reference, missing parameter,
…) and picks the smallest fix: enable retries, repair a misspelled node
reference, route to credential setup, or ask for the value it cannot derive.
It never turns on continue-on-fail or removes a branch.

## Verification

The static report is explicit about what ran:

```json
{ "structural": "pass", "parameters": "warn", "expressions": "pass",
  "contracts": "pass", "fixtureTests": "not_run", "integrationTests": "not_run",
  "publication": "not_run" }
```

`verify-built-workflow` enumerates every branch path behind the verified
trigger and reports `executionPathCoverage` (paths total / covered / the first
node each uncovered path did not reach). A path is covered only when an
execution reached every node on it.

## Versioning

Every compiled artifact carries `generator` metadata: compiler, pattern
registry, node registry and schema versions plus the pattern ids used. Bump
the constants in `src/workflow-compiler/versions.ts` when behavior changes.

## Extending the catalog

Add a `NodeOperation` to `catalog/operations.ts`: node type and version,
discriminators (`baseParameters`), semantic parameters with their node
parameter paths, credential requirements and keywords. Mark parameters the
planner derives (`derivable`) and give every other required parameter a
`question`. Add a pattern in `patterns/phase-one.ts` when several operations
form a reviewed shape.
