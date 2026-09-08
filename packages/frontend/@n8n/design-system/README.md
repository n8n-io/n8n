![n8n.io - Workflow Automation](https://user-images.githubusercontent.com/65276001/173571060-9f2f6d7b-bac0-43b6-bdb2-001da9694058.png)

# @n8n/design-system

The n8n component library for Vue 3. It gives you components, design tokens, icons, and
the directives plugin. Run `pnpm dev` to see the components in Storybook.

## Table of Contents

- [Consume the package](#consume-the-package)
- [Exports](#exports)
- [Develop the package](#develop-the-package)
- [Pack and publish](#pack-and-publish)
- [License](#license)

## Consume the package

You need a Vue 3 app with Vite. You also need the `vue` and `vue-router` packages.

`vue` and `vue-router` are peer dependencies. The barrel imports `vue-router` at load
time. If `vue-router` is absent, the build fails.

### 1. Install

Inside this monorepo, declare the package as a workspace dependency in your `package.json`:

```json
{
  "dependencies": {
    "@n8n/design-system": "workspace:*",
    "vue": "catalog:frontend",
    "vue-router": "catalog:frontend"
  }
}
```

Outside this monorepo, install the package from npm:

```sh
npm install @n8n/design-system@latest vue vue-router
```

Add `sass` as a dev dependency only when you `@use` the SCSS sources from
[`./css/*`](#exports).

### 2. Build the package first

`.gitignore` excludes `dist`. So an in-repo app can resolve nothing before you build the
package. Build the package with turbo. Turbo builds the workspace dependencies first.

```sh
pnpm turbo run build --filter=@n8n/design-system
```

A package that declares `@n8n/design-system` needs no extra step, because the `build` task
of turbo depends on `^build`. If you install from npm, skip this step, because the tarball
includes `dist`.

### 3. Wire it into your app

Import the two stylesheets before your own styles. `theme.css` gives you the design tokens,
the CSS reset, and four `@font-face` rules. The components read their variables from these
tokens.

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
options argument.

Do not skip this call. Ten components render their text through `v-n8n-html`: `N8nNotice`,
`N8nTooltip`, `N8nTabs`, `N8nSticky`, `N8nInputLabel`, `N8nInfoAccordion`, `N8nEmptyState`,
`CommandBarItem`, and the two `AskAssistantChat` message components. If the directive is
absent, these components render empty and show no error.

The `app.provide(IconBodyLoaderKey, loadLucideIconBody)` call gives you the full Lucide
set. If you omit the call, `N8nIcon` renders only the bundled icon set. That set holds
`triangle`, `status-error`, and the custom n8n icons. Every other Lucide name renders
empty, and a dev build writes a warning to the console.

The barrel gives you the components and their types:

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

The package includes the SCSS sources next to the compiled CSS. So an app with its own
sass toolchain can use the mixins and the token maps:

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

The `breakpoint` mixin compiles to `@media screen and (width<=991px)`.

## Exports

Every subpath resolves from `dist`. The package has no CommonJS build and no `require`
condition.

| Subpath                           | Contents                                                                                     |
| --------------------------------- | -------------------------------------------------------------------------------------------- |
| `@n8n/design-system`              | The barrel: components, composables, exported types, and the `locale` singleton.             |
| `@n8n/design-system/plugin`       | `N8nPlugin`. It registers the `v-n8n-truncate` and `v-n8n-html` directives.                  |
| `@n8n/design-system/icons/lucide` | `loadLucideIconBody` and `IconBodyLoaderKey`, for icons outside the bundled set.             |
| `@n8n/design-system/style.css`    | The component styles.                                                                        |
| `@n8n/design-system/theme.css`    | The design tokens, the CSS reset, four `@font-face` rules, and the element-plus overrides.   |
| `@n8n/design-system/css/*`        | The SCSS sources: mixins, token maps, and one stylesheet per component. You must add `sass`. |
| `@n8n/design-system/package.json` | The manifest.                                                                                |

## Develop the package

Run these commands from this directory.

| Command          | What it does                                                           |
| ---------------- | ---------------------------------------------------------------------- |
| `pnpm dev`       | It starts Storybook on http://localhost:6006.                          |
| `pnpm build`     | It builds `dist`. Build the workspace dependencies first — see step 2. |
| `pnpm typecheck` | It runs `vue-tsc --noEmit` on `src`.                                   |
| `pnpm test`      | It runs the unit tests one time.                                       |
| `pnpm lint`      | It lints `src`. `pnpm lint:fix` applies the fixes.                     |
| `pnpm clean`     | It removes `dist` and `.turbo`.                                        |

## Pack and publish

**Pack with `pnpm pack`. Never `npm pack`.**

When `pnpm` packs the package, it rewrites the workspace protocol and the catalog
references to fixed versions. For example, `"@n8n/composables": "workspace:*"` becomes
`"1.27.0"`, and `"vue": "catalog:frontend"` becomes `"^3.5.13"`. `npm` copies both strings
without a change. The npm registry client knows neither protocol. So an install of an
`npm`-packed tarball fails:

```text
npm error code EUNSUPPORTEDPROTOCOL
npm error Unsupported URL Type "catalog:": catalog:frontend
```

Build the package first, because `.gitignore` excludes `dist`. The `files` field includes
`dist`, `assets/fonts`, and this README.

```sh
pnpm turbo run build --filter=@n8n/design-system
pnpm pack --pack-destination /tmp/ds-pack
```

## License

You can find the license information [here](https://github.com/n8n-io/n8n/blob/master/README.md#license)
