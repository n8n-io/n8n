# Canvas delight

## Full n8n app

The running n8n editor is at <http://canvas-delight.localhost:8083/workflow/kkM8mfNMrpuVBrCm>.
Open the tab in the **Eggs · Canvas delight** Orca worktree. Sign in with the local demo account.

The local editor enables the effects through `VUE_APP_CANVAS_DELIGHT=true` in its ignored `.env.local` file. The workflow URL does not need a query parameter. This setting applies only to the Vite development server.

This is the normal n8n app with its backend, database, workflow editor, node parameters, and sticky-note editor. The workflow is saved as **Hackmation · A quiet moment**. The instance data is in `/private/tmp/n8n-canvas-delight-instance`. It does not use your usual n8n database.

1. Leave the canvas idle for 3 seconds. The disconnected Code node sleeps.
2. Move the pointer to wake it. Select it to use **Sleep now**.
3. Click the sticky note's top-right corner. The note folds into a bird and returns.
4. Double-click the note to edit it. Double-click the Code node to open its parameters.

Import [real-workflow.json](real-workflow.json) into another running instance of this branch to repeat the demo. Add `?hackmation=delight` to that workflow URL.

The running editor uses this worktree's source. The backend reuses the main checkout's existing build. The Orca terminals are **Canvas delight backend** and **Canvas delight real editor**.

For a checkout with built backend dependencies, start these commands in separate terminals:

```sh
N8N_USER_FOLDER=/private/tmp/n8n-canvas-delight-instance N8N_PORT=5683 N8N_LISTEN_ADDRESS=127.0.0.1 N8N_DIAGNOSTICS_ENABLED=false N8N_SECURE_COOKIE=false N8N_EDITOR_BASE_URL=http://canvas-delight.localhost:8083 pnpm start
VUE_APP_CANVAS_DELIGHT=true N8N_PORT=5683 N8N_EDITOR_PORT=8083 pnpm --dir packages/frontend/editor-ui exec vite --host 127.0.0.1
```

Use `canvas-delight.localhost` for this instance. Cookies are shared across ports on one hostname. Two n8n backends on `127.0.0.1` can clear each other’s `n8n-auth` cookie. The dedicated hostname keeps this instance separate. No hosts-file change is needed.

Each idea has its own worktree. You can also stop one instance before starting another. The independent branches are `codex-hackmation-canvas-delight`, `codex-hackmation-constellation`, and `codex-hackmation-prints`.

## Standalone animation harness

Open http://127.0.0.1:5183/.

This harness imports the same `CanvasSleepEffect.vue` and `CanvasOrigamiEffect.vue` files as the workflow canvas. It uses a representative six-node workflow. It does not need an n8n backend.

## Start

From the repository root:

```sh
pnpm --dir demos/canvas-delight install --ignore-scripts
pnpm --dir demos/canvas-delight dev
```

The nested workspace installs only the demo dependencies. The Vite config creates one local link in the checkout's ignored `node_modules` directory. That link resolves the repository's TypeScript config. It does not install or build the monorepo.

The server binds to loopback on port 5183. It fails if that port is in use.

## Present

1. Click **Sleep now**. The disconnected Code node breathes and emits three small `z` glyphs.
2. Move the pointer or press a key. The node wakes immediately.
3. Set **Sleep after** to 2 seconds. Leave the canvas idle to show the automatic trigger.
4. Click **Fold the note**, or click the note's top-right corner. The note folds into a paper bird. The bird flies and returns. The original note stays mounted throughout the animation.
5. Repeat the flight. The note text, dimensions, and position stay unchanged.
6. Turn on **Reduce motion**. Sleep shows a static glyph. Origami shows a static bird for 650 ms while the note stays visible. The operating system's reduced-motion setting also applies.
7. Turn off **Enable effects** during a flight to test cleanup. Turn it back on to repeat.

Drag a workflow node to move it. The connections follow it. The harness keeps all state in memory.

## Use the real workflow editor

Start n8n through the normal development setup. Open a workflow and add `?hackmation=delight` to its URL. Use `&hackmation=delight` if the URL already has a query string.

- A disconnected or disabled regular node sleeps after 3 seconds. Running and waiting nodes stay awake.
- Select an eligible node to show its **Sleep now** or **Wake** control.
- Click a sticky note's top-right corner to fold it. The corner is also a keyboard-accessible button.
- Editing a note cancels its flight. Read-only notes do not show the fold control.
- Remove the URL parameter to disable the demo. The ordinary sticky-note renderer has no added layout wrapper in this state.

The app integration accepts normal n8n workflows, including workflows imported through the editor. The harness has a fixed sample. It does not import or export workflow files.

## Checks

```sh
pnpm --dir demos/canvas-delight test
pnpm --dir demos/canvas-delight exec vue-tsc --noEmit -p tsconfig.json
pnpm --dir demos/canvas-delight build > /tmp/canvas-delight-build.log 2>&1
python3 demos/canvas-delight/verify-browser.py <orca-browser-page-id>
git diff --check
```

The browser check needs an open Orca tab at the demo URL. Get its page ID with `orca tab list --json`. It writes screenshots and results to `evidence/`.

## Boundaries

The effects do not modify workflow data, note content, node positions, or execution state. No data leaves the browser. There is no telemetry, credential access, or backend persistence. Animation timers and activity listeners are removed on unmount.

This is a presentation prototype. The harness uses local styling and a simplified draggable canvas. It is not a replacement for Vue Flow. Full-editor runtime checks require the normal n8n development environment.
