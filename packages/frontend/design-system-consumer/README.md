# design-system-consumer

A minimal Vite + Vue app that consumes `@n8n/design-system` **the way a project outside
this monorepo would**: through the package `exports` map, with no source aliases, no
`unplugin-icons`, no `lucideIconsPlugin`, and no SCSS `additionalData` injection.

`editor-ui` cannot answer the consumption question, because its `vite.config.mts` aliases
every `@n8n/*` package to its `src/`. This app deliberately has none of that, so anything
it cannot resolve is a real gap in the package contract.

## Run it

```sh
pnpm --filter @n8n/design-system build   # the package ships a dist; it must exist first
pnpm --filter design-system-consumer build
pnpm --filter design-system-consumer dev
```

## Scripts

| Script                | What it proves                                                        |
| --------------------- | --------------------------------------------------------------------- |
| `build`               | Components, both CSS entries, the `./css/*` SCSS subpath, fonts, and the `./icons/lucide` entry all resolve and bundle. |
| `typecheck`           | Consumer code typechecks against the shipped `.d.ts` with `skipLibCheck: true` — the setting real apps use (it is `true` in Vue's own `create-vue` template). |
| `typecheck:libcheck`  | Diagnostic probe with `skipLibCheck: false`, which checks the shipped declarations *themselves*. **Currently fails**; see below. It is not a gate. |

## What the app exercises

- `@n8n/design-system` — 20 components and 3 exported types, from the barrel.
- `@n8n/design-system/plugin` — `N8nPlugin`, which registers the directives. It is not
  optional: 10 components render text through `v-n8n-html` and render an empty span
  without it.
- `@n8n/design-system/icons/lucide` — `loadLucideIconBody` + `IconBodyLoaderKey`. The
  `anvil` icon is in the app on purpose: it is *not* in the bundled icon set, so it renders
  only when this entry works.
- `@n8n/design-system/style.css` and `/theme.css` — component CSS and the token/reset/font layer.
- `@n8n/design-system/css/mixins/breakpoints` — the shipped SCSS sources, `@use`d from `src/styles.scss`.

## Out-of-repo verification (2026-08-25)

This app resolves `@n8n/design-system` through a workspace link. To close that gap, the
same app was rebuilt twice **outside the monorepo**, with `npm` and with `pnpm`, against
tarballs rather than the workspace:

| Install                                                | Result |
| ------------------------------------------------------ | ------ |
| `npm i @n8n/design-system@2.35.3` (the published `latest`) | Builds, typechecks, renders. |
| `npm i ./n8n-design-system-2.36.0.tgz` (`pnpm pack` of this branch) | Builds, typechecks, renders. |
| `pnpm i ./n8n-design-system-2.36.0.tgz`, `node-linker=isolated` | Builds, typechecks, renders. |

Findings that only an out-of-repo install can show:

1. **The directives are load-bearing, and they fail silently.** 10 components render text
   through `v-n8n-html` (`N8nNotice`, `N8nTooltip`, `N8nEmptyState`, `N8nInputLabel`,
   `N8nTabs`, `N8nSticky`, `N8nInfoAccordion`, `N8nCommandBar`, and 2 `AskAssistantChat`
   messages). Without the directive, Vue renders an **empty** span: no error, no console
   warning in a production build. A consumer sees blank notices and blank empty-state
   descriptions and has nothing to search for.
2. **`./plugin` — the only documented way to register them — is absent from the published
   version.** `2.35.3` exports `.`, `./icons/lucide`, `./style.css`, `./theme.css`,
   `./css/*` and `./package.json`; `import '@n8n/design-system/plugin'` fails with
   `ERR_PACKAGE_PATH_NOT_EXPORTED`. On `2.35.3` a consumer must register the directive by
   hand: `app.directive('n8nHtml', n8nHtml)`, with `n8nHtml` taken from the barrel. The
   `./plugin` subpath lands in `2.36.0`.
3. **`IconBodyLoaderKey` moved.** `2.35.3` exports it from the barrel only; `2.36.0` also
   re-exports it from `./icons/lucide`. Code written against `2.36.0` does not build on
   `2.35.3`.
4. **Every `exports` target is present in the tarball**, `pnpm pack` rewrites all
   `workspace:*` and `catalog:` specifiers to fixed versions, and the fonts resolve from
   `dist/assets`. `npm pack` must not be used to publish this package — it would ship
   `workspace:*` unresolved.
5. **An external install costs \~400 MB / \~236 packages**, and pulls
   `@n8n/composables` → `n8n-workflow` → `@n8n/expression-runtime` → `isolated-vm`, a
   native addon that needs a C++ toolchain. The browser bundle imports only
   `@n8n/composables/useDeviceSupport`, `@n8n/frontend-utils/htmlUtils`,
   `@n8n/utils/event-bus` and `@n8n/utils/string/truncate`.
6. **`skipLibCheck: false` reports 61 errors in 11 shipped `.d.ts` files** out of repo
   (48 TS2300, 9 TS2344, 4 TS7016) — the same defects listed below, minus the
   `@vue/reactivity` ones, which did not reproduce in either out-of-repo tree.

## Known defects in the package (as of 2.36.0)

These are the reasons `typecheck:libcheck` fails. None of them stop the app from building
or rendering.

1. **`app.use(N8nPlugin)` does not typecheck.** `N8nPlugin` is declared
   `Plugin<N8nPluginOptions>` in `src/plugin.ts`, and Vue reads that single object as a
   one-element tuple, so the options argument becomes required. Callers must write
   `app.use(N8nPlugin, {})`. See the comment in `src/main.ts`.
2. **`@vue/reactivity` is an undeclared dependency of the shipped types** (18 errors
   in this workspace; 0 in the two out-of-repo trees measured above). 11 emitted `.d.ts`
   files reference `import('@vue/reactivity').OnCleanup`, but `@vue/reactivity` is neither
   a `dependency` nor a `peerDependency`. Whether it fires depends on where the installer
   places `@vue/reactivity`.
3. **`event` as an emit tuple label breaks the emitted declarations** (48 errors, TS2300).
   `focus: [event: FocusEvent]` emits as `(event: "focus", event: FocusEvent) => void` —
   a duplicate identifier. Sources: `src/components/N8nInput/Input.types.ts`,
   `src/v2/components/InputNumber/InputNumber.types.ts`,
   `src/components/N8nMarkdownEditor/MarkdownEditor.types.ts`,
   `src/v2/components/Checkbox/Checkbox.types.ts`.
4. **The ambient shims are not shipped.** `src/shims-modules.d.ts` (declares
   `markdown-it-task-lists`) and `src/shims-vue.d.ts` (`$style` on
   `ComponentCustomProperties`) are absent from `dist` — `vite-plugin-dts` does not emit
   ambient-only files.
5. **`GlobalComponents` is passed where `Record<string, Component>` is required**
   (9 errors, TS2344) in the emitted declarations.
