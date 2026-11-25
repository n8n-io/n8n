# AGENTS.md

Guidance for the knowledge module (`packages/cli/src/modules/knowledge`). See the [cli package AGENTS.md](../../../AGENTS.md) and the [root AGENTS.md](../../../../../AGENTS.md) for repo-wide conventions.

## Purpose

The module owns knowledge for Agents: uploaded files and their retrieval, and external vector-store connections. The implementation moved here from `packages/cli/src/modules/agents/` in P0 of the plan, with no user-facing change. The agents module is the only consumer today. Background and decisions: [Knowledge module plan](https://app.notion.com/p/3f85b6e0c94f8147b598e8bb4508ac86) (internal).

- `files/` holds uploaded-file knowledge: the file store (module init and disabled-module cleanup wire the configured blob backends), `KnowledgeFileService` (upload, list, delete; scope-based; `validateUploadMetadata` and `prepareUploadContent` are public because the collection file service calls them), the upload middleware, the storage naming helpers and the upload error.
- `entities/` holds `AgentFile` (table `agent_files`) and the collection entities: `KnowledgeCollection`, `SharedKnowledgeCollection`, `KnowledgeFile` (table `knowledge_file`), `KnowledgeVectorStore` and `AgentKnowledgeDependency`. Code in this module imports them from `entities/index.ts`, and a new entity goes there too. `repositories/` holds the repository of `AgentFile` (`KnowledgeFileRepository`), and `KnowledgeCollectionRepository` and `KnowledgeCollectionFileRepository` for the collection tables.
- `collections/` holds the collection code: `KnowledgeCollectionCatalogService` (the create, the list, the read, the change and the delete of shared collections, and the check that a collection belongs to the project in the path), `KnowledgeCollectionFileService` (upload, list and delete of the files of a collection) and their routes.
- `retrieval/` holds the sandbox mirror (`KnowledgeMirrorService`), the shell commands and their parsers, the request and result schemas, and `KnowledgeRetrievalService`, the entry point for consumers.
- `vector-stores/` holds vector-store construction, embedding credential resolution, the connection test and the error sanitiser. Agents calls them and supplies the credential provider.
- `telemetry/` holds the helpers that the knowledge telemetry events share.

## Boundary

Three contracts at the module root define the file knowledge boundary. The module implements them; consumers call them. Change them by agreement of everyone working on the module, not in a review comment.

- `knowledge-consumer-scope.ts`: identifies the consumer a call is made for and bounds the knowledge it can reach. `KnowledgeConsumerScope` is `{ kind: 'agent', projectId, agentId }`. Keep `projectId`: the sandbox id is derived from the instance id, the project id and the agent id, and it must stay byte-identical.
- `knowledge-retriever.ts`: what the module offers to consumers. `hasFiles`, `findFiles`, `searchText` and `readFile` take a scope and the request types in `retrieval/retrieval-schemas.ts`, and return its result types unchanged, because tool outputs must stay identical. `searchText` and `readFile` also take an optional observer that reports how long the call waited for the sandbox and the mirror.
- `knowledge-sandbox-provider.ts`: what the module needs from a consumer. A sandbox to mirror files into, command execution in it, warm-up and teardown. The agents module implements it over its sandbox runtime.

For the knowledge of an agent, the agents module keeps the controllers, `getAgentOrThrow` and every user and project permission check, the three `Tool` definitions, the sandbox runtime (`AgentSandboxRuntimeService` owns the sandbox ids and lifecycle), and the `AgentKnowledgeService` facade. For this knowledge, the knowledge module never checks project membership. Ownership is the caller's job. The caller also owns the fence around its writes: `KnowledgeFileService.uploadFiles` and `deleteFile` take a `KnowledgeWriteRunner`, and the agents facade passes its project-deletion lock through it. An upload inserts each row through the fence. The row delete does not run through it. An upload or a delete refreshes the sandbox mirror in the background, and the delete of the last file removes the sandbox. `KnowledgeRetrievalService.warmSandbox` and `destroySandbox` are the explicit versions: the agents facade calls them when the builder opens an agent and when an agent or a project is deleted. The file service runs an empty write through the fence before and after that refresh, so a mirror that finishes after the consumer stops accepting writes is removed.

Collections are different. Their routes live in this module, in `collections/`, under `/projects/:projectId/knowledge/collections`, and each route carries `@ProjectScope`. Collections have no scopes of their own yet, so the agent scopes of the project in the URL decide: `agent:read` to see a collection and `agent:update` to create or change one. A user without the scope on the project gets 403. The list is the exception to the project route: it shows the collections of many projects, so `GET /knowledge/collections` has no project in the URL and no scope decorator, like `GET /credentials`. The service keeps the collections of the projects where the user has `agent:list`, as the agent list does, or of every project for a global `agent:list` scope.

`KnowledgeCollectionCatalogService` serves the create. It checks the scope again, for callers that do not go through the route, and makes sure that the project exists, because a global scope passes the scope check for any id. It writes the collection and its owner row in one transaction, derives the slug from the name (a nano id when the name has no Latin letters or digits), and returns the collection with its home project and its file and agent totals.

`GET /projects/:projectId/knowledge/collections/:collectionId` returns the collection in the same shape. The routes of one collection call `KnowledgeCollectionCatalogService.getInProject`. It checks the collections flag, the scope of the user on the project in the path, and that this project is the home project of the collection. The route checks the scope too. The check in the service is for callers that do not go through the route. A collection of another project answers 404, as a missing one does. So does the private collection of an agent (no `projectId`): these routes serve shared collections only. One route needs agent data: `GET /projects/:projectId/knowledge/collections/:collectionId/agents`. It lives in the agents module and calls `KnowledgeCollectionCatalogService.listAgentIds`.

`PATCH` and `DELETE` of one collection need `agent:update`, and both use the project of the URL. A `PATCH` of a collection of another project answers 404. A `DELETE` of a missing collection, or of one of another project, answers 200 and deletes nothing, as the delete of a missing knowledge file does. A rename keeps the slug. A delete removes the collection row, and the database cascade removes its file, vector store, share and agent link rows. The stored file bytes stay (see the cascade note below).

`KnowledgeSandboxProvider` is bound at runtime through `knowledge-sandbox-provider-proxy.ts`. `KnowledgeSandboxProviderProxy` is a `@Service` that implements the contract and delegates to the provider a consumer registers with it (the pattern of `workflow-index/agent-usage-provider-proxy.service.ts`). The agents module registers `AgentKnowledgeSandboxProvider`, its adapter over `AgentSandboxRuntimeService`, during `init()`. Code in this module injects the proxy class, never the adapter. A call before any registration throws: the module cannot mirror or search files without a sandbox, so that is a wiring mistake, not a state to degrade into. `destroy` is the exception: teardown never throws, and without a provider there is no sandbox to delete. `KnowledgeRetrievalService` in `retrieval/` implements `KnowledgeRetriever`. Consumers inject it by class and pass their scope.

Vector-store operations use a caller-supplied `CredentialProvider` from `@n8n/agents`. Agents supplies its `AgentsCredentialProvider` adapter.

### What a consumer imports

There is no barrel for the module. A consumer imports by path (`@/modules/knowledge/...`) and never re-exports a symbol of this module. The agents module uses this surface today:

- Availability: `knowledge-availability.service.ts`, before every knowledge call.
- The boundary: `knowledge-consumer-scope.ts`, `knowledge-retriever.ts`, `knowledge-sandbox-provider.ts` and `knowledge-sandbox-provider-proxy.ts` (to register its adapter).
- Files: `files/knowledge-file.service.ts`, `files/knowledge-file-cleanup.service.ts`, `files/knowledge-upload.middleware.ts`, `files/knowledge-upload.error.ts`, and `assertKnowledgePathSegment` from `files/storage-naming.ts`, which the sandbox runtime applies to the ids that form a sandbox path.
- Retrieval: `retrieval/knowledge-retrieval.service.ts`, and the tool input schemas and result types from `retrieval/retrieval-schemas.ts`.
- Vector stores: `vector-stores/factory.ts`, `vector-stores/embedding-credential.ts`, `vector-stores/error-sanitizer.ts` and `vector-stores/connection-test.service.ts`.
- Telemetry: `telemetry/helpers.ts`.
- Collections: `collections/knowledge-collection.service.ts`, for the agents of a collection.
- The repository, `repositories/knowledge-file.repository.ts`, only for the telemetry totals (the publish event and the daily knowledge snapshot), behind `KnowledgeAvailabilityService`. A new consumer reads through the services, not the repository.

This module imports nothing from `modules/agents` outside its tests. `vector-stores/__tests__/read-only.test.ts` builds an agent from a JSON config to prove that the search path never writes to a store. No Code Health rule enforces this direction yet; keep it by review.

## Where code goes

```
knowledge.module.ts                      module registration, byte-store wiring, settings
knowledge.config.ts                      upload limits and the collections override (N8N_KNOWLEDGE_*)
knowledge-availability.service.ts        the one availability check
knowledge-consumer-scope.ts              the boundary: the scope
knowledge-retriever.ts                   the boundary: what the module offers
knowledge-sandbox-provider.ts            the boundary: what the module needs
knowledge-sandbox-provider-proxy.ts      runtime binding of the provider
collections/                             collection services and routes
entities/                                entity classes
repositories/                            repositories
files/                                   upload, storage and file service code
retrieval/                               sandbox mirror, retrieval service, search commands, schemas
telemetry/                               helpers shared by the knowledge telemetry events
vector-stores/                           external vector-store connections, connection test, error sanitiser
```

## Rules

- A move and a behaviour change never share a PR. A move PR has two commits: `git mv` plus import fixes, then the adaptation.
- Moving code here needs no database migration. A moved entity keeps its table.
- The agents-module facade keeps its name (`AgentKnowledgeService`) and the repository keeps its `...ByAgentId` method names until the schema change that makes them scope-based.
- Business logic must not import `@n8n/typeorm`. Put operator queries behind use-case-named repository methods.
- Tool names, descriptions, inputs and outputs stay identical to what the agents module exposes. `modules/agents/tools/knowledge/__tests__/search-knowledge.tool.snapshot.test.ts` pins them; update its snapshot only together with a deliberate tool change. Sandbox ids stay unchanged; `modules/agents/__tests__/knowledge-sandbox-provider.adapter.test.ts` pins their derivation.
- Add an `@Env` property only in the PR that reads it: its JSDoc is exported to the public environment variable reference, so a variable must not appear there before it does something. Follow the `n8n:env-var-docs` skill.
- The upload limits live in `knowledge.config.ts` (`KnowledgeConfig`, the `N8N_KNOWLEDGE_*` variables; the size limits are integer megabytes, the file count is a plain number). The upload middleware, the file service and the collection file service read them, and `settings()` exposes them to the editor as `moduleSettings.knowledge.limits` in bytes and counts, so the editor rejects an upload with the same limits before the request. A limit shows in a message as whole megabytes below one gigabyte and as gigabytes from there on (`formatMbOrGb` in `@n8n/utils`), on both sides. The defaults equal the constants in `@n8n/api-types`, which the editor falls back to while the module is off. A new limit goes into the same class with the same prefix; never rename a variable, because operators configure it.
- Log with `logger.scoped('knowledge')`.
- A database cascade removes `knowledge_file` rows, but never their stored bytes. Three paths do this: a project delete, an agent delete (through its private collection) and a collection delete. A project delete covers the collections that it owns and the private collections of its agents. The cascade also runs while the module or the collections flag is off, so the code that deletes these bytes must work without the entity metadata, as `KnowledgeFileCleanupService` does for `agent_files`. No code deletes them yet, so each of these deletes leaves the bytes in storage. Collection uploads do not run inside the project-deletion fence. The `down()` of `CreateKnowledgeCollectionTables` drops the tables and leaves the bytes in storage, because no module code runs before a migration revert.

## Disabled module

`N8N_DISABLED_MODULES=knowledge` skips the module's `init()` and `entities()`. `AgentFile` is then not registered with TypeORM while the `agent_files` table still exists, and an unguarded `KnowledgeFileRepository` call fails with a metadata error. Feature calls stay away from `KnowledgeFileRepository` while the module is off. Deletion uses the cleanup repository below.

`knowledge-availability.service.ts` (`KnowledgeAvailabilityService`) is the one place that answers whether knowledge is available: `isModuleActive()` and `isFileKnowledgeEnabled()` (module active and sandbox on). Every consumer asks it before a knowledge call, derives its own flags from it, and raises the error that fits its own surface. The check runs at two levels on purpose: the controllers answer the user with the same 404 as the sandbox gate, and the facade protects the callers that bypass the controllers, today the deletion cascades. With the module off:

- `agents.knowledgeBaseEnabled` is false, so the editor hides the files panel in the agent's Knowledge tab.
- The file routes and the knowledge warm-up route return the same 404 as the sandbox gate: `Agent knowledge base is not enabled`.
- The `AgentKnowledgeService` facade rejects upload, list, warm-up and single-file delete before it touches the repository.
- Runtime reconstruction attaches the workspace but not the knowledge tools, and does not call `KnowledgeRetrievalService`.
- The telemetry reads of the file totals (the publish event and the daily knowledge snapshot) report no files.
- Agent and project deletion call `KnowledgeFileCleanupService` before the database cascade removes the file rows. Its cleanup repository reads storage references without entity metadata. It registers configured byte stores on demand and deletes the bytes through `KnowledgeFileStore`. The deletion hooks log cleanup failures and continue. `destroyKnowledgeSandbox` still runs: `KnowledgeRetrievalService.destroySandbox` reads no file row.
- Vector stores keep working. They are plain code, not an entity.

Each guard has a test. A new consumer, or a new knowledge call in the agents module, asks `KnowledgeAvailabilityService` and gets a test.

## Collections flag

Collections ship behind the PostHog flag `KNOWLEDGE_COLLECTIONS_FLAG` (`146_knowledge_collections`, in `@n8n/api-types`).

- The backend asks `KnowledgeAvailabilityService.isCollectionsEnabled()`. It is true only when the module is active, and the operator override or the flag is on. The flag is read for the instance, because retrieval runs without a user.
- The editor asks `useIsCollectionsEnabled()` in `editor-ui/src/features/shared/knowledge`. It applies the same rule. `PostHogClient` lists the flag in `EDITOR_INSTANCE_FLAGS`, so the editor gets the instance result.
- Nothing else reads the flag. Put every collection endpoint, page and retrieval path behind these helpers.
- The flag deletes no data. An agent's own knowledge does not depend on it.
- `N8N_KNOWLEDGE_COLLECTIONS_ENABLED=true` (`collectionsEnabled` in `knowledge.config.ts`) turns collections on without PostHog. `false` falls back to PostHog. The backend helper reads the config. The editor helper reads it from `moduleSettings.knowledge.collectionsEnabled`. This is the pattern of `N8N_EVAL_COLLECTIONS_ENABLED`.
