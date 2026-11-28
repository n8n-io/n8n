# AGENTS.md

Guidance for the custom MCP servers backend module (`packages/modules/mcp-servers/backend`).
Read the [modules AGENTS.md](../../../AGENTS.md), the [cli AGENTS.md](../../../../cli/AGENTS.md),
and the [root AGENTS.md](../../../../../AGENTS.md) for repo-wide conventions.

## What the module owns

- The four tables: `mcp_server`, `mcp_server_tool`, `mcp_server_connection`, and `mcp_server_block`.
- The REST routes for builders, overview listing, share pages, connections, and blocks.
- The stateless MCP runtime endpoint (`/mcp-servers/:slug`) and its per-server concurrency cap.
- The OAuth protected resource resolver for AI client sign-in (`McpServerProtectedResource`).

The module does not own workflow execution, the n8n Assistant model, or OAuth client and refresh
token storage. Those live in `packages/cli` behind ports.

## Layout

```
src/
  index.ts                  public API: main package export for other packages
  mcp-servers.module.ts     entrypoint (`./module` export): ports, controllers, entities
  mcp-servers.config.ts     environment configuration (`McpServersConfig`)
  AGENTS.md                 this guide
  controllers/              REST routes and the runtime HTTP endpoint
  services/                 business logic, gates, runtime, protected resource, run cap
  ports/                    abstract port classes that cli implements, and `McpServerAdapters`
  database/
    entities/               `McpServer`, `McpServerTool`, `McpServerConnection`, `McpServerBlock`
    repositories/           composed repositories with a file-private `BaseRepository` table
  errors/                   named HTTP errors, one class per `.error.ts` file
  utils/                    pure helpers (tool names, tool drafts) and event types
  testing/                  fixtures for tests outside this package (`./testing` export)
  __tests__/                all unit tests, plus `test-utils/` for internal fakes
```

Put a file in the folder of its role. Keep the n8n file infixes: `.controller.ts`, `.service.ts`,
`.port.ts`, `.entity.ts`, `.repository.ts`, and `.error.ts`.

## Layers

| Layer                    | Can import                                                                                            | Cannot import                |
| ------------------------ | ----------------------------------------------------------------------------------------------------- | ---------------------------- |
| `controllers/`           | services, errors, DTOs from `@n8n/api-types`                                                          | repositories                 |
| `services/`              | services, ports, repositories, utils, errors                                                          | controllers                  |
| `ports/`                 | only types from `@n8n/api-types`, `@n8n/db`, `utils/`, and sibling `ports/` files (no implementation) | services, repositories       |
| `database/repositories/` | entities, errors, `@n8n/db`, `@n8n/typeorm`                                                           | services                     |
| `database/entities/`     | `@n8n/db`, `@n8n/typeorm`, types from `@n8n/api-types`                                                | other files of the module    |
| `utils/`, `errors/`      | `@n8n/api-types`, shared packages, each other                                                         | DI, I/O, ports, repositories |

Follow these package boundary rules:

- Never import from `packages/cli` or from the `n8n` package.
- Never import an adapter in this package. Only `packages/cli/src/modules/modules.manifest.ts` knows both sides.
- Declare each workspace and third-party dependency in `package.json`.
- Export the main runtime API for other packages only from `src/index.ts`. Keep the module entrypoint in `./module` (`mcp-servers.module.ts`) and external test fixtures in `./testing` (`src/testing/index.ts`).
- Do not export `McpServersModule` from `src/index.ts`, because importing it runs the `@BackendModule` decorator.
- Use dynamic imports inside `mcp-servers.module.ts`. This keeps disabled modules unloaded.
- Keep `@n8n/typeorm` imports in entity and repository files. Each repository composes a file-private `BaseRepository` table and exposes only use-case methods. Never extend `BaseRepository` on an exported repository class.

## Public API

This package exposes three entrypoints in `package.json`:

- `@n8n/backend-module-mcp-servers` (`src/index.ts`): the main runtime API for other packages. It never exports `McpServersModule`, controllers, repositories, or database entities. `__tests__/index.test.ts` pins its export list and checks that importing it does not register the module.
- `@n8n/backend-module-mcp-servers/module` (`src/mcp-servers.module.ts`): the module loader entrypoint. Only `packages/cli/src/modules/modules.manifest.ts` imports it.
- `@n8n/backend-module-mcp-servers/testing` (`src/testing/index.ts`): fixtures for tests outside this package. Only test files import it. The `packages/cli` lint configurations (`oxlint.config.mts` and `eslint.config.mjs`) reject the import in production code.

### Exports of `@n8n/backend-module-mcp-servers` (`src/index.ts`)

| Export                                       | Role                                                                | Callers                                                                 |
| -------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `CustomMcpServersFlagGate`                   | Checks whether custom MCP servers are enabled for the instance      | `packages/cli` (`instance-ai` adapter)                                  |
| `McpServersConfig`                           | Concurrency cap and IP rate limit configuration                     | `packages/cli` integration tests                                        |
| `McpServersService`                          | Server CRUD and slug availability                                   | `packages/cli` (`instance-ai` adapter)                                  |
| `McpServerToolsService` and candidate types  | Tool CRUD, workflow candidates, and tool drafts                     | `packages/cli` (`instance-ai` adapter)                                  |
| `McpServerActor`, `McpServerEventMap`        | Typed telemetry event payloads                                      | `packages/cli` (`events/maps/relay.event-map.ts`)                       |
| `McpServerAdapters`                          | Resolver token that cli sets before loading `./module`              | `packages/cli` (`modules/modules.manifest.ts`)                          |
| `WorkflowToolPort` and workflow tool types   | Port for listing, checking, describing, and running workflow tools  | `packages/cli` (`WorkflowToolAdapter`, runtime integration tests)       |
| `TextDraftPort`, `TextDraftResult`           | Port for generating tool name and description drafts via Assistant  | `packages/cli` (`TextDraftAdapter`)                                     |
| `OAuthClientNamePort`                        | Port for reading registered OAuth client names                      | `packages/cli` (`OAuthClientNameAdapter`, runtime integration tests)    |
| `RefreshTokenPort`                           | Port for revoking OAuth refresh tokens on block, restore, or delete | `packages/cli` (`RefreshTokenAdapter`, connections integration tests)   |

### Exports of `@n8n/backend-module-mcp-servers/testing` (`src/testing/index.ts`)

| Export                                                                                                   | Role                                                            | Callers                                                      |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------ |
| `createMcpServer`, `findMcpServer`, `softDeleteMcpServer`                                                | Create, read, and soft-delete server rows                       | `packages/cli/test/integration/mcp-servers/`                 |
| `createMcpServerTool`, `findMcpServerTools`                                                              | Create and read tool rows                                       | `packages/cli/test/integration/mcp-servers/`                 |
| `createMcpServerConnection`, `findMcpServerConnection`, `findMcpServerConnections`, `updateMcpServerConnectionLastUsedAt` | Create, read, and update connection rows       | `packages/cli/test/integration/mcp-servers/`                 |
| `createMcpServerBlock`, `findMcpServerBlocks`                                                            | Create and read block rows                                      | `packages/cli/test/integration/mcp-servers/`                 |
| `clearMcpServerTables`                                                                                   | Delete all rows from the four module tables between test cases  | `packages/cli/test/integration/mcp-servers/`                 |

Do not add symbols to `src/index.ts` or `src/testing/index.ts` unless a package outside this
module imports them.

## Ports and adapters

This package cannot import `packages/cli`. Instead, this package defines abstract port classes in
`ports/`, and `packages/cli` implements them as adapters.

```mermaid
flowchart LR
  subgraph pkg["packages/modules/mcp-servers/backend"]
    services["services/"] --> ports["ports/*.port.ts"]
    module["mcp-servers.module.ts\ninit() binds each port"] --> adaptersToken["ports/mcp-server-adapters.ts\nMcpServerAdapters"]
    module -. Container.set .-> ports
  end

  subgraph cli["packages/cli"]
    manifest["modules/modules.manifest.ts\nregisters McpServerAdapters\nthen loads ./module"] --> adaptersToken
    manifest --> adapters["modules/mcp-servers/*.adapter.ts"]
    adapters -- extends --> ports
  end
```

Ownership across the boundary:

- **This package owns** the four port contracts (`WorkflowToolPort`, `TextDraftPort`, `OAuthClientNamePort`, `RefreshTokenPort`), `McpServerAdapters`, and all custom MCP server business rules.
- **`packages/cli/src/modules/mcp-servers/` owns** the four concrete adapters (`WorkflowToolAdapter`, `TextDraftAdapter`, `OAuthClientNameAdapter`, `RefreshTokenAdapter`) that talk to CLI services.
- **`packages/cli/src/modules/modules.manifest.ts` owns** the wiring. It registers a lazy `McpServerAdapters` resolver in `@n8n/di` before importing `@n8n/backend-module-mcp-servers/module`. `McpServersModule.init()` calls `resolve()` once the database is ready and binds each port in `Container`.

Other layers inside this package do not use hexagonal indirection: controllers, services, and
repositories follow standard n8n layering.

## Common changes

### Add a REST route

1. Add or update the DTO and action scope constant in `@n8n/api-types`.
2. Implement the business logic in a service in `services/`.
3. Add the route method to a controller in `controllers/`.
4. Gate the route with `@ProjectScope(...)` or `@GlobalScope(...)` (see the `n8n:protect-endpoints` skill). If a route must skip a route-level scope, document why and enforce access inside the service.
5. Call `await this.flagGate.assertEnabled()` as the first line of the handler.
6. Add an API integration test in `packages/cli/test/integration/mcp-servers/` covering success, scope checks for each role, and the flag-off 404 behavior.

### Add a port

1. Create an abstract class `<Name>Port` in `ports/<name>.port.ts`. Keep it free of implementation and import only types.
2. Export the port and its types from `src/index.ts` and update `__tests__/index.test.ts`.
3. Add a field for the port to `McpServerAdapters` in `ports/mcp-server-adapters.ts`.
4. Bind the port with `Container.set(<Name>Port, adapters.<field>)` in `McpServersModule.init()`.
5. Implement `<Name>Adapter extends <Name>Port` in `packages/cli/src/modules/mcp-servers/<name>.adapter.ts`.
6. Wire the adapter into `Container.set(McpServerAdapters, ...)` in `packages/cli/src/modules/modules.manifest.ts`.
7. Add a mock of the port to `mockMcpServerPorts()` in `__tests__/test-utils/ports.ts`. Service unit tests take their port mocks from it.

### Add a tool kind

1. Add the new kind to `McpServerToolKind` in `@n8n/api-types`.
2. Add a port in `ports/` (and its CLI adapter) if the tool kind calls CLI services.
3. Handle the new kind in `services/mcp-server-runtime.service.ts` for both `inputSchema()` and `runTool()`.
4. Emit the new `toolKind` value in `mcp-server-tool-added` and `mcp-server-tool-called` telemetry events.

### Add a table or a column

1. Create or update the entity in `database/entities/`.
2. If you added a new entity, return it from `entities()` in `mcp-servers.module.ts`.
3. Add a database migration in `packages/@n8n/db/src/migrations/` (follow the `n8n:db-migrations` skill).
4. Add or update the repository in `database/repositories/` using a file-private `BaseRepository` table class and named use-case methods.

### Add an error

1. Create one file per error class in `errors/<name>.error.ts`.
2. Extend the `@n8n/errors` class that matches the HTTP status (for example, `NotFoundError`, `ConflictError`, or `ServiceUnavailableError`).
3. Keep inline throws for one-off messages that no other site shares.

### Add a telemetry event

1. Add the event name and payload type to `McpServerEventMap` in `utils/mcp-server-events.ts`.
2. Emit the event through `EventService` in the owning service.
3. Add the event handler in `packages/cli/src/events/relays/telemetry.event-relay.ts` and register the event following the `n8n:telemetry` skill.

## Tests

Pick the test type by what the behavior depends on:

| What changed                                         | Test to write                                    | Where                                        |
| ---------------------------------------------------- | ------------------------------------------------ | -------------------------------------------- |
| A pure rule in `utils/` (names, draft parsing)       | Decision table with `it.each`, no mocks          | `src/__tests__/`                             |
| Call order, branching, or error handling in a service| Unit test with port fakes or mocks               | `src/__tests__/`                             |
| Public exports of `src/index.ts`                     | Export snapshot test                             | `src/__tests__/index.test.ts`                |
| A database query, REST route, role check, or runtime | Integration test using `@n8n/backend-module-mcp-servers/testing` | `packages/cli/test/integration/mcp-servers/` |
