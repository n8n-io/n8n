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

- Input DTO takes `limit: publicApiPaginationSchema.limit` plus an opaque
  `cursor: z.string().optional()` — cherry-pick `limit` but never spread the whole
  `publicApiPaginationSchema`. That schema also exports `offset`, used by
  internal-API-style page params elsewhere; a Public API list DTO must never
  expose it as a query param. See `ListTagsQueryDto` for the shape to copy.
- `decodeCursor` / `encodeNextCursor` live in
  `v1/shared/services/pagination.service.ts`. Decode the incoming cursor to
  `{ offset, limit }`, guard the decoded shape, and pass `offset`/`limit` to the
  service — never `{ skip, take }`. `offset` is an internal implementation
  detail of the cursor here, never a client-facing query param. TypeORM's
  `skip`/`take` stay inside the repository, at the `find` call.
- Treat the cursor as opaque; never hand-encode a token.
- Return an envelope `{ data, nextCursor }` — never a bare array.
- `encodeNextCursor(...)` returns `null` when there is no further page; surface
  that as `nextCursor: null`.
- An invalid/undecodable cursor is a `400` via the existing bad-request error.
- For an existing list endpoint, keep its current *cursor* semantics unchanged.
  A leaked `offset` query param (DTO spreading `publicApiPaginationSchema`
  instead of picking `limit`) is a defect to remove, not a contract to
  preserve — decorator-routed DTOs validate via a plain `z.object()`, which
  silently strips unknown query keys rather than rejecting them, so removing
  `offset` from the DTO makes it inert rather than erroring for existing
  callers.

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
  unchanged. Tests alone cannot show this — see
  [Verifying a migration](#verifying-a-migration).

## Request body media types

`@Body` defaults to `application/json`; the body is already parsed by the
app-wide `bodyParser` before the registry sees it. Declaring
`@Body({ mediaType: 'multipart/form-data', uploadLimits })` instead takes a
`multipart/form-data` body:

- `uploadLimits: () => MultipartUploadLimits` is a thunk, read once the route
  handles its first request (not at startup) — read live config inside it
  (e.g. `Container.get(GlobalConfig)`), don't inline a literal.
- The route's `@Body` DTO validates text fields merged with uploaded files,
  not `req.body` alone. A text field and a file share the same flat object;
  a file field uses `publicApiUploadedFileSchema` (`@n8n/api-types`) — a
  multer-file-shaped schema that documents itself as `{ type: 'string',
  format: 'binary' }`. Several files under the same field name become an
  array.
- An unknown field (one the DTO doesn't declare, on a `{ strict: true }` DTO)
  fails with `Unexpected form field "<name>"` — not the default "unrecognized
  keys" wording.
- Multer parsing errors map to these statuses: `413` for a size or count limit,
  `400` for any other multer error, and `500` for anything else (a malformed
  body). The `500` is not masked, because it is a `ResponseError`. A missing
  boundary gives `400` with `multipart file(s) required`.
- The body is parsed **after** every auth/scope/license/quota gate and
  **before** controller/route middlewares — a caller those gates would reject
  never has their (possibly huge) body read off the socket, and a middleware
  that reads `req.body` sees it already parsed.
- `/discover` shows no request schema for a multipart route (same as a legacy
  multipart route today) — a client can't assume a JSON schema it never gets.
- The generator documents the body under the `multipart/form-data` content
  key (not `application/json`) and adds `413` alongside `415` to the route's
  documented responses automatically.

Everything above lives in `packages/cli/src/public-api/media-types/`, one
handler per media type (`REQUEST_BODY_HANDLERS` in
`media-types/request-body/index.ts`). Adding a further media type (e.g.
`application/octet-stream`) means: add it to `RequestBodyMediaOptions` in
`@n8n/decorators`'s `controller/types.ts`, write a handler implementing
`RequestBodyHandler` in `media-types/request-body/`, and register it in
`REQUEST_BODY_HANDLERS` — the registry, resolver, generator and `/discover`
need no change, since they all read the handler, not the media type.

## Binary response bodies

`@ApiResponse(status, { mediaType, description?, headers? })` declares a
success body that the controller method writes to `res` itself, for example
an `application/gzip` stream. The framework treats options whose `mediaType` is in
`BINARY_RESPONSE_MEDIA_TYPES` as a binary response. `mediaType` accepts only
those types.

- The registry sets the declared status and `Content-Type: <mediaType>`
  before it calls the method. It does not call `res.json(...)`, and it
  ignores the method's return value.
- The method must start the response before it resolves. For a stream, use
  `await pipeline(source, res)` from `node:stream/promises`. Do not wait for
  the `finish` event: if the framework aborts the response, `finish` never
  fires, and the method never settles. A method that returns before the
  response starts fails with a `500`.
- If the method throws, or returns, before the response starts, the registry
  restores the headers to their values from before the method ran. It removes
  headers the method added, and puts back any value the method overwrote. The
  JSON error then has no binary `Content-Type`, and no `Content-Disposition`
  unless an earlier middleware set one. Headers from earlier middleware (for
  example `Deprecation`) stay.
- After the response starts, an error goes to `next(error)`, as for a JSON
  route.
- Every header in `headers` must be set before the body starts. The
  framework checks this at the first write. A missing header aborts the
  response. If the method returns without writing, the request fails with a
  `500`. Declare only headers the method always sets.
- The generator documents the body as `{ type: string, format: binary }`
  under the `mediaType` content key, with the description and headers.
  The description defaults to `Operation successful.`.

The runtime part is `runBinaryResponseRoute` in
`packages/cli/src/public-api/media-types/binary-response.ts`.

## Verifying a migration

Tests are written against the new code, so they can't show that the old behavior
survived. These checks can:

- Diff live responses against master. Run the route on an instance per branch and
  compare status, body, and error message for the same requests. Reading the old
  YAML beside the new Zod schema doesn't find the differences.
- Check whether a field is absent or `null`. `activeVersion` omitted is not the
  same response as `activeVersion: null`; use a conditional spread to omit it.
- Check query-param coercion at the edges (`""`, `"0"`, `"false"`, absent). A Zod
  DTO and the old validator don't coerce identically.
- Request a route the PR didn't migrate. A shared DTO change can stop the spec
  bundle compiling at startup, which turns every legacy route into a `500` without
  failing a test.

## CI and merging

Two failures that a migration hits outside the code itself:

- Merge master in before merging. A generator change on master leaves every
  branch's committed `*.generated.yml` stale, and `generated-spec-drift.test.ts`
  then fails only on the merge commit, so the PR itself stays green and
  `MERGEABLE`. `gh pr checks` hides `merge_group` runs; look for the run on
  `gh-readonly-queue/master/pr-<number>-<sha>`.
- Ask a maintainer for a `/size-limit-override` early. Generated YAML counts
  toward the 1,000-line PR size limit, so a single-route migration can exceed it
  on generator output alone.
