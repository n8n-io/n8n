# Static export and base path per framework

`apps(action="build")` runs the build command with `APP_BASE=/apps/<namespace>/`
(trailing slash) in the app directory and then packages `outDir`. The output
must be a static site with `index.html` at the root of `outDir`. n8n serves
unknown paths with `index.html` (SPA fallback), so client-side routing works.

Pass `command` and `outDir` to `build` when they differ from the defaults
(`npm run build`, `dist`). Most frameworks want the base without the trailing
slash; strip it where noted.

## Vite (Vue, React, Svelte, vanilla) — default

```ts
// vite.config.ts
export default defineConfig({
	base: process.env.APP_BASE ?? '/',
});
```

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

Set `export const prerender = true;` and `export const ssr = false;` in
`src/routes/+layout.ts`. Links use `{base}` from `$app/paths`. `outDir`: `build`.

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
`outDir`; the source tarball excludes it.
