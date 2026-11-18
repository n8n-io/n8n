# Canvas delight implementation report

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

Full-editor runtime, resize, selection, and full CI checks remain for the normal n8n development environment. The app integration was compiled and linted but was not run against a backend. Full frontend typechecking and the broad test suites remain for CI.

No workflow data, credentials, execution state, telemetry, or backend persistence changed. The UI state remains local. All changes are staged. The sandbox blocked the local commit because the worktree index is outside the writable checkout. The coordinator will make the local commit, as agreed. No commit ID is available from this worker.
