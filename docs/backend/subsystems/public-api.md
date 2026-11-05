---
title: The public API
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-05
---

# The public API

Read this when you add or change an endpoint under `/api/v1`, or when you need to know how it differs from the internal REST API.

## What it is

The public API is the versioned REST surface at `/api/v1` for scripts, CI, and external tools. It is separate from the internal API at `/rest` that the editor uses. Callers authenticate with an API key or another token. The public API ships its own OpenAPI document, a Swagger UI, and cursor-based pagination. Every endpoint is a method on a `@PublicApiController` class. `@n8n/cli` is a separate client that talks only to this API.

## Why it has this shape

- **A public contract.** External code depends on these endpoints, so a change must not break callers. When an endpoint moves to a new implementation, its public contract must stay the same.
- **Decorators, not handler modules.** Until October 2026, part of the API ran as handler modules that an OpenAPI validator dispatched. The migration to `@PublicApiController` classes is complete, and the validator stack is gone. The `v1/handlers/` folders still hold YAML schema files and a few helpers. Each controller needs a side-effect import in `packages/cli/src/public-api/v1/controllers/index.ts`.
- **The spec comes from code.** At build time, a generator reads the DTOs from `@n8n/api-types` and the `@Api*` decorators. It writes `openapi.decorator-routes.generated.yml`, and the build merges it into `openapi.yml`. New endpoints therefore describe themselves.
- **One middleware order.** The registry adds the middlewares of each route in a fixed order. The order is: deprecation notice, authentication, rate limits, `@ApiKeyScope`, `@GlobalScope` or `@ProjectScope`, `@Licensed`, the body parser, and idempotency. The scope check uses the same `userHasScopes` as the internal API.
- **Two scope vocabularies.** API key scopes are a smaller set than user scopes. A key can never carry a scope that its owner's role lacks.
- **Pluggable authentication.** Authentication goes through `AuthStrategyRegistry`. It accepts an API key, a session cookie, a scoped JWT from token exchange, or an OAuth token from a trusted source.
- **Lint rules guard the direction.** Handlers and controllers must not use repositories (`no-repository-in-public-api-handler`). Developers cannot turn these rules off inline.

## Where it lives

| Part | File | Symbol |
|---|---|---|
| Router per version | `packages/cli/src/public-api/index.ts` | `loadPublicApiVersions` |
| Route registry and middleware order | `packages/cli/src/public-api/public-api-controller.registry.ts` | `PublicApiControllerRegistry.activate` |
| Spec generator | `packages/cli/src/public-api/v1/openapi-gen/generate.ts` | `getDecoratorGeneratedOperations` |
| Cursor pagination | `packages/cli/src/public-api/v1/shared/services/pagination.service.ts` | `encodeNextCursor` |
| Rate limits | `packages/cli/src/public-api/public-api-rate-limit.service.ts` | `PublicApiRateLimitService` |
| Idempotency keys | `packages/cli/src/public-api/idempotency-key.service.ts` | `IdempotencyKeyService` |
| Controller decorator | `packages/@n8n/decorators/src/controller/public-api-controller.ts` | `PublicApiController` |
| API key scopes per role | `packages/@n8n/permissions/src/public-api-permissions.ee.ts` | `getApiKeyScopesForRole` |
| API key auth switch | `packages/cli/src/public-api/index.ts` | `isApiKeyAuthEnabled` |

API key authentication is off when the public API is disabled in configuration, or when the license excludes the API.

## What is moving

The public API grows new operational features: per-route rate limits with a settings API, and `Idempotency-Key` support on `POST` requests.

## Read more

- `.agents/skills/public-api/SKILL.md` and its reference, the how-to and the rules
- `packages/@n8n/cli/docs/`
- [Authentication and sessions](authentication.md) for the strategy chain
- docs.n8n.io: the API reference
