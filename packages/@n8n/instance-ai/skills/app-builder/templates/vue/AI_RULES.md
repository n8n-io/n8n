# Rules for this app

Stack: Vite, Vue 3, TypeScript, vue-router, Tailwind v4 utilities mapped to the `@n8n/design-system` tokens, reka-ui headless primitives.

- `src/main.ts` boots the app, `src/router.ts` holds the routes, `src/pages/` holds one component per route. Shared components go in `src/components/`. `src/style.css` imports the design-system theme and Tailwind and maps the tokens to utility names; add a token there when one is missing.
- Build with the `apps` tool (`action: "build"`). Never run `npm run dev` — there is no dev server in this environment.
- The build machine has 512 MiB of memory. `npm run build` is `vite build` only; `npm run typecheck` (`vue-tsc -b`) runs separately and must stay out of the build script. Run it before a build when you changed TypeScript.
- Style with utility classes only: `bg-brand`, `text-text`, `p-md`, `rounded-lg`, `shadow-xs`. Tailwind's default palette and scales are removed, so `bg-blue-500`, `p-4` and `text-base` do not exist; the available names are in the app-builder skill's `references/design-system.md`. No hex colors, no px values, no inline styles, no `dark:` variants (dark mode comes from the tokens).
- For interactive widgets (switch, dialog, dropdown, tabs, tooltip) use the `reka-ui` primitives and style them with utilities and `data-[state=…]:` variants. Do not import `N8nButton` or other components from `@n8n/design-system`: bundling them needs more than 1 GiB and fails here.
- The app is served under a base path. Keep `base` in `vite.config.ts` and `createWebHistory(import.meta.env.BASE_URL)` in the router. Reference assets with relative paths or `import.meta.env.BASE_URL`.
- Static export only: no server code, no SSR, no API routes. Do not call `/rest` endpoints.
