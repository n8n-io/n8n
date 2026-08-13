# Workflow generative UI (local spike)

1. `pnpm start` and `pnpm dev:fe` from repo root.
2. Open a workflow. Top-right: View → Story or Play-by-play.
3. Paste a Claude key when asked (stored in localStorage `n8n.workflowGenerativeUi.apiKey`).
4. Playground: open http://localhost:8080/generative-ui.

Do not commit the key. Adding a catalog type: Zod in `catalog.ts`, Vue file, register in `registry.ts`, optional row in `nodeActionMap.ts`.
