# AGENTS.md

Guidance for the knowledge module (`packages/cli/src/modules/knowledge`). See the [cli package AGENTS.md](../../../AGENTS.md) and the [root AGENTS.md](../../../../../AGENTS.md) for repo-wide conventions.

> Note: This module is currently WIP. P0 moves the implementation here from `packages/cli/src/modules/agents/` with no user-facing change. P1 adds collections that several agents share. See `WIP Note` comments in it's files for more info.

## Purpose

The module owns knowledge for Agents: uploaded files and their retrieval, and external vector-store connections.

The plan and its decisions live in Notion: [Knowledge module: shared knowledge layer for Agents](https://app.notion.com/p/3f85b6e0c94f8147b598e8bb4508ac86) and the [P0 implementation plan](https://app.notion.com/p/3fe5b6e0c94f803b88b8ff711d11e500). Tickets are in the Linear project "Shared Knowledge Layer" (team `KNO`).

## Boundary

Three interfaces at the module root define the boundary. Every P0 PR implements against them. Change them with the agreement of the whole P0 group, not in review comments.

- `knowledge-consumer-scope.ts`: who is asking. `KnowledgeConsumerScope` is `{ kind: 'agent', projectId, agentId }`. Keep `projectId`: the sandbox id is derived from the instance id, the project id and the agent id, and it must stay byte-identical.
- `knowledge-retriever.ts`: what the module offers to consumers. `hasFiles`, `findFiles`, `searchText` and `readFile` take a scope and today's request type and return today's result type unchanged, because tool outputs must stay byte-identical.
- `knowledge-sandbox-provider.ts`: what the module needs from a consumer. Exactly the sandbox calls the mirror service makes today, plus `warm` and `destroy`. The agents module implements it over its sandbox runtime. Nothing more, so the P1 sandbox inversion can shrink it to the scope type.

The agents module keeps the controllers, `getAgentOrThrow` and every user and project permission check, the three `Tool` definitions, the workspace half of the sandbox runtime, and the `AgentKnowledgeService` facade. The knowledge module never checks project membership. Ownership is the caller's job.

## Layout after P0

```
knowledge.module.ts            default-enabled, unlicensed; entities()
knowledge.config.ts            upload limits as env vars; defaults equal the api-types constants
knowledge-consumer-scope.ts    the scope
knowledge-retriever.ts         offered to consumers
knowledge-sandbox-provider.ts  required from a consumer
knowledge-availability.ts      whether knowledge is available; consumers derive their flags from it
entities/                      knowledge-file.entity.ts (table agent_files, unchanged)
repositories/                  knowledge-file.repository.ts
files/                         file service, file store, storage naming, pdf text, upload middleware
retrieval/                     mirror service, commands, retrieval schemas, in-process reader
vector-stores/                 connection test, factory, embedding credential, error sanitizer
```

## Rules

- Never combine a move with a behaviour change. A move PR has two commits: `git mv` plus import fixes, then the adaptation.
- No database migration in P0. `KnowledgeFile` maps to the unchanged `agent_files` table.
- Naming freeze in P0: the facade keeps the name `AgentKnowledgeService`. Repository methods keep `findByAgentId`, `hasFilesForAgent` and `findByIdAndAgentId` until P1.
- Business logic must not import `@n8n/typeorm`. Put operator queries behind use-case-named repository methods.
- Tool names, descriptions, inputs and outputs stay byte-identical through P0. Sandbox ids stay unchanged.
- The JSDoc on every `@Env` property in `knowledge.config.ts` is public documentation. Follow the `n8n:env-var-docs` skill.
- Log with `logger.scoped('knowledge')`.

## Disabled module

`N8N_DISABLED_MODULES=knowledge` skips the module's `init()` and `entities()`. Its entities are then not registered with TypeORM while the `agent_files` table still exists, so a repository call fails. This is the only kill switch P0 has.

`knowledge-availability.ts` (`KnowledgeAvailability`) is the one place that answers whether knowledge is available: `isModuleActive()` and `isFileKnowledgeEnabled()` (module active and sandbox on). Every consumer asks it before a knowledge call, derives its own flags from it, and raises the error that fits its own surface. With the module off:

- `agents.knowledgeBaseEnabled` is false, so the editor hides the files panel in the agent's Knowledge tab.
- The file routes and the knowledge warm-up route return the same 404 as the sandbox gate: `Agent knowledge base is not enabled`.
- The `AgentKnowledgeService` facade rejects every file operation before it touches the repository. `destroyKnowledgeSandbox` still runs: it needs no entity.
- Runtime reconstruction attaches the workspace but not the knowledge tools, and does not query the file repository.
- Agent and project deletion catch the facade error, log a warning and continue. The `agent_files` rows go with the agent through the foreign key; the stored bytes stay behind while the module is off.
- Vector stores keep working. They are plain code, not an entity.

Each guard has a test. A new consumer or a new knowledge call in the agents module asks `KnowledgeAvailability` and gets a test.
