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

## Push handlers

A module owns a push message type by declaring it in `pushHandlers`. The shell
dispatches every registered handler from app scope, so a handler runs in every
layout, and not only where an editor component is mounted. The shell skips its
own built-in handler for a type a module owns.

The app-scope dispatch and the shell's built-in handling attach separate
listeners, so their order is not defined.

**Contract:** a module push handler must not depend on the built-in handling of
the same event. Write it so it holds on its own — read the state it needs, and
do not assume a built-in handler ran first.
