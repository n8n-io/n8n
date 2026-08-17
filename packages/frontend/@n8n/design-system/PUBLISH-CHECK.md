# Checking that the packed artifact can be consumed

A by-hand procedure that installs the packed `@n8n/design-system` tarball outside the workspace and
builds a small consumer against it.

Recommended before each `@n8n/design-system` publish. It is not wired to CI and nothing triggers
it, so it only runs when somebody runs it.

## Why it exists

The package published a broken artifact for months with a green pipeline. Nothing in the monorepo
consumes `dist`: every internal package aliases `@n8n/design-system(.*)` to `src$1`, so the
published output is never exercised by anything the repo builds. This procedure is the only thing
that looks at what consumers actually get.

Two parts of the surface degraded silently before, so both are exercised below: a component with a
typed slot, and the pre-built lucide icon chunks.

## Prerequisites

`dist` must exist, and it must be this commit's `dist` — `pnpm pack` packs what is on disk.

```bash
pnpm turbo run build --filter=@n8n/design-system...
```

## 1. Pack the package and its workspace dependencies

```bash
rm -rf /tmp/ds-tarballs && mkdir -p /tmp/ds-tarballs
for d in \
  packages/frontend/@n8n/design-system \
  packages/@n8n/utils \
  packages/frontend/@n8n/frontend-utils \
  packages/frontend/@n8n/composables
do
  (cd "$d" && pnpm pack --pack-destination /tmp/ds-tarballs)
done
```

`pnpm pack`, not `npm pack`: it resolves `catalog:` and `workspace:` specifiers the way publishing
does, so the packed manifest carries real version ranges.

**Pack the three workspace dependencies, do not let them come from the registry.** They are
published in the same release as the design system, so the registry copy is the *previous*
release's build. Skipping them tests the wrong thing, and it currently fails for a fixed bug: the
published `@n8n/frontend-utils@0.3.0` was built from `import xss, { escapeAttrValue, escapeHtml }
from 'xss'`, which Node cannot load because `xss` is CommonJS without named-export support. The
repo source has the corrected default import, at the same version number.

## 2. Make a consumer project outside the workspace

`/tmp` matters: anywhere under the repo would resolve the package through the workspace instead of
the tarball, and the check would verify nothing.

```bash
rm -rf /tmp/ds-check && mkdir -p /tmp/ds-check/src && cd /tmp/ds-check
npm init -y >/dev/null
```

Then replace `package.json` with the following, so every workspace package is forced to its local
tarball rather than to a published copy at the same version:

```json
{
  "name": "ds-check",
  "private": true,
  "type": "module",
  "dependencies": {
    "@n8n/design-system": "file:/tmp/ds-tarballs/n8n-design-system-<version>.tgz",
    "vue": "^3.5.13",
    "vue-router": "^4.5.0"
  },
  "overrides": {
    "@n8n/design-system": "file:/tmp/ds-tarballs/n8n-design-system-<version>.tgz",
    "@n8n/utils": "file:/tmp/ds-tarballs/n8n-utils-<version>.tgz",
    "@n8n/frontend-utils": "file:/tmp/ds-tarballs/n8n-frontend-utils-<version>.tgz",
    "@n8n/composables": "file:/tmp/ds-tarballs/n8n-composables-<version>.tgz"
  }
}
```

Fill the versions in from `ls /tmp/ds-tarballs`.

**Take `vue` and `vue-router` from the packed manifest's `peerDependencies`, not from `latest`.**
Unpinned, `vue-router` installs 5.x, which does not satisfy the declared `^4.5.0` peer and fails
the install.

```bash
npm install --no-audit --no-fund
npm install -D 'vite@^8' '@vitejs/plugin-vue@^6' 'vue-tsc@^2.2.8' 'typescript@6.0.2' 'sass@^1.71.1' \
  --no-audit --no-fund
```

Those toolchain pins are deliberate. `vue-tsc@3` cannot drive `typescript@7` (tsgo) and exits with
`ERR_PACKAGE_PATH_NOT_EXPORTED` before it checks anything. `@vitejs/plugin-vue@6` is the first
major that accepts Vite 8; the catalog is still on v5, whose stale peer range npm refuses.

## 3. Write the consumer

`src/App.vue` — a generically typed slot. `N8nDataTableServer`'s `#item` payload reaches a
`@tanstack/vue-table` type through the emitted declarations, which is the shape that broke before.
Use the static `#item` slot, not `#[`item.${key}`]`: a dynamic slot name is unchecked by `vue-tsc`
and would compile no matter how badly the types had rotted.

```vue
<script setup lang="ts">
import { N8nDataTableServer, N8nIcon, type TableHeader } from '@n8n/design-system';

type Row = { id: string; label: string };

const headers: Array<TableHeader<Row>> = [{ title: 'Label', key: 'label' }];
const items: Row[] = [{ id: 'a', label: 'first' }];
</script>

<template>
	<N8nDataTableServer :headers="headers" :items="items" :items-length="items.length">
		<template #item="{ item, cells }">
			<N8nIcon icon="activity" />
			<span>{{ item.id }} / {{ item.label }} / {{ cells.length }}</span>
		</template>
	</N8nDataTableServer>
</template>
```

`src/main.ts` — the icon entry and the barrel have to agree, and they come from different `exports`
subpaths.

```ts
import { createApp } from 'vue';
import { IconBodyLoaderKey } from '@n8n/design-system';
import { loadLucideIconBody } from '@n8n/design-system/icons/lucide';
import '@n8n/design-system/style.css';
import '@n8n/design-system/theme.css';
import App from './App.vue';

const app = createApp(App);
app.provide(IconBodyLoaderKey, loadLucideIconBody);
app.mount('#app');
```

`src/shims.d.ts` — TypeScript 6 errors on a side-effect stylesheet import with no declaration.

```ts
declare module '*.css';
declare module '*.scss';
```

`vite.config.mts` — the stock Vue plugin and nothing else. No `lucideIconsPlugin()`: the icon
bodies are compiled into `dist` as lazy chunks, so needing the plugin here would mean those chunks
stopped shipping.

```ts
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({ plugins: [vue()] });
```

`tsconfig.json` — `bundler` resolution is the only mode this package supports. `node16` is
unattainable for a `.vue` library without flattening the declarations, which api-extractor cannot
do for `.vue` specifiers.

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "lib": ["ESNext", "DOM", "DOM.Iterable"]
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.vue", "vite.config.mts"]
}
```

`index.html`:

```html
<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><title>check</title></head>
<body><div id="app"></div><script type="module" src="/src/main.ts"></script></body></html>
```

## 4. Typecheck, build, load

All three, and each must exit `0`. They fail independently — types, bundling, and native loading
are three different ways for the artifact to be broken.

```bash
npx vue-tsc --noEmit
npx vite build
```

The load step is separate because a bundler papers over CommonJS interop with `cjs-module-lexer`,
so a green `vite build` is not evidence that Node can load the package:

```bash
node --input-type=module -e "
const failures = [];
for (const s of ['@n8n/design-system', '@n8n/design-system/icons/lucide']) {
  try {
    const m = await import(s);
    if (Object.keys(m).length === 0) failures.push(s + ': empty namespace');
    else console.log('  ok  ' + s + ' (' + Object.keys(m).length + ' exports)');
  } catch (e) { failures.push(s + ': ' + e.message.split('\n')[0]); }
}
const { loadLucideIconBody } = await import('@n8n/design-system/icons/lucide');
const body = await loadLucideIconBody('activity');
if (typeof body !== 'string' || body.length === 0) failures.push('no icon body for activity');
else console.log('  ok  icon body loads from a pre-built chunk');
if (await loadLucideIconBody('not-a-real-icon') !== null) failures.push('unknown icon was not null');
else console.log('  ok  unknown icon resolves to null');
if (failures.length) { console.error('FAIL:'); failures.forEach(f => console.error('  - ' + f)); process.exit(1); }
console.log('OK');
"
```

Import the subpaths **one at a time**, as above. A single module that imports everything stops at
the first failure and hides the rest.

### Expected result

```
  ok  @n8n/design-system (183 exports)
  ok  @n8n/design-system/icons/lucide (1 exports)
  ok  icon body loads from a pre-built chunk
  ok  unknown icon resolves to null
OK
```

The export count moves with the barrel; it is a sanity signal, not an assertion.

## 5. Confirm the check can actually fail

A procedure never shown to fail is not evidence. Break the tarball on purpose and re-run:

```bash
rm -rf /tmp/ds-broken && mkdir -p /tmp/ds-broken && cd /tmp/ds-broken
tar -xzf /tmp/ds-tarballs/n8n-design-system-<version>.tgz
node -e "
const fs = require('fs');
const d = JSON.parse(fs.readFileSync('package/package.json', 'utf8'));
delete d.exports['./icons/lucide'];
fs.writeFileSync('package/package.json', JSON.stringify(d, null, 2));
"
tar -czf n8n-design-system-<version>.tgz package && rm -rf package
```

Point both the `dependencies` entry and the `overrides` entry at
`/tmp/ds-broken/n8n-design-system-<version>.tgz`, delete `node_modules` and
`package-lock.json`, reinstall, and re-run step 4. Overrides win over dependencies, so changing
only the dependency leaves the good tarball installed and the check passes — which looks like the
procedure failing to catch the defect.

Verified 2026-08-17 against `2.34.0`:

| Step | Result |
| --- | --- |
| `vue-tsc --noEmit` | exit `2` — `TS2307: Cannot find module '@n8n/design-system/icons/lucide'` |
| `vite build` | exit `1` — `"./icons/lucide" is not exported under the conditions [...]` |
| load | `ERR_PACKAGE_PATH_NOT_EXPORTED` |

## What this does not cover

Every specifier the monorepo writes for this package should resolve through the published `exports`
map, and this procedure does not check that — it only exercises the specifiers written above. A
deep import elsewhere in the repo resolves through the build-time alias to `src` and stays
invisible here. One such import was found and fixed while this document was written
(`editor-ui/src/features/agents/channels/types.ts`, importing
`@n8n/design-system/components/N8nIcon/icons`); `@n8n/storybook`'s `.storybook/preview.ts` still
has two, tracked separately.

To sweep for them by hand:

```bash
git grep -nE "['\"\`(]@n8n/design-system(/[^'\"\`)]*)?" -- \
  '*.ts' '*.mts' '*.vue' '*.scss' '*.css' ':!packages/frontend/@n8n/design-system'
```

Then check each distinct subpath against the six keys in `exports`. `@n8n/design-system/src/…` is
deliberately outside the map — `files` ships `dist`, not `src` — so those are workspace-internal
by construction.
