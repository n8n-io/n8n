# No runtime frontend module loading

Date: 2026-09-11

Status: Active

Decision Owner: Nightshift (Frontend Modularization)

## Context

Frontend features move into workspace packages that register through a descriptor
(`@n8n/frontend-module-sdk`). The shell imports the descriptors from one static list,
`packages/frontend/editor-ui/src/app/modules.manifest.ts`.

A recurring proposal is to fetch module bundles at runtime, keyed off the backend module
list, instead of compiling them with the shell. The design ruling against this is recorded
in the Frontend Modules design (§9). This ADR records the decision, because the ruling is
not discoverable from the repository.

Evidence:

- The bundle win is already banked. Route components and modal components load lazily
  today, and Vite emits one chunk per route.
- Availability is enforced on the backend: `licenseFlag` plus the `isModuleActive` route
  middleware fed from `/rest/module-settings`. Bundle absence is not the enforcement
  mechanism. Self-hosted n8n ships one artifact, so disabled-module code on disk is inert.
- PR [#14406](https://github.com/n8n-io/n8n/pull/14406) ("Create extensions loader for
  Frontend", opened 2025-04-04) built a runtime loader. It was closed unmerged on
  2026-09-09. Its defects are the cost profile of runtime loading, not review feedback:
  - `modules.store.ts` matches loaded scripts to manifests by array index
    (`window.n8nFrontendModules[index]`), so load order silently decides identity.
  - `injectScript` sets `onload` but no `onerror`. One failed fetch makes the
    `Promise.all` hang forever, with no error path.
  - `createNamespaceString` reads `manifest.publisher`. The PR removed `publisher` from
    the zod schema, so every namespace is `undefined/<name>`.
  - `ModulesService` reads the manifest with `jsonParse` and never runs the zod schema it
    defines. External input stays unvalidated at the boundary.
  - The bundle URL is hard-coded to `http://localhost:5678/...`; both `/rest/modules`
    endpoints take an `AuthlessRequest`; vue is externalized to a `Vue` global that the
    shell never provides.

## Decision

No runtime dynamic module loading. `modules.manifest.ts` is the single extension seam: a
static list of descriptors, compiled with the shell.

## Alternatives Considered

- **Runtime loading (PR #14406 shape).** A backend-served manifest list plus injected
  script tags. It adds failure modes that the static manifest does not have: a chunk 404
  after a rolling deploy invalidates hashed filenames mid-session, and self-hosted has no
  CDN version pinning; shared dependencies duplicate unless federation is added, which
  breaks the single vue and pinia guarantee; boot ordering becomes fragile, because
  `registerModuleRoutes` runs before mount while module settings arrive after; the test
  matrix doubles.
- **Build-time per-module chunks.** Convert the manifest to a static map of dynamic
  imports. This is compatible with this decision, not an alternative to it. It is deferred
  to the wave-2 exit, with bundle data (see Revisit triggers).

## Consequences

- One Vite graph. Types stay checked end to end across the descriptor boundary.
- The shell owns the lifecycle: routes register before mount, the rest after login,
  cleanups run on logout.
- There is no runtime fetch of module code, so there is no chunk-404 failure mode.
- Disabled-module JavaScript ships to disk as inert bytes.
- Third-party frontend extensions are not possible without reversing this decision.
- Every new module needs a shell commit, because the manifest line lives in editor-ui.

## Revisit triggers

- **Wave-2 exit bundle analysis.** This is the decision point for build-time per-module
  `import()` chunks. That change keeps the static manifest and does not reverse this ADR.
- **A frontend plugin marketplace decision.** If external extensions become a product
  requirement, the manifest-as-data shape from PR #14406 (backend-served manifest list,
  `minSDKVersion`, `permissions`) is the right contract, and it plugs in at
  `modules.manifest.ts`. Do not build it speculatively.

## Links

RFC: -
Documentation: Frontend Modules design, §9 (project brief)
Related ADRs: -
