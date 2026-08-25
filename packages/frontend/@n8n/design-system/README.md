![n8n.io - Workflow Automation](https://user-images.githubusercontent.com/65276001/173571060-9f2f6d7b-bac0-43b6-bdb2-001da9694058.png)

# @n8n/design-system

The n8n component library for Vue 3: components, design tokens, icons, and the directives
plugin. Run `pnpm dev` to browse the components in Storybook.

## Table of Contents

- [Consume the package](#consume-the-package)
- [Exports](#exports)
- [Develop the package](#develop-the-package)
- [Pack and publish](#pack-and-publish)
- [License](#license)

## Consume the package

Prerequisites: a Vue 3 app built by Vite, and `vue` plus `vue-router` installed. Both are
peer dependencies, and the barrel imports `vue-router` at load time — without it the build
fails.

### 1. Install

Inside this monorepo, declare it as a workspace dependency in your own `package.json`:

```json
{
  "dependencies": {
    "@n8n/design-system": "workspace:*",
    "vue": "catalog:frontend",
    "vue-router": "catalog:frontend"
  }
}
```

Outside this monorepo, install from npm. **Pin `2.36.0` or later** — the wiring below does
not resolve on earlier versions, and `2.35.3` is still the `latest` tag:

```sh
npm install @n8n/design-system@latest vue vue-router
```

Add `sass` as a dev dependency only if you `@use` the SCSS sources from
[`./css/*`](#exports).

### 2. Build the package first

`dist` is gitignored, so an in-repo consumer has nothing to resolve until the package is
built. Build it with turbo, which builds its workspace dependencies first:

```sh
pnpm turbo run build --filter=@n8n/design-system
```

A consumer package that declares `@n8n/design-system` gets this for free — turbo's `build`
task depends on `^build`. Skip this step when you install from npm: the tarball ships `dist`.

### 3. Wire it into your app

Import the two stylesheets before your own styles. `theme.css` carries the design tokens,
the CSS reset, and the `@font-face` rules that the components resolve their variables from.

```ts
// src/main.ts
import '@n8n/design-system/style.css';
import '@n8n/design-system/theme.css';
import './styles.scss';

import { IconBodyLoaderKey, loadLucideIconBody } from '@n8n/design-system/icons/lucide';
import { N8nPlugin } from '@n8n/design-system/plugin';
import { createApp } from 'vue';

import App from './App.vue';

const app = createApp(App);
app.use(N8nPlugin, {});
app.provide(IconBodyLoaderKey, loadLucideIconBody);
app.mount('#app');
```

`N8nPlugin` registers the `v-n8n-truncate` and `v-n8n-html` directives. Pass `{}` as the
options argument. Do not skip this call: ten components render their text through
`v-n8n-html` — `N8nNotice`, `N8nTooltip`, `N8nTabs`, `N8nSticky`, `N8nInputLabel`,
`N8nInfoAccordion`, `N8nEmptyState`, `CommandBarItem`, and the two `AskAssistantChat`
message components — and without the directive they render empty, with no error.

The `IconBodyLoaderKey` provide is what makes the full Lucide set available. Without it,
`N8nIcon` renders the bundled icon set only (`triangle`, `status-error`, the custom n8n
icons); every other Lucide name renders empty, with a warning in a dev build.

Components and their types come from the barrel:

```vue
<!-- src/App.vue -->
<script setup lang="ts">
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import type { ButtonVariant } from '@n8n/design-system';
import { ref } from 'vue';

const variant: ButtonVariant = 'solid';
const clicks = ref(0);
</script>

<template>
	<main class="page">
		<N8nText size="medium">clicks: {{ clicks }}</N8nText>
		<N8nButton :variant="variant" label="Click me" @click="clicks++" />
		<N8nIcon icon="anvil" />
	</main>
</template>
```

The SCSS sources ship next to the compiled CSS, so a consumer with its own sass toolchain
can reach the mixins and token maps:

```scss
// src/styles.scss
@use '@n8n/design-system/css/mixins/breakpoints' as breakpoints;

.page {
	padding: var(--spacing--lg);

	@include breakpoints.breakpoint('sm-and-down') {
		padding: var(--spacing--2xs);
	}
}
```

That compiles to `@media screen and (width<=991px)`.

## Exports

Every subpath resolves from `dist`. There is no CommonJS build and no `require` condition.

| Subpath                           | Contents                                                                               |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| `@n8n/design-system`              | The barrel: components, composables, exported types, and the `locale` singleton.       |
| `@n8n/design-system/plugin`       | `N8nPlugin` — registers the `v-n8n-truncate` and `v-n8n-html` directives.              |
| `@n8n/design-system/icons/lucide` | `loadLucideIconBody` and `IconBodyLoaderKey`, for icons outside the bundled set.       |
| `@n8n/design-system/style.css`    | Component styles.                                                                      |
| `@n8n/design-system/theme.css`    | Design tokens, the CSS reset, four `@font-face` rules, and the element-plus overrides. |
| `@n8n/design-system/css/*`        | The SCSS sources — mixins, token maps, and per-component stylesheets. Needs `sass`.    |
| `@n8n/design-system/package.json` | The manifest.                                                                          |

## Develop the package

Run these from this directory.

| Command          | What it does                                                        |
| ---------------- | ------------------------------------------------------------------- |
| `pnpm dev`       | Starts Storybook on http://localhost:6006.                          |
| `pnpm build`     | Builds `dist`. Needs the workspace dependencies built — see step 2. |
| `pnpm typecheck` | `vue-tsc --noEmit` over `src`.                                      |
| `pnpm test`      | Runs the unit tests once.                                           |
| `pnpm lint`      | Lints `src`. `pnpm lint:fix` applies the fixes.                     |
| `pnpm clean`     | Removes `dist` and `.turbo`.                                        |

## Pack and publish

**Pack with `pnpm pack`. Never `npm pack`.**

`pnpm` rewrites the workspace protocol and the catalog references to fixed versions when it
packs — `"@n8n/composables": "workspace:*"` becomes `"1.27.0"`, `"vue": "catalog:frontend"`
becomes `"^3.5.13"`. `npm` copies both verbatim, and neither is a protocol the npm registry
client understands, so installing an `npm`-packed tarball fails:

```text
npm error code EUNSUPPORTEDPROTOCOL
npm error Unsupported URL Type "catalog:": catalog:frontend
```

Build first — `dist` is gitignored, and `files` ships `dist`, `assets/fonts`, and this
README:

```sh
pnpm turbo run build --filter=@n8n/design-system
pnpm pack --pack-destination /tmp/ds-pack
```

## License

You can find the license information [here](https://github.com/n8n-io/n8n/blob/master/README.md#license)
