# @n8n/design-system ships as a compiled package

Date: 2026-07-28 · Status: accepted
Implemented by: [#35108](https://github.com/n8n-io/n8n/pull/35108) (open at filing)
Supersedes: — · Superseded by: —

## Context

`@n8n/design-system` was already being published to npm on every release
(`release-publish.yml` publishes all non-private packages recursively). What
shipped was not consumable. Unpacking `2.31.0` from the registry showed three
artifacts disagreeing about what the package even was:

- `package.json` declared `main`/`import` → `src/index.ts`, raw TypeScript
  source, with no `exports`, `types`, `module` or `files`. Top-level `import` is
  not a valid manifest field.
- `.npmignore` stripped `/src/**/*.{ts,vue,scss,snap}` and re-included `dist`,
  written by someone who intended `dist` consumption.
- `.github/scripts/trim-fe-packageJson.js` deleted **all** `dependencies` from
  the manifest at publish time.

Net result in the published tarball: the declared entry point did not exist, no
type declarations, zero declared dependencies (33 were removed), and a `dist/`
that nothing referenced — plus `.turbo/` cache and lint configs shipped as
junk. A plain `import '@n8n/design-system'` could not resolve, so no working
external consumer existed. Every packaging decision was therefore still a
two-way door: there was nobody to break.

`dist/` also had zero consumers inside the monorepo — editor-ui, chat,
frontend-module-sdk, mcp-apps and storybook all alias
`@n8n/design-system(.*) → src$1`. Unexercised output rots silently, and did.

Three targets were live, and they plan differently:

- **(A) A compiled npm package** other n8n repos install.
- **(B) A source package** that pushes our vite/sass/icon toolchain onto every
  consumer.
- **(C) Monorepo-internal consumption only**, done properly.

## Decision

We ship `@n8n/design-system` as a **compiled, self-describing npm package**
(option A): ESM-only `dist` output with `preserveModules`, runtime dependencies
externalized, tokens and fonts shipped as CSS, lucide icon buckets pre-built as
lazy chunks, an `exports` allowlist, and `files` in place of `.npmignore`.
`@n8n/design-system` is removed from the publish-time dependency trim script.

The supported type-resolution target is `bundler`. `node16` is a documented
limitation, not a failure — see [ADR-0002](0002-per-file-declarations-for-design-system.md).

### Why not B or C

- **(B) Source package — the strongest case against us:** it is the honest
  description of how the monorepo already consumes this package (everyone
  aliases to `src`), it needs no build step, and it never desynchronises source
  from artifact — the exact failure mode that produced the husk. It was rejected
  because it exports our whole build stack as public API: every consumer would
  need our vite plugins, sass setup, `@iconify/json` and icon codegen wired
  identically. That is a far larger and more permanent coupling than a build
  step, and it makes any toolchain change a breaking change for consumers.
- **(C) Internal-only:** cheapest, and defensible if nobody outside the
  monorepo ever consumes it. Rejected because the package is *already* published
  publicly on every release; choosing C means either un-publishing (a visible
  break) or knowingly continuing to ship a broken artifact.

## Consequences

**Good**

- `npm i @n8n/design-system` resolves: 341 packages install where the trim
  script previously removed all 33 dependencies.
- Verified from a packed tarball in a Vite app outside the monorepo, with no
  aliases, no sass config and no icon plugins: build clean, 736 custom
  properties on `:root`, brand orange as the button's computed background,
  `InterVariable` loaded, N8nSelect interactive, and lucide icons rendering from
  pre-built chunks.
- `publint` clean; `arethetypeswrong` 🟢 on `bundler` and `node10`.
- `preserveModules` output makes the package tree-shakeable without
  hand-maintaining ~150 entry points; deps stay `import`s, so consumers that
  already use element-plus/tiptap/vue do not get a second copy.
- The `exports` allowlist (root, `./theme.css`, `./style.css`, `./scss/*`,
  `./package.json`) is much tighter than the `"./*": "./*"` catch-all that
  `@n8n/chat` uses — the public surface is now enumerable.

**Bad**

- `dist` becomes load-bearing, and it is exactly what rotted before. Internal
  consumers still alias to `src`, so the published artifact remains largely
  unexercised by our own CI. Nothing yet asserts the tarball works — that gap
  is tracked as the anti-rot job (N8N-117) and is the single highest-value
  follow-up in this record.
- UMD output is dropped. With ~40 externals a UMD bundle needs a `globals` entry
  per dependency; any consumer still on a non-bundler script-tag flow is broken
  by this. Accepted: every consumer of a Vue SFC library uses a bundler.
- An `exports` allowlist can break consumers in ways the alias argument does not
  predict. It did: `editor-ui/src/app/constants/parameters.ts` imported
  `@n8n/design-system/src/components/...`, which resolved through `node_modules`
  before and is blocked by `exports`. The alias reasoning covered the bundler's
  resolution, not TypeScript's. **An allowlist change requires a consumer
  typecheck pass, not reasoning.**
- ~200 internal deep imports remain, unmigrated by choice. They work through the
  `src` alias, so the allowlist does not break them, but they are not a
  contract any external consumer can rely on and the codemod is still owed.
- Publishing a *working* package converts several deferred questions into real
  obligations the moment anyone adopts: changelog and versioning policy, a
  consumption doc, and the licence call for consumers outside n8n. None exist
  yet.

**Neutral**

- `vue` and `vue-router` become peer dependencies (`vue-router` optional);
  `@types/markdown-it` and `@types/markdown-it-link-attributes` move to
  `dependencies` because they are part of the public type surface.
- Styles build through a second vite config (`vite.config.styles.mts`), so
  `build` is now two passes.

## Revisit triggers

- CI does not yet consume the packed tarball. Until N8N-117 lands, treat every
  claim in this record as true *as of 2026-07-28* and re-verify by packing.
- Any consumer requiring `node16`/`nodenext` type resolution → see
  [ADR-0002](0002-per-file-declarations-for-design-system.md).
- A named external consumer appears → the deferred obligations above stop being
  deferrable, starting with versioning policy and the licence call.
- A second frontend package is found shipping the same husk shape
  (`@n8n/frontend-module-sdk`, N8N-118) → fix the publish pipeline as a class
  rather than per package.
