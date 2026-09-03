# Frontend module

A frontend module is one unit of editor-ui function. It is a workspace package at
`packages/modules/<name>/frontend`. A descriptor registers it with the editor-ui shell.

Modules give these benefits:

- **Organization:** Feature code has one home. Its public entry says what the rest of the app
  can use.
- **Independence:** You typecheck, lint and test one feature in seconds. You do not run all of
  editor-ui (~770K lines of `.ts` and `.vue`; `src/features/` holds ~600K of that).
- **Decoupling:** A module cannot read the shell or another module. Features stay separate.
- **Ownership:** One package has one CODEOWNERS line.
- **Parity:** The frontend module id is the same as the backend module id. Both read
  `/rest/module-settings`.

Frontend modules are **source-only**. They declare `"main": "src/index.ts"`. They have no `build`
script and no `dist`.

There are two reasons. First, `tsdown` cannot compile `.vue` SFCs, and `@n8n/stores` and similar
packages build with `tsdown`. Second, a `dist` would have no consumer, because an alias already
points every frontend package at its `src`. The Vite graph of the shell compiles module sources
directly.

"Built separately" here means **typechecked, linted and tested separately**. That is the source of
the CI benefit.

This guide describes the CLI that shipped. If it disagrees with the original modularization
design proposal (CAT-3680), the code is correct. This guide marks each disagreement.

## Quickstart

Run these commands from the monorepo root:

```sh
pnpm n8n-module-sdk create                      # prompts for name and stack
pnpm n8n-module-sdk create my-feature --stack=frontend
```

`create` asks two questions. It asks for the module name. It then asks for the frontend half, the
backend half, or both.

The name is the one spelling of your module. It becomes the package suffix, the directory name,
the file infix and the descriptor `id`. It must also be the same as the backend module id. Write
it in kebab-case, and start every word with a letter. The CLI refuses any other form.

The command prints this output:

```
✔ Created packages/modules/my-feature
  packages/modules/my-feature/frontend  → @n8n/frontend-module-my-feature
  updated @n8n/frontend-vite-config/index.ts (Vite alias)
  updated editor-ui/package.json (dependency)
  updated editor-ui/tsconfig.json (paths)
  updated editor-ui/src/app/modules.manifest.ts (registration)

 ╭───────────────────────────────────────────────────────────────────╮
 │                                                                   │
 │  Next:                                                            │
 │    pnpm install                                                   │
 │    pnpm turbo typecheck --filter=@n8n/frontend-module-my-feature  │
 │    pnpm turbo lint --filter=@n8n/frontend-module-my-feature       │
 │    pnpm turbo test --filter=@n8n/frontend-module-my-feature       │
 │                                                                   │
 │    Guide: packages/@n8n/module-cli/frontend-module-guide.md       │
 │                                                                   │
 ╰───────────────────────────────────────────────────────────────────╯
```

Biome prints one more line before that output: `Formatted 12 files in 5ms. No fixes applied.` The
CLI formats the new package and every file that it changed. A registration line can be longer than
the limit of 100 columns. Without this step, the next `format:check` in CI fails on a module that
nobody changed by hand.

**Caution:** do not change those next-steps to `pnpm --filter … typecheck`. They use turbo for a
reason.

A module reads `n8n-workflow` and `@n8n/permissions` from their built `dist`, because the module
tsconfig base does not list them in `paths`. A direct `--filter` run on a cold tree then fails
with many errors:

```
../../../@n8n/api-types/src/agent-builder-tool-node-types.ts(5,8): error TS2307: Cannot find module 'n8n-workflow' or its corresponding type declarations.
../../../@n8n/api-types/src/api-keys.ts(1,34): error TS2307: Cannot find module '@n8n/permissions' or its corresponding type declarations.
```

Your module is correct. `turbo typecheck` declares `dependsOn: ["^build"]`. Turbo builds the
dependencies first, and the typecheck then passes. `lint` and `test` pass in both forms.

The CLI makes every edit outside the new package idempotent. You can run the command again after
a partial failure.

### `--stack=backend` is a placeholder

The backend half is a reserved path and a README. **Nothing loads it.**

The backend runtime reads its modules from `packages/cli/src/modules/<name>`. All 37 real backend
modules are there. For this reason `packages/modules/<name>/backend` is not a workspace package.

To create a backend module that runs, use `pnpm setup-backend-module`. Then obey
`scripts/backend-module/backend-module-guide.md`.

The CLI prints all of this when you ask for the backend half. This guide repeats it, because it is
the one part of `create` that can mislead you.

## File structure

```sh
packages/modules/my-feature/frontend/
├── package.json               # source-only; deps are L0-L2 only
├── tsconfig.json              # extends the shared module base
├── vite.config.ts             # vitest config + the shared source aliases
├── eslint.config.mjs
├── biome.jsonc
├── README.md
└── src/
    ├── index.ts               # the ONLY public entry
    ├── my-feature.module.ts   # the descriptor (entrypoint)
    ├── my-feature.store.ts    # Pinia store(s)
    ├── my-feature.store.test.ts
    └── __tests__/
        └── setup.ts           # per-package test bootstrap
```

Add the directories and files that you need: `views/`, `components/`, `composables/`,
`my-feature.api.ts` and `my-feature.constants.ts`.

Only `.module.ts` must have an infix, the same as on the backend. Use an infix on the other files
also. A module with many files is then easy to search.

The example in the repository is **`packages/modules/instance-registry/frontend`**. It is the
first extraction, and still the only one. It is small enough to read at one time.

## Entrypoint

The entrypoint has two files. `src/index.ts` holds what the shell can import.
`src/<name>.module.ts` holds the descriptor.

```ts
// src/index.ts — the module's only public entry.
export { MyFeatureModule } from './my-feature.module';
export { useMyFeatureStore } from './my-feature.store';
```

A deep path into `src/` is not part of the contract. If the shell or another package needs a
value, export that value here.

```ts
// src/my-feature.module.ts
import type { FrontendModuleDescription } from '@n8n/frontend-module-sdk';

export const MyFeatureModule: FrontendModuleDescription = {
	// Must match the backend module id: both gate off `/rest/module-settings`.
	id: 'my-feature',
	name: 'My Feature',
	description: 'What this module does',
	icon: 'box',
};
```

The `id` field is critical. `settingsStore.isModuleActive(id)` reads the `activeModules` list from
the backend. An id with no backend twin is never active. A route that uses the module availability
guard then does not resolve.

A descriptor with no surfaces is correct. `instance-registry` is such a module. Its store is the
full module. The descriptor makes it a module that the shell knows, and not a library that the
shell imports.

## The descriptor contract

`FrontendModuleDescription` (`@n8n/frontend-module-sdk/src/types/descriptor.ts`) declares twelve
extension surfaces. The shell connects them at three different levels. Read the difference before
you use a surface.

### Live — the shell registers these, and a reader shows them

| Field                   | Register function              | Reader                                   |
| ----------------------- | ------------------------------ | ---------------------------------------- |
| `routes`                | `registerModuleRoutes`         | vue-router                               |
| `projectTabs`           | `registerModuleProjectTabs`    | `ProjectHeader`                          |
| `resources`             | `registerModuleResources`      | `ResourcesListLayout`                    |
| `modals`                | `registerModuleModals`         | `DynamicModalLoader`                     |
| `adHocModalKeyPrefixes` | `registerModuleModals`         | `modalRegistry` (keys minted at runtime) |
| `settingsPages`         | `registerModuleSettingsPages`  | `SettingsSidebar`                        |
| `pushHandlers`          | `registerModulePushHandlers`   | `useModulePushDispatcher`, in `App.vue`  |

All the register functions are in `editor-ui/src/app/moduleInitializer/moduleInitializer.ts`.
`main.ts` registers `routes` before the mount. `app/init/index.ts` registers the other surfaces
after the login.

`pushHandlers` has one more rule. Only an **active** module registers its handlers. A module
handler also stops the built-in handler of the shell for that push type. A handler from an
inactive module would stop the built-in handler and give no message.

### The shell registers this one, but nothing shows it

`registerModuleCommands` puts `commands` into `commandRegistry`. No command-bar host reads that
registry. `features/shared/commandBar` still makes its list from its own `use*Commands`
composables. The registry keeps your `commands` array, but the command bar never shows it.

### Types-only — these do nothing at all

`locales` · `shortcuts` · `banners` · `setup`

The SDK exports the types. No file in the shell reads them. A value that you set does nothing: no
error, no warning, no behaviour.

Do not use `commands` or the four types-only fields yet. **CAT-3685** tracks the remaining work.
The descriptor that the CLI writes repeats this split in a comment, so you see it as you write.

**Note:** this is the most common cause of lost time for a new module author. The type accepts
your `commands` array, and no component draws it.

### Route names are yours, and a check guards them

A route name is global to the router. `router.addRoute` replaces a duplicate name and gives no
warning. The route that loses then does not resolve.

The central `VIEWS` enum of the shell made every name unique. A module cannot import `VIEWS`,
because `VIEWS` is in `@/app/constants` — the shell. Declare your own constant, and export it from
your `constants.ts` file:

```ts
// src/my-feature.constants.ts
export const MY_FEATURE_VIEW = 'my-feature';
```

`assertUniqueRouteNames` (`@n8n/frontend-module-sdk`) gives that check back. `registerModuleRoutes`
calls it before it adds a module route. It throws an error if a name is the same as a shell name
or as another module name:

```
Duplicate route name "my-feature" declared by module "my-feature" — already taken by the app shell.
```

`features/workflow-reviews/module.descriptor.ts` is the example in the shell of module-owned name
constants.

### Route gating

`registerModuleRoutes` writes `meta.moduleName = <module id>` on every route of a module. The
availability check is **per route, and optional**. It runs only if the route asks for it:

```ts
routes: [
	{
		path: '/my-feature',
		name: MY_FEATURE_VIEW,
		component: MyFeatureView,
		meta: {
			middleware: ['authenticated', 'rbac', 'custom'], // 'custom' → checkModuleAvailability
			middlewareOptions: { rbac: { scope: 'myFeature:manage' } },
		},
	},
],
```

If `meta.middleware` has no `'custom'` entry, the route resolves. The state of the module then
makes no difference.

## Import-light descriptors

The descriptor file can import **types and the SDK only**. Load views lazily. Read a store inside
a guard, a handler or `setup`. Never read a store at module scope.

```ts
const MyFeatureView = async () => await import('./views/MyFeatureView.vue');
```

There are two reasons. The first reason applies today.

1. **Boot order.** The imports of `main.ts` reach `modules.manifest.ts`, so JavaScript runs every
   descriptor body *before* `app.use(pinia)`. A `useXStore()` call at module scope then runs with
   no active Pinia.
2. **Chunks, later.** Import-light descriptors are the condition for one `import()` chunk for each
   module. A descriptor that imports its own views puts the full module in the entry bundle, even
   when the module is inactive.

**The shell descriptors are not all correct yet.** All eight descriptors in the shell load their
view components lazily. That part is the agreed convention, and this guide records it.

But six of the eight still import more than types and the SDK at module scope. `settings/otel`
imports `useRBACStore`. `core/dataTable` calls `useI18n()` at module scope. Correct the descriptor
that you extract. Do not copy the descriptors that are in the shell today.

## Imports and boundaries

A module can depend on **L0–L2 packages only**. The shared tsconfig base resolves this set from
source:

`@n8n/api-types` · `@n8n/chat` · `@n8n/chat-hub` · `@n8n/composables` · `@n8n/constants` ·
`@n8n/design-system` · `@n8n/frontend-constants` · `@n8n/frontend-module-sdk` ·
`@n8n/frontend-utils` · `@n8n/i18n` · `@n8n/rest-api-client` · `@n8n/stores` · `@n8n/telemetry` ·
`@n8n/utils`

A module also uses `@n8n/permissions`, `n8n-workflow`, `vue`, `vue-router` and `pinia`. These five
resolve from their built `dist`. That is why the next-steps commands use turbo.

Never import another `@n8n/frontend-module-*`. Never import `@/…`, because `@/…` is the shell.

### Caution: several platform packages are subpath-only

**Caution:** import the subpath, and not the package root. A root import fails in two different
ways:

```ts
import { useSettingsStore } from '@n8n/stores';       // ❌ TS2305: no exported member
import { useToast } from '@n8n/composables';          // ❌ TS2307: cannot find module

import { useSettingsStore } from '@n8n/stores/settings.store';   // ✅
import { useToast } from '@n8n/composables/useToast';            // ✅
```

`@n8n/stores/src/index.ts` has one line: `export * from './constants'`. A root import of it
resolves, but it gives you nothing that you need.

`@n8n/composables` has no `src/index.ts` file. Its `exports` map declares only `"./*"`. A root
import of it does not resolve.

`@n8n/frontend-constants`, `@n8n/frontend-utils` and `@n8n/utils` behave in the same way. The alias
table marks them `entry: false`. A package with no root entry gets no bare-specifier alias, on
purpose (`@n8n/frontend-vite-config/index.ts`).

Always import the subpath. The dependency list in the design proposal shows root imports. That
list is wrong.

### The no-cross-module rule: what a tool stops, and what it does not

Read this section with care. Three different mechanisms have the name "the boundary".

**Two mechanisms stop an accidental cross-module import.**

The `vite.config.ts` file of a module spreads `frontendAliases`. That set holds the platform table
and the `@n8n/tournament` rewrite. A second array, `modulePackages`, holds the sibling modules.
Only the shell expands that array, through `frontendModuleAliases`. An import of a sibling then
does not resolve in a test run:

```
Error: Failed to resolve import "@n8n/frontend-module-instance-registry" from "src/cross.test.ts". Does the file exist?
  Plugin: vite:import-analysis
```

The typecheck also fails, because the shared tsconfig base has no module `paths`.

**Neither mechanism stops a deliberate cross-module import.** Add the sibling to your
`dependencies`, and pnpm makes a symlink to it. Modules are source-only
(`"main": "src/index.ts"`), so node resolution finds the sibling and uses no alias. The tsconfig
base says the same:

> `paths` lists the L0-L2 packages a module consumes from source. Module packages are absent
> from it on purpose, which stops an *accidental* cross-module import — but it is not a
> boundary: `paths` is additive, so once a module declares another module as a dependency,
> pnpm symlinks it and the import typechecks clean. Boundary enforcement is the ESLint rule.
>
> — `packages/@n8n/typescript-config/tsconfig.frontend-module.json`

**`pnpm boundaries:check` does not close the gap either.** It runs `turbo boundaries` against a
baseline in the repository (`.boundaries-baseline.json`). The count of issues can only decrease.
`turbo boundaries` reports an *undeclared* dependency or a reach-in import. It accepts a declared
dependency by design.

The alias split changes an accidental import from a silent success into two clear failures. It
does not stop a person who wants that import. An ESLint `no-restricted-imports` rule would stop
it, and that rule **is not in the repository yet**. **CAT-3692** tracks it.

Until that rule lands, the boundary is the responsibility of the reviewer. Reviewers, look for a
new `@n8n/frontend-module-*` entry in the `dependencies` of a module. That entry is the only
signal. After a module declares the dependency, every check passes.

## Stores

A Pinia store registers itself on the first `use…Store()` call. You declare nothing in the
descriptor, and you connect no lifecycle.

```ts
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useMyFeatureStore = defineStore('myFeature', () => {
	const isReady = ref(false);
	const markReady = () => { isReady.value = true; };
	return { isReady, markReady };
});
```

Export the store from `src/index.ts` if a file outside the module reads it. `instance-registry`
does this, because `AboutModal` and `useDebugInfo` read its cluster-info store.

## Module settings and the timing problem

There are two levels of gating. They come from **different endpoints at different times**:

```ts
// Level 1 — is the module enabled on this instance at all?
settingsStore.isModuleActive('my-feature')          // from `settings.activeModules`

// Level 2 — module-specific configuration
settingsStore.moduleSettings['my-feature']?.enabled // from `/rest/module-settings`
```

**Caution:** do not read `moduleSettings` before the login. It is `{}` until then.

`getModuleSettings()` runs one time, in the login hook in `editor-ui/src/app/init/index.ts`. The
object is empty during the boot and during the route registration. An early read returns
`undefined`, and your code then behaves as if the module is inactive.

Never read it at module scope. Never read it in the setup body of a store. Never read it on the
path before the login. Read it in a route guard, a computed value or an event handler. This is the
full pattern:

```ts
const isEnabled = computed(
	() => settingsStore.isModuleActive('my-feature') &&
	      settingsStore.moduleSettings['my-feature']?.enabled === true,
);
```

`isModuleActive` is safe earlier, because it reads the main settings payload and not
`/rest/module-settings`. But it is also empty before `getSettings()`.

## Register the module with the shell

A module does nothing until the shell can see it. The shell needs **four file edits and one
CODEOWNERS line**. The CLI makes the four edits. Read this section when you register a module by
hand, or when you debug a CI failure.

| # | Where                                          | What                                      | Scaffolded? |
| - | ---------------------------------------------- | ----------------------------------------- | ----------- |
| 1 | `@n8n/frontend-vite-config/index.ts`           | an entry in the `modulePackages` array     | ✅          |
| 2 | `editor-ui/package.json`                       | `"@n8n/frontend-module-x": "workspace:*"`  | ✅          |
| 3 | `editor-ui/tsconfig.json`                      | two `paths` entries (bare + `/*`)          | ✅          |
| 4 | `editor-ui/src/app/modules.manifest.ts`        | import + array entry                       | ✅          |
| 5 | `.github/CODEOWNERS`                           | one line for the new package               | ❌ do this  |

The frontend has no CODEOWNERS entries today, so you cannot copy a line for #5. Add your line when
you create the module. A package with no owner is the start of an incomplete migration.

**Put #1, #2 and #3 in the same PR.** They are not alternatives. Each one serves a different
resolver:

- **#1** is the Vite alias. It makes the dev server and the production bundle read your module
  from `src`. A person maintains this table by hand. It does not appear without that edit.
- **#2** makes a bare import resolve outside Vite, for `vue-tsc` and for node.
- **#3** makes `vue-tsc` resolve the same `src` that Vite resolves.

**Note:** the list came from the file system in the past. It does not now. Commit `fae4c98` made
that change on purpose, and gave a table that you read and edit. If you read an older description
of this system, this is the part that changed.

### A test guards the table by name

If you forget #1, you do not get a silent split between the bundle and the typecheck. You get a
test failure with the name of the package. Remove a module from the table, then run
`editor-ui/vite/aliases.test.ts`:

```
 FAIL  vite/aliases.test.ts > editor-ui vite aliases > aliases every source package editor-ui typechecks from src
AssertionError: expected [ '@n8n/frontend-module-my-feature' ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "@n8n/frontend-module-my-feature",
+ ]
```

The message gives the name of the package that you forgot. That test enforces the registration. It
is a real gate, and not a convention. The failure is also real: for months, `vue-tsc` read four
packages from `src` while the build used their `dist`.

**Note:** the test makes sure that the alias table, the `paths` of editor-ui and the shared module
base agree. It says nothing about an import of one module by another module. That is the separate
boundary above, and no tool enforces it.

The old `pnpm check:frontend-aliases` script is gone. `aliases.test.ts` replaced it. The guard now
runs in the standard frontend test job, and not in `lint:ci`.

If you add a **platform** package, or you rename one, add it to the `sourcePackages` array in the
same file. Then update `editor-ui/tsconfig.json` and `tsconfig.frontend-module.json` to agree. The
same test reports a file that you forgot.

A person maintains `packages/@n8n/typescript-config/tsconfig.frontend-module.json` by hand. It must
agree with the alias table and with the `paths` of editor-ui. `aliases.test.ts` fails if they
disagree.

## Typecheck

Each module runs its own `vue-tsc --noEmit` with
`@n8n/typescript-config/tsconfig.frontend-module.json`. Learn three facts about that base file
first.

### A module inherits `paths`, but not `rootDirs`, `types` or `include`

A relative entry in `rootDirs`, `types` or `include` resolves against the config file that
**consumes** it. A copy of those three in the base file would point at the directory of the base
file.

`paths` is the exception, because it anchors to the file that *declares* it. For this reason one
shared base can serve a module at any depth. That difference explains the shape of the module
tsconfig template.

### Each module keeps its own ambient `.d.ts` shims, for the same reason

```jsonc
"types": [
	"vite/client",
	"vitest/globals",
	"unplugin-icons/types/vue",
	"../../../frontend/@n8n/design-system/src/shims-modules.d.ts",  // ~icons/*, markdown-it-task-lists
	"../../../frontend/@n8n/stores/src/shims.d.ts"                  // window.BASE_PATH
]
```

Your module never imports these ambient declarations. No file adds them to the program. They are
here because your module reads `@n8n/design-system` and `@n8n/stores` **from source**. A built
`dist` carries its own declarations. Source does not, so the consumer must add them. The
resolution rule above stops a move of these entries into the shared base.

Keep them. If a module removes the `@n8n/design-system` dependency, remove the related shim also.

### `useUnknownInCatchVariables: false`

Every module inherits this flag from the base file. A `catch` variable then has the type **`any`,
and not `unknown`**. This code compiles in a module. It does not compile in another package:

```ts
try { … } catch (error) {
	error.anything;  // no TS18046. `error` is `any`.
}
```

This flag is not a style decision. It is the cost of a read of `@n8n/rest-api-client` from source.
That package sets the flag in its own tsconfig, and its `catch` blocks need it. The flag must then
hold for every consumer. editor-ui has the same line. The flag goes away when the source of that
package no longer needs it.

Narrow the type of each error by hand.

## Lint

```sh
pnpm turbo lint --filter=@n8n/frontend-module-my-feature      # eslint src --quiet
pnpm --filter @n8n/frontend-module-my-feature lint:fix        # no build needed to autofix
```

**Note:** lint is stricter in a module than in the shell. `editor-ui/eslint.config.mjs` sets
`'import-x/order': 'off'`. The shared frontend config keeps that rule on. Code that passed in
editor-ui then fails in a module:

```
  2:1  error  `@n8n/stores/settings.store` import should occur before import of `vue`  import-x/order

✖ 1 problem (1 error, 0 warnings)
  1 error and 0 warnings potentially fixable with the `--fix` option.
```

`pnpm lint:fix` corrects this error. Every extraction PR gets these import-order changes, and they
change no behaviour.

Put those changes in one commit, so a reviewer can skip them. Then say so in the PR body. A new
module author can read this error as a defect, and can then search for a problem that does not
exist.

## Tests

```sh
pnpm turbo test --filter=@n8n/frontend-module-my-feature   # vitest run
pnpm --filter @n8n/frontend-module-my-feature test:dev     # watch
```

Put each test next to its code (`my-feature.store.test.ts`). editor-ui uses the same convention.

`vite.config.ts` already holds `@vitejs/plugin-vue` and the shared source aliases. A `.vue` file
then compiles in a test with no more setup.

`src/__tests__/setup.ts` imports the shared jsdom harness, `@n8n/vitest-config/setup/frontend`.
That harness gives the observers, `matchMedia`, canvas, timers and the teardown guards. The file
then starts Pinia for each test.

Each package starts the frameworks itself, on purpose. `@n8n/i18n` has `@n8n/vitest-config` in its
`devDependencies`. A start of i18n inside the shared harness would make a turbo cycle. Add the
`useI18n` start to your own setup file if your module needs it.

### Two entries in `package.json` are mandatory

**`"test:changed": "janitor test-scoped"`.** The CI for a PR runs `pnpm test:ci:frontend:changed`.
That script is
`turbo run test:changed --continue --filter='./packages/frontend/**' --filter='./packages/modules/**'`.

Turbo **does nothing for a package that has no such script**. It gives no error and no skip
message. Your tests then never run in the CI for a PR, and the job passes.

The second `--filter` puts modules in the frontend test job. `packages/modules/**` is not inside
`packages/frontend/**`. Without that filter, a module leaves the sharded frontend job and joins the
backend job.

Four packages have this defect today: `@n8n/frontend-module-sdk`, `@n8n/frontend-constants`,
`@n8n/frontend-utils` and `@n8n/eslint-plugin-design-system`. Do not add a fifth.

**`passWithNoTests: true`.** Your module inherits this option from `@n8n/vitest-config/frontend`.
That is the config factory, and not the `setup/frontend` harness above. Do not override the option.

CI splits the frontend into two shards (`--shard=N/2`). vitest exits with an error when a shard
gets no test file. A module with few tests would then fail on shard 2 for no reason.

The two options are a compromise. `passWithNoTests` makes an empty module suite pass. So
`test:changed` and one real test are your true protection. The CLI writes an example test that
passes. Replace that test. Do not delete it.

## Publish the package

The repository publishes frontend module packages. Do not add `"private": true`. This decision
reverses the design proposal, on purpose (Alex, 2026-08-05).

`scripts/check-workspace-private-deps.mjs` fails `pnpm lint:ci` if a public package has a private
workspace **runtime** dependency. The repository publishes `n8n-editor-ui`, and that package
depends on every module at run time.

**Caution:** do not mark a module private. `npm install n8n` then fails, because the install graph
points at packages that nobody published.

Keep `"license": "LicenseRef-n8n-sustainable-use"`. Do not add `private`.

## Future work

1. **Five descriptor surfaces do not work yet.** `commands` goes into `commandRegistry`, but no
   command-bar host reads that registry. `locales`, `shortcuts`, `banners` and `setup` are types,
   and no file reads them (**CAT-3685**). Until that work lands, cross-feature code stays in the
   shell.
2. **No tool stops a deliberate cross-module import.** The ESLint `no-restricted-imports` rule is
   **CAT-3692**. The alias split stops an accident in a test run. The tsconfig base stops one at
   typecheck. `turbo boundaries` reports only an *undeclared* dependency. A declared dependency
   clears all three. This rule must land before the second extraction.
3. **Per-module i18n.** A module keeps its strings in the central `en.json` of `@n8n/i18n` today.
   The target is the `locales` descriptor field with per-module key types. The central `en.json` is
   the accepted alternative, but it must not become permanent.
4. **One build-time chunk for each module.** After the descriptors are import-light, the manifest
   can become a static map of dynamic imports. Vite then emits one chunk for each module. The
   decision point is the end of wave 2, with bundle data. The team decided against a module load
   at run time.
5. **CODEOWNERS is a manual step.** An addition to the CLI is a small and clear follow-up.
6. **`@n8n/module-cli` has no `lint` script.** Type-aware lint on a package with no types gives
   only `no-unsafe-*` noise. Ten other `@n8n/*` packages ship in the same way, and Biome still
   formats this one. Review this decision if the CLI grows past a few hundred lines.

## FAQs

- **Which module is a good example?** `packages/modules/instance-registry/frontend`. It is the
  first extraction, and it is small enough to read fully.
- **Why is there no `build` script?** There is nothing to build. The Vite context that loads a
  module reads it from source. That context is the dev server, the production build of the shell,
  or the vitest run of the module. See the introduction.
- **Does `pnpm dev` still hot-reload?** Yes, with no change. There is one Vite dev server. A change
  to a file in a module hot-reloads in the same way as a change to a file in
  `editor-ui/src/features/`.
- **My module needs a value from another module. What must I do?** Do not import that module. Move
  the shared value into an L2 package, such as `@n8n/stores` or `@n8n/composables`. If you cannot
  move it, the two features are one module. If you need a contribution point that does not exist,
  ask for it on the SDK. The registries are the supported method, and a direct import is not.
- **Do I need a backend module also?** Only if your feature needs a gate on the backend. If a
  backend twin exists, the two ids **must** be the same, because `isModuleActive` and
  `/rest/module-settings` use the same string. See
  `scripts/backend-module/backend-module-guide.md`.
- **Must every new feature be a module?** Yes, after the wave-1 pilots prove the pattern. Each new
  feature then starts as a package. The editor core — canvas, NDV and the node creator — stays in
  the shell for now. See the modularization roadmap on CAT-3680.
- **Does a module PR need a special PR-title scope?** No. A module PR keeps the `editor` scope.
- **How do I remove a module?** Do these five steps:
  1. Find the files that import the module.
  2. Reverse the four registrations.
  3. Delete the package.
  4. Run `pnpm install`.
  5. Run `editor-ui/vite/aliases.test.ts` again.
