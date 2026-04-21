---
description: >-
  Close the Figma-to-code feedback loop without a human in the middle. Use
  when implementing UI from a Figma design, matching a mockup, iterating on
  visual fidelity, or the user says "build this screen", "match the design",
  "iterate on the UI", or "/iterate-ui". Requires Figma MCP and Playwright
  MCP; uses Chrome DevTools MCP and mcp-image-compare-server when available.
---

# Iterative UI development

Build a UI component, render it, compare to the Figma reference, edit,
re-render. Repeat until pixels match. You do this yourself — do not ask a
human to eyeball intermediate states.

## Prerequisites

| MCP | Required? | Used for |
|---|---|---|
| `plugin:figma:figma` | **yes** | Pull reference screenshots, design tokens, Code Connect mappings |
| `playwright` (`@playwright/mcp`) | **yes** | Navigate dev server / Storybook, take snapshots + screenshots |
| `mcp-image-compare-server` | optional | Pixel diff rendered output vs Figma reference (`pixelmatch`) |
| `plugin:chrome-devtools-mcp:chrome-devtools` | optional | Console errors, perf traces, network inspection during debug |

If Playwright MCP is missing, fall back to `packages/testing/playwright` +
`page.screenshot()` via a Bash-run script (slower per iteration). If Figma MCP
is missing, ask the user for exported PNGs of the reference frames.

## The loop

### 1. Pull the Figma reference

Use `mcp__plugin_figma_figma__get_design_context` for the target node — it
returns a reference code snippet, a screenshot, and design tokens in one
call. The snippet is React+Tailwind; treat it as a **reference only**, then
adapt to Vue + n8n CSS variables per `packages/frontend/AGENTS.md`.

For tokens, `mcp__plugin_figma_figma__get_variable_defs` returns the CSS
variable bindings for the node — map these to the `--color--*`, `--spacing--*`,
and `--font-size--*` vars listed in `packages/frontend/AGENTS.md`.

Before writing new UI, call `mcp__plugin_figma_figma__search_design_system`
and `get_code_connect_map` to find existing n8n components that already map
to the Figma nodes. Prefer reuse over new code.

Save the reference screenshot locally (e.g. `.tmp/ref-<slice>.png`) so you
can re-read it later in the loop.

### 2. Pick a rendering harness

| Task shape | Harness | Why |
|---|---|---|
| Leaf / atom component with visual states (chip, button, badge) | **Storybook** — write `.stories.ts` | Isolates states side-by-side; hot reload; no flow setup |
| Composite view that needs layout, routing, or stores | **Dev server demo route** (`?uidemo=<slice>` or `/ui-demo/<slice>`) | Renders in real app shell with stores + portals |
| Final regression protection | **Playwright `toHaveScreenshot`** in `packages/testing/playwright` | Runs in CI |

For n8n:
- Storybook: `pnpm --filter @n8n/design-system storybook` (design-system) or
  `pnpm --filter n8n-editor-ui storybook` (editor-ui). Default port is
  printed in the log.
- Dev server: see repo root `AGENTS.md` — start and redirect output to a log
  file, tail for the URL.

Start the server with `run_in_background: true` so the shell is free for the
Playwright MCP calls below.

### 3. Render + capture

Navigate and snapshot with Playwright MCP:

```
mcp__playwright__browser_navigate  url: http://localhost:<port>/...
mcp__playwright__browser_snapshot   → accessibility tree (structured)
mcp__playwright__browser_take_screenshot  filename: .tmp/out-<slice>.png
```

Accessibility snapshots are the cheaper check: they confirm structure,
labels, and roles without reading pixels. Use them for correctness asserts.
Use screenshots only for layout / spacing / color checks that the a11y tree
cannot express.

To force states: `browser_hover`, `browser_click`, or
`browser_evaluate` to toggle classes / focus / media queries (dark mode:
`matchMedia` override or the app's theme store).

### 4. Compare

Two options, in order of preference:

1. **Multimodal self-check.** `Read` both `ref-<slice>.png` and
   `out-<slice>.png` in a single response. Describe deltas out loud
   (spacing, font weight, border radius, color tokens).
2. **Pixel diff.** If `mcp-image-compare-server` is connected, call its
   compare tool with both paths. It returns a `diffCount` and writes a
   diff image — `Read` the diff image to see where pixels disagree.

Translate deltas into edits against the n8n token scale. Never hard-code
raw px or hex once you have a token — always prefer the `--spacing--*` /
`--color--*` var that matches.

### 5. Edit, reload, re-capture

Hot reload handles Vue/SFC changes; no server restart needed. Re-run step 3
and step 4. Stop when deltas are under a token quantum (e.g. 2 px, one
tint step).

### 6. Lock in protection

Once a slice visually matches:

- Commit the Storybook story (atoms) or demo route guard (composites).
- Add a Playwright visual-regression test under
  `packages/testing/playwright` using `toHaveScreenshot`. Baseline on
  first run, then the test fails in CI on visual drift. Follow the
  architecture rules in `packages/testing/playwright/AGENTS.md` (entry
  points, janitor).
- Run `pnpm typecheck` + `pnpm lint` in the owning package.

Do not leave exploratory Playwright MCP artifacts in the repo. The MCP is
for your build loop; committed tests live in the Playwright harness.

## Common gotchas

- **Viewport.** Set it explicitly on first navigate — default Playwright
  viewport is not the same as the Figma frame size. Pass `viewport:
  { width, height }` to `browser_navigate` if the MCP supports it, else
  `browser_evaluate` `window.resizeTo(...)`.
- **Fonts.** InterVariable must load before comparing. Poll for
  `document.fonts.ready` via `browser_evaluate` before screenshotting.
- **Portals & modals.** Storybook can mis-render `N8nModal` portal targets;
  prefer the dev-server demo route for anything with a portal.
- **Dark mode.** Capture both — the `@media (prefers-color-scheme: dark)`
  branch often drifts. Toggle via `browser_emulate_media` or the app's
  theme store.
- **Token drift.** If the Figma uses a raw hex with no bound variable, flag
  it to the user — do not guess the token.

## When to stop iterating

- Pixel diff is ≤ anti-aliasing noise and all tokens are semantic.
- Accessibility snapshot shows the correct roles/labels.
- Typecheck + lint pass in the owning package.
- A `toHaveScreenshot` baseline is committed.

If you have burned ~6 iterations without convergence, stop and report the
remaining delta to the user — usually means the Figma reference has a
state or token the design system does not yet express.

## Escape hatches

- **No Playwright MCP.** Write a Node script in `.tmp/snap.mjs` that spawns
  `chromium.launch()` from `packages/testing/playwright`'s installed
  Playwright and screenshots, then `Read` the PNG. Slower but equivalent.
- **No Image Compare MCP.** Self-check with multimodal `Read` of both PNGs
  is usually enough for the first ~3 iterations; only reach for pixel diff
  when you are close and want to catch 1–2 px issues.
- **Figma node behind auth.** Ask the user to paste the exported PNG; use
  it in place of the MCP-fetched reference.
