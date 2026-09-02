---
name: n8n:public-api
description: >-
  Adds, migrates, or updates n8n Public API v1 endpoints with @PublicApiController
  — public DTOs, API-key and RBAC scopes, cursor pagination, OpenAPI + coverage
  wiring, and tests. Use when working under packages/cli/src/public-api/v1/ or
  when exposing an existing service through /api/v1.
---

# Public API v1

Public API v1 lives in `packages/cli/src/public-api/v1/`, mounted at `/api/v1`
with API-key auth and public error formatting via `PublicApiControllerRegistry`
(`packages/cli/src/public-api/public-api-controller.registry.ts`).

Two rule tiers: **invariants** (never break) and **team defaults** (follow unless
an existing public contract forces otherwise). When this skill and the code
disagree on a detail, the code wins — so open the files below. That is a reason to
check the code, not license to drop a team default.

## Non-negotiable rules

- New endpoints are `@PublicApiController` classes under `v1/controllers/`, one
  `*.public.controller.ts` per feature. A controller is a class — never
  `export =` (the legacy tuple style; `require-public-api-controller` flags it).
- Public API and internal REST are separate HTTP surfaces. A public controller
  never calls an internal controller/endpoint; both reuse the same service.
- Controllers and handlers delegate to a service — never import a repository or
  `Container.get(…Repository)` (`no-repository-in-public-api-handler`).
- Input/output go through DTOs from `@n8n/api-types`; every JSON route declares
  `@ApiResponse(Dto)`.
- Register each controller via a side-effect import in `v1/controllers/index.ts`
  (`public-api-controllers.test.ts` fails otherwise).
- Don't add business logic to legacy `express-openapi-validator` (EOV) handlers.
- Migrating a legacy endpoint must not change its public contract.

These are `n8n-local-rules` ESLint rules (see `packages/cli/eslint.config.mjs`)
and can't be silenced inline (`no-public-api-guardrail-disable`). The `off`
allowlist there covers pre-existing legacy files only — it's shrink-only, don't
add to it.

## Team defaults

- List endpoints: cursor-based pagination (internal API uses both cursor- and
  page-based — don't copy an internal endpoint's model).
- Pagination args are always `offset` and `limit` — on service methods, handler
  calls, and repository methods you add. Never `skip`/`take` (TypeORM names).
  Translate to `skip`/`take` only inside a repository, at the TypeORM `find`
  call. The public query string is still `cursor` + `limit`; `offset` is the
  decoded cursor field passed into the service, never a client-facing param.
- Updates: full-object `PUT`, not `PATCH`. A successful `GET` body should be
  acceptable as a `PUT` body for the same resource (round-trip), aside from
  server-managed/immutable fields.
- Strict input DTOs; output DTOs are an allowlist of public fields.
- Never return real secrets/tokens in responses or error details — mask with the
  resource's sentinel/placeholder (or omit). Echoing that sentinel on `PUT`
  means keep; any other value replaces. Detail:
  [Updates and write-only secrets](reference.md#updates-and-write-only-secrets).
- "Test connection/config" endpoints validate the request body (test-before-save).

## Architecture

Public and internal are sibling routes over one shared, HTTP-agnostic service;
neither calls the other.

```
GET /rest/tags    → TagsController         ┐  JWT auth, internal shape
                                            ├─→ TagService
GET /api/v1/tags  → TagsPublicController   ┘  API-key auth, public DTO
```

Reuse the service behavior. Reuse a DTO only when public and internal contracts
are intentionally identical; otherwise make a public-specific DTO that doesn't
depend on a UI-oriented internal shape.

## Before editing

Open these — they are the source of truth, not this skill:

- `v1/controllers/` — copy structure from `tags.public.controller.ts` (list +
  cursor) or `workflows.public.controller.ts` (`@Param` + `@ProjectScope`), and
  `index.ts` for the barrel.
- Decorators in `packages/@n8n/decorators/src/controller/`:
  `public-api-controller.ts`, `api-key-scope.ts`, `api-response.ts`,
  `api-error-response.ts`, `api-summary.ts`, `api-description.ts`, `api-tags.ts`,
  `route.ts`, `scoped.ts`, `args.ts`, `licensed.ts`.
- The OpenAPI generator (reads the decorators above, no hand-written YAML
  needed for a controller route): `v1/openapi-gen/generate.ts`,
  `v1/openapi-gen/decorator-routes.ts`.
- Pagination helpers: `v1/shared/services/pagination.service.ts`
  (`decodeCursor`, `encodeNextCursor`).
- DTOs: `packages/@n8n/api-types/src/dto/`.
- Gating tests: `v1/__tests__/public-api-controllers.test.ts`,
  `v1/__tests__/scope-parity.test.ts`,
  `v1/openapi-gen/__tests__/generated-spec-drift.test.ts`.
- The internal controller for this resource and its neighboring functional tests.

## Declaring a controller

A controller is a class marked `@PublicApiController('/base')` that injects the
shared service via its constructor and delegates to it. Copy the shape from an
existing controller in `v1/controllers/` with the same operation type and auth
model; reuse only what applies. Decorators, all from `@n8n/decorators`:

| Decorator | Use |
|---|---|
| `@PublicApiController('/base')` | Class marker; mounts routes at `/api/v1/base`. |
| `@Get/@Post/@Put/@Patch/@Delete('/path')` | Route method. |
| `@ApiKeyScope('res:action')` | API-key grant check. |
| `@ProjectScope/@GlobalScope('res:action')` | User RBAC check. |
| `@ApiResponse(status)` / `@ApiResponse(status, Dto)` | Success status + (optional) output DTO; registry `.parse()`s + strips the return value. Exactly one per route — a second `@ApiResponse` throws. `204` can't carry a DTO — throws. |
| `@ApiErrorResponse(status)` | Declares an additional documented non-2xx status (e.g. `404`, `409`). Stack multiple for more than one. `400`/`401`/`403` are added automatically (body/query present, always, and `@ApiKeyScope` present, respectively) — don't declare those yourself. |
| `@ApiSummary(text)` / `@ApiDescription(text)` / `@ApiTags([...])` | OpenAPI summary/description/tags. `@ApiTags` sorts alphabetically regardless of the order you pass. All optional but expected on every real route. |
| `@Query` / `@Body` / `@Param('name')` | Bind + validate via a `Z.class` DTO / path param. |
| `@Licensed('feat')` | Gates the route on a single `BooleanLicenseFeature`; `PublicApiControllerRegistry` runs its own license middleware (after auth/`@ApiKeyScope`/`@ProjectScope`|`@GlobalScope`, before the handler) and 403s unlicensed requests. Only takes one feature — if the gate is an any-of/all-of combination (e.g. `LicenseState.isProvisioningLicensed()`, which is `feat:saml` OR `feat:oidc`), `@Licensed` can't express that; check manually in the handler instead, same as the internal `provisioning.controller.ee.ts`/`role-mapping-rule.controller.ee.ts` do today (throwing `ForbiddenError` on failure). |

## Authorization (easy to get wrong)

- `@ApiKeyScope` (what the API key is granted) and `@ProjectScope`/`@GlobalScope`
  (what the user may do) are independent. Use both when the model needs both.
- `@ProjectScope` reads `req.params` as-is and does not remap `id` — name the path
  param what the resolver expects (`workflowId`, `credentialId`, `projectId`,
  `dataTableId`, …). A generic `id` often fails.
- `@ApiKeyScope` takes a string, `{ anyOf: [...] }`, or `{ allOf: [...] }` — never
  a bare array. The scope must exist in the permissions registry
  (`API_KEY_RESOURCES` in `@n8n/permissions`); `scope-parity.test.ts` fails on an
  orphan scope.

## DTOs

- Build the public response shape explicitly; don't return an ORM entity and lean
  on `@ApiResponse` stripping to hide fields.
- Treat the output DTO as an allowlist. Re-check nested relations, ownership
  fields, tokens, and encrypted values.
- Make input DTOs strict so unknown/partial fields aren't silently accepted.
- Secrets: never return a real secret; use the resource's sentinel/placeholder
  (or omit). See [Updates and write-only secrets](reference.md#updates-and-write-only-secrets).

## List endpoints (cursor pagination)

Copy the cursor flow from `tags.public.controller.ts`. The input DTO takes
`limit: publicApiPaginationSchema.limit` plus `cursor: z.string().optional()` —
pick `limit` off the schema, never spread the whole `publicApiPaginationSchema`
(it also exports `offset`, which must never be a Public API query param). Use
`decodeCursor` / `encodeNextCursor` from the shared pagination service; the
cursor is opaque; return `{ data, nextCursor }` (never a bare array) with
`nextCursor: null` on the last page; an invalid cursor is a `400`. Preserve an
existing endpoint's cursor semantics as-is — but an `offset` param is a
defect to remove, not a contract to preserve. Detail:
[List endpoints and cursor pagination](reference.md#list-endpoints-and-cursor-pagination).

## Wiring checklist

1. `v1/controllers/<feature>.public.controller.ts` + side-effect import in
   `v1/controllers/index.ts`.
2. Public DTO in `@n8n/api-types` + export from the barrel (`src/dto/`).
3. `@ApiKeyScope` value exists in the permissions registry.
4. Don't hand-write the OpenAPI path or `x-required-scope` for a controller
   route — the generator (`v1/openapi-gen/generate.ts`) builds it from your
   decorators (`@ApiSummary`/`@ApiDescription`/`@ApiTags`/`@ApiKeyScope`/
   `@ApiResponse`/`@ApiErrorResponse`). Run the full `pnpm build` and commit
   the regenerated `handlers/<feature>/spec/paths/*.generated.yml` fragment(s)
   and `openapi.decorator-routes.generated.yml` —
   `generated-spec-drift.test.ts` fails CI if they're stale. `pnpm run
   build:data` alone is **not** enough after touching a controller: it runs
   the generator against the already-compiled `dist/`, so a new/changed
   controller silently doesn't show up unless `tsc` ran first.
5. Add the route to `packages/nodes-base/nodes/N8n/n8n-api-coverage.json`.
6. Tests.

## Testing

Always cover: happy path, input-validation failure, missing API-key scope, RBAC
denial. Prefer covering the business path in
`packages/cli/test/integration/public-api/` (real HTTP + DB); mocked-service unit
tests don't replace that. Add the cases that apply (cursor pages,
not-found/conflict, no sensitive fields, credential keep/replace, migration
contract) — see [Testing matrix](reference.md#testing-matrix). Match the nearest
existing tests.

## More detail (reference.md)

- [List endpoints and cursor pagination](reference.md#list-endpoints-and-cursor-pagination)
- [Updates and write-only secrets](reference.md#updates-and-write-only-secrets)
- [Test-before-save endpoints](reference.md#test-before-save-endpoints)
- [Errors](reference.md#errors)
- [Testing matrix](reference.md#testing-matrix)
- [Migrating legacy EOV endpoints](reference.md#migrating-legacy-eov-endpoints)
