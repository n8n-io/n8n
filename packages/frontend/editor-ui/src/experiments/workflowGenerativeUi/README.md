# Workflow generative UI (local spike)

1. `pnpm start` and `pnpm dev:fe` from repo root.
2. Open a workflow. Top-right: View → Story or Play-by-play.
3. Paste a Claude key when asked (stored in localStorage `n8n.workflowGenerativeUi.apiKey`).
4. Playground: open http://localhost:8080/generative-ui.

Do not commit the key.

## Extending the visual grammar

Add a catalog type in this order:

1. **Zod props in `catalog.ts`** — wrap with `withVisualProps(...)` from `visualGrammar.ts` so semantic expression props and the token escape hatch stay shared.
2. **Vue component** under `components/` — map props through `visualStyle` / data attributes; resolve logos only via `nodeId` + `NodeBrand`.
3. **Register** in `registry.ts`.
4. **Optional** mapping row in `nodeActionMap.ts` when the type should be the default for a node type.
5. **Disclosure paths** (if expandable) use `disclosureStatePath([...])` from `disclosure.ts` so state keys stay stable across SpecStream follow-ups (`/disclosure/<slug>`).

Prefer narrative (`Hero`, `Summary`, `Chapter`, `Beat`, `Caption`, `Cluster`) and composition (`Stack`, `Grid`, `Split`, `Timeline`, `Branch`, `Spotlight`) primitives over new one-off shells. `Cluster.nodeIds` must list every included node id.

## Styling guardrails

- Prefer **semantic props**: `emphasis`, `density`, `tone`, `orientation`, `disclosure`, `motion`, `variant`.
- Token escape hatch only: `accent`, `surface`, `radius`, `pad` — values must be from the allow-lists in `visualGrammar.ts` (`--color--*`, `--spacing--*`, `--radius--*`). Validation rejects anything else.
- **Never** emit raw CSS, hex, px, class names, SVG, icon/image URLs, or animation code from generated specs. Vue owns styling, responsiveness, accessibility, and `prefers-reduced-motion`.

## Caveats

- **What leaves the browser.** `workflowPayload.ts` strips credentials, but node parameter
  values are sent to Anthropic verbatim. Don't demo on a workflow with a token, password or
  customer data pasted into a node field — use the playground fixtures or a scrubbed copy.
- **zod version.** json-render's published peer range wants zod ^4; this repo pins zod 3
  through the root `pnpm.overrides`. The catalog schemas and `Spec` parsing this spike uses
  behave the same on both, so the peer warning is expected. A wider adoption of json-render
  would need the peer resolved properly.
- **Live harness.** `live.harness.test.ts` runs only when `ANTHROPIC_API_KEY` is set or
  `.superpowers/sdd/2026-08-13-workflow-generative-ui/.anthropic-key` exists. It asserts
  `catalog.validate`, required `Screen.summary`, real `nodeId`s, narrative primitives on Story,
  and non-`Stack` composition for workflows with ≥4 visible operations.
