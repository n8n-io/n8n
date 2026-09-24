# Exploration: Custom Nodes & Custom Operations mockup

This document records what the codebase does today in the areas the mockup
touches. All paths are relative to the repository root. Line numbers are
approximate and refer to `master` at the time of writing (September 2026).

## 1. How node type descriptions are loaded and served

### Data structures

`packages/cli/src/load-nodes-and-credentials.ts` owns four structures:

| Field | Type | Purpose |
| --- | --- | --- |
| `loaders` | `Record<string, NodeLoader>` | One loader per package name. The only durable state. |
| `known.nodes` | `Record<fullType, { className, sourcePath }>` | Index of every node type the instance knows. Keys are `${packageName}.${nodeName}`. |
| `types.nodes` | `INodeTypeDescription[]` | One description per node version, name rewritten to the full type. This becomes `/types/nodes.json`. |
| `loaded.nodes` | `Record<string, LoadedClass>` | Cache of instantiated node classes (mainly synthetic AI tools). |

`postProcessLoaders()` (`load-nodes-and-credentials.ts:557-635`) rebuilds
`known` and `types` from all loaders, then runs the post-processors:
`createAiTools`, `createHitlTools`, `injectCustomApiCallOptions`, and every
function registered with `addPostProcessor`. `FrontendService` registers
`generateTypes()` as a post-processor (`frontend.service.ts:141`). It writes
`types/nodes.json`, `types/node-versions.json` and `types/credentials.json`
into the static cache directory.

### Serving

`packages/cli/src/server.ts:490-517` (`protectTypeFiles`) registers an
authenticated `GET /types/nodes.json` that streams the pre-rendered file. The
per-node REST endpoint is `POST /rest/node-types` in
`packages/cli/src/controllers/node-types.controller.ts`, backed by
`NodeTypes.getDescriptionWithTranslation`.

`packages/cli/src/node-types.ts` is the runtime `INodeTypes`.
`getByNameAndVersion` resolves a full type name via
`LoadNodesAndCredentials.getNode(fullType)`, which splits the name on the
first `.` into `packageName` and `nodeName` and delegates to
`loaders[packageName].getNode(nodeName)`. A runtime node source therefore must
use a package name that contains no `.`.

### Icons

`DirectoryLoader.fixIconPaths` (`packages/core/src/nodes-loader/directory-loader.ts:443-476`)
rewrites `icon: 'file:foo.svg'` into `iconUrl: 'icons/<package>/<path>'` at load
time. `server.ts:349-368` serves `/icons/:packageName/*` by resolving the path
against the loader directory. This only works for `DirectoryLoader` instances.
The frontend (`packages/frontend/editor-ui/src/app/utils/nodeIcon.ts:113-116`)
prefixes any `iconUrl` that is not absolute with the instance base URL. A
`data:` URI would get the base URL prepended, so generated node types must
serve their icon from a real route.

### Runtime node sources that are not on disk

There is no `addNode` API. The supported extension point is the `NodeLoader`
interface (`packages/workflow/src/interfaces.ts:3299-3312`). A backend module
returns loaders from `nodeLoaders()`; `ModuleRegistry.loadModules` collects
them and `LoadNodesAndCredentials.init` calls `loadAll()` on each
(`load-nodes-and-credentials.ts:113-128`).

The MCP registry module is a working precedent that synthesizes node types
from **database rows**:

- `packages/cli/src/modules/mcp-registry/mcp-registry-node-loader.ts`
  implements `NodeLoader`, builds one `INodeTypeDescription` per row, stores a
  prototype-delegating `INodeType` in a private map and fills `known.nodes`
  and `types.nodes`.
- `packages/cli/src/modules/mcp-registry/registry/mcp-registry.service.ts:249-279`
  is the refresh cycle: `loader.setServers(rows)` → `loader.loadAll()` →
  `loadNodesAndCredentials.postProcessLoaders()` → `releaseTypes()` →
  `push.broadcast({ type: 'nodeDescriptionUpdated' })` → pubsub command for
  peer instances.

The mockup copies this pattern one-to-one.

### Reload without restart

Community package install (`packages/cli/src/modules/community-packages/community-packages.service.ts:511-585`)
does `unloadPackage` → `loadPackage` → `postProcessLoaders` → `releaseTypes`,
then broadcasts `reloadNodeType` / `removeNodeType` push events. The
frontend handler `packages/frontend/editor-ui/src/app/composables/usePushConnection/handlers/nodeDescriptionUpdated.ts`
refetches `types/nodes.json` and credential types. The nodes panel rebuilds
its actions list from `nodeTypesStore.visibleNodeTypes` through a watcher in
`NodeCreator.vue:145-157`.

## 2. How declarative nodes execute

A declarative node has no `execute` method. `NodeTypes.getByNameAndVersion`
(`packages/cli/src/node-types.ts:106-112`) assigns one that instantiates
`RoutingNode` (`packages/core/src/execution-engine/routing-node.ts`) and calls
`runNode()`. `shouldAssignExecuteMethod` (`packages/cli/src/utils.ts:102-113`)
treats a node as declarative when `description.requestDefaults` is defined.

`RoutingNode.runNode()` per item:

1. Resolves every key of `requestDefaults` as an expression with
   `$credentials` and `$version` in scope, and writes the result to the
   request options.
2. Walks every top-level property with `getRequestOptionsFromParameters`
   (`routing-node.ts:799-1101`). It respects `displayOptions`, recurses into
   the selected option of an `options` property (per-option `routing`), into
   the present keys of a `collection`, and into `fixedCollection` entries.
3. `routing.request` keys (`url`, `method`, `qs`, `headers`, `body`, ...) are
   expression-resolved with `$value` bound to the parameter value and
   assigned onto the options.
4. `routing.send` writes the parameter value into `body` or `qs` under
   `property`. With `propertyInDotNotation` (default `true`) it uses lodash
   `set`, so `line_items[0].price` creates the nested array and object.
5. If `description.credentials` has exactly one entry, `prepareCredentials`
   uses it. `makeRequest` then calls
   `helpers.httpRequestWithAuthentication(credentialType, options)`, which
   runs `CredentialsHelper.authenticate`. A credential with an
   `IAuthenticateGeneric` block (for example `StripeApi` adds
   `Authorization: Bearer {{$credentials.secretKey}}`) is applied without any
   code in the node.

Consequence for the mockup: a generated description with `requestDefaults`,
`credentials: [{ name: 'stripeApi', required: true }]` and `routing` on its
properties executes through the existing engine. No new execution code is
needed.

Small reference nodes: `packages/nodes-base/nodes/Adalo/Adalo.node.ts`
(per-option `routing.request`, `$credentials` in `baseURL`),
`packages/nodes-base/nodes/Gong/descriptions/UserDescription.ts`
(`routing.send` into `body`, collection with nested `routing`),
`packages/nodes-base/nodes/PostBin/PostBin.node.ts` (no credentials).

`packages/core/src/nodes-loader/directory-loader.ts:478-520`
(`applyDeclarativeNodeOptionParameters`) prepends the shared `Request Options`
collection (batching, SSL, proxy, timeout) to any node without `execute`.
That only happens inside `DirectoryLoader`, so a runtime loader has to apply
it itself if it wants the same options.

## 3. Nodes panel actions and the "Custom API Call" precedent

The node creator lives in
`packages/frontend/editor-ui/src/features/shared/nodeCreator/`.

### Actions list

`composables/useActionsGeneration.ts` exports `generateMergedNodesAndActions`.
For each visible non-trigger node it calls `generateNodeActions(node)` which
concatenates trigger, operation, resource and mode categories. For nodes with
a `resource` property, `resourceCategories` (`:264-327`) emits one
`ActionTypeDescription` per operation option with:

- `name`: the node type that gets added when the action is selected,
- `actionKey`: the operation value,
- `values: { operation }` and synthesized `displayOptions` for the resource,
- `codex.label`: the group heading (the resource display name),
- `codex.categories: ['Actions']`.

`composables/useActions.ts:107-156` (`injectActionsLabels`) splices a
`LabelCreateElement` before the first action of every distinct `codex.label`.
That is how the resource headings in the actions view are rendered. Adding a
"Custom operations" heading only requires pushing actions with
`codex.label = 'Custom operations'` into `actions[parentNodeType]`.

### Selecting an action

`ActionsMode.vue:176-210` → `getActionData(action)` (`useActions.ts:174-190`)
returns `{ name: displayName, key: action.name, value }`. `key` becomes the
node type to add. `actionDataToNodeTypeSelectedPayload` keeps only
`resource` / `operation` / `language` from `value`. After the node is added,
`setAddedNodeActionParameters` (`useActions.ts:405-418`) applies the action
values through `workflowDocumentStore.setLastNodeParameters`.

Because `key` is the action's `name`, an action can point at a **different
node type** than the node it is listed under. The mockup uses this: a Custom
Operation listed under Stripe has `name = 'n8n-custom.<id>'`, so selecting it
adds the generated node type, while the panel still shows it under Stripe.

### Custom API Call

Backend: `injectCustomApiCallOptions` (`load-nodes-and-credentials.ts:381-402`)
appends `{ name: 'Custom API Call', value: '__CUSTOM_API_CALL__' }` to every
`resource` and `operation` property of the latest version of any node whose
credentials support proxy auth (`supportsProxyAuth`, `:341-358`).

Frontend: the option is filtered out of the actions list
(`useActionsGeneration.ts:273, 353`) and shown as a footer hint in
`ActionsMode.vue:360-369`. Clicking it (`addHttpNode`, `:238-256`) emits a
`nodeTypeSelected` for `n8n-nodes-base.httpRequest` with
`{ authentication: 'predefinedCredentialType' }`. The credential-only nodes
(`packages/frontend/editor-ui/src/app/utils/credentialOnlyNodes.ts`) clone
the HTTP Request description and hard-code `nodeCredentialType` as a hidden
property. This pattern is the documented fallback for the mockup; the
declarative approach is preferred because the resulting node has real,
typed parameters.

### Adding to the canvas

`NodeCreation.vue:106-109` → `getAddedNodesAndConnections` (`useActions.ts:319-403`)
→ `useCanvasOperations.addNodes` (`:981-1055`). `resolveNodeData` applies
`NodeHelpers.getNodeParameters(properties, {}, true, false, node, description)`
so `default` values from the description become concrete parameters.
`visibleNodeTypes` (`app/stores/nodeTypes.store.ts:225-230`) excludes
`hidden: true` descriptions, but hidden types can still be added by name.

Nodes without `codex.categories` land in the default subcategory
("Action in an app"), see `nodeCreator.utils.ts:85-103`.

## 4. HTTP Request node and predefined credentials

`packages/nodes-base/nodes/HttpRequest/V3/Description.ts`:

- `authentication`: `none | predefinedCredentialType | genericCredentialType`.
- `nodeCredentialType` (`:85-99`): `type: 'credentialsSelect'`,
  `credentialTypes: ['extends:oAuth2Api', 'extends:oAuth1Api', 'has:authenticate']`.
- `genericAuthType` (`:113-125`): `credentialTypes: ['has:genericAuth']`.
- Request shape: `method`, `url`, `sendQuery` + `queryParameters.parameters[]`
  (or `specifyQuery: 'json'` + `jsonQuery`), `sendHeaders` +
  `headerParameters.parameters[]`, `sendBody` + `contentType` +
  `specifyBody` + `bodyParameters.parameters[]` / `jsonBody`.

`CredentialsSelect.vue`
(`packages/frontend/editor-ui/src/features/credentials/components/`) filters
credential types by those `has:` / `extends:` rules.

`packages/nodes-base/credentials/StripeApi.credentials.ts:45-52` defines
`authenticate: { type: 'generic', properties: { headers: { Authorization: '=Bearer {{$credentials.secretKey}}' } } }`.
A generated node that declares `credentials: [{ name: 'stripeApi' }]` reuses
the user's existing Stripe credential and gets the header applied by
`CredentialsHelper.authenticate`. For a Custom Node with generic auth, the
generated node declares the matching generic credential type
(`httpHeaderAuth`, `httpBasicAuth`, `httpBearerAuth`, `httpQueryAuth`), which
also carry `authenticate` blocks.

## 5. Settings pages and REST controllers

### Frontend: routes, sidebar, modals

The editor moved to `src/app/` and `src/features/`. There is no
`src/views/` or `src/router.ts` any more.

- Router: `packages/frontend/editor-ui/src/app/router.ts`. The `/settings`
  parent route is at `:607-620`. Community Nodes is a child at `:1123-1141`
  with `meta.middleware: ['authenticated', 'rbac', 'custom']` and a `custom`
  guard that reads `settingsStore.isCommunityNodesFeatureEnabled`.
- `VIEWS` enum: `packages/frontend/@n8n/frontend-constants/src/views.ts`.
- Sidebar: `packages/frontend/editor-ui/src/app/composables/useSettingsItems.ts`.
  Each item's `available` flag is derived from the route middleware through
  `canUserAccessRouteByName`. Module-contributed items come from
  `uiStore.settingsSidebarItems` (`:206`).
- **Frontend modules** are the modern way to add a settings page. A feature
  ships a `module.descriptor.ts` (type in
  `packages/frontend/@n8n/frontend-module-sdk/src/types/descriptor.ts`) with
  `routes`, `settingsPages`, `modals`, `locales`, `pushHandlers`. It is listed
  in `packages/frontend/editor-ui/src/app/modules.manifest.ts`.
  `moduleInitializer.ts` registers routes whose
  `meta.telemetry.pageCategory === 'settings'` under `VIEWS.SETTINGS` and
  registers `settingsPages` in the UI store only when
  `settingsStore.isModuleActive(moduleName)`. Worked example:
  `packages/frontend/editor-ui/src/features/ai/mcpAccess/module.descriptor.ts`.
- Modals: shell modals are listed statically in
  `packages/frontend/editor-ui/src/app/components/Modals.vue` and need an
  entry in `app/stores/defaults/modals.ts`. Module modals are registered
  through `modalRegistry.register({ key, component, initialState })` from
  `@n8n/frontend-module-sdk`, and rendered by `DynamicModalLoader.vue`.
  `Modal.vue` wraps `ElDialog` and needs a `name`. Data is passed with
  `uiStore.openModalWithData({ name, data })` and read from
  `uiStore.modalsById[key].data`.
- Multi-step modals hand-roll a `currentStep` ref, for example
  `features/settings/migrationReport/MigrateWorkflowModal.vue` and
  `features/core/auth/components/MfaSetupModal.vue`.
- Community Nodes view: `features/settings/communityNodes/views/SettingsCommunityNodesView.vue`
  with `CommunityPackageCard.vue` as the list item and a Pinia store in
  `communityNodes.store.ts`. API calls live in
  `packages/frontend/@n8n/rest-api-client/src/api/communityNodes.ts` and use
  `makeRestApiRequest(context, method, path, body)`.
- i18n: `packages/frontend/@n8n/i18n/src/locales/en.json`, flat dotted keys.

### Backend: controllers, modules, entities, migrations

- Decorators from `@n8n/decorators`: `@RestController(basePath)`,
  `@Get/@Post/@Put/@Patch/@Delete`, `@Body`, `@Query`, `@Param`,
  `@GlobalScope`, `@Licensed`. Handler signature is positional:
  `(req: AuthenticatedRequest, res, ...decoratedArgs)`. `AuthenticatedRequest`
  comes from `@n8n/db`. Small example:
  `packages/cli/src/environments.ee/variables/variables.controller.ee.ts`.
- Controllers are registered at import time; `ControllerRegistry.activate`
  (`packages/cli/src/server.ts:262`) mounts them under
  `/${endpoints.rest}/${basePath}`. A module imports its controller inside
  `init()` so the route only exists when the module runs.
- Backend modules: `packages/cli/src/modules/<name>/<name>.module.ts` with
  `@BackendModule({ name })` and `ModuleInterface` hooks `init`, `entities`,
  `settings`, `nodeLoaders`, `shutdown`. Module names must be listed in
  `MODULE_NAMES` (`packages/@n8n/backend-common/src/modules/modules.config.ts`)
  and, to be on by default, in `defaultModules`
  (`module-registry.ts:44-76`). See `scripts/backend-module/backend-module-guide.md`.
- Entities: modules own their entities (returned from `entities()`), for
  example `packages/cli/src/modules/type-availability-policies/database/entities/type-availability-policy.entity.ts`
  using `WithTimestampsAndStringId` and `@JsonColumn()` from `@n8n/db`.
  Repositories extend `Repository<T>` and take `DataSource` in the
  constructor (see `mcp-registry-server.repository.ts`).
- Migrations always live in `packages/@n8n/db/src/migrations/{common,sqlite,postgresdb}`,
  even for module tables. MySQL is no longer supported. `sqlite/index.ts` and
  `postgresdb/index.ts` are generated and gitignored; use
  `pnpm --filter=@n8n/db migration:new <Name>` to scaffold with a safe
  timestamp. A recent `createTable` + JSON column example is
  `common/1787841960965-CreateTypeAvailabilityPolicyTables.ts`.

## 6. Feature flags and settings exposed to the frontend

- Core settings: `FrontendService.getSettings()`
  (`packages/cli/src/services/frontend.service.ts:455`) returns
  `FrontendSettings` (`packages/@n8n/api-types/src/frontend-settings.ts`),
  including `activeModules` (`:298`).
- Module settings: `ModuleInterface.settings()` return values are collected
  in `ModuleRegistry.settings` and served by
  `GET /rest/module-settings` (`packages/cli/src/controllers/module-settings.controller.ts`).
  Their shape is declared in `FrontendModuleSettings`
  (`frontend-settings.ts:303+`), keyed by module name.
- Frontend: `packages/frontend/@n8n/stores/src/settings.store.ts` exposes
  `isModuleActive(name)` and `moduleSettings`. The idiom is
  `isModuleActive('chat-hub') && moduleSettings.value['chat-hub']?.enabled === true`.
- Env vars: `@Config` classes with `@Env('N8N_...')` from `@n8n/config`.
  Module-local configs live next to the module
  (`community-packages.config.ts`) and are read through `Container.get`.

## 7. Decisions taken from this exploration

1. **Backend module `custom-nodes`** with its own `NodeLoader`, entity,
   repository, service, controller and config, mirroring `mcp-registry`.
   The module is a default module. The first iteration gated `init()` on
   `N8N_CUSTOM_NODES_MOCKUP`; the flag was removed later so the branch is
   testable without extra setup.
2. **Generated declarative descriptions** executed by `RoutingNode`. One
   virtual node type per Custom Operation and per Custom Node, in a synthetic
   package `n8n-custom`. Custom Operations are `hidden` so they do not show
   up as standalone nodes.
3. **Frontend module** under `features/customNodes/` with a descriptor for
   the settings route, sidebar entry and modals. The nodes panel integration
   is a small addition to `useActionsGeneration.ts` that reads the
   `customOperation` marker on hidden node descriptions and pushes actions
   under the parent node with the `Custom operations` label.
4. **Icons** are served from `GET /rest/custom-nodes/:id/icon` and referenced
   via `iconUrl: 'rest/custom-nodes/<id>/icon'`. Custom Operations copy the
   parent node's `iconUrl` / `icon`.
5. **Migration** in `packages/@n8n/db/src/migrations/common`, one table
   `custom_node_definition` with a JSON column.
