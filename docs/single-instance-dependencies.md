# Single-instance dependencies

Some libraries break when a single process loads **more than one physical copy** of
them. Checks like `instanceof`, module-level singletons, and cross-package schema
composition all depend on a shared runtime identity — two copies means two identities,
and the check silently does the wrong thing. In Node, module identity is the resolved
real path of the file, so "two physical copies" means "two distinct real paths",
regardless of version or inode.

We have hit this in production more than once (`zod`, `form-data`). This document
describes how we prevent it.

## Curated libraries

The single source of truth is [`scripts/single-instance-libs.mjs`](../scripts/single-instance-libs.mjs):

- `zod`
- `form-data`
- `@langchain/core`
- `reflect-metadata` (pin-only — see below)

Both the manifest checks and the closure verifier read that file, so they cannot drift.

## Two duplication mechanisms

| | Version conflict | Peer-context instancing |
|---|---|---|
| Cause | Incompatible ranges resolve two versions | pnpm makes one physical copy per resolved peer set, so a transitive (often optional) peer resolving two ways yields two copies of the **same** version |
| Same version? | No | Yes |
| Hidden in local dev? | Yes — root `pnpm.overrides` + catalog force one copy | No — visible in the dev store |
| Caught by | manifest checks **and** the verifier | the **verifier only** |

The manifest layer cannot see the peer-context class. The closure verifier is therefore
the load-bearing layer; the manifest checks are prevention on top for the class they can
reach.

## Enforcement layers

### 1. Manifest checks (prevention)

- **`catalog:` protocol** — `syncpack` ([`syncpack.config.mjs`](../syncpack.config.mjs))
  requires every curated library, wherever declared, to be consumed via the pnpm
  catalog. A raw semver range fails. This gives one version, monorepo-wide.
- **Dependency shape** — [`scripts/check-single-instance-peers.mjs`](../scripts/check-single-instance-peers.mjs)
  requires curated libraries (except pin-only ones) to be declared as
  `peerDependencies` (+ `devDependencies` via `catalog:` for local builds) in every
  non-host, non-frontend package, never as a plain `dependency`. A plain dependency is
  what lets `npm install` nest a second copy.

`reflect-metadata` is **pin-only**: enforced to use `catalog:`, but not moved to
`peerDependencies` in this iteration.

Hosts (`n8n`, `@n8n/task-runner`) provide the single shared runtime instance and keep
curated libraries as real `dependencies`. Frontend packages (`packages/frontend/**`)
bundle with Vite, so runtime-identity duplication does not apply; they use
`resolve.dedupe` instead (see `packages/frontend/editor-ui/vite.config.mts`).

### 2. Closure verifier (detection)

[`scripts/verify-single-instance-deps.mjs`](../scripts/verify-single-instance-deps.mjs)
walks an install closure, resolves every package to its real path, dedups, and fails if
a curated library resolves to more than one real path. It reports **every** duplicated
package (a discovery aid for the next single-instance-sensitive library) and hard-fails
only on curated ones. Run it against the pruned `compiled/` closure or an `npm install`
tree — **not** the dev `.pnpm` store, which over-reports peer-context entries that are
never co-loaded.

It covers curated **third-party** libraries. Our **own workspace packages** are covered
by a complementary check — `runWorkspaceDedupCheck` in
[`scripts/smoke-n8n-image.mjs`](../scripts/smoke-n8n-image.mjs), which fails if a
`file:`-injected workspace package (e.g. `n8n-core`) is materialized more than once in
the docker image. The two are deliberately split by domain (third-party vs workspace) and
each keeps its own migration-window allowlist (`EXPECTED_DUPLICATES` here,
`KNOWN_DUPLICATED` there). When investigating "is anything else duplicated?", read both.

## Report-first rollout (no breaking changes on master)

Moving a published package's curated library from `dependencies` to `peerDependencies`
is a breaking change for external consumers, so it does **not** land on master — it is a
separate `3.x`-branch effort. Until then the checks run report-first:

- **Manifest baseline** — packages still declaring a curated library as a `dependency`
  are recorded in [`scripts/single-instance-peers-baseline.json`](../scripts/single-instance-peers-baseline.json)
  and reported, not failed. A package **not** in the baseline that adds a curated
  dependency (a regression, e.g. moving `zod` back to `dependencies`) hard-fails. The
  baseline shrinks to empty as the peer migration lands.
- **Verifier allowlist** (`EXPECTED_DUPLICATES`) — a migration-window escape hatch for a
  known, not-yet-fixable curated duplicate: the verifier reports it without failing until
  it is remediated. Currently **empty** — every curated library resolves to a single copy.

## Published peer ranges

`pnpm pack`/`pnpm publish` resolve the `catalog:` protocol to the **exact** catalog
version in the published tarball — not a caret range. Verified: `@n8n/json-schema-to-zod`
packs with `"peerDependencies": { "zod": "3.25.67" }`. So a downstream `npm install`
cannot satisfy a curated peer with a compatible-but-different version; the exact pin is
already what ships. No publish-tooling change is needed for this on master.

## Where the checks run

| Check | Where |
|---|---|
| `catalog:` + dependency shape + verifier self-test (`pnpm check:single-instance`) | `lint:ci` (required PR gate + merge-to-master) and lefthook on any `package.json` change |
| Closure verifier against `compiled/` | `scripts/build-n8n.mjs`, after `pnpm deploy` (runs on every `build:deploy`/`build:docker`, incl. nightly Docker + release) |
| Scoped npm-install verifier (changed packages) | `ci-master.yml`, post-merge (non-blocking initially) |
| Full npm-install verifier (all publishable packages) | `release-create-pr.yml`, release prep (non-blocking initially) |

## Remediation playbook

**A curated library we own is declared as a `dependency`.** Move it to
`peerDependencies` and add it to `devDependencies` via `catalog:` for local builds. This
is the breaking-change path — do it on `3.x`, and remove the package from the manifest
baseline.

**A duplicate originates from a third-party dependency we don't own.** The catalog and
peer rules only govern our own manifests, so they cannot fix this (a transitive optional
peer that resolves two ways splits the package into two peer-context copies). Options, in
order of preference:

1. **Host-level `pnpm.overrides`** in the root `package.json` to force a single version
   or resolution. Works when the duplication is a version conflict.
2. **`pnpm.packageExtensions` / a `.pnpmfile.cjs` hook** to normalise the offending
   dependency's peer declarations so pnpm stops instancing it per peer context.
3. **A patch** (`pnpm patch`) as a last resort when upstream won't change.

Whichever is used, once resolved, remove the entry from the verifier's
`EXPECTED_DUPLICATES` allowlist so a regression re-fails.

**Tactical escape hatch (a class we own that gets `instanceof`-checked across copies).**
When a duplicate can't be removed immediately but is actively breaking an `instanceof`
check, give the class a `[Symbol.hasInstance]` so the check recognises instances from any
copy (as done for `StructuredToolkit` in `n8n-core`). This is a runtime workaround for a
specific class, not a substitute for de-duplicating the dependency graph — prefer the
options above.
