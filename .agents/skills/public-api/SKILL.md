---
name: n8n:public-api
description: >-
  Adds or updates n8n Public API v1 endpoints, OpenAPI specs, and handler wiring.
  Use when creating public API handlers, registering paths in openapi.yml, or adding OpenAPI tags. Always use @PublicApiController for new endpoints (API-37+).
---

# Public API v1

Public API lives under `packages/cli/src/public-api/v1/`.

**Always use `@PublicApiController` for new endpoints (API-37+).** Do not add new business logic to `express-openapi-validator` handlers. Controllers use the same decorator style as internal `@RestController`, mounted at `/api/v1` with API-key auth and public errors via `PublicApiControllerRegistry`.

**Legacy (existing endpoints only):** `express-openapi-validator` handlers under `handlers/`; OpenAPI path specs are YAML under each handler's `spec/` directory.
When you touch a legacy endpoint, migrate it to `@PublicApiController` rather than extending the eov handler. Do not mix data-access styles within a new feature.

## Architecture

Convergence is at the **service layer**, not HTTP. Public and internal stay as
two sibling routes over one shared service — neither calls the other:

```
GET /rest/tags    → TagsController         ┐  JWT auth, internal shape
                                            ├─→ TagService
GET /api/v1/tags  → TagsPublicController   ┘  API-key auth, public DTO
```

## Adding an endpoint (required: controller pattern)

Reference: `v1/controllers/tags.public.controller.ts` (`GET /tags`).

1. **Public DTOs** in `@n8n/api-types` — input query/body + output resource DTO
   (distinct from internal shapes when they diverge). Use `Z.class` so the
   registry can validate/parse. Wrap list payloads as objects (e.g. `{ data: [...] }`),
   same as `TagListPublicDto` / `WorkflowVersionHistoryListPublicDto`.
2. **Controller** — `v1/controllers/<feature>.public.controller.ts`
   ```ts
   @PublicApiController('/tags')
   export class TagsPublicController {
     constructor(private readonly tagService: TagService) {}

     @Get('/')
     @ApiKeyScope('tag:list')
     @ApiResponse(TagListPublicDto)
     async getTags(_req, _res, @Query q: ListTagsQueryDto) { /* call service */ }
   }
   ```
   - Reuse `@Get/@Post/@Body/@Query/@Param/@GlobalScope/@ProjectScope` as-is.
   - For `@ProjectScope` on workflow/credential routes, name the path param
     `workflowId` / `credentialId` (or `projectId` / `dataTableId`) — the
     registry passes `req.params` to `userHasScopes`, which does not remap `id`.
   - `@ApiKeyScope` — string, or `{ anyOf }` / `{ allOf }` (no bare arrays).
   - `@ApiResponse(Dto)` — registry `.parse()`s the return value (strips
     undeclared fields). Shape is provisional until API-39 (doc-gen).
   - Delegate to the same service as the internal REST controller.
3. **Side-effect import** the controller from
   `packages/cli/src/public-api/v1/controllers/index.ts` (re-exported via
   `public-api/index.ts`) so metadata is registered before
   `PublicApiControllerRegistry.activate`. Name the file
   `*.public.controller.ts` — `public-api-controllers.test.ts` fails CI if a
   controller file is missing from that barrel or lives outside `controllers/`.
4. **OpenAPI path spec** — still required for docs + `scope-parity.test.ts`
   (`handlers/<feature>/spec/paths/…`, `$ref` in `openapi.yml`). Set
   `operationId`, `x-required-scope` matching `@ApiKeyScope`. **Do not** set
   `x-eov-operation-id` / `x-eov-operation-handler` — those are legacy eov-only;
   scope-parity and discover read `@ApiKeyScope` from the controller by matching
   method + path.
5. **Coverage manifest** — add every new OpenAPI endpoint to
   `packages/nodes-base/nodes/N8n/n8n-api-coverage.json`.

## Legacy eov handlers (do not use for new endpoints)

Only for maintaining endpoints not yet migrated:

1. **Handler** — `handlers/<feature>/<feature>.handler.ts`
   - Export middleware arrays keyed by `x-eov-operation-id`.
   - For scope-protected endpoints, use `publicApiScope()` or
     `apiKeyHasScopeWithGlobalScopeFallback()` (they tag the scope-enforcement
     middleware with `__apiKeyScope`) and add matching `x-required-scope` in the
     path YAML; use `none` for endpoints without an API-key scope (see
     `scope-parity.test.ts`).
   - **Delegate to the same service layer as the internal REST API.**
     Parse input with `@n8n/api-types` DTOs, call `Container.get(SomeService)`,
     map errors — do not reach into repositories or duplicate business logic.
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

- **Controller pattern (required for new work):** `v1/controllers/tags.public.controller.ts`, `v1/controllers/workflows.public.controller.ts`
- **Registry:** `packages/cli/src/public-api/public-api-controller.registry.ts`
- Legacy eov examples (migration targets, not templates for new endpoints):
  `handlers/insights/`, `handlers/variables/`, `handlers/folders/`,
  `handlers/projects/`, `handlers/data-tables/`, `handlers/workflows/`
- Multipart: `handlers/n8n-packages/` (see also
  `packages/cli/src/modules/n8n-packages/CLAUDE.md`)
