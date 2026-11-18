# Workflow constellation

This Hackmation prototype turns a workflow into a star chart. It keeps the node positions and connections. It does not change the workflow or run any nodes.

## Run the demo

Use the installed editor dependencies. No backend server or monorepo build is needed.

From the repository root:

```sh
pnpm --dir packages/frontend/editor-ui exec vite --config src/features/workflows/canvas/components/constellation/demo/vite.config.ts --configLoader runner
```

Open **http://127.0.0.1:5181/**. The server binds to loopback. Port 5181 must be free.

1. Inspect the branched order workflow.
2. Select **View constellation**. You can also type `stardust` outside an input.
3. Enable **Show node names** or disable **Show sky grid**.
4. Select **Download SVG** or **Download PNG**.
5. Select **Back to workflow** or press Escape.
6. Open the constellation again. The workflow stays unchanged.

Use **Import workflow JSON** to load an n8n workflow export. Import stays in memory. **Reset sample** restores the example. The sample uses the n8n nodes and connections format. The demo canvas is a lightweight preview. The constellation overlay, graph projection, motion, and downloads use the same source components as the app.

## Open it in the app

Open a workflow in the normal editor. Type `stardust` outside inputs and dialogs. Each letter must follow the previous letter within 1.8 seconds. The sequence consumes matching key events before canvas shortcuts can change selected nodes.

For an explicit demo button, add `?hackmation=constellation` to the workflow URL. Use `&hackmation=constellation` if the URL already has a query string. Select **View constellation** near the top of the canvas.

`NodeView.vue` mounts `WorkflowConstellation.vue`. The adapter reads nodes and connections from the injected workflow document store. It gets UI copy from the `hackmation.constellation.*` i18n keys.

## Artwork

- Labels are off by default. The sky grid is on by default.
- One scale factor preserves the graph geometry. The chart centers the graph without changing its layout.
- Main connections use solid lines. Auxiliary connections use dotted lines. Unconnected nodes remain visible.
- Sticky notes and nodes with invalid positions are omitted.
- A small set of background stars pulse in opacity. Reduced motion disables the pulse. Closing the dialog removes the artwork from the DOM.
- SVG downloads are standalone vector images. PNG downloads are 3200 × 2000 pixels.
- Exports contain the visible artwork and optional node names. They do not contain node parameters, credentials, notes, workflow IDs, or execution data.
- All exports use local browser APIs. They do not send requests.

## Focused checks

From the repository root:

```sh
pnpm --dir packages/frontend/editor-ui exec vitest run --config demo/vite.config.ts --root src/features/workflows/canvas/components/constellation graph.test.ts --maxWorkers=1 --configLoader runner
pnpm --dir packages/frontend/editor-ui exec vue-tsc -p src/features/workflows/canvas/components/constellation/demo/tsconfig.json
pnpm --dir packages/frontend/editor-ui exec vite build --config src/features/workflows/canvas/components/constellation/demo/vite.config.ts --configLoader runner > /tmp/constellation-build.log 2>&1
git diff --check
```

The scoped typecheck covers the shared components and demo. It is not a full editor typecheck.

## Prototype limits

The demo shell uses native controls to keep its dependency graph small. The app uses the same controls inside a native modal dialog. Node names can overlap in dense graphs. The chart does not show group boundaries or node execution state. Self-connections have no visible length. The in-memory import is a display preview, not a workflow importer or validator.

This checkout can reuse dependencies from an existing checkout through local, ignored `node_modules` links. The Vite config keeps its cache and build output inside this demo folder. Do not run an install through a dependency link.

Local verification artifacts, when present, are in `demo/evidence/`. That folder is ignored by Git.
