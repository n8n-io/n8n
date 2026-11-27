# AGENTS.md

Rules for frontend work in `packages/frontend` and `packages/modules/*/frontend`.
Read the root `AGENTS.md` first. This file does not repeat its rules.

## Commands

- Run one test from the package folder: `pnpm test <file> --maxWorkers=1`.
- Start the editor with hot reload from the repository root: `pnpm dev:fe:editor`.
  "Local development" in the root `AGENTS.md` tells how to start the backend.
- Start Storybook: `pnpm dev` in `@n8n/design-system`.
- Do not run a full frontend typecheck. CI runs it.
- Format and lint the files that you changed. See [Checks](#checks).

## Skills and review rules

Skills are in `.agents/skills/<name>`. Load a skill when the task matches:

- `ui-review`: you build, change or style UI in `editor-ui`, `@n8n/design-system` or a module frontend.
- `content-design`: you write or change UI text.
- `experiments`: you add, change or remove an experiment or a PostHog feature flag in `editor-ui`.
- `agent-design-language`: you change the Agent Builder UI.
- `telemetry`: you add or change a telemetry event.

`.agents/review-rules/frontend/*.md` lists the problems that code review flags.
Read these files before you hand back the work.

## Where code goes

- `editor-ui/src/app` is the shell. It holds the router, the app-wide stores, components and composables.
- Existing features are in `editor-ui/src/features/<area>`. Code that more than one feature uses is in `editor-ui/src/features/shared`.
- Frontend feature modules are at `packages/modules/<name>/frontend`, and not in `editor-ui/src/features`.
  Scaffold one with `pnpm n8n-module-sdk create`. Then obey `packages/@n8n/module-cli/frontend-module-guide.md`.
  A module owns its tsconfig, its lint config and its vitest config.
  A module must never import `@/…` or another `@n8n/frontend-module-*`.
- Pure Vue components go in `@n8n/design-system`.
- Shared frontend packages are in `packages/frontend/@n8n`: `composables`, `stores`, `i18n`, `frontend-constants`, `frontend-utils` and `rest-api-client`.

## Imports

- In `editor-ui`, import a file from a different folder with the `@/` alias. `@/` is `editor-ui/src/`.
  Do not add `../` imports in new or changed code. Old code still has them. Do not copy them.
- A `./` import of a file in the same folder is correct.
- Import a different package by its package name, not by a relative path.
- `@n8n/composables`, `@n8n/frontend-constants`, `@n8n/frontend-utils` and `@n8n/utils` have no root entry.
  Import a subpath, for example `@n8n/composables/useToast`.
- The `@/` rule is not for `@n8n/design-system`, which uses relative imports, or for feature modules.

## Reuse before you build

Before you write a component or a composable, look for one that exists:

- `@n8n/design-system/src/components`, and its stories in Storybook (`pnpm dev` in `@n8n/design-system`)
- `editor-ui/src/app/components` and `editor-ui/src/app/composables`
- `editor-ui/src/features/shared`
- `@n8n/composables`

If an existing component is almost correct, extend it. Do not make a copy.
The lint rule `@n8n/design-system/no-direct-component-imports` stops most direct `element-plus` and `reka-ui` imports.
Its message names the design-system component to use, or tells you to add one to `@n8n/design-system`.

## Vue and Pinia

- Write components with `<script setup lang="ts">`.
- Write Pinia stores as setup stores: `defineStore(<id>, () => { ... })`.
- `.agents/review-rules/frontend/vue-correctness.md` lists the Vue errors that no check finds.

## Design system

- To select a CSS token, use the narrowest token layer that fits.
  `.agents/review-rules/frontend/design-system.md` lists the layers. `ui-review` tells how to find a token.
- Available icon names are in `packages/frontend/@n8n/design-system/src/components/N8nIcon/icons.ts`.
  Use keys from `updatedIconSet` only — `deprecatedIconSet` entries must not be used in new code.
- When rendering `el-plus` popovers/dropdowns/selects inside `N8nDialog`, prefer to keep them in the dialog stacking context with `:teleported="false"` unless they intentionally need to escape.

## UI text

- Get the translator with `useI18n()` from `@n8n/i18n`. Show a string with `i18n.baseText('<key>')`.
- Add `editor-ui` and module keys to `packages/frontend/@n8n/i18n/src/locales/en.json`.
- Add design-system keys to `packages/frontend/@n8n/design-system/src/locale/lang/en.ts`.

## Stores and timing

- When you change a Pinia store, check for unused computed properties.
- Use centralized debounce times from `@n8n/frontend-constants/durations` instead of hardcoding:

```typescript
import { DEBOUNCE_TIME } from '@n8n/frontend-constants/durations';
import { getDebounceTime } from '@n8n/composables/useDebounce';

useDebounceFn(() => { ... }, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));
```

Categories: `UI`, `INPUT`, `API`, `TELEMETRY`, `COLLABORATION`, `CONNECTION`.
Other `editor-ui` timing constants are in `@/app/constants/durations`.

## Node types and credential types

Startup does not wait for the node types or the credential types, so their stores can be empty on the first render.
A component that reads them must wait with the composable for the types that the getter reads:

- Node types: `useNodeTypesLoad()` from `@/app/composables/useNodeTypesLoad`.
- Credential types: `useCredentialTypesLoad()` from `@/features/credentials/composables/useCredentialTypesLoad`.
- Some getters read both, for example `isCredentialTypeTestable` and `getNodeType()` for a credential-only node. Use both composables.

Both return `isLoading`, `isLoaded`, `error`, `whenLoaded()` and `whenSettled()`, and share one request between callers.
Do not wait with `getNodeTypes()` or `fetchCredentialTypes(true)`. They load the types again on each call.

## Tests and analytics attributes

- Set `data-test-id` for tests. Vitest and Playwright `getByTestId` find elements by `data-test-id`.
  Some tests, most of them in `features/agents`, change `testIdAttribute` with `configure()`.
  For a component that these tests cover, use the attribute that its tests use.
- Set `data-attr` for analytics. `data-test-id` and `data-attr` can hold the same value.
  PostHog autocapture masks the text of the clicked element, so it identifies an element by its `data-attr`.
  When an element has no `data-attr`, analytics may use its test id, but this is brittle. A test change can rename it.
  Add a `data-attr` to each element that analytics needs to identify.
- Render a component in a test with `createComponentRenderer`:
  from `@/__tests__/render` in `editor-ui`, from `@n8n/frontend-test-utils` in a feature module,
  and from `src/__tests__/render.ts` in `@n8n/design-system`.

## Checks

Run each check from the package folder, on the files that you changed:

| Files | Format | Lint |
| --- | --- | --- |
| `.ts` | `pnpm exec biome check --write <files>` | `pnpm exec oxlint --quiet <files>` |
| `.vue` | `pnpm exec prettier --write <files>` | `pnpm exec oxlint --quiet <files>`, then `pnpm exec vize lint -c vize-lint.config.mjs <files>` |
| `.scss`, `.vue` styles | `pnpm exec prettier --write <files>` | `pnpm exec stylelint <files>` |

The lint configs load from `dist`. In a new checkout, build them first, from the repository root:
`pnpm turbo run build --filter='@n8n/oxlint-config...' --filter='@n8n/stylelint-config...'`.

## Local agent files

Some folders have their own `AGENTS.md`. Read it before you change a file in that folder:

- `packages/frontend/@n8n/design-system/AGENTS.md`
- `packages/modules/AGENTS.md`
- `packages/frontend/editor-ui/src/features/agents/AGENTS.md`
- `packages/frontend/editor-ui/src/app/stores/workflowDocument/AGENTS.md`
