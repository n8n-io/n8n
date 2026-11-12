# Module migration pitfalls

Examples come from the backend modularization PRs from September to November
2026.

| Pitfall | Example | Prevention |
|---|---|---|
| A codemod adds duplicate or missing imports | #39949 to #39952: more than 60 P0 and P1 review comments; the stack was closed and redone as smaller PRs | Format the changed files, then typecheck cli before you push |
| References to the old path stay | `scripts/lint-parity/samples.json` (#40261, #42431), the `packages/cli/oxlint.config.mts` allowlist (#40157), README roadmaps (#42938, #42945, #39951), `OWNERS` | Search the repo for the old path and the moved symbol names |
| A dependency is not declared | `@types/express` (#42957), `@n8n/api-types` and `@n8n/errors` (#39949 to #39952) | Declare each import. Put types from the published `.d.ts` in `dependencies` |
| `exports` point to files that are not published | #40261, #41088 | Point each `exports` target to `dist` |
| An old `catch` swallows the proxy error | #42975 needed three follow-up commits | Throw a dedicated error class from the proxy. Rethrow it in each `catch` |
| Proxy registration breaks tests | #42967: `Container.get(Telemetry)` in `BaseCommand.init` broke the command tests | Let the real service register itself in its own `init` |
| A repository query changes the authorization result | #40157 (`In` on the relation, not the role slug), #40490 (a different result shows if a project exists), #40511 (check done in memory) | Keep authorization filters in SQL. Test allow, deny and not-found |
| A read leaves the transaction | #39999 and #40511: role cache reads used the default manager | Pass `ctx` through each read. Do not cache a read inside a transaction |
| Tests are lost during the move | #40066, #40068, #40313 | Map each deleted test to a new test. Compare coverage |
| Moved integration tests run on SQLite only | #40261 | Add `test:postgres` to the package |
| A test depends on test order or leaks config | #42431 `data-table-package.test.ts` | Load the package in each test. Restore config in `afterEach` |
| A test depends on an import side effect | #42955: the version was set only because another import ran first | Set the state in the test |
| A large refactor before the move stalls | `ProjectService` (#40313 to #40316), scope access (#40511 to #40517), `OwnershipService` (#40854), `userHasScopes` (#42938) | Make the narrowest port that unblocks the module |
| A low-level package gets high-level dependencies | #39907: REST error code in `@n8n/backend-common` added `express-openapi-validator` to `n8n-core` and `@n8n/db` | Put REST, express and cache code in `@n8n/backend-services` |
| A shared file has a generic name | #39907: `http-error-classifier` mapped errors to REST responses | Name the file for its purpose (`rest-error-response`) |
| A move makes a folder layout mandatory | #40261: a `database/` folder in the guide | Enforce the boundary with code health, not with folder names |
| Reviews ask again about package-root imports | #39851, #40069, #40261, #40854, #41088 | cli imports all of `@n8n/backend-services` anyway. Use `await import()` only on cold paths, and say so in the PR when a reviewer asks |

## Guard a module before the move

To stop new cli imports while the stack is open, add a code-health rule with
an allowlist that only shrinks. See
`packages/quality/policy/code-health/src/rules/skills-module-boundary.rule.ts`.
