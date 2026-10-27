# @n8n/backend-module-llm-usage

Backend feature module. The n8n runtime loads the module through the lazy import in
`packages/cli/src/modules/modules.manifest.ts`.

Stores the token usage and estimated cost of every LLM call. Turn it on with
`N8N_ENABLED_MODULES=llm-usage`. It runs on main and worker processes.

## Data flow

1. Capture: `@n8n/ai-utilities/llm-usage` reports each call to the sink that this module sets.
   Node HTTP requests reach `request-inspector.ts` through the core request helpers.
2. Collector (`llm-usage-collector.service.ts`): buffers the records, prices them, and writes
   them to `llm_usage` in batches.
3. Price catalog (`price-catalog.service.ts`): loads token prices from
   `N8N_LLM_USAGE_CATALOG_URL`. When a new version loads, the leader main process prices the
   calls that were stored without a price.
4. API (`llm-usage.controller.ts`, `llm-usage.service.ts`): `GET /llm-usage/summary` and
   `GET /llm-usage/calls`, with the `llmUsage:read` scope.

## Budgets

Admins set spending budgets on the LLM calls of workflow nodes and agents, through the Public API
`/api/v1/llm-budgets` (scopes `llmBudget:read`, `llmBudget:manage`, license
`feat:typeAvailabilityPolicies`). The design is in `.claude/specs/llm-budget-policies.md`.

- Storage: `llm_budget` (`llm-budget.entity.ts`, `llm-budget.repository.ts`). Calls are counted
  for `llm_usage.accountableUserId`: the user who started the run, else the workflow publisher
  (`workflow-publisher-cache.ts`).
- Spend (`llm-budget-spend.service.ts`): each process keeps the spend of each counter in memory.
  It reads the database totals every 30 seconds and adds its own calls at once.
- Check (`llm-budget.check.ts`): a `@PolicyCheck` on the `llmCall` point. It blocks a call when an
  applicable `block` budget is spent. It reads memory only, and fails closed until the first
  spend load.
- Warnings (`llm-budget-warnings.ts`): the leader main emits `llm-budget-threshold-reached` and
  `llm-budget-limit-reached`. Log streaming sends them as `n8n.audit.llm-budget.*`.

Budgets need a price catalog. `N8N_LLM_USAGE_CATALOG_URL` is empty by default, and then every
call counts as 0. When this module is off, the budget routes return 503 and nothing is
enforced.

```bash
pnpm turbo typecheck --filter=@n8n/backend-module-llm-usage
pnpm turbo lint --filter=@n8n/backend-module-llm-usage
pnpm turbo test --filter=@n8n/backend-module-llm-usage
```

Go through Turbo. It builds this package's workspace dependencies first.

Read `scripts/backend-module/backend-module-guide.md` for the module lifecycle, REST controller,
service, repository, entity, configuration, and testing patterns.

## Import rules

- Do not import from `packages/cli` or from the `n8n` package.
- Declare each workspace and third-party import in this package.
- Export APIs for other packages from `src/index.ts`.
- Keep the module entrypoint in the `./module` export. Do not export it from `src/index.ts`.
  Importing the entrypoint runs the `@BackendModule` decorator.
- Use dynamic imports inside the module entrypoint. This keeps disabled modules unloaded.
- Keep TypeORM imports in entity and repository files.
