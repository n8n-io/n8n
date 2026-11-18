# Print studio delivery

## Result

Implemented three workflow print styles with three palettes, real SVG and high-resolution PNG downloads, and a binary STL plaque export. The app integration reads the current workflow document. The standalone harness runs the same studio component and export code.

Demo: <http://127.0.0.1:5182/>

Server terminal: `term_b1daf57e-7525-41db-a3de-6a9dc3bd30ea`. The server remains running after handoff.

App trigger: press **Alt + Shift + P** on a workflow canvas. Add `?hackmation=prints` to show the explicit **Open print studio** button. See [README.md](./README.md) for commands and limits.

## Verification

- Vitest: 6 tests passed with one worker. Tests cover graph branches, metadata removal, invalid input, single nodes, nine distinct style/palette outputs, and STL topology.
- Browser: all three styles switched. Signature, warm, and monochrome palettes changed the preview.
- Browser: downloaded SVG and PNG for each style. All PNG headers report 3,600 × 4,500. All SVG files report 1,200 × 1,500.
- Browser: imported the coordinator's branched n8n workflow. Its node names and synthetic private markers do not appear in the exported SVG.
- Browser: an empty workflow showed the import error. A single-node workflow rendered. The 390 px mobile viewport had no horizontal overflow. No page errors occurred.
- STL download: 3,252,084 bytes and 65,040 triangles. The mesh bounds are 160 × 100 × 4 mm.
- Mesh test: every edge has two incident faces with opposite directions. The Euler characteristic is 2. The volume is positive.
- Coordinator's independent binary inspection: no degenerate triangles, consistent winding, and signed volume 33,119.65 mm³.
- Biome, Prettier, Oxlint, Vize, and focused Stylelint checks passed for changed files.
- The small renderer/demo Vue typecheck passed.
- Vue SFC script and template compilation passed for `PrintStudio.vue`, `WorkflowPrintStudio.vue`, and `NodeView.vue`.
- The standalone Vite production build passed. It warns about a large chunk because the harness reuses the English locale file.
- `git diff --check` passed.

The full app was not started. The app wrapper's full dependency typecheck was not completed: the reused design-system build lacks declarations, and the source dependency graph is not installed in this isolated checkout. No full frontend typecheck or monorepo build was run. Full-app runtime checks and comprehensive repository checks remain for CI or a normal dev instance.

## Evidence

Evidence directory: `/private/tmp/n8n-print-studio-evidence/`.

| File | Evidence |
| --- | --- |
| `blueprint-desktop.png` | Blueprint studio screenshot |
| `minimal-desktop.png` | Minimal studio screenshot |
| `circuit-desktop.png` | Circuit studio screenshot |
| `imported-desktop.png` | Imported workflow screenshot |
| `mobile.png` | Mobile screenshot |
| `n8n-blueprint-original.svg` and `.png` | Downloaded blueprint exports |
| `n8n-minimal-original.svg` and `.png` | Downloaded minimal exports |
| `n8n-circuit-original.svg` and `.png` | Downloaded circuit exports |
| `imported-workflow.svg` | Export from the private-marker fixture |
| `n8n-relief-160x100mm.stl` | Downloaded binary plaque |
| `browser-results.json` | Browser assertions and export sizes |
| `browser-check.mjs` | Browser verification script used in this checkout |
| `build.log` | Standalone production build output |
| `stylelint.log` | Focused style check output |

Independent mesh evidence: `/private/tmp/n8n-easter-egg-checks/stl-validation.json`.

## Modified files

All new files are under `packages/frontend/editor-ui/src/app/components/print-studio/`:

- `PrintStudio.vue`: shared studio UI.
- `WorkflowPrintStudio.vue`: app button, keyboard trigger, and design-system dialog.
- `art.ts`: geometry extraction, SVG rendering, PNG rendering, and downloads.
- `relief.ts`: closed height-field mesh and binary STL output.
- `copy.ts`: i18n adapter.
- `sample.ts`: representative branched workflow.
- `studio.css`: responsive studio styles.
- `art.test.ts`: focused export and topology tests.
- `demo/index.html`, `demo/main.ts`, and `demo/vite.config.ts`: standalone entry and server.
- `demo/vitest.config.ts` and `demo/tsconfig.json`: isolated checks.
- `README.md` and `REPORT.md`: instructions and delivery evidence.

Narrow integration edits:

- `packages/frontend/editor-ui/src/app/views/NodeView.vue`: pass current nodes and connections to the studio wrapper.
- `packages/frontend/@n8n/i18n/src/locales/en.json`: add only `printStudio.*` keys.

No backend, persistence, credential, telemetry, or execution files changed. No PR or push was made. All changes are staged. No local commit was created. The coordinator declined the commit approval prompt and will make the commit with its authorized tools.
