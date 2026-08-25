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
| `typecheck`           | Consumer code typechecks against the shipped `.d.ts` with `skipLibCheck: true` — the setting real apps use (it is `true` in Vue's own `create-vue` template). Then runs `typecheck:libcheck`, so CI gates both. |
| `typecheck:libcheck`  | Checks the shipped declarations *themselves*, with `skipLibCheck: false`. This is a gate, not a diagnostic. |

### Why `typecheck:libcheck` is scoped

`skipLibCheck: false` checks every `.d.ts` in the program, so it also reports
declarations this repo does not write: element-plus 2.4.3 against a newer vue and
csstype, `@vueuse/core` wanting `@types/web-bluetooth`, and a stale
`@types/markdown-it-link-attributes`. Those are dependency-upgrade work, not a
broken package contract, and gating on them would leave the probe permanently red
— which is how a probe stops being read.

`scripts/check-shipped-types.mjs` therefore fails only on errors inside
`@n8n/design-system` or inside this app's own sources, and reports the rest as a
count (`--verbose` lists them). Third-party noise moving never changes the
verdict.

## What the app exercises

- `@n8n/design-system` — 20 components and 3 exported types, from the barrel.
- `@n8n/design-system/plugin` — `N8nPlugin`, which registers the directives.
- `@n8n/design-system/icons/lucide` — `loadLucideIconBody` + `IconBodyLoaderKey`. The
  `anvil` icon is in the app on purpose: it is *not* in the bundled icon set, so it renders
  only when this entry works.
- `@n8n/design-system/style.css` and `/theme.css` — component CSS and the token/reset/font layer.
- `@n8n/design-system/css/mixins/breakpoints` — the shipped SCSS sources, `@use`d from `src/styles.scss`.

## Defects this harness found (all fixed)

Measured against 2.36.0, all five now fixed — the probe is green and gates CI.

1. **`app.use(N8nPlugin)` did not typecheck.** `N8nPlugin` was declared
   `Plugin<N8nPluginOptions>`, and `Plugin<Options>` only reads `Options` as a
   rest-parameter tuple when it is an array type — so the options argument was
   required. Now `Plugin<[options?: N8nPluginOptions]>`, and `src/main.ts` makes
   the bare call.
2. **`@vue/reactivity` was named by the shipped types** (18 × TS2307). `OnCleanup`
   is declared there and only re-exported through `@vue/runtime-core`, so
   TypeScript printed the declaring package into 11 emitted files.
3. **`event` as an emit tuple label broke the emitted declarations** (48 ×
   TS2300). `focus: [event: FocusEvent]` emits
   `(event: "focus", event: FocusEvent) => void`. All 24 labels in the package are
   now `payload` — using `event` there is a defect by construction.
4. **The `markdown-it-task-lists` option type was unreachable** (TS7016).
   `MarkdownProps.options` named the `Config` from `src/shims-modules.d.ts`, and
   `vite-plugin-dts` emits no ambient-only files. The shape now lives in
   `src/components/N8nMarkdown/taskLists.ts`, which the build does emit; the shim
   imports it.
5. **`GlobalComponents` and `GlobalDirectives` failed their own constraints**
   (9 + 9 × TS2344). Both are augmentable interfaces, so neither has the index
   signature that `Record<string, Component>` / `Record<string, Directive>`
   requires.

Defects 2 and 5 are unsoundness in what vue-tsc prints, not in the source, so
they are corrected after the emit — see the `REWRITES` block in
`@n8n/design-system/vite.config.mts`, which also fails the build if a new
undeclared package shows up in the output. Narrowing the `defineExpose` calls
that leak whole component instance types would remove the expansions at the
source; that is the better end state and a much larger change.

## Known gaps this harness cannot see

`MarkdownProps.options` also names `Options` from `@types/markdown-it` and
`Config` from `@types/markdown-it-link-attributes`. Both are `devDependencies` of
`@n8n/design-system`, so an out-of-repo consumer cannot resolve either — but
inside this monorepo they resolve, so the probe stays green. Promoting them to
`dependencies` is not enough on its own: `@types/markdown-it-link-attributes@3.0.5`
imports `Renderer` from a `@types/markdown-it` that no longer exports it, which is
one of the third-party errors listed above.
