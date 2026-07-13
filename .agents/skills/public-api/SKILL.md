---
name: n8n:public-api
description: >-
  Adds or updates n8n Public API v1 endpoints, OpenAPI specs, and handler wiring.
  Use when creating public API handlers, registering paths in openapi.yml, or
  adding OpenAPI tags.
---

# Public API v1

Public API lives under `packages/cli/src/public-api/v1/`. Handlers are
`express-openapi-validator` route modules; OpenAPI path specs are YAML under
each handler's `spec/` directory.

## Adding an endpoint

1. **Handler** — `handlers/<feature>/<feature>.handler.ts`
   - Export middleware arrays keyed by `x-eov-operation-id`.
   - Tag the first middleware with `__apiKeyScope` and add `x-required-scope` in
     the path YAML (see `scope-parity.test.ts`).
2. **OpenAPI path spec** — `handlers/<feature>/spec/paths/<path>.yml`
   - Set `tags: [<TagName>]` matching a top-level tag in `openapi.yml`.
3. **Register path** — add a `$ref` entry under `paths:` in `openapi.yml`.
4. **Request types** — add a namespace in `packages/cli/src/public-api/types.ts`
   when the handler needs typed query/body params.
5. **Coverage manifest** — if the endpoint is user-facing, add it to
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

## Reference handlers

- Simple GET: `handlers/insights/`
- CRUD: `handlers/credentials/`, `handlers/workflows/`
- Multipart: `handlers/n8n-packages/` (see also
  `packages/cli/src/modules/n8n-packages/CLAUDE.md`)
