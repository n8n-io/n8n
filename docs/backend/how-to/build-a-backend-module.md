---
title: Build a backend module
audience: Backend engineers who add a feature to n8n
tier: 3
last_reviewed: 2026-11-06
contact: ivov
---

# Build a backend module

Most new backend features are built as modules (e.g. [Insights](https://docs.n8n.io/administer/observe-and-log/track-usage-with-insights) or [Data tables](https://docs.n8n.io/build/work-with-data/data-tables)). A module keeps all the backend code of one feature in one place. n8n starts the module only when it is enabled, licensed, and needed on that process.

> [!NOTE]
> Only n8n engineers build backend modules. Modules are not an extension point for community contributors.

## Choose a location

A new module lives in its own pnpm package at `packages/modules/<name>/backend/`. The module must not import `packages/cli/`.

Most existing modules currently live in `packages/cli/src/modules/<name>/` and are moving to their own pnpm packages. Create a new module in `packages/cli/src/modules/` only if it depends on code inside `packages/cli/`, which should be rare. Additionally, some features cannot be a module, because they change code all over `packages/cli/` (e.g. workflow archival).

If you are unsure where your feature belongs, or if it can be a module at all, ask in `#team-backend`.

## Create a module

From repository root:

```bash
pnpm n8n-module-sdk create my-feature --stack=backend
```

The scaffolder writes the package `@n8n/backend-module-my-feature` to `packages/modules/my-feature/backend/`.

```bash
pnpm install
pnpm turbo typecheck --filter=@n8n/backend-module-my-feature
pnpm turbo lint --filter=@n8n/backend-module-my-feature
pnpm turbo test --filter=@n8n/backend-module-my-feature
```

For a module in `packages/cli/src/modules/`, run `pnpm setup-backend-module` instead.

If other packages need services, entities, or types from your module, export them from `src/index.ts`. Do not expose the entrypoint there, because n8n imports it separately.

## Write an entrypoint

The entrypoint is the file that n8n loads first. It tells n8n which tables, periodic tasks, and settings the module adds, and how to start and stop the module.

Example from the insights module:

```ts
@BackendModule({ name: 'insights', instanceTypes: ['main', 'webhook'] })
export class InsightsModule implements ModuleInterface {
	async init() {
		await import('./insights.controller.js');

		const { InsightsService } = await import('./insights.service.js');
		await Container.get(InsightsService).init();
	}

	async systemTasks() {
		const { InsightsCompactionTask } = await import('./insights-compaction.task.js');
		const { InsightsPruningTask } = await import('./insights-pruning.task.js');
		return [InsightsCompactionTask, InsightsPruningTask];
	}

	async entities() {
		const { InsightsByPeriod } = await import('./insights-by-period.entity.js');
		const { InsightsMetadata } = await import('./insights-metadata.entity.js');
		const { InsightsRaw } = await import('./insights-raw.entity.js');

		return [InsightsByPeriod, InsightsMetadata, InsightsRaw];
	}

	async settings() {
		const { InsightsSettings } = await import('./insights.settings.js');

		return await Container.get(InsightsSettings).settings();
	}

	@OnShutdown()
	async shutdown() {
		const { InsightsService } = await import('./insights.service.js');

		await Container.get(InsightsService).shutdown();
	}
}
```

Every method is optional. Keep the entrypoint lightweight:

- Import every file with `await import()` inside a method.
- Do not give the class a constructor. Use `Container.get()` in the methods.
- Put `@OnShutdown()` on `shutdown()`. Without it, `shutdown()` never runs.

## Set license and instance types

`@BackendModule` takes three options:

- `name` for module name
- `licenseFlag` for license flag that the module needs
- `instanceTypes` for instance types that run the module (all by default)

Example from the external secrets module:

```ts
@BackendModule({
	name: 'external-secrets',
	licenseFlag: 'feat:externalSecrets',
})
```

When only some routes need a license, do not license the whole module with `licenseFlag`. Put `@Licensed()` on those routes instead.

Example from the insights module, where `/summary` needs no license and `/by-workflow` does:

```ts
@RestController('/insights')
export class InsightsController {
	@Get('/summary')
	@GlobalScope('insights:list')
	async getInsightsSummary(/* ... */) { /* ... */ }

	@Get('/by-workflow')
	@GlobalScope('insights:list')
	@Licensed('feat:insights:viewDashboard')
	async getInsightsByWorkflow(/* ... */) { /* ... */ }
}
```

> [!CAUTION]
> **n8n checks `licenseFlag` only at startup.** A license that changes later does not start or stop a module. See [Licensing](../licensing.md#license-checks).

## Add routes, services, and tables

| To add | Write | Method |
|---|---|---|
| Routes | `@RestController()` class in `*.controller.ts` | `init()` |
| Services | `@Service()` class in `*.service.ts` | `init()` |
| Periodic tasks | `@SystemTask()` class in `*.task.ts` | `systemTasks()` |
| Tables | `@Entity()` class in `*.entity.ts`, repository in `*.repository.ts` | `entities()` |
| CLI commands | `@Command()` class in `*.command.ts` | `commands()` |

Keep in mind:

- **Routes:** Protect each authenticated route with `@ProjectScope` or `@GlobalScope`. Type each request body as a DTO class from `@n8n/api-types`, because the server validates only DTO classes.
- **Services:** Import each injected class as a value, not with `import type`. With `import type`, the container injects `undefined`.
- **Periodic tasks:** Do not start timers in services. Use a `@SystemTask()` class, which n8n already schedules, moves on leader handover, and stops at shutdown.
- **Tables:** Follow "Persistence layer & the TypeORM boundary" in the root `AGENTS.md` for the repository.
- **Configuration:** Write a `@Config` class in `*.config.ts`, with a default for each `@Env()` property.
- **Migrations:** See [Write a database migration](write-a-database-migration.md). n8n runs all migrations, even for a disabled module.

## Share data with the frontend and executions

`settings()` serves an object to the frontend on `/rest/module-settings`. After a setting changes at runtime, call `ModuleRegistry.refreshModuleSettings(name)`.

`context()` adds an object to `IWorkflowExecuteAdditionalData`, under the module name.

Example from the data table module:

```ts
@BackendModule({ name: 'data-table' })
export class DataTableModule implements ModuleInterface {
	// ...

	async context() {
		const { DataTableProxyService } = await import('./data-table-proxy.service.js');

		return { dataTableProxyProvider: Container.get(DataTableProxyService) };
	}
}
```

Add the type by hand to `IWorkflowExecuteAdditionalData` in `packages/core/src/execution-engine/index.ts`.

Example from the data table module:

```ts
declare module 'n8n-workflow' {
	interface IWorkflowExecuteAdditionalData {
		// ...
		'data-table'?: { dataTableProxyProvider: DataTableProxyProvider };
	}
}
```

## Register the module in shared files

| To add | File |
|---|---|
| License flag | `LICENSE_FEATURES` in `packages/@n8n/constants/src/index.ts` |
| Log scope | `LOG_SCOPES` in `packages/@n8n/config/src/configs/logging.config.ts` |
| Enabled by default | `defaultModules` in `packages/@n8n/backend-common/src/modules/module-registry.ts` |

## Enable or disable a module

- `N8N_ENABLED_MODULES` enables a module that is disabled by default.
- `N8N_DISABLED_MODULES` disables a module.

## Module testing

Keep the tests in the module folder, under `src/`. To load the module in a test, use `testModules.loadModules` from `@n8n/backend-test-utils`.

Example from the data table module:

```ts
beforeAll(async () => {
	await testModules.loadModules(['data-table'], {
		'data-table': async () => await import('../data-table.module.js'),
	});
});
```

A module with entities also needs `tscDecoratorTransform` from `packages/@n8n/vitest-config/tsc-decorator-transform.ts` in its `vitest.config.ts`.

Your repository has only the methods that you write, with no `find` or `save`. In tests, seed and check data through its use-case methods, or through `Container.get(DataSource).getRepository(...)`.

## Run the module locally

Run `pnpm watch` in the module folder, and `pnpm dev` in `packages/cli/`. n8n does not restart when the module changes, so restart it after each change.
