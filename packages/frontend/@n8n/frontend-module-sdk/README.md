# @n8n/frontend-module-sdk

The frontend module contract and registries for n8n editor modules.

This package owns the `FrontendModuleDescription` descriptor type plus the modal
and resource registries that features register against. The editor shell keeps
the wiring (`moduleInitializer`) that drives the two-phase lifecycle; this
package only defines the contract and the registry state.

It is a source-only package (no build step): consumers resolve it from `src`
via the editor-ui Vite alias and `tsconfig` paths, and `src/index.ts` is the
only public entry point.

```ts
import { modalRegistry, registerResource, type FrontendModuleDescription } from '@n8n/frontend-module-sdk';
```

## Not published

This package is `private` and deliberately not on npm. Being source-only, its
entry point is TypeScript, so an installed copy cannot be imported by Node
(type stripping is unsupported under `node_modules`), and its type surface
reaches `@n8n/design-system` source that is not published either. The module
list in `editor-ui` (`app/modules.manifest.ts`) is a static in-repo array, so
there is no external-module-author story for this contract to serve.

External frontend extensions are served by `@n8n/extension-sdk`
(`defineFrontendExtension`), which is a separate, properly packaged contract.
If this SDK ever needs to go public, it needs a real build, an `exports` map
over `dist`, emitted declarations and a `files` allowlist — not just the flag
flipped back.
