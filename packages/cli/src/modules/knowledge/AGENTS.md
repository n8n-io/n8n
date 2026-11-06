# AGENTS.md

Guidance for the knowledge module (`packages/cli/src/modules/knowledge`). See the [cli package AGENTS.md](../../../AGENTS.md) and the [root AGENTS.md](../../../../../AGENTS.md) for repo-wide conventions.

## Purpose

The module owns knowledge for Agents: uploaded files and their retrieval, and external vector-store connections. The implementation is moving here from `packages/cli/src/modules/agents/` in steps, with no user-facing change.

Vector-store construction, embedding credential resolution and connection testing now live in this module. Agents calls them and supplies the credential provider. Uploaded-file knowledge lives in `files/` (the file store, which `init()` wires to the configured blob backends; the file service, `KnowledgeFileService`: upload, list, delete, scope-based; the upload middleware, the storage naming helpers and the upload error), plus the entity (`KnowledgeFile`, table `agent_files`) in `entities/` and its repository in `repositories/`. Retrieval (the sandbox mirror and the search commands) still lives in Agents. Background and decisions: [Knowledge module plan](https://app.notion.com/p/3f85b6e0c94f8147b598e8bb4508ac86) (internal).

## Boundary

Three contracts at the module root define the file knowledge boundary. File knowledge code that moves into this module implements against them. Change them by agreement of everyone working on the module, not in a review comment.

- `knowledge-consumer-scope.ts`: identifies the consumer a call is made for and bounds the knowledge it can reach. `KnowledgeConsumerScope` is `{ kind: 'agent', projectId, agentId }`. Keep `projectId`: the sandbox id is derived from the instance id, the project id and the agent id, and it must stay byte-identical.
- `knowledge-retriever.ts`: what the module offers to consumers. `hasFiles`, `findFiles`, `searchText` and `readFile` take a scope and the request types the agents module uses, and return its result types unchanged, because tool outputs must stay identical.
- `knowledge-sandbox-provider.ts`: what the module needs from a consumer. A sandbox to mirror files into, command execution in it, warm-up and teardown. The agents module implements it over its sandbox runtime.

The agents module keeps the controllers, `getAgentOrThrow` and every user and project permission check, the three `Tool` definitions, the workspace half of the sandbox runtime, and the `AgentKnowledgeService` facade. The knowledge module never checks project membership. Ownership is the caller's job. The caller also owns the fence around its row writes: `KnowledgeFileService.uploadFiles` takes a `KnowledgeWriteRunner`, and the agents facade passes its project-deletion lock through it.

The contracts are compile-time only; nothing binds them at runtime yet. The change that first implements each one adds its binding: a concrete `@Service` for `KnowledgeRetriever` that consumers inject by class, and a registry `@Service` in this module for `KnowledgeSandboxProvider` that the agents module registers its adapter with during `init()` (the pattern of `workflow-index/agent-usage-provider-proxy.service.ts`). Until the retrieval schemas move here, `knowledge-retriever.ts` takes its request and result types from the agents module through `import type`, which is erased at runtime.

Vector-store operations use a caller-supplied `CredentialProvider` from `@n8n/agents`. Agents supplies its `AgentsCredentialProvider` adapter.

## Where code goes

```
entities/        entity classes
repositories/    repositories
files/           upload, storage and file service code
retrieval/       sandbox mirror, search commands, retrieval schemas
vector-stores/   external vector-store connections
```

## Rules

- A move and a behaviour change never share a PR. A move PR has two commits: `git mv` plus import fixes, then the adaptation.
- Moving code here needs no database migration. A moved entity keeps its table.
- Keep the names of the agents-module facade (`AgentKnowledgeService`) and of its repository methods while moving. Rename them only together with the schema change that makes them scope-based.
- Business logic must not import `@n8n/typeorm`. Put operator queries behind use-case-named repository methods.
- Tool names, descriptions, inputs and outputs stay identical to what the agents module exposes. Sandbox ids stay unchanged.
- Add an `@Env` property only in the PR that reads it: its JSDoc is exported to the public environment variable reference, so a variable must not appear there before it does something. Follow the `n8n:env-var-docs` skill. The upload limits (`MAX_AGENT_FILE_SIZE_BYTES`, `MAX_AGENT_FILES_PER_UPLOAD`, `MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES` in `@n8n/api-types`) become `KnowledgeConfig` env vars together with the upload middleware and the size check that read them, and with the editor reading the same values from module settings.
- Log with `logger.scoped('knowledge')`.

## Disabled module

`N8N_DISABLED_MODULES=knowledge` skips the module's `init()` and `entities()`. `KnowledgeFile` is then not registered with TypeORM while the `agent_files` table still exists, and an unguarded `KnowledgeFileRepository` call fails with a metadata error. The guards below keep every caller away from the repository while the module is off.

`knowledge-availability.service.ts` (`KnowledgeAvailabilityService`) is the one place that answers whether knowledge is available: `isModuleActive()` and `isFileKnowledgeEnabled()` (module active and sandbox on). Every consumer asks it before a knowledge call, derives its own flags from it, and raises the error that fits its own surface. The check runs at two levels on purpose: the controllers answer the user with the same 404 as the sandbox gate, and the facade protects the callers that bypass the controllers, today the deletion cascades. With the module off:

- `agents.knowledgeBaseEnabled` is false, so the editor hides the files panel in the agent's Knowledge tab.
- The file routes and the knowledge warm-up route return the same 404 as the sandbox gate: `Agent knowledge base is not enabled`.
- The `AgentKnowledgeService` facade rejects upload, list, warm-up and single-file delete before it touches the repository.
- Runtime reconstruction attaches the workspace but not the knowledge tools, and does not query the file repository.
- The telemetry reads of the file totals (the publish event and the daily knowledge snapshot) report no files.
- Agent and project deletion cannot read the agent's files, so `deleteAllFilesForAgent` logs a warning and returns. The `agent_files` rows go with the agent through the database cascade, but their stored bytes stay in `binary_data` or the blob store. This is a known gap: an operator who deletes agents while the module is off leaves their knowledge bytes behind. `destroyKnowledgeSandbox` still runs: it needs no entity.
- Vector stores keep working. They are plain code, not an entity.

Each guard has a test. A new consumer, or a new knowledge call in the agents module, asks `KnowledgeAvailabilityService` and gets a test.
