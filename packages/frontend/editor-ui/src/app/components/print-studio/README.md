# Workflow print studio

Turn the current workflow graph into a print. The studio runs in the browser. It does not execute or save the workflow.

## Run the demo

From the repository root, with the editor dependencies installed:

```sh
pnpm --dir packages/frontend/editor-ui exec vite --config src/app/components/print-studio/demo/vite.config.ts
```

Open <http://127.0.0.1:5182/>. The server binds to loopback. It uses the same `PrintStudio.vue`, SVG renderer, PNG exporter, and STL exporter as the app. It does not need a backend or a monorepo build.

The supplied sample is an order workflow. It has a webhook, validation, a stock branch, notifications, a merge, and an update. Select each edition and palette. Use **Import workflow JSON** to preview another exported n8n workflow. The import stays in memory. Use **Use sample workflow** to reset it.

This checkout reuses installed dependency entries from the main checkout. The local `node_modules` directories own their Vite caches. No dependency or lockfile change is required.

## Open it in n8n

1. Open a workflow in the editor.
2. Press **Alt + Shift + P** while focus is on the canvas.
3. For an explicit demo button, add `?hackmation=prints` to the workflow URL. Use `&hackmation=prints` if the URL already has query parameters.
4. Select **Open print studio** at the top left of the canvas.
5. Close the dialog with its close button or **Escape**.

The app passes the live document's `allNodes` and `connectionsBySourceNode`. The studio loads its renderer when the dialog opens. The shortcut ignores text inputs, editable fields, open dialogs, and repeated key events.

## Export formats

| Format | Output |
| --- | --- |
| Blueprint | Fine lines, construction grid, numbered nodes, and a drawing frame |
| Bold minimal | Large geometric nodes, thick connections, and a cropped color disc |
| Circuit engraving | Routed traces, chip pins, etched texture, and mounting marks |
| SVG | 1,200 × 1,500 view box, solid background, editable vectors |
| PNG | 3,600 × 4,500 pixels, solid background |
| STL | Binary mesh, 160 × 100 mm, 2 mm base, up to 2 mm raised graph |

All three art styles have signature, warm, and monochrome palettes. Exports omit workflow names, node names, parameters, credentials, and sticky notes. Node numbers refer only to geometry. The artwork uses fixed English display titles.

The STL uses a continuous triangulated height field. The base joins all features into one solid object. Its 1 mm grid creates 65,040 triangles. It has no separate floating shells. Set the slicer units to millimeters. The graph uses straight connections. The print style and palette do not change the STL geometry.

## Focused checks

Run these from the repository root:

```sh
pnpm --dir packages/frontend/editor-ui exec vitest run --config src/app/components/print-studio/demo/vitest.config.ts --maxWorkers=1
pnpm --dir packages/frontend/editor-ui exec vue-tsc --project src/app/components/print-studio/demo/tsconfig.json --noEmit
pnpm --dir packages/frontend/editor-ui exec vite build --config src/app/components/print-studio/demo/vite.config.ts > /private/tmp/print-studio-build.log 2>&1
git diff --check
```

The small typecheck covers the shared studio and export code. It excludes the app wrapper and the full editor dependency graph. The demo build writes to `/private/tmp/n8n-print-studio-build`.

## Demo limits

- Imports accept up to 5 MB, 300 positioned nodes, and 2,000 connections. Extra connections are omitted.
- Graphs use their existing node positions. Dense graphs can overlap. Duplicate positions can hide nodes. Sticky notes do not become art.
- Self-connections have no visible length. This is decorative artwork, not an execution diagram.
- SVG text uses system fonts. Its appearance can vary slightly between viewers.
- PNG files contain pixel dimensions, not print DPI metadata.
- The STL is a prototype plaque. Inspect it in a slicer before printing. No physical print was made.
- No backend, telemetry, credential, or workflow execution behavior changes.
- Full-app runtime verification and full-repository checks remain separate from the standalone demo checks.
