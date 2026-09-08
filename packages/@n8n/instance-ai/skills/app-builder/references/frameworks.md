# Static export and base path per framework

`apps(action="build")` runs the build command with `APP_BASE=/apps/<namespace>/`
(trailing slash) in the app directory and then packages `outDir`. The output
must be a static site with `index.html` at the root of `outDir`. n8n serves
unknown paths with `index.html` (SPA fallback), so client-side routing works.

Pass `command` and `outDir` to `build` when they differ from the defaults
(`npm run build`, `dist`). The command runs with `node_modules/.bin` on `PATH`,
so `vite build` works without `npx`. Most frameworks want the base without the
trailing slash; strip it where noted.

## Memory: 512 MiB for every framework

The build machine has 512 MiB of memory; exit code 134 (heap out of memory)
or 137 (killed) means you exceeded it. For every framework:

- The Vue template's `vue-tsc --noEmit && vite build` is measured to fit
  (about 300 MiB). For other frameworks keep type checking (`tsc`,
  `svelte-check`, `astro check`) out of `build` unless you have measured it;
  put it in a separate `typecheck` script and run it before `build`.
- Do not import `@n8n/design-system` components (`N8n*`). Avoid other large
  component libraries (element-plus, MUI, Ant Design) for the same reason.
  Tailwind v4 (`tailwindcss` + `@tailwindcss/vite`, Rust engine) and `reka-ui`
  fit: the template builds in about 300 MiB with both.

## Styling in another framework

The Vue template's `src/style.css` (Tailwind + the shadcn-vue `:root`/`.dark`
CSS-variable block) is plain CSS and portable: copy it into any Vite project,
add `@tailwindcss/vite` to the plugins and `tailwindcss` + `@tailwindcss/vite`
to `package.json`, import the file once in the entry module. The utility
names in `references/design-system.md` then work the same, but the
pre-generated components under `src/components/ui/` do not — those are
Vue-specific. Use that framework's own shadcn CLI/registry (`shadcn` for
React, `shadcn-svelte` for Svelte) to generate matching components against
the same CSS variables, or hand-style with the utilities directly. For
non-Vite frameworks use `@tailwindcss/postcss` instead of the Vite plugin.
`reka-ui` is Vue-only; in React use `radix-ui` primitives with the same
utilities.
- Prefer Vite for small apps. If another framework's build dies with 134/137,
  tell the user the sandbox is too small for that stack instead of retrying.
- Raising `NODE_OPTIONS=--max-old-space-size` does not help: the limit is the
  machine, not the heap. A bigger heap turns exit 134 into exit 137.

## Vite (Vue, React, Svelte, vanilla) — default

```ts
// vite.config.ts
export default defineConfig({
	base: process.env.APP_BASE ?? '/',
});
```

`package.json` scripts: `"build": "vite build"`, `"typecheck": "vue-tsc -b"`
(or `tsc --noEmit`, `svelte-check`).

Vue Router: `createWebHistory(import.meta.env.BASE_URL)`.
React Router: `createBrowserRouter(routes, { basename: import.meta.env.BASE_URL.replace(/\/$/, '') })`.
Assets in code: `import.meta.env.BASE_URL + 'file.png'` or `import` them.

## Nuxt 3

```ts
// nuxt.config.ts
export default defineNuxtConfig({
	ssr: false,
	app: { baseURL: process.env.APP_BASE ?? '/' },
	nitro: { preset: 'static' },
});
```

Build: `command: "npx nuxi generate"`, `outDir: ".output/public"`. Do not add
`server/` routes; the check rejects `.output/server`.

## SvelteKit

```js
// svelte.config.js
import adapter from '@sveltejs/adapter-static';
export default {
	kit: {
		adapter: adapter({ fallback: 'index.html' }),
		paths: { base: (process.env.APP_BASE ?? '/').replace(/\/$/, '') },
	},
};
```

Set `export const ssr = false;` in `src/routes/+layout.ts`. The `fallback`
option writes the SPA shell; do not add `prerender = true`. Links use `{base}`
from `$app/paths`. `outDir`: `build`.

## Next.js

```js
// next.config.js
const base = (process.env.APP_BASE ?? '/').replace(/\/$/, '');
module.exports = {
	output: 'export',
	basePath: base,
	assetPrefix: base,
	trailingSlash: true,
	images: { unoptimized: true },
};
```

No API routes, no server components that fetch at request time, no
middleware. Build: `command: "npx next build"`, `outDir: "out"`.

## Astro

```js
// astro.config.mjs
export default defineConfig({
	output: 'static',
	base: (process.env.APP_BASE ?? '/').replace(/\/$/, ''),
});
```

Links: `import.meta.env.BASE_URL`. `outDir`: `dist`.

## Plain HTML

No bundler: `template: "none"`, put the files in `public/` and copy them on
build: `command: "rm -rf dist && cp -r public dist"`. Use relative URLs
(`./style.css`) so the base path does not matter. Keep sources out of
`outDir`; the source tarball excludes it. Uses no build memory at all.
