# Canvas delight implementation report

## Full-app verification

The normal n8n app runs at <http://canvas-delight.localhost:8083/workflow/kkM8mfNMrpuVBrCm?hackmation=delight>. The backend runs on port 5683 with a task-owned SQLite database. The editor runs from this worktree on port 8083.

Verified on the saved workflow in the full editor:

- The disconnected Code node sleeps after idle time. Pointer movement wakes it.
- The actual sticky-note corner starts the flight.
- The same sticky-note DOM element, text, size, and inline style return after flight.
- The saved workflow nodes remain unchanged after the animation.
- Double-click opens the real sticky-note text editor and the Code node parameter panel.
- Sticky-note dragging works. Undo restores its original position.
- Browser error output was empty during these checks.

Full-app evidence is in `evidence/real-app/`. Broad editor regression tests remain unrun.

## Local session isolation

The two running n8n backends used the same `n8n-auth` cookie on `127.0.0.1`. A request to the other backend rejected that cookie and cleared it. Switching back then required a new login.

The canvas demo now uses `canvas-delight.localhost:8083`. Both Orca tabs and the restart instructions use this address. Authentication behavior is unchanged.

A real HTTP cookie-jar check logged in, requested the other app, and checked the original session again. With the old hostname, the original session changed from 200 to 401. With the dedicated hostname, it stayed at 200. See `evidence/real-app/session-isolation.json`.

## Result

Implemented sleeping nodes and sticky-note origami. Both effects run in the real workflow canvas behind `?hackmation=delight`. The standalone harness imports the same effect components.

Demo: http://127.0.0.1:5183/

Server terminal: `term_5dc45157-3fed-4755-8c97-da687fe1e445`.

Browser page: `0302ded7-c45c-4142-8470-efd847ab0964`.

The server remains running after completion. No branch was pushed. No PR was created.

## Triggers

- Harness: click **Sleep now**. Move the pointer or press a key to wake the disconnected Code node. Adjust the idle delay from 2 to 30 seconds.
- Harness: click **Fold the note**, or click the note's top-right corner. The flight takes 3.4 seconds. Repeat the interaction after the note returns.
- Harness: use **Reduce motion** or the operating system setting for static effects. Use **Enable effects** to cancel the effects while keeping the note visible.
- Real editor: add `?hackmation=delight` to a workflow URL. Disconnected or disabled regular nodes sleep after 3 seconds. Select an eligible node for its explicit Sleep now/Wake control. Use a sticky note's corner button to fold it.

The real editor keeps running and waiting nodes awake. Editing a note cancels its animation. Read-only notes have no fold control. Removing the URL parameter returns the original note layout without a wrapper.

## Verification

- Seven focused Vitest tests passed with one worker. They cover activity wake-up, eligibility changes, delay updates, repeat flights, note DOM/content/style preservation, reduced motion, no wrapper in normal mode, and timer/listener cleanup.
- The demo and effect files passed `vue-tsc --noEmit -p tsconfig.json`.
- Configured editor-ui Oxlint passed on all changed source files. Read-only links to installed lint dependencies supplied the toolchain for this isolated checkout.
- Configured Vize template lint passed on all four changed Vue components.
- Prettier and Biome formatting checks passed on changed files.
- Both real canvas renderers passed Vue script and template compilation. Their relative component imports resolve.
- The standalone Vite production build passed. No monorepo build ran.
- Browser assertions passed for explicit sleep, keyboard wake, automatic idle sleep, corner flight, exact note restoration, repeated flights, reduced motion, and cancellation when disabled.
- `git diff --check` passed.

The browser compared the note's DOM identity, text, complete bounding rectangle, and inline style before and after flight. The screenshot pauses the real CSS animation at 1.3 seconds to show the bird clearly. The normal demo plays continuously.

## Evidence

- [Sleeping node](evidence/sleeping.png)
- [Paper bird in flight](evidence/origami-flight.png)
- [Restored note](evidence/restored.png)
- [Browser assertions](evidence/browser-results.json)
- [Run instructions](README.md)

## Changed files

- `packages/frontend/editor-ui/src/features/workflows/canvas/components/delight/CanvasSleepEffect.vue`
- `packages/frontend/editor-ui/src/features/workflows/canvas/components/delight/useCanvasSleep.ts`
- `packages/frontend/editor-ui/src/features/workflows/canvas/components/delight/CanvasOrigamiEffect.vue`
- `packages/frontend/editor-ui/src/features/workflows/canvas/components/delight/CanvasDelight.test.ts`
- `packages/frontend/editor-ui/src/features/workflows/canvas/components/elements/nodes/render-types/CanvasNodeDefault.vue`
- `packages/frontend/editor-ui/src/features/workflows/canvas/components/elements/nodes/render-types/CanvasNodeStickyNote.vue`
- `packages/frontend/editor-ui/src/features/workflows/canvas/components/elements/nodes/render-types/__snapshots__/CanvasNodeDefault.test.ts.snap` (one conditional placeholder in each render snapshot)
- `packages/frontend/@n8n/i18n/src/locales/en.json` (three owned keys)
- `demos/canvas-delight/` (isolated Vue/Vite harness, lockfile, setup, checks, documentation, and evidence)

## Limits

The harness uses a fixed representative workflow and simplified dragging. Real workflow JSON can be imported through n8n's normal editor. The harness has no import or download controls, so no download test applies.

The full-app checks above supplement the initial standalone checks. Comprehensive resize, selection, frontend typechecking, and regression suites remain for CI.

The effects do not modify workflow data or execution state. The initial implementation is saved in local commit `5d20afc86c6`. The full-app check created one demo workflow and one local account in a separate task-owned database. No workflow was published or executed.
