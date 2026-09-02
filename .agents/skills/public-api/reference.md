# Public API v1 — reference

Detail for tasks that need it. Essentials and the rule tiers are in
[SKILL.md](SKILL.md). Open the cited files; they are the source of truth.

## List endpoints and cursor pagination

The internal API mixes cursor- and page-based pagination. New Public API list
endpoints use **cursor-based** pagination — do not copy an internal controller's
model.

Copy the working flow from `v1/controllers/tags.public.controller.ts` (and
`workflows.public.controller.ts` for a `@Param` list) rather than pasting a
snippet here — a copy would drift. The moving parts:

- Input DTO composes `publicApiPaginationSchema` from `@n8n/api-types` (a `limit`
  plus an opaque `cursor`).
- `decodeCursor` / `encodeNextCursor` live in
  `v1/shared/services/pagination.service.ts`. Decode the incoming cursor to
  `{ offset, limit }`, guard the decoded shape, and pass `offset`/`limit` to the
  service.
- Treat the cursor as opaque; never hand-encode a token.
- Return an envelope `{ data, nextCursor }` — never a bare array.
- `encodeNextCursor(...)` returns `null` when there is no further page; surface
  that as `nextCursor: null`.
- An invalid/undecodable cursor is a `400` via the existing bad-request error.
- For an existing list endpoint, keep its current pagination semantics unchanged.

The output DTO wraps the list as `{ data, nextCursor }` and is declared with
`@ApiResponse(...)` so the registry strips undeclared fields.

## Updates and write-only secrets

- Default to `PUT`. The update DTO describes the full mutable object; the
  validation layer rejects a partial payload (typically `400`). Don't implement
  merge semantics behind a `PUT`.
- Don't add a new `PATCH` unless the task explicitly requires partial-update
  semantics or an established resource-specific exception applies.
- Migrating an update endpoint keeps its current public HTTP semantics.

Write-only secrets (credentials, tokens, keys) support GET→PUT round-trip via a
resource-specific sentinel/placeholder (e.g. credentials use
`CREDENTIAL_BLANKING_VALUE` / related helpers — do not invent a new format):

- `GET` never returns the real secret; it returns that sentinel (or omits the
  field). Never echo a real secret in responses or error details (including
  test-connection and upstream error messages).
- On `PUT`, sending the **exact** sentinel from `GET` means **keep** the stored
  secret. Sending **any other** value means **replace** it. Do not treat
  "looks masked" or "field omitted" as keep unless the resource helper/tests say
  so.
- Reuse the resource's redact/unredact (or equivalent) helper in the service —
  don't reimplement sentinel detection or credential merge in the controller, and
  never persist the sentinel as a real secret.
- Sentinel support does not make the whole `PUT` a partial update; other required
  client-manageable fields stay required. Server-managed/immutable fields from
  `GET` (`id`, timestamps, …) follow the resource DTO (ignored or not required on
  write).

## Test-before-save endpoints

A connection/config-test endpoint validates the config in the **request body**,
not stored state — unless the endpoint explicitly verifies an already-saved
resource. Secret handling is the same as any other endpoint — see above.

## Errors

- Don't leak persistence errors, stack traces, or internal messages. Reuse
  existing domain errors when the registry already maps them to the right public
  errors; otherwise map at the controller boundary.
- Follow the error semantics of the nearest existing public controller; invalid
  input and invalid cursors use the existing bad-request pattern.
- When migrating, preserve the documented status codes and public error behavior.

## Testing matrix

Always (in SKILL.md): happy path, input-validation failure, missing API-key
scope, RBAC denial. Add whichever apply, matching the nearest existing tests:

- At least one integration test under `packages/cli/test/integration/public-api/`
  that exercises the real service/DB path for the main success case (and
  paging/RBAC where they matter). Controller unit tests with a mocked service are
  fine for wiring/validation edges — not as the only coverage of behavior.
- Cursor paging: first page, final page with `nextCursor: null`, invalid cursor,
  `limit` handling.
- Not-found and conflict semantics.
- Response carries no sensitive/internal fields.
- Credential resources: response has no real secret (sentinel or omitted);
  `PUT` with the exact sentinel keeps the secret; any other value replaces it;
  the sentinel is never persisted as a real secret.
- Migration: path, method, status codes, scope, and response contract are
  unchanged.

## Migrating legacy EOV endpoints

Legacy `express-openapi-validator` endpoints live under
`v1/handlers/`, wired through `openapi.yml` with `x-eov-operation-*` and request
types in `packages/cli/src/public-api/types.ts`. Treat these as migration targets,
not templates.

- Prefer migrating to `@PublicApiController` over extending the handler.
- Preserve the public contract: path, method, scopes, status codes, response
  shape, and pagination.
- Move HTTP concerns into the controller and business orchestration into the
  shared service; keep the controller a thin HTTP boundary. If the legacy
  handler was itself already just a thin wrapper around an internal
  `@RestController` (calling its methods directly, e.g.
  `Container.get(SomeController).createThing(req, res, payload)`), the new
  public controller can call that same internal controller directly — no need
  to duplicate its validation/business logic.
- A route must be served by either the EOV handler or a controller, not both —
  the build's `mergeDecoratorDocument` (`v1/openapi-gen/generate.ts`) throws on
  a path+method declared by both sides. Remove the legacy wiring (its path's
  `$ref` entry in `openapi.yml`, the `x-eov-operation-*` handler, and its
  `handler.ts`) only after the new controller is registered, `pnpm build`
  regenerates the spec cleanly, and tests are updated.
- Fully delete the migrated legacy files: the handler's `.ts`, its
	`spec/paths/*.yml` and `spec/schemas/*.yml`, and any now-dead request type
	in `packages/cli/src/public-api/types.ts`. Then check
  `v1/shared/spec/schemas/_index.yml` and `v1/shared/spec/parameters/_index.yml`
  for entries that `$ref` one of the deleted schema/parameter files — those are
  separate from the path's own `$ref` in `openapi.yml` and are easy to miss;
  left dangling, the next bundle fails on a broken `$ref`.
- If the legacy handler gated on a license (`isLicensed('feat:x')` middleware),
  `@Licensed('feat:x')` now replicates that for a controller route (see the
  decorator table in [SKILL.md](SKILL.md#declaring-a-controller)) — but only for
  a single feature. If the legacy check was an any-of/all-of over several flags
  (e.g. `LicenseState.isProvisioningLicensed()`), `@Licensed` can't express
  that; replicate it manually in the controller instead, don't drop it - this
  is exactly what the internal `provisioning.controller.ee.ts` and
  `role-mapping-rule.controller.ee.ts` already do, since neither uses
  `@Licensed` for that reason.
- As a legacy file drops repository access / the `export =` tuple, remove its
  entry from the `off` allowlists for `no-repository-in-public-api-handler` and
  `require-public-api-controller` in `packages/cli/eslint.config.mjs` (shrink-only
  — never extend them).
- For complex legacy-only, multipart, or non-standard endpoints, study the
  nearest existing handler first.
