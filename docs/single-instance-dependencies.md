# Single-instance dependencies

A few libraries break when a single process loads more than one physical copy of them —
`instanceof`, module singletons, and cross-package schema composition all rely on a shared
runtime identity, and a second copy silently breaks them (it bit us with `zod` and
`form-data`). In Node, module identity is the resolved real path, so "two copies" means
"two distinct real paths".

The curated list of these libraries and the host/frontend exemptions are the single source
of truth in [`scripts/single-instance/single-instance-libs.mjs`](../scripts/single-instance/single-instance-libs.mjs).
Enforcement lives in `scripts/single-instance/` (syncpack catalog config, the manifest
peer-shape check, and the closure verifier) plus `runWorkspaceDedupCheck` in
[`scripts/smoke-n8n-image.mjs`](../scripts/smoke-n8n-image.mjs), which covers our own
workspace packages in the docker image.

## Remediation playbook

**A curated library we own is declared as a `dependency`.** Move it to `peerDependencies`
and add it to `devDependencies` via `catalog:` for local builds. This is a breaking change
for external consumers, so it lands on `3.x`, not master.

**A duplicate originates from a third-party dependency we don't own.** The catalog and peer
rules only govern our own manifests, so they cannot fix this (a transitive optional peer
that resolves two ways splits the package into two peer-context copies). Options, in order
of preference:

1. **Host-level `pnpm.overrides`** in the root `package.json` to force a single version or
   resolution — works when the duplication is a version conflict.
2. **`pnpm.packageExtensions` / a `.pnpmfile.cjs` hook** to normalise the offending
   dependency's peer declarations so pnpm stops instancing it per peer context.
3. **A patch** (`pnpm patch`) as a last resort when upstream won't change.

**Tactical escape hatch (a class we own that gets `instanceof`-checked across copies).**
When a duplicate can't be removed immediately but is actively breaking an `instanceof`
check, give the class a `[Symbol.hasInstance]` so the check recognises instances from any
copy (as done for `StructuredToolkit` in `n8n-core`). This is a per-class runtime
workaround, not a substitute for de-duplicating the dependency graph — prefer the options
above.
