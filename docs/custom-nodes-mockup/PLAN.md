# Implementation plan: Custom Nodes & Custom Operations mockup

Branch: `feat/custom-nodes-mockup`. Feature flag: `N8N_CUSTOM_NODES_MOCKUP=true`.
Checklist items are ticked as they land. See `EXPLORATION.md` for the
codebase facts behind each decision and `DESIGN.md` for the write-up.

## 0. Groundwork

- [x] Read `CONTRIBUTING.md`, `AGENTS.md`, frontend `AGENTS.md`, backend module guide, migration guide
- [x] Write `EXPLORATION.md`
- [x] Write this plan
- [x] Commit docs

## 1. Shared types (`packages/@n8n/api-types`, `packages/workflow`)

- [x] `packages/@n8n/api-types/src/custom-nodes/` — definition schema
      (`CustomOperationDefinition`, `CustomOperationVersion`,
      `CustomNodeDefinition`, `CustomNodeAuth`, `CustomOperationInput`) as
      zod schemas with inferred types, plus request DTOs
      (`CreateCustomOperationDto`, `UpdateCustomOperationDto`,
      `CreateCustomNodeDto`, `UpdateCustomNodeDto`, `SetActiveVersionDto`,
      `UploadIconDto`) and the list response shape
- [x] `FrontendModuleSettings['custom-nodes']: { enabled: boolean }`
- [x] `packages/workflow/src/interfaces.ts` — optional
      `INodeTypeDescription.customOperation` marker
      (`{ definitionId, parentNodeType, customNodeId }`) so the nodes panel
      can find custom operations and their parent without a second request

## 2. Persistence (`packages/@n8n/db`, `packages/cli`)

- [x] Migration `CreateCustomNodeDefinitionTable` in
      `packages/@n8n/db/src/migrations/common/` via
      `pnpm --filter=@n8n/db migration:new`: table `custom_node_definition`
      with `id` varchar(36) PK, `name` varchar(255), `type` varchar(16)
      enum-checked (`operation` | `node`), `definition` json, timestamps
- [x] Entity `CustomNodeDefinitionEntity` in
      `packages/cli/src/modules/custom-nodes/database/` extending
      `WithTimestampsAndStringId` with `@JsonColumn() definition`
- [x] Repository `CustomNodeDefinitionRepository`
- [x] Regenerate `docs/generated/` schema docs — skipped (needs tbls/Docker),
      noted in DESIGN.md

## 3. Backend module `custom-nodes` (`packages/cli/src/modules/custom-nodes/`)

- [x] `custom-nodes.config.ts` — `@Env('N8N_CUSTOM_NODES_MOCKUP') enabled`
- [x] `custom-nodes.module.ts` — `@BackendModule({ name: 'custom-nodes' })`;
      `init()` returns early when disabled; `entities()`, `settings()`,
      `nodeLoaders()` (empty when disabled)
- [x] Register `custom-nodes` in `MODULE_NAMES` and `defaultModules`
- [x] `node-description.generator.ts` — pure function
      `definition -> IVersionedNodeType description(s)`:
      `requestDefaults` (baseURL + method-agnostic defaults), `credentials`
      (predefined or generic HTTP credential), `properties` with `routing`
      (`request.url/method/qs/headers/body` for fixed data, `send` for
      inputs), required inputs as top-level parameters, optional inputs in an
      `Additional Fields` collection, one description per stored version,
      `defaultVersion = activeVersion`, `customOperation` marker, `hidden`
      for operations, parent icon for operations, `iconUrl` route for nodes
- [x] `__tests__/node-description.generator.test.ts` — two focused tests
- [x] `custom-nodes-node-loader.ts` — `NodeLoader` for package `n8n-custom`,
      modelled on `McpRegistryNodeLoader`
- [x] `custom-nodes.service.ts` — list/get/create/update (new version)/set
      active version/delete/set icon; `refreshNodeTypes()` =
      `loader.setDefinitions` → `loadAll` → `postProcessLoaders` →
      `releaseTypes` → push `nodeDescriptionUpdated`; `seed()` on first run
- [x] `custom-nodes.seed.ts` — Stripe "Create Payment Link" operation and
      "Acme Billing" custom node with two operations and an SVG logo
- [x] `custom-nodes.controller.ts` — `@RestController('/custom-nodes')`:
      `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `POST /:id/active-version`,
      `DELETE /:id`, `POST /:id/icon`, `GET /:id/icon`
- [x] Build `workflow`, `api-types`, `db`, `cli`; typecheck; lint touched files

## 4. Frontend: API client, store, settings page

- [x] `packages/frontend/@n8n/rest-api-client/src/api/customNodes.ts`
- [x] `features/customNodes/customNodes.constants.ts` (view names, modal keys)
- [x] `features/customNodes/customNodes.store.ts` (Pinia)
- [x] `features/customNodes/module.descriptor.ts` — settings route
      `/settings/custom-nodes`, sidebar entry next to Community Nodes,
      modals (wizard, versions); register in `app/modules.manifest.ts`
- [x] `features/customNodes/views/SettingsCustomNodesView.vue` — list with
      name, kind, parent node, active version, version count; actions edit,
      versions, delete, replace logo
- [x] `features/customNodes/components/CustomNodeVersionsModal.vue` —
      version history with "Set active"
- [x] `settings.store.ts` — `isCustomNodesMockupEnabled`
- [x] i18n keys in `en.json`

## 5. Frontend: creation wizard and entry points

- [x] `features/customNodes/components/CustomNodeWizardModal.vue` with four
      steps: Choose (add to existing node with searchable picker, or new
      node with name/description/logo/base URL/auth), Request (method, URL,
      headers, query, body, "Import cURL" if the existing converter is
      reusable), Fields (table: each URL/header/query/body entry marked
      fixed / required / optional, display name, type, default), Review
      (generated parameters preview through `ParameterInputList` if
      feasible, otherwise static)
- [x] `composables/useCustomNodeDraft.ts` — map HTTP Request node
      parameters to a wizard draft
- [x] Header button "Create custom node" in
      `app/components/MainHeader/WorkflowDetails.vue` (flag-gated)
- [x] NDV button "Save as custom operation…" in
      `features/ndv/settings/components/NodeSettings.vue` for HTTP Request
      nodes (flag-gated), opens the wizard pre-filled

## 6. Frontend: nodes panel integration

- [x] `useActionsGeneration.ts` — read hidden node types with the
      `customOperation` marker and push `ActionTypeDescription`s with
      `codex.label = 'Custom operations'` into `actions[parentNodeType]`;
      the action `name` is the virtual node type so selection adds it
- [ ] Verify in the UI that Custom Nodes appear in "Action in an app" with their icon (not exercised)
- [ ] Verify in the UI that adding a custom operation from Stripe's action list
      adds a working node with the Stripe credential selector (backend path
      verified via API; UI not exercised)

## 7. Demo data, docs, verification

- [x] `docs/custom-nodes-mockup/fixtures/mock-stripe-workflow.json` —
      Webhook + Respond to Webhook workflow that mocks
      `POST /v1/payment_links`
- [x] `docs/custom-nodes-mockup/DEMO.md` — click-by-click script
- [x] `docs/custom-nodes-mockup/DESIGN.md` — problem, concepts,
      architecture (Mermaid), mocked vs production, deviations, open questions
- [x] `pnpm build` (full), `pnpm typecheck` for `cli` and `editor-ui`, eslint + biome on touched files
- [x] Boot with `N8N_CUSTOM_NODES_MOCKUP=true pnpm start` on a throwaway user
      folder; verified via REST: migration + seed, module settings, generated
      types in `types/nodes.json`, icon route, preview, create/version/set-active,
      and a workflow run of a custom Stripe operation against the mock webhook
      (Bearer header + form-encoded nested body arrived). The UI click-through
      was not exercised in this session (see DESIGN.md → Verification)
- [ ] Push branch, write final summary

## 8. Follow-ups from the first demo run (2026-09-19)

- [x] Fix: icon route exempt from the browser-id check (image requests logged the user out)
- [x] Custom operations become real Resource/Operation entries of the parent node
      (`ParentNodePatcher`: description injection + `execute` wrapping through `RoutingNode`)
- [x] Nodes panel: "Create custom node" as the last list item and highlighted on empty search
- [x] Remove the header button and the hidden virtual node types for operations
- [ ] UI walk-through of the new flow by the author
- [x] Rename user-facing "operations" to "actions"; new seed set (3 actions: Stripe, GitHub,
      Slack; 3 nodes: Acme Billing, Open-Meteo Weather, Feature Flags) with automatic
      re-seed on an outdated set and a "Reset demo data" button in Settings
