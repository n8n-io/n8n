# Rules for this app

Stack: Vite, Vue 3, TypeScript, vue-router, Tailwind v4, this skill's own component catalog (built on `@ark-ui/vue`).

- `src/main.ts` boots the app, `src/router.ts` holds the routes, `src/pages/` holds one component per route. `src/components/ui/` holds catalog components added via `add-component` (only `button` and `switch` exist from `create`); shared app components go in `src/components/`. `src/style.css` holds the template defaults (Tailwind + the `:root`/`.dark` CSS variables every component reads) — do not edit it. Put any theme variable you want to change into `src/theme-overrides.css`'s `:root { }` block instead; a Theme-tab save merges its own keys onto that file rather than replacing it, so your edits to any other variable survive. `src/theme-mode.ts` is the one exception — a Theme-tab save always overwrites it.
- Build with the `apps` tool (`action: "build"`). Never run `npm run dev` — there is no dev server in this environment.
- The build machine has 512 MiB of memory. `npm run build` is `vue-tsc --noEmit && vite build`; it fits, do not add other checkers or heavy dependencies to it.
- Workflows: the app calls n8n workflows only through `@n8n/app-sdk` (`import { n8n, N8nAppError } from '@n8n/app-sdk'`, `await n8n.workflows.run('<key>', input)`) and only for keys bound with `apps(action="bind")`. Bind first: it writes `src/n8n-bindings.d.ts`, which types the keys and inputs, so an unbound key or a wrong field fails the build. `vendor/n8n-app-sdk.tgz` and `src/n8n-bindings.d.ts` are generated; do not edit them. Never call `/rest`, `/webhook` or `/apps/*/api` by hand.
- Build UI from the components in `src/components/ui/`, e.g. `import { Button } from '@/components/ui/button'`. Need a component that isn't there yet? Call `apps(action: "add-component", component: "<name>")` to pull it in — do not hand-write a component that catalog already provides.
- Style everything with Tailwind utility classes reading the theme's CSS variables (`bg-primary`, `text-muted-foreground`, `rounded-lg`). No hex colors, no inline styles, no `dark:` variants (dark mode comes from the `.dark` class the theme mode sets).
- For interactive behavior a component doesn't already cover, use `@ark-ui/vue` primitives directly and style them with utilities and `data-[state=…]:` variants.
- The app is served under a base path. Keep `base` in `vite.config.ts` and `createWebHistory(import.meta.env.BASE_URL)` in the router. Reference assets with relative paths or `import.meta.env.BASE_URL`.
- Static export only: no server code, no SSR, no API routes.
