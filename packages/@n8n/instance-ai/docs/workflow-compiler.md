# Workflow Compiler

The workflow compiler is the build path behind `build-workflow`. The model
never writes workflows. It scores bounded options; deterministic code
extracts requirements, plans a typed IR, compiles the n8n JSON, validates it
and hands it to `persist-workflow`.

> **The model chooses bounded semantic options. The compiler owns graph
> construction. The validator owns correctness.**

```text
request → requirements (deterministic) → candidate retrieval (lexical)
        → one decision wave (structured reads) → completeness
        → IR (patterns + actions) → validate IR → compile → static validation
        → execution paths + verification report → persist-workflow
```

Every stage except the decision wave is code, so the same request with the
same answers yields the same workflow. Any missing value or low-confidence
read becomes a grouped clarification that resumes the same `sessionId`.

| Folder | Responsibility |
|---|---|
| `decision/` | `DecisionService` contract, `/v1/systemone` client, model fallback, policy (`resolveChoice`, `resolveNoul`) |
| `requirements/` | Requirement state (`resolved` / `missing` / `ambiguous`), extraction, completeness, clarification |
| `catalog/`, `patterns/` | Versioned `NodeRegistry` with parameter paths, lexical retrieval, reviewed pattern expansions |
| `ir/`, `expressions/` | Zod IR, semantic validation (ordering, reachability, workflow calls), structural expressions |
| `compiler/`, `validation/`, `paths/` | Deterministic IR → JSON, four validators, `VerificationReport`, execution-path enumeration |
| `modes/`, `session/`, `service.ts` | `create` (plan IR), `edit` (`WorkflowPatch[]`), `debug` (evidence classifier), sessions, orchestration |

## Decisions

Each read has fixed questions, bounded answers with `none_of_these`, and a
policy outside the model: `resolveChoice` acts at confidence `>= 0.8`, keeps
a hint above `0.55`, and abstains otherwise; without a backend it falls back
to the retrieval prior. Confidence is evidence, never authorization: saving,
publishing and credentials keep the existing approval flow. Every decision
is logged on the session (`diagnostics.decisions`). Backends in priority
order: `SystemOneDecisionClient` (`N8N_INSTANCE_AI_DECISION_URL`),
`ModelDecisionService`, `NullDecisionService` (abstain and ask). Thresholds
are uncalibrated defaults.

## Modes

- **Create** plans requirements → decisions → IR → compile. Missing
  information is a question, never a guess.
- **Edit** classifies the change, resolves the target node (one read when
  ambiguous) and emits a minimal `WorkflowPatch[]`; untouched nodes stay as
  they are and the result is revalidated.
- **Debug** classifies the failed execution from its recorded error and picks
  the smallest fix: retries, a repaired node reference, credential setup, or
  a question. It never enables continue-on-fail or removes a branch.

## Verification and versioning

The static report names every level explicitly (`pass` / `warn` / `fail` /
`not_run`) for structural, parameters, expressions, contracts, fixture tests,
integration tests and publication. `verify-built-workflow` enumerates every
branch path behind the verified trigger and reports `executionPathCoverage`;
a path is covered only when an execution reached every node on it. Every
artifact carries `generator` metadata (compiler, pattern registry, node
registry and schema versions); bump `src/workflow-compiler/versions.ts` when
behavior changes.

## Extending the catalog

Add a `NodeOperation` in `catalog/operations.ts` with node type and version,
discriminators, semantic parameters mapped to node parameter paths,
credentials and keywords. Mark derived parameters `derivable` and give every
other required parameter a `question`. Add a pattern in
`patterns/phase-one.ts` when several operations form a reviewed shape.
