# Frontend module

A frontend module is a self-contained unit of editor-ui functionality, shipped as its own
workspace package at `packages/modules/<name>/frontend`, and registered with the editor-ui shell
through a descriptor.

Benefits of modularity:

- **Organization:** Feature code has one home, and a public entry that says what the rest of the
  app may use
- **Independence:** Typecheck, lint and test one feature in seconds instead of running all of
  editor-ui (~770K lines of `.ts` and `.vue`, of which `src/features/` is ~600K)
- **Decoupling:** A module cannot reach into the shell or into another module, so features stop
  entangling
- **Ownership:** One package, one CODEOWNERS line
- **Parity:** The frontend module id matches its backend twin, and both gate off
  `/rest/module-settings`

Frontend modules are **source-only**: `"main": "src/index.ts"`, no `build` script, no `dist`.
Two reasons. `tsdown` — what `@n8n/stores` and friends build with — cannot compile `.vue` SFCs.
And a `dist` would have no consumer: every frontend package is already aliased to its `src`, so
the shell's Vite graph compiles module sources directly. "Built separately" here means
**typechecked, linted and tested separately**, which is where the CI win actually comes from.

This guide is written against the shipped CLI. Where it disagrees with the original
modularization design proposal (CAT-3680), the code wins; those disagreements are called out
inline.

## Quickstart

From the monorepo root:

```sh
pnpm n8n-module-sdk create                      # prompts for name and stack
pnpm n8n-module-sdk create my-feature --stack=frontend
```

`create` prompts for two things: the module name, and whether you want the frontend half, the
backend half, or both. The name is the canonical spelling of your module — it becomes the package
suffix, the directory name, the file infix, the descriptor `id`, and the backend module id it must
match. It must be kebab-case, and every word must start with a letter; the CLI rejects anything
else.

Real output:

```
Formatted 12 files in 5ms. No fixes applied.
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

The first line is Biome. The CLI formats the new package and every file it edited, because a
registration line can be longer than the 100-column limit; without that step the next
`format:check` in CI fails on a module nobody touched by hand.

⚠️ **Those next-steps go through turbo on purpose — don't "simplify" them to
`pnpm --filter … typecheck`.** `n8n-workflow` and `@n8n/permissions` are consumed from their built
`dist` (they are not in the module tsconfig base's `paths`), so a direct `--filter` run on a cold
tree fails with a wall of

```
../../../@n8n/api-types/src/agent-builder-tool-node-types.ts(5,8): error TS2307: Cannot find module 'n8n-workflow' or its corresponding type declarations.
../../../@n8n/api-types/src/api-keys.ts(1,34): error TS2307: Cannot find module '@n8n/permissions' or its corresponding type declarations.
```

Nothing is wrong with your module. `turbo typecheck` declares `dependsOn: ["^build"]`, builds the
dependencies first, and passes. `lint` and `test` are green either way.

Every edit the CLI makes outside the new package is idempotent, so re-running after a partial
failure is safe.

### `--stack=backend` is a placeholder

The backend half is a reserved path and a README, and **nothing loads it**. The backend runtime
discovers modules under `packages/cli/src/modules/<name>`, which is where all 37 real backend
modules live, so `packages/modules/<name>/backend` is deliberately not a workspace package. To
create a backend module that actually runs, use `pnpm setup-backend-module` and follow
`scripts/backend-module/backend-module-guide.md`. The CLI says all of this on stdout when you ask
for the backend half; it is repeated here because it is the one thing about `create` that could
mislead you.

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

Add what you need — `views/`, `components/`, `composables/`, `my-feature.api.ts`,
`my-feature.constants.ts`. As on the backend, infixes are not enforced (except on `.module.ts`)
but are strongly recommended: they make files searchable once a module has several dozen.

The worked example in-repo is **`packages/modules/instance-registry/frontend`** — the first real
extraction, and still the only one, small enough to read in one sitting.

## Entrypoint

Two files make up the entrypoint: `src/index.ts` (what the shell may import) and
`src/<name>.module.ts` (the descriptor).

```ts
// src/index.ts — the module's only public entry.
export { MyFeatureModule } from './my-feature.module';
export { useMyFeatureStore } from './my-feature.store';
```

Deep paths into `src/` are not part of the contract. If the shell or another package needs
something, export it here.

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

`id` is load-bearing. `settingsStore.isModuleActive(id)` reads the backend's `activeModules`
list, so an id with no backend twin is never active — and any route that opts into the module
availability guard (below) will refuse to resolve.

A descriptor with no surfaces at all is legitimate. `instance-registry` is exactly that: the
store is the whole module, and the descriptor is what makes it a module the shell knows about
rather than a library it happens to import.

## The descriptor contract

`FrontendModuleDescription` (`@n8n/frontend-module-sdk/src/types/descriptor.ts`) types twelve
extension surfaces. They sit at three different levels of wiring, and the difference matters.

### Live — the shell reads these and something renders them

| Field                   | Registered by                  | Consumed by                              |
| ----------------------- | ------------------------------ | ---------------------------------------- |
| `routes`                | `registerModuleRoutes`         | vue-router                               |
| `projectTabs`           | `registerModuleProjectTabs`    | `ProjectHeader`                          |
| `resources`             | `registerModuleResources`      | `ResourcesListLayout`                    |
| `modals`                | `registerModuleModals`         | `DynamicModalLoader`                     |
| `adHocModalKeyPrefixes` | `registerModuleModals`         | `modalRegistry` (keys minted at runtime) |
| `settingsPages`         | `registerModuleSettingsPages`  | `SettingsSidebar`                        |
| `pushHandlers`          | `registerModulePushHandlers`   | `useModulePushDispatcher`, in `App.vue`  |

All of them live in `editor-ui/src/app/moduleInitializer/moduleInitializer.ts`. `routes` register
pre-mount from `main.ts`; the rest register post-login from `app/init/index.ts`.

`pushHandlers` has one extra rule: only an **active** module registers. A claimed push type also
suppresses the shell's own handler for it, so registering from an inactive module would silently
kill the built-in.

### Registered, but nothing renders it yet

`commands` is registered into `commandRegistry` by `registerModuleCommands`. No command-bar host
subscribes to that registry — `features/shared/commandBar` still builds its list from its own
`use*Commands` composables. So a `commands` array is stored and never shown.

### Types-only — setting these does nothing at all

`locales` · `shortcuts` · `banners` · `setup`

The SDK exports the types. Nothing in the shell reads them. A value you set is silently ignored:
no error, no warning, no behaviour.

Do not use `commands` or the four types-only fields yet. The remaining wiring is tracked in
**CAT-3685**. The scaffolded descriptor carries the same split as a comment so it is in front of
you while you write.

This is the one place a module author is most likely to lose an afternoon — the type accepts your
`commands` array happily, and nothing ever draws it.

### Route names are yours, and they are checked

Route names are global to the router, and `router.addRoute` replaces a duplicate without warning:
the losing route just stops resolving. The shell's central `VIEWS` enum used to keep every name
unique by construction. A module cannot import `VIEWS` — that is `@/app/constants`, the shell — so
declare your own constant and export it from your `constants.ts`:

```ts
// src/my-feature.constants.ts
export const MY_FEATURE_VIEW = 'my-feature';
```

`assertUniqueRouteNames` (`@n8n/frontend-module-sdk`) restores the lost check. It runs inside
`registerModuleRoutes`, before any module route is added, and throws on a collision with the shell
or with another module:

```
Duplicate route name "my-feature" declared by module "my-feature" — already taken by the app shell.
```

`features/workflow-reviews/module.descriptor.ts` is the in-shell precedent for module-owned name
constants.

### Route gating

`registerModuleRoutes` stamps `meta.moduleName = <module id>` onto every route a module
contributes, but the availability check is **opt-in per route**. It only runs if the route asks
for it:

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

Without `'custom'` in `meta.middleware`, the route resolves whether or not the module is active.

## Import-light descriptors

The descriptor file may import **types and the SDK only**. Views load lazily; stores are
referenced inside guards, handlers or `setup`, never at module scope.

```ts
const MyFeatureView = async () => await import('./views/MyFeatureView.vue');
```

Two reasons, one of them load-bearing today:

1. **Boot order.** `modules.manifest.ts` is reached through `main.ts`'s own imports, so every
   descriptor body is evaluated *before* `app.use(pinia)` runs. A top-level `useXStore()` call
   therefore executes with no active Pinia.
2. **Future chunking.** Import-light descriptors are the precondition for per-module `import()`
   chunks. A descriptor that eagerly pulls its own views drags the whole module into
   the entry bundle even when the module is disabled.

**This is a burn-down, not a clean slate.** All eight in-shell descriptors already lazy-load their
view components — that part is settled convention, codified here. But six of the eight still reach
past types and the SDK at module scope: `settings/otel` imports `useRBACStore`, and
`core/dataTable` calls `useI18n()` at module scope. Fix the descriptor you are extracting; don't
take the existing ones as the pattern.

## Imports and boundaries

A module may depend on **L0–L2 packages only**. The full set the shared tsconfig base resolves
from source:

`@n8n/api-types` · `@n8n/chat` · `@n8n/chat-hub` · `@n8n/composables` · `@n8n/constants` ·
`@n8n/design-system` · `@n8n/frontend-constants` · `@n8n/frontend-module-sdk` ·
`@n8n/frontend-utils` · `@n8n/i18n` · `@n8n/rest-api-client` · `@n8n/stores` · `@n8n/telemetry` ·
`@n8n/utils`

plus `@n8n/permissions`, `n8n-workflow`, `vue`, `vue-router` and `pinia`, which resolve from their
built `dist` — the reason the next-steps commands go through turbo.

Never import another `@n8n/frontend-module-*`. Never import `@/…` — that is the shell.

### ⚠️ Several platform packages are subpath-only

This one bites everybody, and it fails in two different ways:

```ts
import { useSettingsStore } from '@n8n/stores';       // ❌ TS2305: no exported member
import { useToast } from '@n8n/composables';          // ❌ TS2307: cannot find module

import { useSettingsStore } from '@n8n/stores/settings.store';   // ✅
import { useToast } from '@n8n/composables/useToast';            // ✅
```

`@n8n/stores/src/index.ts` is a single line — `export * from './constants'` — so a root import
resolves but exposes nothing you want. `@n8n/composables` has no `src/index.ts` at all and
declares only `"./*"` in its `exports`, so a root import does not resolve. The same is true of
`@n8n/frontend-constants`, `@n8n/frontend-utils` and `@n8n/utils`: the alias table marks them
`entry: false`, and a package with no root entry deliberately gets no bare-specifier alias
(`@n8n/frontend-vite-config/index.ts`).

Always import the subpath. The design proposal's dependency list implies root imports; it is
wrong.

### The no-cross-module rule: what is enforced, and what is not

Be precise about this one, because three different things get called "the boundary".

**Accidental cross-module imports are blocked, in two places.** A module's `vite.config.ts`
spreads `frontendAliases` — the platform table plus the `@n8n/tournament` rewrite. Sibling modules
live in a second array, `modulePackages`, which only the shell expands through
`frontendModuleAliases`. So a stray import of a sibling fails to resolve at test time:

```
Error: Failed to resolve import "@n8n/frontend-module-instance-registry" from "src/cross.test.ts". Does the file exist?
  Plugin: vite:import-analysis
```

And it fails at typecheck too, because the shared tsconfig base omits module `paths`.

**A deliberate cross-module import is still not blocked by either.** Add the sibling to your
`dependencies`, and pnpm symlinks it; because modules are source-only (`"main": "src/index.ts"`),
node resolution finds it with no alias involved. The tsconfig base says so itself:

> `paths` lists the L0-L2 packages a module consumes from source. Module packages are absent
> from it on purpose, which stops an *accidental* cross-module import — but it is not a
> boundary: `paths` is additive, so once a module declares another module as a dependency,
> pnpm symlinks it and the import typechecks clean. Boundary enforcement is the ESLint rule.
>
> — `packages/@n8n/typescript-config/tsconfig.frontend-module.json`

**`pnpm boundaries:check` does not close the gap either.** It ratchets `turbo boundaries`, which
finds *undeclared* dependencies and reach-in imports against a committed baseline
(`.boundaries-baseline.json`). A declared dependency is exactly what it is designed to accept.

So: the alias split raises the cost of an accident from "silently works" to "fails in two
places". It does not stop anyone who means it. The enforcement that would is an ESLint
`no-restricted-imports` rule, and **it does not exist in the repo yet** — tracked as
**CAT-3692**. Until it lands, treat the boundary as a review responsibility. Reviewers: a new
`@n8n/frontend-module-*` entry in a module's `dependencies` is the tell, and it is the *only*
tell — once it is there, every check goes green.

## Stores

Pinia stores self-register on the first `use…Store()` call, so there is nothing to declare in
the descriptor and no lifecycle to wire.

```ts
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useMyFeatureStore = defineStore('myFeature', () => {
	const isReady = ref(false);
	const markReady = () => { isReady.value = true; };
	return { isReady, markReady };
});
```

Export the store from `src/index.ts` if anything outside the module reads it —
`instance-registry` does exactly this, because the About modal and the debug-info report consume
its cluster-info store.

## Module settings and the timing trap

There are two levels of gating, and they come from **different endpoints at different times**:

```ts
// Level 1 — is the module enabled on this instance at all?
settingsStore.isModuleActive('my-feature')          // from `settings.activeModules`

// Level 2 — module-specific configuration
settingsStore.moduleSettings['my-feature']?.enabled // from `/rest/module-settings`
```

⚠️ **`moduleSettings` is `{}` until after login.** `getModuleSettings()` runs exactly once,
inside the login hook in `editor-ui/src/app/init/index.ts`. During bootstrap and route
registration the bag is empty, so an eager read returns `undefined` and silently behaves like
"disabled".

Never read it at module scope, in a store's setup body, or anywhere on the pre-login path. Read
it inside a route guard, a computed, or an event handler. The two-level pattern in full:

```ts
const isEnabled = computed(
	() => settingsStore.isModuleActive('my-feature') &&
	      settingsStore.moduleSettings['my-feature']?.enabled === true,
);
```

`isModuleActive` alone is safe earlier — it reads the main settings payload, not
`/rest/module-settings` — but it is still not populated before `getSettings()`.

## Registering with the shell

A module is inert until the shell can see it. That takes **four file edits plus a CODEOWNERS
line** — the CLI makes the four edits for you, and this section exists for when you are
hand-registering or debugging a red CI.

| # | Where                                          | What                                      | Scaffolded? |
| - | ---------------------------------------------- | ----------------------------------------- | ----------- |
| 1 | `@n8n/frontend-vite-config/index.ts`           | an entry in the `modulePackages` array     | ✅          |
| 2 | `editor-ui/package.json`                       | `"@n8n/frontend-module-x": "workspace:*"`  | ✅          |
| 3 | `editor-ui/tsconfig.json`                      | two `paths` entries (bare + `/*`)          | ✅          |
| 4 | `editor-ui/src/app/modules.manifest.ts`        | import + array entry                       | ✅          |
| 5 | `.github/CODEOWNERS`                           | one line for the new package               | ❌ do this  |

The frontend has no CODEOWNERS entries at all today, so #5 is a new habit rather than a line to
copy. Add yours at creation time — a package with no owner is how half-migrations rot.

**#1, #2 and #3 must land in the same PR.** They are not alternatives, and each covers a
different resolver:

- **#1** is the Vite alias — what makes the dev server and the production bundle load your module
  from `src`. The mapping is **hand-maintained**; it does not appear on its own.
- **#2** is what makes a bare import resolve outside Vite at all — vue-tsc, node.
- **#3** is what makes vue-tsc resolve the same `src` Vite does.

⚠️ **The list used to be derived from the filesystem. It is not any more** — `fae4c98` reversed
that deliberately, in favour of a table you read and edit. If you are working from an older
description of this system, that is the part that changed.

### The table is guarded by name

Miss #1 and you do not get a silent bundle/typecheck split — you get a named test failure.
Dropping a module from the table and running `editor-ui/vite/aliases.test.ts`:

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

It names the package you forgot. That test is the enforcement for registration — a real gate,
not a convention — and it exists because the failure it catches is not hypothetical: four
packages spent months typechecked from `src` while the bundle was built from their `dist`.

Note what it does and does not cover. It guards that the alias table, editor-ui's `paths` and the
shared module base all agree. It says nothing about whether one module imports another — that is
the separate, still-unenforced boundary above.

The old `pnpm check:frontend-aliases` script is gone; `aliases.test.ts` replaced it, so the guard
now runs in the normal frontend test job rather than in `lint:ci`.

If you add or rename a **platform** package, add it to the `sourcePackages` array in the same
file, and update `editor-ui/tsconfig.json` and `tsconfig.frontend-module.json` to match. The same
test tells you if you missed one.

`packages/@n8n/typescript-config/tsconfig.frontend-module.json` is **hand-maintained** and has to
agree with both the alias table and editor-ui's `paths`. `aliases.test.ts` fails when they
diverge.

## Typecheck

Each module runs its own `vue-tsc --noEmit` against
`@n8n/typescript-config/tsconfig.frontend-module.json`. Three things about that base are worth
knowing before they surprise you.

### `paths` is inherited; `rootDirs`, `types` and `include` are not

Relative entries in `rootDirs`, `types` and `include` resolve against the **consuming** config,
so a copy of them in the base would point at the base's own directory. `paths` is the exception —
it anchors to the file that *declares* it, which is what lets one shared base serve modules at
any depth. That asymmetry is why the module tsconfig template looks lopsided.

### Ambient `.d.ts` shims live per-module, for the same reason

```jsonc
"types": [
	"vite/client",
	"vitest/globals",
	"unplugin-icons/types/vue",
	"../../../frontend/@n8n/design-system/src/shims-modules.d.ts",  // ~icons/*, markdown-it-task-lists
	"../../../frontend/@n8n/stores/src/shims.d.ts"                  // window.BASE_PATH
]
```

These are ambient declarations your module never imports — nothing pulls them into the program on
its own. They are here because you consume `@n8n/design-system` and `@n8n/stores` **from source**:
a built `dist` would have carried its own declarations, and consuming source makes them the
consumer's problem. They cannot be hoisted into the shared base, by the resolution rule above.

Keep them. If a module drops the `@n8n/design-system` dependency, drop the matching shim with it.

### `useUnknownInCatchVariables: false`

Every module inherits it from the base. A `catch` variable types as **`any`, not `unknown`** — so
this compiles clean inside a module, and would not elsewhere:

```ts
try { … } catch (error) {
	error.anything;  // no TS18046. `error` is `any`.
}
```

This is not a style choice and not a licence to be sloppy. It is the price of consuming
`@n8n/rest-api-client` from source: that package sets the flag in its own tsconfig and its
`catch` blocks rely on it, so the flag has to hold in every consumer. editor-ui carries the same
line. It goes away when that package's source stops needing it. Narrow your errors by hand.

## Lint

```sh
pnpm turbo lint --filter=@n8n/frontend-module-my-feature      # eslint src --quiet
pnpm --filter @n8n/frontend-module-my-feature lint:fix        # no build needed to autofix
```

⚠️ **Extracted code hits stricter lint than it did in the shell.** `editor-ui/eslint.config.mjs`
sets `'import-x/order': 'off'`; the shared frontend config leaves it on. So code that was green
inside editor-ui goes red the moment it moves into a module:

```
  2:1  error  `@n8n/stores/settings.store` import should occur before import of `vue`  import-x/order

✖ 1 problem (1 error, 0 warnings)
  1 error and 0 warnings potentially fixable with the `--fix` option.
```

Autofixable — `pnpm lint:fix` clears it. Expect a non-behavioural import-order churn in every
extraction PR, keep it in its own commit so reviewers can skip it, and say so in the PR body. A
first-time module author who reads that red as their own mistake will go looking for a bug that
isn't there.

## Tests

```sh
pnpm turbo test --filter=@n8n/frontend-module-my-feature   # vitest run
pnpm --filter @n8n/frontend-module-my-feature test:dev     # watch
```

Colocate tests next to the code (`my-feature.store.test.ts`), the same convention editor-ui uses.
`vite.config.ts` already wires `@vitejs/plugin-vue` and the shared source aliases, so `.vue` files
compile in tests with no extra setup. `src/__tests__/setup.ts` imports the shared jsdom harness
(`@n8n/vitest-config/setup/frontend` — observers, matchMedia, canvas, timers, teardown guards) and
boots Pinia per test. Framework boot stays per-package on purpose: `@n8n/i18n` devDepends on
`@n8n/vitest-config`, so booting i18n inside the shared harness would close a turbo cycle. Add
`useI18n` boot to your own setup file if you need it.

### Two entries in `package.json` are mandatory, not optional

**`"test:changed": "janitor test-scoped"`.** PR CI runs `pnpm test:ci:frontend:changed`, which is
`turbo run test:changed --continue --filter='./packages/frontend/**' --filter='./packages/modules/**'`.
Turbo **silently no-ops a package that does not define the script** — no error, no skip notice.
Your suite simply never runs in PR CI, and the job is green.

(That second filter is why modules are in the frontend test job at all: `packages/modules/**` is
not under `packages/frontend/**`, so without it a module would drop out of the sharded frontend
job and reappear in the backend one.)

This is not hypothetical: `@n8n/frontend-module-sdk`, `@n8n/frontend-constants`,
`@n8n/frontend-utils` and `@n8n/eslint-plugin-design-system` are in exactly that hole today. Do
not add a fifth.

**`passWithNoTests: true`.** Inherited from `@n8n/vitest-config/frontend` (the config factory, not
the `setup/frontend` harness above), so you get it for free — but do not override it. CI shards
the frontend two ways (`--shard=N/2`), and vitest exits non-zero when a shard is handed no test
files. A sparse module would fail on shard 2 for no reason.

The pair is a trade: `passWithNoTests` means an empty module suite is green rather than red. So
`test:changed` and a real test are what actually protect you. The CLI emits a passing example
test — replace it, don't delete it.

## Publishing

Frontend modules are **published packages** — no `"private": true`. This reverses the design
proposal deliberately (Alex, 2026-08-05).

`scripts/check-workspace-private-deps.mjs` fails `pnpm lint:ci` when a non-private package has a
private workspace **runtime** dependency. `n8n-editor-ui` is published and depends on every
module at runtime, so marking a module private breaks `npm install n8n` — the install graph would
point at packages that were never published. Keep `"license": "LicenseRef-n8n-sustainable-use"`
and leave `private` off.

## Future work

1. **Five descriptor surfaces are not usable yet** — `commands` registers into `commandRegistry`
   but no command-bar host subscribes to it, and `locales`, `shortcuts`, `banners` and `setup` are
   types with no read site at all (**CAT-3685**). Until then, cross-feature glue still goes
   through the shell.
2. **The cross-module boundary has no enforcement against a deliberate import** — the ESLint
   `no-restricted-imports` rule is **CAT-3692**. The alias split blocks accidents at test time,
   the tsconfig base blocks them at typecheck, and `turbo boundaries` only looks for *undeclared*
   dependencies — declaring the dependency clears all three. It should land before the second
   extraction, not after.
3. **Per-module i18n.** Modules currently keep their strings in the central `@n8n/i18n` `en.json`.
   The `locales` descriptor field plus per-module key types is the target; central `en.json` is
   the accepted fallback and must not become permanent.
4. **Per-module build-time chunks.** Once descriptors are genuinely import-light, the manifest can
   become a static map of dynamic imports and Vite emits one chunk per module. Decision point is
   wave-2 exit, with bundle data. Runtime dynamic loading is ruled out.
5. **CODEOWNERS is manual.** Adding it to the CLI is a small, obvious follow-up.
6. **`@n8n/module-cli` has no `lint` script.** Type-aware lint on a package with no types produces
   only `no-unsafe-*` noise; ten other `@n8n/*` packages ship the same way and Biome still formats
   it. Revisit if the CLI grows past a few hundred lines.

## FAQs

- **What is a good example of a frontend module?** `packages/modules/instance-registry/frontend` —
  the first extraction, small enough to read end to end.
- **Why is there no `build` script?** There is nothing to build. Modules are consumed from source
  by whatever Vite context loads them — the dev server, the shell's production build, or the
  module's own vitest. See the intro.
- **Does `pnpm dev` still hot-reload?** Yes, unchanged. One Vite dev server; editing a file inside
  a module HMRs exactly as it did under `editor-ui/src/features/`.
- **My module needs something from another module. What do I do?** Don't import it. Either the
  shared piece belongs in an L2 package (`@n8n/stores`, `@n8n/composables`), or the two features
  are one module. If you genuinely need a contribution point that doesn't exist, raise it against
  the SDK — the registries are the supported inversion, not a direct import.
- **Do I need a backend module too?** Only if your feature needs backend gating. But if a backend
  twin exists, the ids **must** match — `isModuleActive` and `/rest/module-settings` key off the
  same string. See `scripts/backend-module/backend-module-guide.md`.
- **Should every new feature be a module?** New features should be born as packages once the
  pattern is proven on the Wave-1 pilots. The editor core — canvas, NDV, node creator — stays in
  the shell for now; see the modularization roadmap on CAT-3680.
- **Does a module PR use a special PR-title scope?** No. Module PRs keep the `editor` scope.
- **How do I remove a module?** Reverse the four registration points, delete the package, run
  `pnpm install`, and re-run `editor-ui/vite/aliases.test.ts`. Check inbound imports first.
