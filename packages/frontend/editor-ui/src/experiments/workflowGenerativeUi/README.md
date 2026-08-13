# Workflow generative UI (local spike)

1. `pnpm start` and `pnpm dev:fe` from repo root.
2. Open a workflow. Top-right: View → Story or Play-by-play.
3. Paste a Claude key when asked (stored in localStorage `n8n.workflowGenerativeUi.apiKey`).
4. Playground: open http://localhost:8080/generative-ui.

Do not commit the key. Adding a catalog type: Zod in `catalog.ts`, Vue file, register in `registry.ts`, optional row in `nodeActionMap.ts`.

## Caveats

- **What leaves the browser.** `workflowPayload.ts` strips credentials, but node parameter
  values are sent to Anthropic verbatim. Don't demo on a workflow with a token, password or
  customer data pasted into a node field — use the playground fixtures or a scrubbed copy.
- **zod version.** json-render's published peer range wants zod ^4; this repo pins zod 3
  through the root `pnpm.overrides`. The catalog schemas and `Spec` parsing this spike uses
  behave the same on both, so the peer warning is expected. A wider adoption of json-render
  would need the peer resolved properly.
