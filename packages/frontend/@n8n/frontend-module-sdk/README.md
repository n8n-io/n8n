# @n8n/frontend-module-sdk

The frontend module contract and registries for n8n editor modules.

This package owns the `FrontendModuleDescription` descriptor type, the
`defineFrontendModule()` helper that declares one, plus the modal and resource
registries that features register against. The editor shell keeps the wiring
(`moduleInitializer`) that drives the two-phase lifecycle; this package only
defines the contract and the registry state.

It is a source-only package (no build step): consumers resolve it from `src`
via the editor-ui Vite alias and `tsconfig` paths, and `src/index.ts` is the
only public entry point.

```ts
import { defineFrontendModule, modalRegistry, registerResource } from '@n8n/frontend-module-sdk';
```

## Declaring a module

`defineFrontendModule()` is the canonical descriptor form. Use it for every
module, in the shell and in a module package alike.

```ts
export const MyFeatureModule = defineFrontendModule({
	// Must match the backend module id: both gate off `/rest/module-settings`.
	id: 'my-feature',
	name: 'My Feature',
	description: 'What this module does',
	icon: 'box',
});
```

The helper is the identity function at runtime. It returns the object that it
gets. It does not wrap, clone, or freeze it, so a getter-backed field such as
`available` stays lazy.

Two reasons to prefer it over a `: FrontendModuleDescription` annotation:

- **One seam.** The SDK gets one function to attach descriptor validation or a
  dev-mode check to, instead of declaration sites it cannot see.
- **Inference.** `const T` keeps the literal type of each field, so
  `MyFeatureModule.id` is `'my-feature'` and not `string`.

Do not use both. An annotation on top of the helper widens the types again.

Keep the descriptor file import-light: types and the SDK at module scope only.
Load a view with `async () => await import('./views/X.vue')`, and read a store
inside a route guard, a push handler, or `setup`. The shell manifest imports
every descriptor eagerly, so a top-level store import pulls the module into the
boot chunk even when the module is off.

## Push handlers

A module owns a push message type when it declares it in `pushHandlers`. The
shell dispatches these at app scope, so a handler runs in every layout. The shell
skips its own built-in handler for a type a module owns.

**Contract:** a handler must not depend on the built-in handling of the same
event. The two run on separate listeners, so their order is not defined.
