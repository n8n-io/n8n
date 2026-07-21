---
name: n8n:public-api
description: >-
  Adds or updates n8n Public API v1 endpoints, OpenAPI specs, and handler wiring.
  Use when creating public API handlers, registering paths in openapi.yml, or
  adding OpenAPI tags. Prefer @PublicApiController for new endpoints (API-37+).
---

# Public API v1

Public API lives under `packages/cli/src/public-api/v1/`.

**Preferred for new endpoints (API-37+):** `@PublicApiController` +
`PublicApiControllerRegistry` — same decorator style as internal
`@RestController`, mounted at `/api/v1` with API-key auth and public errors.

**Legacy (existing endpoints):** `express-openapi-validator` handlers under
`handlers/`; OpenAPI path specs are YAML under each handler's `spec/` directory.
Migrate to the controller pattern when touching an endpoint; do not mix data
access styles within a new feature.

## Architecture

Convergence is at the **service layer**, not HTTP. Public and internal stay as
two sibling routes over one shared service — neither calls the other:

```
GET /rest/tags    → TagsController         ┐  JWT auth, internal shape
                                            ├─→ TagService
GET /api/v1/tags  → TagsPublicController   ┘  API-key auth, public DTO
```

## Adding an endpoint (controller pattern)

Reference: `v1/controllers/tags.public.controller.ts` (`GET /tags`).

1. **Public DTOs** in `@n8n/api-types` — input query/body + output resource DTO
   (distinct from internal shapes when they diverge). Use `Z.class` so the
   registry can validate/parse.
2. **Controller** — `v1/controllers/<feature>.public.controller.ts`
   ```ts
   @PublicApiController('/tags')
   export class TagsPublicController {
     constructor(private readonly tagService: TagService) {}

     @Get('/')
     @ApiKeyScope('tag:list')
     @ApiResponse(TagListPublicDto)
     @ApiDescription('Retrieve all tags from your instance.')
     async getTags(_req, _res, @Query q: ListTagsQueryDto) { /* call service */ }
   }
   ```
   - Reuse `@Get/@Post/@Body/@Query/@Param/@GlobalScope/@ProjectScope` as-is.
   - `@ApiKeyScope` — string, or `{ anyOf }` / `{ allOf }` (no bare arrays).
   - `@ApiResponse(Dto)` — registry `.parse()`s the return value (strips
     undeclared fields) and its schema feeds the generated OpenAPI response.
   - `@ApiDescription('...')` (optional) — feeds the generated operation's
     `description`. There's no `@ApiSummary` yet; add one the same way if a
     route needs it.
   - Delegate to the same service as the internal REST controller.
3. **Side-effect import** the controller from `packages/cli/src/public-api/v1/controllers/index.ts`
   (not from `public-api/index.ts` directly — that barrel is what both the
   runtime registry and the OpenAPI generator import) so metadata is
   registered before `PublicApiControllerRegistry.activate` and before
   `openapi-gen/decorator-routes.ts` discovers the route.
4. **OpenAPI path spec is generated, not hand-written.** `pnpm run build:data`
   discovers every `@PublicApiController` route via `resolvePublicApiRoutes()`
   and writes `handlers/<feature>/spec/paths/<handlerName>.generated.yml` from
   its DTOs/decorators — `x-required-scope` comes from `@ApiKeyScope`, the
   response schema from `@ApiResponse`. Point `openapi.yml`'s path at it with a
   `$ref` (at the whole-path level for a brand-new path, or at the single
   `get:`/`post:` key when the path has other methods still hand-written —
   see `handlers/tags/spec/paths/tags.yml`, which mixes a generated `get`
   with a hand-written `post`). `scope-parity.test.ts` and `discover.service.ts`
   both read decorator metadata directly for these routes — no eov handler
   stub needed.
5. **Coverage manifest** — add every new OpenAPI endpoint to
   `packages/nodes-base/nodes/N8n/n8n-api-coverage.json`.

## Adding an endpoint (legacy eov handler)

1. **Handler** — `handlers/<feature>/<feature>.handler.ts`
   - Export middleware arrays keyed by `x-eov-operation-id`.
   - For scope-protected endpoints, use `publicApiScope()` or
     `apiKeyHasScopeWithGlobalScopeFallback()` (they tag the scope-enforcement
     middleware with `__apiKeyScope`) and add matching `x-required-scope` in the
     path YAML; use `none` for endpoints without an API-key scope (see
     `scope-parity.test.ts`).
   - **Delegate to the same service/controller layer as the internal REST API.**
     Parse input with `@n8n/api-types` DTOs, call `Container.get(SomeService)` or
     `Container.get(SomeController)`, map errors — do not reach into repositories
     or duplicate business logic in the handler. Older handlers like
     `handlers/credentials/` and `handlers/workflows/` predate this pattern;
     follow them only for middleware/OpenAPI wiring, not for data access.
2. **OpenAPI path spec** — `handlers/<feature>/spec/paths/<path>.yml`
   - Set `tags: [<TagName>]` matching a top-level tag in `openapi.yml`.
3. **Register path** — add a `$ref` entry under `paths:` in `openapi.yml`.
4. **Request types** — add a namespace in `packages/cli/src/public-api/types.ts`
   when the handler needs typed query/body params.
5. **Coverage manifest** — add every new OpenAPI endpoint to
   `packages/nodes-base/nodes/N8n/n8n-api-coverage.json`.

## `tags` array in `openapi.yml`

When adding or editing the top-level `tags:` array in
`packages/cli/src/public-api/v1/openapi.yml`, **keep entries sorted
alphabetically by `name`**. Insert the new tag in order; do not append to the end.

```yaml
tags:
  - name: Audit
    description: Operations about security audit
  - name: CommunityPackage
    description: Operations about community packages
  # … remaining tags in A→Z order by name
```

`scope-parity.test.ts` asserts this ordering — CI fails if tags drift out of
sort order.

## Reference

- **Controller pattern:** `v1/controllers/tags.public.controller.ts`
- **Registry:** `packages/cli/src/public-api/public-api-controller.registry.ts`
- **Route resolution (shared by registry + doc-gen):**
  `packages/cli/src/public-api/public-api-route-resolver.ts`
- **OpenAPI generation:** `v1/openapi-gen/` — `decorator-routes.ts` discovers
  every `@PublicApiController` route automatically and builds its
  `RouteConfig`; `generate.ts` renders and writes the fragments, called from
  `scripts/build.mjs`'s `build:data` step. Only decorator-routed endpoints are
  generated today — legacy eov endpoints (e.g. `/data-tables`) keep
  hand-written YAML until migrated to the controller pattern.
- Simple GET via eov + service: `handlers/insights/`
- CRUD via eov + service/controller: `handlers/variables/`, `handlers/folders/`,
  `handlers/projects/`, `handlers/data-tables/`
- Multipart: `handlers/n8n-packages/` (see also
  `packages/cli/src/modules/n8n-packages/CLAUDE.md`)
