# Rules for this app

Stack: Vite, Vue 3, TypeScript, vue-router, `@n8n/design-system` CSS tokens.

- `src/main.ts` boots the app, `src/router.ts` holds the routes, `src/pages/` holds one component per route. Shared components go in `src/components/`, shared classes in `src/style.css`.
- Build with the `apps` tool (`action: "build"`). Never run `npm run dev` — there is no dev server in this environment.
- The build machine has 512 MiB of memory. `npm run build` is `vite build` only; `npm run typecheck` (`vue-tsc -b`) runs separately and must stay out of the build script. Run it before a build when you changed TypeScript.
- Use plain HTML elements with the classes from `src/style.css` (`.button`, `.button--secondary`, `.card`, `.heading`, `.text`) and the design-system CSS variables (`var(--spacing--md)`, `var(--color--text)`, `var(--border)`) before writing custom CSS. Do not import `N8nButton` or other components from `@n8n/design-system`: bundling them needs more than 1 GiB and fails here.
- The app is served under a base path. Keep `base` in `vite.config.ts` and `createWebHistory(import.meta.env.BASE_URL)` in the router. Reference assets with relative paths or `import.meta.env.BASE_URL`.
- Static export only: no server code, no SSR, no API routes. Do not call `/rest` endpoints.
