# Rules for this app

Stack: Vite, Vue 3, TypeScript, vue-router, Tailwind v4, shadcn-vue components, reka-ui headless primitives.

- `src/main.ts` boots the app, `src/router.ts` holds the routes, `src/pages/` holds one component per route. `src/components/ui/` holds shadcn-vue components added via `add-component` (none exist yet in a fresh app); shared app components go in `src/components/`. `src/style.css` holds the shadcn-vue theme (Tailwind + the `:root`/`.dark` CSS variables every component reads) — do not edit `src/theme-overrides.css` or `src/theme-mode.ts`, the app's Theme tab manages them.
- Build with the `apps` tool (`action: "build"`). Never run `npm run dev` — there is no dev server in this environment.
- The build machine has 512 MiB of memory. `npm run build` is `vite build` only; `npm run typecheck` (`vue-tsc -b`) runs separately and must stay out of the build script. Run it before a build when you changed TypeScript.
- Build UI from the components in `src/components/ui/`, e.g. `import { Button } from '@/components/ui/button'`. Need a component that isn't there yet? Call `apps(action: "add-component", component: "<name>")` to pull it in — do not hand-write a component that shadcn-vue already provides.
- Style everything with Tailwind utility classes reading the theme's CSS variables (`bg-primary`, `text-muted-foreground`, `rounded-lg`). No hex colors, no inline styles, no `dark:` variants (dark mode comes from the `.dark` class the theme mode sets).
- For interactive behavior a component doesn't already cover, use `reka-ui` primitives directly and style them with utilities and `data-[state=…]:` variants.
- The app is served under a base path. Keep `base` in `vite.config.ts` and `createWebHistory(import.meta.env.BASE_URL)` in the router. Reference assets with relative paths or `import.meta.env.BASE_URL`.
- Static export only: no server code, no SSR, no API routes. Do not call `/rest` endpoints.
