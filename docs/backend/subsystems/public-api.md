---
title: The public API
audience: Backend engineers new to n8n
tier: 3
reading_time: 5 min
last_reviewed: 2026-09-02
owner: "@n8n-io/ligo"
---

# The public API

Read this when you add or change an endpoint under `/api/v1`, or when you need to know how it differs from the internal REST API.

## What it is

The public API is the versioned, API-key-authenticated REST surface at `/api/v1` for scripts, CI, and external tools. It is separate from the session-based internal API at `/rest` that the editor uses. It ships its own OpenAPI document, a Swagger UI, and cursor-based pagination. It is in the middle of a migration from handler modules validated by an OpenAPI validator to decorator-based `@PublicApiController` classes. `@n8n/cli` is a separate client that talks only to this API.

## How it works

`server.ts` calls `loadPublicApiVersions`, which builds one Express router per version folder. The router serves the Swagger UI and the spec, parses JSON, then mounts two layers in order. First, `PublicApiControllerRegistry` registers every class marked by `@PublicApiController`. Second, the OpenAPI validator middleware validates requests against the spec and dispatches to legacy handler modules. For decorator routes, the spec points at a stub so that the validator does not complain while the registry answers first.

Both layers authenticate through `AuthStrategyRegistry`, which accepts an API key, a session cookie, or a scoped JWT from the token exchange module, and on success update the user's last active time and emit an event. Per route the registry pushes middlewares in this order: deprecation notice, authentication, `@ApiKeyScope` checked against the key's scopes, then `@GlobalScope` or `@ProjectScope` through the same `userHasScopes` as the internal API, then `@Licensed`. API key scopes are a smaller vocabulary than user scopes, and a key can never carry scopes its owner's role lacks. List endpoints decode a base64 cursor and return the next one.

At build time a generator uses the `@n8n/api-types` DTOs and the `@Api*` decorators to emit an OpenAPI fragment that is merged into the spec. New endpoints therefore describe themselves in code.

## Where to look

| Path | What |
|---|---|
| `packages/cli/src/public-api/index.ts` | Router setup per version |
| `packages/cli/src/public-api/public-api-controller.registry.ts` | The decorator-route registry |
| `packages/cli/src/public-api/v1/controllers/` | Migrated controllers, one per feature |
| `packages/cli/src/public-api/v1/handlers/` | Legacy handler modules |
| `packages/cli/src/public-api/v1/openapi.yml` and the generated fragment | The spec |
| `packages/cli/src/public-api/v1/shared/services/pagination.service.ts` | Cursor pagination |
| `packages/@n8n/decorators/src/controller/public-api-controller.ts`, `api-key-scope.ts` | The decorators |
| `packages/@n8n/permissions/src/public-api-permissions.ee.ts` | API key scopes |
| `packages/@n8n/cli/` | The client CLI and its docs |
| `.agents/skills/public-api/SKILL.md` | The how-to and the rules |

## What it owns

`user_api_keys` in `@n8n/db`, with a scopes column. Nothing else. The public API reads domain tables through services.

## Flags

`N8N_PUBLIC_API_DISABLED`, `N8N_PUBLIC_API_ENDPOINT` (default `api`), and `N8N_PUBLIC_API_SWAGGERUI_DISABLED`. The license flag `feat:apiDisabled` switches API key authentication off on plans that exclude the API. Routes are still registered, because the editor uses some of them with the session cookie. Per route `@Licensed` applies as elsewhere.

## Per mode

Main only. No cloud branch in code.

## Was, is, goes

**Was.** Every operation in the spec pointed at a handler module. **Is.** The `@PublicApiController` pattern arrived in July 2026, and the git log since then is a stream of migrations to it, plus commits that route handlers through services ahead of migration. Three lint rules guard the direction: no repository access in handlers, a controller for every new route, and no disabling of either rule. A test checks that scopes in the spec match scopes in code. **Goes.** The skill states the target: controllers under `v1/controllers`, DTOs from `@n8n/api-types`, an `@ApiResponse` on every JSON route, and no business logic in legacy handlers. Migrating an endpoint must not change its public contract. The Linear initiatives "Public API v1+: Foundation" and "Schema-First API" track the work.

## Terms

- **API key scope**: a scope on a key, from a smaller vocabulary than user scopes.
- **cursor**: an encoded offset and limit, or a last id, returned as `nextCursor`.
- **handler tuple**: the legacy export shape of a handler module.
- **decorator route**: a `@PublicApiController` method, self-described for the spec.

## Read more

- `.agents/skills/public-api/SKILL.md` and its reference
- `packages/@n8n/cli/docs/`
- docs.n8n.io: the API reference
