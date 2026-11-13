# AGENTS.md

Guidance for the knowledge module (`packages/cli/src/modules/knowledge`). See the [cli package AGENTS.md](../../../AGENTS.md) and the [root AGENTS.md](../../../../../AGENTS.md) for repo-wide conventions.

## Purpose

The module owns knowledge for Agents: uploaded files and their retrieval, and external vector-store connections. The implementation moved here from `packages/cli/src/modules/agents/` in P0 of the plan, with no user-facing change. The agents module is the only consumer today. Background and decisions: [Knowledge module plan](https://app.notion.com/p/3f85b6e0c94f8147b598e8bb4508ac86) (internal).

- `files/` holds uploaded-file knowledge: the file store (`init()` wires it to the configured blob backends), `KnowledgeFileService` (upload, list, delete; scope-based), the upload middleware, the storage naming helpers and the upload error.
- `entities/` holds `KnowledgeFile` (table `agent_files`); `repositories/` holds its repository.
- `retrieval/` holds the sandbox mirror (`KnowledgeMirrorService`), the shell commands and their parsers, the request and result schemas, and `KnowledgeRetrievalService`, the entry point for consumers.
- `vector-stores/` holds vector-store construction, embedding credential resolution, the connection test and the error sanitiser. Agents calls them and supplies the credential provider.
- `telemetry/` holds the helpers that the knowledge telemetry events share.

## Boundary

Three contracts at the module root define the file knowledge boundary. The module implements them; consumers call them. Change them by agreement of everyone working on the module, not in a review comment.

- `knowledge-consumer-scope.ts`: identifies the consumer a call is made for and bounds the knowledge it can reach. `KnowledgeConsumerScope` is `{ kind: 'agent', projectId, agentId }`. Keep `projectId`: the sandbox id is derived from the instance id, the project id and the agent id, and it must stay byte-identical.
- `knowledge-retriever.ts`: what the module offers to consumers. `hasFiles`, `findFiles`, `searchText` and `readFile` take a scope and the request types in `retrieval/retrieval-schemas.ts`, and return its result types unchanged, because tool outputs must stay identical.
- `knowledge-sandbox-provider.ts`: what the module needs from a consumer. A sandbox to mirror files into, command execution in it, warm-up and teardown. The agents module implements it over its sandbox runtime.

The agents module keeps the controllers, `getAgentOrThrow` and every user and project permission check, the three `Tool` definitions, the sandbox runtime (`AgentSandboxRuntimeService` owns the sandbox ids and lifecycle), and the `AgentKnowledgeService` facade. The knowledge module never checks project membership. Ownership is the caller's job. The caller also owns the fence around its writes: `KnowledgeFileService.uploadFiles` and `deleteFile` take a `KnowledgeWriteRunner`, and the agents facade passes its project-deletion lock through it. An upload inserts each row through the fence. The row delete does not run through it. An upload or a delete refreshes the sandbox mirror in the background, and the delete of the last file removes the sandbox. `KnowledgeRetrievalService.warmSandbox` and `destroySandbox` are the explicit versions: the agents facade calls them when the builder opens an agent and when an agent or a project is deleted. The file service runs an empty write through the fence before and after that refresh, so a mirror that finishes after the consumer stops accepting writes is removed.

`KnowledgeSandboxProvider` is bound at runtime through `knowledge-sandbox-provider-registry.ts`. `KnowledgeSandboxProviderRegistry` is a `@Service` that implements the contract and delegates to the provider a consumer registers with it (the pattern of `workflow-index/agent-usage-provider-proxy.service.ts`). The agents module registers `AgentKnowledgeSandboxProvider`, its adapter over `AgentSandboxRuntimeService`, during `init()`. Code in this module injects the registry class, never the adapter. A call before any registration throws: the module cannot mirror or search files without a sandbox, so that is a wiring mistake, not a state to degrade into. `destroy` is the exception: teardown never throws, and without a provider there is no sandbox to delete. `KnowledgeRetrievalService` in `retrieval/` implements `KnowledgeRetriever`. Consumers inject it by class and pass their scope.

Vector-store operations use a caller-supplied `CredentialProvider` from `@n8n/agents`. Agents supplies its `AgentsCredentialProvider` adapter.

### What a consumer imports

There is no barrel. A consumer imports by path (`@/modules/knowledge/...`) and never re-exports a symbol of this module. The agents module uses this surface today:

- Availability: `knowledge-availability.service.ts`, before every knowledge call.
- The boundary: `knowledge-consumer-scope.ts`, `knowledge-retriever.ts`, `knowledge-sandbox-provider.ts` and `knowledge-sandbox-provider-registry.ts` (to register its adapter).
- Files: `files/knowledge-file.service.ts`, `files/knowledge-upload.middleware.ts`, `files/knowledge-upload.error.ts`, and `assertKnowledgePathSegment` from `files/storage-naming.ts`, which the sandbox runtime applies to the ids that form a sandbox path.
- Retrieval: `retrieval/knowledge-retrieval.service.ts`, and the tool input schemas and result types from `retrieval/retrieval-schemas.ts`.
- Vector stores: `vector-stores/factory.ts`, `vector-stores/embedding-credential.ts`, `vector-stores/error-sanitizer.ts` and `vector-stores/connection-test.service.ts`.
- Telemetry: `telemetry/helpers.ts`.
- The repository, `repositories/knowledge-file.repository.ts`, only for the telemetry totals (the publish event and the daily knowledge snapshot), behind `KnowledgeAvailabilityService`. A new consumer reads through the services, not the repository.

This module imports nothing from `modules/agents` outside its tests. `vector-stores/__tests__/read-only.test.ts` builds an agent from a JSON config to prove that the search path never writes to a store. No Code Health rule enforces this direction yet; keep it by review.

## Where code goes

```
knowledge.module.ts                      module registration, byte-store wiring, settings
knowledge.config.ts                      upload limits (N8N_KNOWLEDGE_*)
knowledge-availability.service.ts        the one availability check
knowledge-consumer-scope.ts              the boundary: the scope
knowledge-retriever.ts                   the boundary: what the module offers
knowledge-sandbox-provider.ts            the boundary: what the module needs
knowledge-sandbox-provider-registry.ts   runtime binding of the provider
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
- The upload limits live in `knowledge.config.ts` (`KnowledgeConfig`, the `N8N_KNOWLEDGE_*` variables; the size limits are integer megabytes, the file count is a plain number). The upload middleware and the file service read them, and `settings()` exposes them to the editor as `moduleSettings.knowledge.limits` in bytes and counts, so the editor rejects an upload with the same limits before the request. A limit shows in a message as whole megabytes below one gigabyte and as gigabytes from there on (`formatMbOrGb` in `@n8n/utils`), on both sides. The defaults equal the constants in `@n8n/api-types`, which the editor falls back to while the module is off. A new limit goes into the same class with the same prefix; never rename a variable, because operators configure it.
- Log with `logger.scoped('knowledge')`.

## Disabled module

`N8N_DISABLED_MODULES=knowledge` skips the module's `init()` and `entities()`. `KnowledgeFile` is then not registered with TypeORM while the `agent_files` table still exists, and an unguarded `KnowledgeFileRepository` call fails with a metadata error. The guards below keep every caller away from the repository while the module is off.

`knowledge-availability.service.ts` (`KnowledgeAvailabilityService`) is the one place that answers whether knowledge is available: `isModuleActive()` and `isFileKnowledgeEnabled()` (module active and sandbox on). Every consumer asks it before a knowledge call, derives its own flags from it, and raises the error that fits its own surface. The check runs at two levels on purpose: the controllers answer the user with the same 404 as the sandbox gate, and the facade protects the callers that bypass the controllers, today the deletion cascades. With the module off:

- `agents.knowledgeBaseEnabled` is false, so the editor hides the files panel in the agent's Knowledge tab.
- The file routes and the knowledge warm-up route return the same 404 as the sandbox gate: `Agent knowledge base is not enabled`.
- The `AgentKnowledgeService` facade rejects upload, list, warm-up and single-file delete before it touches the repository.
- Runtime reconstruction attaches the workspace but not the knowledge tools, and does not call `KnowledgeRetrievalService`.
- The telemetry reads of the file totals (the publish event and the daily knowledge snapshot) report no files.
- Agent and project deletion cannot read the agent's files, so `deleteAllFilesForAgent` logs a warning and returns. The `agent_files` rows go with the agent through the database cascade, but their stored bytes stay in `binary_data` or the blob store. This is a known gap: an operator who deletes agents while the module is off leaves their knowledge bytes behind. `destroyKnowledgeSandbox` still runs: `KnowledgeRetrievalService.destroySandbox` reads no file row.
- Vector stores keep working. They are plain code, not an entity.

Each guard has a test. A new consumer, or a new knowledge call in the agents module, asks `KnowledgeAvailabilityService` and gets a test.
