# @n8n/frontend-test-utils

The vue-aware test helpers every frontend package needs: a component renderer, `mockedStore`, the
`defaultSettings` fixture, and a vitest setup entry that boots i18n and pinia.

Private, source-only, test-only. Nothing in the shipped bundle imports it.

## Why it exists

`@n8n/vitest-config` is the shared vitest harness, and it must not import `vue`, `pinia` or
`@n8n/i18n`: backend packages consume it too, and `@n8n/i18n` devDepends on it, so an import of
i18n there closes a cycle in the turbo graph. The vue-aware helpers had nowhere to live, so each
new module package copied them. This package is that home.

## Layer

L1 — beside `@n8n/design-system` and `@n8n/i18n`, below `@n8n/stores` and `@n8n/composables`.

It may import `vue`, `pinia`, `@pinia/testing`, `@testing-library/*`, `vitest`, `lodash`,
`@n8n/api-types`, `@n8n/i18n` and `@n8n/design-system`. It may not import `@n8n/stores`,
`@n8n/composables`, any `@n8n/frontend-module-*`, or the shell's `@/*`. The `paths` in
`tsconfig.json` enforce this structurally; `eslint.config.mjs` repeats it with the reason.

The rule runs the other way too: **no package this one imports may import it back.** Converging
`@n8n/design-system`'s own renderer onto this package would close that cycle, so that stays a
separate decision.

## Use

```ts
// vitest setup file
import '@n8n/frontend-test-utils/setup';
```

```ts
import { createComponentRenderer, mockedStore } from '@n8n/frontend-test-utils';

const renderComponent = createComponentRenderer(MyView);
```

The zero-config renderer installs i18n, pinia, the design system, a `RouterLink` stub and a no-op
`$telemetry`. A consumer that needs more calls `defineRenderer` with its own plugins, stubs and
`provide` thunk, rather than adding a flag here — see `editor-ui/src/__tests__/render.ts`, which
adds the editor-core workflow document store.
