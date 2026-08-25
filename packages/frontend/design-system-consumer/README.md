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
- `@n8n/design-system/plugin` — `N8nPlugin`, which registers the directives.
- `@n8n/design-system/icons/lucide` — `loadLucideIconBody` + `IconBodyLoaderKey`. The
  `anvil` icon is in the app on purpose: it is *not* in the bundled icon set, so it renders
  only when this entry works.
- `@n8n/design-system/style.css` and `/theme.css` — component CSS and the token/reset/font layer.
- `@n8n/design-system/css/mixins/breakpoints` — the shipped SCSS sources, `@use`d from `src/styles.scss`.

## Known defects in the package (as of 2.36.0)

These are the reasons `typecheck:libcheck` fails. None of them stop the app from building
or rendering.

1. **`app.use(N8nPlugin)` does not typecheck.** `N8nPlugin` is declared
   `Plugin<N8nPluginOptions>` in `src/plugin.ts`, and Vue reads that single object as a
   one-element tuple, so the options argument becomes required. Callers must write
   `app.use(N8nPlugin, {})`. See the comment in `src/main.ts`.
2. **`@vue/reactivity` is an undeclared dependency of the shipped types** (18 errors).
   11 emitted `.d.ts` files reference `import('@vue/reactivity').OnCleanup`, but
   `@vue/reactivity` is neither a `dependency` nor a `peerDependency`.
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
