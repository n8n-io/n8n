---
title: Build a backend module
audience: Backend engineers who add a feature to n8n
tier: 3
last_reviewed: 2026-11-05
---

# Build a backend module

A backend module is one optional feature of the backend in its own folder. The module holds the routes, services, tables, settings, and startup work of that feature. n8n loads the code of a module only when the module is enabled, licensed, and right for the instance type.

[Recurring patterns](../patterns.md#backend-modules) explains why modules exist and how `ModuleRegistry` runs them. This page tells you how to build one.

> [!NOTE]
> Modules are for features of the core team. They are not an extension point for external contributors.

## Decide if a module fits

Start with a module for each new feature. A module is a bad fit when the feature changes the internals of `packages/cli` in many places. Workflow archival is an example. If you are not sure, ask the owners of `packages/@n8n/backend-common/` in `OWNERS`.

A module lives in one of two places:

- **A workspace package at `packages/modules/<name>/backend`.** This is the target for new modules. The package must not import `packages/cli`.
- **A folder in `packages/cli/src/modules/<name>`.** Use this only when the module needs code that exists only in `packages/cli`. The module can move to a package when that code has a package-level interface.

If the feature is already a package in `packages/@n8n/`, add a small module that imports the feature from that package. The module then makes sure that n8n loads the feature only when it is needed.

## Create the module

<!-- steps -->

1. **Run the scaffolder.**

   Run this command at the repository root. Use a kebab-case name.

   ```sh
   pnpm n8n-module-sdk create my-feature --stack=backend
   ```

2. **Check what the scaffolder changed.**

   The scaffolder writes the package `@n8n/backend-module-my-feature` to `packages/modules/<name>/backend`. It also changes three files outside the package:

   - It adds the package as a dependency in `packages/cli/package.json`.
   - It adds a lazy import to `packages/cli/src/modules/modules.manifest.ts`.
   - It adds the name to `MODULE_NAMES` in `packages/@n8n/backend-common/src/modules/modules.config.ts`. An unknown name makes startup throw `UnknownModuleError`.

3. **Install, then run the checks.**

   ```sh
   pnpm install
   pnpm turbo typecheck --filter=@n8n/backend-module-my-feature
   pnpm turbo lint --filter=@n8n/backend-module-my-feature
   pnpm turbo test --filter=@n8n/backend-module-my-feature
   ```

   Use Turbo. It builds the workspace dependencies of the package first.

For a module that must stay in `packages/cli/src/modules`, run `pnpm setup-backend-module` instead. The script is `scripts/backend-module/setup.mjs`.

The manifest entry for a packaged module is a thunk, so a disabled module is never imported. From `packages/cli/src/modules/modules.manifest.ts`:

```ts
	insights: async () => await import('@n8n/backend-module-insights/module'),
```

## Lay out the files

The scaffolder writes only the entrypoint, an empty `index.ts`, one test, and the package configuration. Add the other files when the feature needs them. A typical module has these files:

```sh
src/
├── __tests__/
├── index.ts                    # public API for other packages
├── my-feature.module.ts        # entrypoint
├── my-feature.controller.ts    # REST routes
├── my-feature.service.ts       # business logic
├── my-feature.task.ts          # periodic work
├── my-feature.repository.ts    # database access
├── my-feature.entity.ts        # table model
├── my-feature.config.ts        # environment variables
└── my-feature.constants.ts
```

Only the `.module.ts` infix is necessary. Use the other infixes too, because they make the files easy to find. A large module can group files in folders. The inbound auth module keeps its repositories in `database/repositories/`, for example.

A packaged module follows the import rules in its `README.md`:

- Do not import from `packages/cli` or from the `n8n` package.
- Declare each workspace and third-party import in the module package.
- Export the API for other packages from `src/index.ts`.
- Keep the entrypoint in the `./module` export only. An import of the entrypoint runs the `@BackendModule` decorator.
- Put shared test helpers in a `./testing` export. The insights and data table packages have one.

A module in `packages/cli/src/modules` can import from `packages/cli`, from shared packages such as `@n8n/db` and `@n8n/backend-common`, and from the dependencies of `packages/cli`.

## Write the entrypoint

The entrypoint is a class with the `@BackendModule` decorator that implements `ModuleInterface`. The decorator also registers the class as a `@Service()`. The insights module uses most of the methods. From `packages/modules/insights/backend/src/insights.module.ts`:

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

Each method is optional. `ModuleInterface` in `packages/@n8n/decorators/src/module/module.ts` defines them:

| Method | What it returns or does | When `ModuleRegistry` calls it |
|---|---|---|
| `entities()` | The entity classes of the module | At load, before the database connects |
| `nodeLoaders()` | Extra node loaders, as in the community packages module | At load |
| `commands()` | Imports CLI command files | At load |
| `init()` | Imports controllers and starts services | At init |
| `systemTasks()` | `@SystemTask()` classes for periodic work | At init, after `init()` |
| `settings()` | An object for the frontend, served on `/module-settings` | At init |
| `context()` | An object for workflow executions | At init |
| `shutdown()` | Stops the services of the module | See the warning below |

> [!WARNING]
> **Put `@OnShutdown()` on `shutdown()`.** `ModuleRegistry.shutdownModule` exists, but no production code calls it. `ShutdownService` calls only methods with `@OnShutdown()`. Without the decorator, the shutdown method never runs.

> [!WARNING]
> **Keep the entrypoint free of static relative imports.** Import every file of the module with `await import()` inside a method. Do not give the class a constructor. Constructor parameters load their classes when the entrypoint loads, also for a disabled module. Use `Container.get()` in the methods instead. In `packages/cli`, the lint rules `no-top-level-relative-imports-in-backend-module` and `no-constructor-in-backend-module` enforce this for `*.module.ts` files. The `oxlint` configuration of a packaged module does not have these rules, so a reviewer must check them.

Under `module: NodeNext`, a packaged module writes the `.js` extension in each dynamic import, as the insights module does.

## Gate the module

`@BackendModule` takes three options:

- `name`: the kebab-case name, as in `MODULE_NAMES`.
- `licenseFlag`: one flag or an array of flags. With an array, one licensed flag is enough. An unlicensed module does not start.
- `instanceTypes`: a subset of `main`, `webhook`, and `worker`. Without this option, the module starts on all three.

From `packages/cli/src/modules/external-secrets.ee/external-secrets.module.ts`:

```ts
@BackendModule({ name: 'external-secrets', licenseFlag: 'feat:externalSecrets' })
```

When only some routes need a license, do not set `licenseFlag`. Put `@Licensed()` on those routes. From `packages/modules/insights/backend/src/insights.controller.ts`:

```ts
	@Get('/by-workflow')
	@GlobalScope('insights:list')
	@Licensed('feat:insights:viewDashboard')
```

> [!CAUTION]
> **n8n checks the license only at startup.** `initModules` runs once, from the `start`, `webhook`, and `worker` commands. A license that changes later does not start or stop a module. Read [Enterprise gating](../enterprise-gating.md) before you choose between `licenseFlag` and `@Licensed()`.

## Add the parts of the feature

Each part follows a pattern on the [Recurring patterns](../patterns.md) page. This section tells you how to connect each part to the module.

<!-- steps -->

1. **Routes**

   Write a `@RestController()` class, and import its file in `init()`. The import runs the decorators, and the server then mounts the routes. Keep the controller small. It parses the request and calls a service. See [Controllers and routes](../patterns.md#controllers-and-routes), [Authorization and licensing on routes](../patterns.md#authorization-and-licensing-on-routes), and [Request validation with DTOs](../patterns.md#request-validation-with-dtos).

2. **Services**

   Write `@Service()` classes for the business logic. Start them from `init()` with `Container.get()`. A service can use `@OnLifecycleEvent()`, `@OnPubSubEvent()`, and `@OnShutdown()`. See [Lifecycle hooks](../patterns.md#lifecycle-hooks) and [Pubsub across processes](../patterns.md#pubsub-across-processes).

3. **Periodic work**

   Do not start a timer in a service. Write a `@SystemTask()` class in a `*.task.ts` file, and return it from `systemTasks()`. The system task runner then controls the schedule, the leader handover, and the shutdown. `InsightsCompactionTask` in `packages/modules/insights/backend/src/insights-compaction.task.ts` is the example. `packages/cli/src/scheduling/system-tasks/README.md` describes the runner.

4. **Tables**

   Write the entities, and return them from `entities()`. Write a repository that composes a file-private `BaseRepository` table. See [Services, repositories, and the TypeORM boundary](../patterns.md#services-repositories-and-the-typeorm-boundary) and [Transactions](../patterns.md#transactions). Name an entity class without the `Entity` suffix, for example `InsightsRaw`.

5. **Migrations**

   Add the migrations to `packages/@n8n/db/src/migrations`, not to the module. n8n runs all migrations, also for a disabled module. The tables of a disabled module therefore exist too.

6. **Configuration**

   Write a `@Config` class with `@Env()` properties in `<name>.config.ts`. See [Configuration](../patterns.md#configuration).

7. **CLI commands**

   Write a `@Command()` class in a `.command.ts` file, and import it in `commands()`. The community packages module does this in `packages/cli/src/modules/community-packages/community-packages.module.ts`.

## Share data with the frontend and with executions

`settings()` sends an object to the frontend. When a setting changes at runtime, call `ModuleRegistry.refreshModuleSettings(name)` so that the frontend gets the new value.

`context()` adds an object to `WorkflowExecuteAdditionalData`, under the module name. Nodes and the engine can then use the feature. From `packages/modules/data-table/backend/src/data-table.module.ts`:

```ts
	async context() {
		const { DataTableProxyService } = await import('./data-table-proxy.service.js');

		return { dataTableProxyProvider: Container.get(DataTableProxyService) };
	}
```

> [!IMPORTANT]
> **Add the type by hand.** `context()` does not change the type of `WorkflowExecuteAdditionalData`. Add a property with the module name to the type in `packages/core/src/execution-engine/index.ts`. The data table module has this line:
>
> ```ts
> 		'data-table'?: { dataTableProxyProvider: DataTableProxyProvider };
> ```

## Register the parts that live outside the module

Some facts about a module still live in shared files. Change these files when the feature needs them:

| Need | File |
|---|---|
| A license flag | `LICENSE_FEATURES` in `packages/@n8n/constants/src/index.ts` |
| A license check method | `LicenseState` in `packages/@n8n/backend-common/src/license-state.ts` |
| A log scope | `LOG_SCOPES` in `packages/@n8n/config/src/configs/logging.config.ts` |
| A migration | `packages/@n8n/db/src/migrations` |
| Request and response types for the frontend | `packages/@n8n/api-types` |
| Default on | `defaultModules` in `packages/@n8n/backend-common/src/modules/module-registry.ts` |

## Turn the module on and off

Operators control modules with two environment variables:

- `N8N_ENABLED_MODULES` turns on a module that is not a default module.
- `N8N_DISABLED_MODULES` turns off any module.

A name in both lists makes startup throw `ModuleConfusionError`.

To make a module a default module, add it to `defaultModules`. n8n starts the modules in the order of that list. If your module reads the state of another module, put your module after it. The comments in the list show two examples.

> [!TIP]
> Modules cannot call each other through a shared interface. Two narrow ways exist. `ModuleRegistry.isActive(name)` tells a module if another module is active. The agents module reads `isActive('knowledge')` in `settings()`. A manifest thunk can also bind `packages/cli` services to classes of the package before the import. The `apps` entry in `packages/cli/src/modules/modules.manifest.ts` does this. Ask the module system owners before you add a third way.

## Test the module

Keep the tests in the module package, under `src`. Keep a test in `packages/cli` only when it checks the wiring in `packages/cli` or uses its fixtures.

To load a packaged module in a test, give `testModules.loadModules` from `@n8n/backend-test-utils` the name and an import thunk. From `packages/modules/data-table/backend/src/__tests__/csv-parser.service.test.ts`:

```ts
beforeAll(async () => {
	await testModules.loadModules(['data-table'], {
		'data-table': async () => await import('../data-table.module.js'),
	});
});
```

The scaffolded `vitest.config.ts` uses `createVitestConfigWithDecorators`. A package that owns TypeORM entities also needs `tscDecoratorTransform` from `packages/@n8n/vitest-config/tsc-decorator-transform.ts`.

> [!WARNING]
> **A composed repository has no `find` or `save` for tests.** Seed and check data through the use-case methods of the repository. Or get a TypeORM repository for the entity with `Container.get(DataSource).getRepository(...)`. `packages/cli/src/encryption/__tests__/encryption-bootstrap.service.integration.test.ts` does this. Do not add a passthrough method for tests. `testDb.truncate` works as before.

## Run the module locally

Run `pnpm watch` in the module package, and `pnpm dev` in `packages/cli`. The package watch rebuilds `dist` of the module. `packages/cli/nodemon.json` restarts n8n only when `packages/cli/dist` changes. Restart n8n after a change to the module.

## Self-check

1. Your entrypoint stops a timer in `shutdown()`, but the timer still runs after n8n stops. What is the most likely cause?
   - A. The module is not in `defaultModules`.
   - B. `shutdown()` has no `@OnShutdown()` decorator.
   - C. The module has no `licenseFlag`.
2. An admin adds a license with your feature while n8n runs. Your module has `licenseFlag` set. When does the module start?
   - A. At once, when the license reloads.
   - B. At the next system task run.
   - C. At the next startup of the instance.
3. Where does the migration for a new module table go?
   - A. In `packages/modules/<name>/backend/src/migrations`.
   - B. In `packages/@n8n/db/src/migrations`.
   - C. In the `entities()` method of the module.

<details>
<summary>Answers</summary>

1. B. `ShutdownService` calls only methods with `@OnShutdown()`. No production code calls `ModuleRegistry.shutdownModule`.
2. C. `initModules` runs only at startup. A license change at runtime does not start a module.
3. B. Migrations stay central. n8n runs them also for a disabled module.

</details>
