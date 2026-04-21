# workflow-authoring-checks

Pre-publish lint-like checks for workflows. A check inspects a workflow draft
(nodes, connections, settings) and reports violations with one of two
severities:

- `warning` — the user may still publish ("publish anyway").
- `blocking` — the user must resolve the violation before publishing.

Checks are registered globally per instance. Each check's effective severity
and enabled state can be overridden by an instance admin at runtime.

"Publish" means activation; the check pipeline runs whenever a workflow is
activated or explicitly previewed from the editor.

## Module layout

```
workflow-authoring-checks/
├── workflow-authoring-checks.module.ts      // @BackendModule entry point
├── workflow-authoring-checks.controller.ts  // REST endpoints
├── workflow-authoring-checks.service.ts     // Orchestrates checks + config
├── workflow-check-registry.service.ts       // In-memory check registry
├── workflow-authoring-checks.types.ts       // WorkflowCheck / result types
├── workflow-authoring-checks.constants.ts   // Check IDs
├── checks/
│   └── ai-agent-requires-guardrail.check.ts
├── database/
│   ├── entities/workflow-check-config.entity.ts
│   └── repositories/workflow-check-config.repository.ts
└── __tests__/
```

## Lifecycle

`WorkflowAuthoringChecksModule.init()` runs on startup and:

1. Loads the controller (so its routes are registered).
2. Instantiates the registry and each check via the DI container.
3. Registers every check with the `WorkflowCheckRegistry`.
4. Wires `WorkflowAuthoringChecksService` into
   `WorkflowAuthoringChecksProxy` (`packages/cli/src/workflows/`), the
   null-safe facade used by the activation pipeline.

`entities()` exports the `WorkflowCheckConfig` TypeORM entity so the module's
migration (`CreateWorkflowCheckConfigTable1778000000000`) and entity metadata
are picked up by the main DB connection.

## Core concepts

### `WorkflowCheck`

Each check implements:

```ts
interface WorkflowCheck {
  readonly id: string;
  readonly defaultSeverity: 'warning' | 'blocking';
  readonly title: string;
  readonly description: string;
  evaluate(ctx: WorkflowCheckContext): Promise<WorkflowCheckViolation[]>;
}
```

`WorkflowCheckContext` gives the check the raw workflow plus a
destination-indexed connection map (`connectionsByDestination`) so parent
lookups via `getParentNodes` are cheap.

### `WorkflowCheckRegistry`

In-memory `Map<id, check>`. Rejects duplicate IDs. Checks register
themselves in `WorkflowAuthoringChecksModule.init()`; third-party modules
can register additional checks the same way.

### `WorkflowAuthoringChecksService`

- `runAll(input)` — loads stored configs once, iterates the registry,
  skips disabled checks, applies `severityOverride`, and returns only
  checks that produced violations.
- `listChecksWithConfig()` — every registered check merged with its stored
  config, used by the admin list endpoint.
- `updateConfig(checkId, patch)` — upserts the row for that check and
  returns the merged DTO. Unknown check IDs return `null` (the controller
  translates this to 404).

### `WorkflowCheckConfig`

Persisted per-check override:

| Column             | Type              | Notes                           |
| ------------------ | ----------------- | ------------------------------- |
| `checkId`          | `varchar(255)` PK | Matches `WorkflowCheck.id`      |
| `enabled`          | `boolean`         | Default `true`                  |
| `severityOverride` | `varchar(32)`     | `warning`/`blocking` or `null`  |
| `createdAt`        | timestamp         | From `WithTimestamps`           |
| `updatedAt`        | timestamp         | From `WithTimestamps`           |

A missing row is treated as "enabled, default severity" — no bootstrap rows
are needed.

### Activation integration

`WorkflowService` depends on `WorkflowAuthoringChecksProxy` rather than on
this module directly, so the rest of the CLI stays independent of whether
the module is loaded. On activate:

1. `proxy.runAll(...)` — empty array if the module is disabled.
2. Any `severity === 'blocking'` violations → throw
   `WorkflowAuthoringChecksFailedError` (HTTP 422, activation refused).
3. Any `severity === 'warning'` violations → throw the same error unless
   the caller passed `skipAuthoringChecksWarnings=true` ("publish anyway").

## Endpoints

All routes are mounted under `/workflow-authoring-checks`.

### `GET /preview/:workflowId`

Returns the checks that would fire for a workflow draft.

- **Scope:** `@ProjectScope('workflow:publish')`
- **Access:** the caller must also have `workflow:read` on the target
  workflow (enforced via `WorkflowFinderService`).
- **Query:** `WorkflowAuthoringChecksPreviewQueryDto`
  - `versionId?` — if present and different from the current draft, loads
    `nodes` + `connections` from workflow history instead. Missing versions
    surface as 404.
- **Response:** `WorkflowAuthoringChecksPreviewResponse`
  ```ts
  {
    results: WorkflowCheckResult[];
    summary: { blocking: number; warning: number };
  }
  ```
  `summary` is computed by `summarize(results)` in the controller.

### `GET /`

Lists every registered check merged with its stored config. Used by the
instance admin UI.

- **Scope:** `@GlobalScope('workflowAuthoringCheck:list')`
- **Response:** `WorkflowAuthoringChecksListResponse`
  ```ts
  { checks: WorkflowCheckConfigDto[] }
  ```

### `PATCH /:checkId`

Updates the stored config for a check.

- **Scope:** `@GlobalScope('workflowAuthoringCheck:update')`
- **Body:** `UpdateWorkflowCheckConfigDto`
  - `enabled?: boolean`
  - `severityOverride?: 'warning' | 'blocking' | null`
- **Response:** the merged `WorkflowCheckConfigDto`.
- **404** when `checkId` is not registered.

## Adding a new check

1. Add the ID to `WORKFLOW_AUTHORING_CHECK_IDS` in
   `workflow-authoring-checks.constants.ts`.
2. Create a class under `checks/` that implements `WorkflowCheck` and is
   decorated with `@Service()`.
3. Register it in `WorkflowAuthoringChecksModule.init()`:
   ```ts
   registry.register(Container.get(YourCheck));
   ```
4. Add unit tests under `__tests__/`.

No DB migration is required — config rows are created lazily by
`updateConfig`.

## Tests

Backend test files live in `__tests__/`:

- `workflow-authoring-checks.service.test.ts` — registry skip-empty,
  disabled-skip, severity override, and list/update DTO shape.
- `workflow-authoring-checks.controller.test.ts` — preview (draft vs.
  history, version-not-found → 404, summary), list, updateConfig.
- `ai-agent-requires-guardrail.check.test.ts` — single-check behaviour.

Run with `pnpm --filter n8n test workflow-authoring-checks`.
