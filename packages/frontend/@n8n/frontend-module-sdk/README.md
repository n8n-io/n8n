# @n8n/frontend-module-sdk

The frontend module contract and registries for n8n editor modules.

This package owns the `FrontendModuleDescription` descriptor type plus the modal
and resource registries that features register against. The editor shell keeps
the wiring (`moduleInitializer`) that drives the two-phase lifecycle; this
package only defines the contract and the registry state.

```ts
import { modalRegistry, registerResource, type FrontendModuleDescription } from '@n8n/frontend-module-sdk';
```

## Published shape

`src/index.ts` is the only public entry point. It is built with `tsdown` into
`dist` as both ESM and CJS with declarations for each, and `files` restricts the
tarball to `dist` — source is not published.

`vue` and `vue-router` are `peerDependencies`: the consumer supplies them. Every
external import in this package is `import type`, so the emitted JavaScript has
no runtime imports at all.

Inside the monorepo, `editor-ui` still resolves this package from `src` through
its Vite alias and `tsconfig` paths, so local changes need no rebuild.

## Contract types are self-contained

`ModuleSettingsPage`, `ModuleTabOptions` and `CommandBarEntry` are deliberate
stable subsets of the design-system types they are handed to (`IMenuItem`,
`TabOptions`, `CommandBarItem`), so the module contract does not couple to
sidebar, tab or command-bar internals — and so the published type surface
resolves without `@n8n/design-system` installed.

The one deliberate difference is `icon`, a plain `string` here rather than the
design-system `IconName` union: the icon set is a shell detail that changes
whenever icons are added, and an unknown name degrades at render time.
`designSystemCompat.test.ts` asserts these types stay assignable to their
design-system counterparts, so drift fails in CI rather than at a consumer's
build. Keep that guard in step when adding a field.
