# Rules for this app

Stack: Vite, Vue 3, TypeScript, vue-router, `@n8n/design-system`.

- `src/main.ts` boots the app, `src/router.ts` holds the routes, `src/pages/` holds one component per route. Shared components go in `src/components/`.
- Build with the `apps` tool (`action: "build"`). Never run `npm run dev` — there is no dev server in this environment.
- The app is served under a base path. Keep `base` in `vite.config.ts` and `createWebHistory(import.meta.env.BASE_URL)` in the router. Reference assets with relative paths or `import.meta.env.BASE_URL`.
- Static export only: no server code, no SSR, no API routes. Do not call `/rest` endpoints.
- Use `@n8n/design-system` components (`N8nButton`, `N8nInput`, `N8nCard`, ...) and its CSS variables (`var(--spacing--md)`, `var(--color--text)`) before writing custom CSS.
