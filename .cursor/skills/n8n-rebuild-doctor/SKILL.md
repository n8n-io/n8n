---
name: n8n-rebuild-doctor
description: Diagnostic runbook for "the UI didn't pick up my change" or "the demo route 404s". Use when changes are not visible after a refresh, or when the dev/build flow seems wedged.
---

# n8n Rebuild Doctor

Use this skill when a code change seems correct but the running app doesn't show it. Walk down the list in order; stop at the first hit.

## 1. Are you on the right port?

- `pnpm start` → built app on **`http://localhost:5678`**.
- `pnpm dev:fe` → Vite dev server on **`http://localhost:8080`**.

Visiting `:8080` while running `pnpm start` shows nothing useful. Visiting `:5678` while running `pnpm dev:fe` shows the **previous** built bundle.

## 2. Is the dist stale?

If you're running `pnpm start`, every editor-ui change requires a rebuild:

```bash
pnpm --filter n8n-editor-ui build
```

For a cross-package change touching `@n8n/api-types`:

```bash
pnpm --filter @n8n/api-types build
pnpm --filter n8n build
pnpm --filter n8n-editor-ui build
```

Then restart `pnpm start`. The CLI loads the built editor from `packages/frontend/editor-ui/dist`.

## 3. Is the env flag enabled?

Demo features default to `false`. Confirm with:

```bash
echo "$N8N_DEMO_INSIGHTS_ANALYST"
```

Export, then restart:

```bash
export N8N_DEMO_INSIGHTS_ANALYST=true
pnpm start
```

## 4. Is `pnpm dev:fe` actually healthy?

Vite often half-starts and serves stale chunks if a workspace dep failed to build. If the editor at `:8080` shows import errors in the console (`Failed to resolve import "@n8n/rest-api-client"`), build the workspace deps first:

```bash
pnpm --filter '@n8n/i18n' build
pnpm --filter '@n8n/rest-api-client' build
pnpm --filter '@n8n/stores' build
```

## 5. Is `node_modules` aligned with `package.json`?

If you added a dependency to a package's `package.json`:

```bash
pnpm install
```

If pnpm reports that the lockfile doesn't match, do not pass `--no-frozen-lockfile` blindly. Inspect the diff first.

## 6. Is the route gated by something else?

Check the frontend module descriptor for `beforeEnter` guards. A `false` from a guard sends the user to `NOT_FOUND` even though the route exists.

## 7. Cache?

Hard-refresh the page. If you've toggled an env flag, the i18n cache and Pinia state are reset on reload but the browser cache for chunked JS may not be — open in incognito to confirm.

## Quick decision tree

```
UI not updating?
  ├─ on :5678  → rebuild editor-ui (and api-types/cli if those changed) and restart pnpm start
  └─ on :8080  → check console for import errors; build any failing workspace dep
Route 404 / NOT_FOUND?
  └─ check env flag and module-descriptor beforeEnter guard
LLM feature returns deterministic responses?
  └─ check the API key env var and the service log for "fallback" warnings
```
