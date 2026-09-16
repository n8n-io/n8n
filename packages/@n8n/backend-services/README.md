# @n8n/backend-services

Backend services and HTTP error classes that many backend modules share.

## Why this package exists

Backend modules live in `packages/cli/src/modules/<name>` today. Most of them
import a small set of services from the rest of `cli`. A module cannot move
into its own workspace package while those imports point at `@/...` paths in
`cli`.

This package is the home for that shared set. It sits above `@n8n/db` and
below `n8n` (`cli`) in the dependency graph:

```mermaid
flowchart TD
  cli["n8n (cli) and backend modules"] --> sc["@n8n/backend-services"]
  sc --> db["@n8n/db"]
  sc --> bc["@n8n/backend-common"]
  db --> bc
```

`@n8n/backend-common` holds the foundation that `@n8n/db` also needs (logger,
license state, module registry, locks). `@n8n/backend-services` holds business
and infrastructure services that need the persistence layer or that only
`cli` and the modules consume.

## What lives here

Nothing yet. The next PRs move the response errors, `UrlService`, `CacheService`,
`RedisClientService`, `ProtectedResourceRegistry`, `EventService`, `RoleService`, the
finder services and the scope checks here, one area at a time.

## Rules for adding code

- The code must not import from `n8n` (`cli`). If it needs a `cli` seam,
  define a narrow DI port here and bind it in `cli` at bootstrap.
- At least two backend modules must use the code. A service that one module
  uses belongs to that module.
- Keep the file layout of `cli` (`errors/`, `services/`). A move with `git mv`
  keeps the history readable.
- Add each new export to `src/index.ts`. Consumers import from the package
  root only.
