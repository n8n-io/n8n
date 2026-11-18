# Workflow constellation

This Hackmation prototype reveals a star chart as you zoom out on the real workflow canvas. The stars stay at the rendered node centers as you pan and zoom. Zooming back in restores the normal canvas. The effect does not change the workflow or run any nodes.

## Show the running app

The local review instance runs the full n8n editor from this checkout. It uses a separate backend and a test database under `/tmp/n8n-constellation-app/data`.

Open http://127.0.0.1:5184/workflow/jmrK04z0Fp1QqrjU?hackmation=constellation in the Orca browser. This browser is signed in to the local demo account.

1. Select **Zoom to Fit** to see the full workflow.
2. Select **Zoom Out** four times to reveal the constellation.
3. Select **Zoom to Fit** to return. The workflow stays unchanged.
4. Select **Save constellation artwork** to change labels or download SVG and PNG files.

The Northstar sample has 33 nodes, 36 connections, and four section notes. It includes customer review, stock routing, pricing, three-way merge, notifications, and follow-up. Import `demo/northstar-workflow.json` into another local instance to reuse it. The sample is for visual review. Its HTTP nodes use example.com and require no credentials. Do not execute the sample as a business workflow.

## Run the lightweight harness

Use the installed editor dependencies. No backend server or monorepo build is needed.

From the repository root:

```sh
pnpm --dir packages/frontend/editor-ui exec vite --config src/features/workflows/canvas/components/constellation/demo/vite.config.ts --configLoader runner
```

Open **http://127.0.0.1:5181/**. The server binds to loopback. Port 5181 must be free.

1. Inspect the branched order workflow.
2. Select the canvas minus button several times, or scroll down over the canvas.
3. Below 32% zoom, the sky starts to appear. At 18%, the constellation is fully visible.
4. Pan the canvas. The stars stay connected to their node positions.
5. Zoom back in or select **Fit workflow** to restore the normal view.
6. Optionally select **Save constellation artwork** for the SVG and PNG export view.

The zoom transition stays inside the canvas. It does not open a dialog. `stardust` remains a secondary shortcut for the export view.

Use **Import workflow JSON** to load an n8n workflow export. Import stays in memory. **Reset sample** restores the example. The sample uses the n8n nodes and connections format. The demo uses real Vue Flow for zoom and pan. The canvas sky layer and export components use the same source as the app.

## Open it in the app

Open a workflow in the normal editor. Use the canvas zoom-out control, pinch out, or hold the canvas zoom modifier while scrolling. The normal n8n canvas controls still handle the viewport.

The reveal starts below 32% and finishes at 18%. Zoom back above 32% to restore the normal view. These thresholds are defined in `zoom.ts`.

`NodeView.vue` enables the effect on its `Canvas.vue` instance. `Canvas.vue` passes live Vue Flow nodes, edges, dimensions, and viewport data to `CanvasConstellation.vue`. Each star uses the rendered node center, including its dimensions and group offset. The sky does not intercept pointer events. Hidden nodes, group frames, and sticky notes are omitted.

The export button appears at low zoom. Add `?hackmation=constellation` to a workflow URL to show it at any zoom. The optional `stardust` shortcut also opens the export view. UI copy comes from `hackmation.constellation.*` i18n keys.

## Artwork

- Labels are off by default. The sky grid is on by default.
- The live canvas uses the existing viewport without recentering. The export view fits the graph to the image with one scale factor.
- Main connections use solid lines. Auxiliary connections use dotted lines. Unconnected nodes remain visible.
- Sticky notes and nodes with invalid positions are omitted.
- A small set of background stars pulse in opacity. Reduced motion disables the pulse. Closing the dialog removes the artwork from the DOM.
- SVG downloads are standalone vector images. PNG downloads are 3200 × 2000 pixels.
- Exports contain the visible artwork and optional node names. They do not contain node parameters, credentials, notes, workflow IDs, or execution data.
- All exports use local browser APIs. They do not send requests.

## Focused checks

From the repository root:

```sh
pnpm --dir packages/frontend/editor-ui exec vitest run --config demo/vite.config.ts --root src/features/workflows/canvas/components/constellation graph.test.ts zoom.test.ts --maxWorkers=1 --configLoader runner
pnpm --dir packages/frontend/editor-ui exec vue-tsc -p src/features/workflows/canvas/components/constellation/demo/tsconfig.json
pnpm --dir packages/frontend/editor-ui exec vite build --config src/features/workflows/canvas/components/constellation/demo/vite.config.ts --configLoader runner > /tmp/constellation-build.log 2>&1
git diff --check
```

The scoped typecheck covers the shared components and demo. It is not a full editor typecheck.

## Prototype limits

The demo uses Vue Flow with simplified workflow node cards. Its shell uses native controls to keep its dependency graph small. The app uses the same controls inside a native modal dialog. Node names can overlap in dense graphs. The chart does not show group boundaries or node execution state. Self-connections have no visible length. The in-memory import is a display preview, not a workflow importer or validator.

This checkout can reuse dependencies from an existing checkout through local, ignored `node_modules` links. The Vite config keeps its cache and build output inside this demo folder. Do not run an install through a dependency link.

Local verification artifacts, when present, are in `demo/evidence/`. That folder is ignored by Git.
