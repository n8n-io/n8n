# Policy infrastructure module

The shared layer that every policy feature is built on. It runs the registered
`@PolicyCheck()` classes at fixed points in n8n and turns their answers into one
of three outcomes: cleared, blocked by policy, or blocked because a check failed.

The module holds no policy of its own. A policy feature adds a check class and a
store for its rules. It does not add an enforcement path, an error shape, or an
audit gap.

Opt-in while it is built out: `N8N_ENABLED_MODULES=policy-infrastructure`.
With the module off, nothing is checked and everything is allowed. That is the
documented break-glass lever.

## Architecture

```mermaid
flowchart LR
    subgraph hosts["Host call sites (packages/cli)"]
        save["workflowSave<br/>WorkflowCreationService, WorkflowService,<br/>chat hub, instance AI, public API"]
        publish["workflowPublish<br/>WorkflowService.activateWorkflow,<br/>WorkflowPublicationApplier, ActiveWorkflowManager"]
        start["workflowStart<br/>PolicyLifecycleHandler on<br/>workflowExecuteBefore"]
        other["workflowTransfer<br/>contentImport<br/>credentialDecrypt"]
    end

    subgraph pep["Enforcement point · src/policy (always loaded)"]
        pes["PolicyEnforcementService<br/>enforce* · evaluate* · hasChecksFor"]
    end

    subgraph module["policy-infrastructure module (opt-in)"]
        pds["PolicyDecisionService<br/>deadline per check · all checks must pass<br/>crash or timeout = fail closed"]
        registry["PolicyCheckMetadata<br/>registry in @n8n/decorators"]
        checks["@PolicyCheck() classes<br/>onWorkflowSave · onWorkflowPublish · …"]
    end

    subgraph outcomes["Outcomes"]
        cleared["PolicyCleared token"]
        violation["PolicyViolationError<br/>403 · meta.violations"]
        failed["PolicyCheckFailedError<br/>503 · meta.correlationIds"]
    end

    repo["WorkflowRepository.updateContent<br/>assertClearedFor(token, point, subject)"]

    save & publish & start & other --> pes
    pes -. "setImplementation() at module init" .-> pds
    pds --> registry --> checks
    pes --> cleared --> repo
    pes --> violation
    pds --> failed
```

Without the module, `PolicyEnforcementService` has no implementation. `enforce*`
then returns a cleared token and `evaluate*` returns an empty decision. A feature
that is absent is not a security failure.

## One save, end to end

```mermaid
sequenceDiagram
    participant H as WorkflowService.update
    participant PES as PolicyEnforcementService
    participant PDS as PolicyDecisionService
    participant C as @PolicyCheck classes
    participant R as WorkflowRepository

    H->>PES: enforceWorkflowSave({ workflow, storedWorkflow, projectId })
    PES->>PDS: enforce('workflowSave', ctx)
    loop every check with onWorkflowSave
        PDS->>C: onWorkflowSave(ctx, signal) under a 1 s deadline
        C-->>PDS: { violations, policyVersions }
    end
    alt a check threw or timed out
        PDS-->>H: PolicyCheckFailedError (503)
    else at least one violation
        PES-->>H: PolicyViolationError (403, meta.violations)
    else clear
        PES-->>H: PolicyCleared token bound to workflowSave and this workflow
        H->>R: updateContent(id, content, { policyCleared })
        R->>R: assertClearedFor(token, 'workflowSave', subject)
    end
```

`storedWorkflow` is loaded from the database by the host, never taken from the
request. A check can compare it with `workflow` to judge only what the save adds.

## Enforcement points

| Point | Deadline | Subject the token binds to | Where it fires |
|---|---|---|---|
| `workflowSave` | 1000 ms | row id, or node hash for a create | editor, public API, chat hub, instance AI, eval thread restore |
| `workflowPublish` | 1000 ms | row id | activate, publication applier, activation on startup |
| `workflowStart` | 250 ms | row id | `workflowExecuteBefore` on main, workers, sub-executions, manual runs |
| `workflowTransfer` | 1000 ms | row id | move to another project |
| `contentImport` | 1000 ms | row id | CLI import, source control import |
| `credentialDecrypt` | 250 ms | credential id | credential resolution during a run or a test |

Deadlines are tight on the two points that sit inside a running execution. A
wedged policy store there pins worker slots instead of failing one request.

## Fail posture

- **No check registered for a point:** allowed.
- **A check returns violations:** `PolicyViolationError`, HTTP 403. Every violation
  from every check is in `meta.violations`, so a user fixing a workflow sees the
  whole list. On `workflowStart` the run is stored as `error` with the same
  violations on `resultData.error`.
- **A check throws or overruns its deadline:** `PolicyCheckFailedError`, HTTP 503.
  Check internals never reach the response. The `correlationIds` tie the response
  to the server log lines that hold the real errors.
- **`evaluate*` (advisory):** never throws and never mints. A failed check lands
  in `checkErrors` next to the other results, so a crash never reads as "no
  violations".

## The seal

A cleared write needs a `PolicyCleared` token minted by the enforcement point.
`WorkflowRepository.updateContent` and its siblings call `assertClearedFor`, which
checks that the token exists, was minted for this point, and binds to this
subject. Only `PolicyEnforcementService` may import the minter; a lint rule
enforces that.

A second lint rule, `no-unsealed-workflow-entity-write`, flags direct
`save`/`insert`/`update`/`upsert` calls on `WorkflowEntity` in runtime code. It is
syntactic. It catches `save({ id, nodes })` and `update(id, { nodes })`, not a
payload built off-site or an aliased receiver. The runtime check is the enforcing
half.

## Add a check

```typescript
@PolicyCheck()
export class NodeTypePolicyCheck implements RegisteredPolicyCheck {
	readonly id = 'node-type-availability';

	async onWorkflowSave({ workflow, storedWorkflow, projectId }: WorkflowSaveContext, signal: AbortSignal) {
		return { violations: await this.violationsFor(workflow, storedWorkflow, projectId, signal) };
	}
}
```

Rules:

- Report violations. Do not throw for them. A throw means the check broke.
- Read state only. `evaluate*` must be safe to call from advisory UI.
- Implement only the points you need. An `on*` method that matches no point is a
  startup error.
- Pass `signal` to anything that accepts it. The deadline holds either way, but the
  signal lets the check stop its own work.

Import the file for its side effect from the module that owns the feature. The
registry is read on every decision, so load order cannot hide a check.

## Files

| File | Role |
|---|---|
| `policy-infrastructure.module.ts` | Registers `PolicyDecisionService` into the enforcement point and loads the lifecycle handler |
| `policy-decision.service.ts` | Runs the checks with deadlines and combines their results |
| `policy-lifecycle-handler.ts` | The `workflowStart` host, one hook for every way an execution starts |
| `policy-check-failed.error.ts` | The 503 for a check that did not answer |
| `../../policy/policy-enforcement.service.ts` | The enforcement point the hosts call, always loaded |
| `../../policy/policy-violation.error.ts` | The 403 that carries `meta.violations` |
| `../../policy/evaluate-content-import-safely.ts` | Advisory `contentImport` evaluation that reports a broken check instead of throwing |
| `@n8n/decorators/src/policy-check/` | `@PolicyCheck()`, the registry, the contexts, the `PolicyCleared` token |
