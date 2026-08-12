# Project File Preview — Implementation Plan

Preview a project file inline, in a dialog opened from a per-row button on the
project **Files** tab, for the MIME types where that is safe and cheap.

Scope is one PR. It builds on the Project Files feature (see
[PROJECT_FILES_PLAN.md](PROJECT_FILES_PLAN.md)) and is independent of the
Project File node.

---

## Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | **No PDF preview** | `ViewableMimeTypes` excludes `application/pdf` for "potential arbitrary code-execution vulnerabilities in PDF rendering engines" ([binary-data.schema.ts:1-8](packages/@n8n/api-types/src/schemas/binary-data.schema.ts#L1-L8)). Diverging from an instance-wide security policy for one feature is the policy owner's call, not this PR's. PDFs keep the Download action |
| 2 | Previewable set is a **strict subset of `ViewableMimeTypes`**, asserted by a test | Stops the list widening later without the security discussion that produced it |
| 3 | Reuse the existing content route with **`?action=view`** | Mirrors [binary-data.controller.ts](packages/cli/src/controllers/binary-data.controller.ts); no new route, and the existing browser-id exemption already covers it |
| 4 | The allowlist is **enforced on the server** | A client-side-only check is decorative — anything that can build a URL bypasses it |
| 5 | Add **`X-Content-Type-Options: nosniff`** | Without it, bytes uploaded as `text/plain` that are really HTML can be content-sniffed and rendered as HTML, defeating the allowlist |
| 6 | A **dedicated renderer**, not `BinaryDataDisplayEmbed.vue` | See [Reuse decision](#reuse-decision) |

---

## 1. Previewable MIME types

One shared list in `@n8n/api-types`, beside `ViewableMimeTypes`:

```ts
/**
 * MIME types the project Files tab previews inline.
 *
 * A strict subset of `ViewableMimeTypes` — enforced by a test, so this can never
 * grant inline rendering to a type the instance-wide policy rejects.
 */
export const ProjectFilePreviewableMimeTypes = [
	'image/png',
	'image/jpeg',
	'image/jpg',
	'image/gif',
	'image/webp',
	'image/bmp',

	'application/json',
	'text/plain',
	'text/csv',
	'text/markdown',
];
```

### What is excluded, and why

| Excluded | Reason |
|---|---|
| `application/pdf` | Policy — see decision #1. The most-wanted preview, and the one deliberately out of reach |
| `text/html` | Executes arbitrary JavaScript on the n8n origin |
| `image/svg+xml` | An image MIME type that can carry script — the classic trap in any "images are safe" allowlist |
| `image/tiff` | Present in `ViewableMimeTypes`, but only Safari renders it natively. Would show a broken image in Chrome and Firefox |
| `audio/*`, `video/*` | Present in `ViewableMimeTypes`, but the content route pipes a stream with no `Accept-Ranges`, so there is no seeking and the browser buffers the whole file. Needs HTTP Range support first — a technical blocker, not a security one |
| `text/css` | Harmless as text, but previewing a stylesheet has no user value here |

> **Never branch on `mimeType.startsWith('text/')`.** `text/html` is inside that
> prefix. Only explicit list membership decides previewability.

---

## 2. Backend

### Route

```
GET /projects/:projectId/files/:fileId/content?action=view
```

Same route, same `@ProjectScope('projectFile:read')` gate. `action=download`
and a missing `action` keep today's `attachment` behavior untouched.

### Response headers when `action=view`

| Header | Value |
|---|---|
| `Content-Type` | The stored `mimeType` |
| `Content-Length` | `fileSizeBytes` |
| `Content-Disposition` | `inline` |
| `Content-Security-Policy` | `getHtmlSandboxCSP()` |
| `X-Content-Type-Options` | `nosniff` |

### Rejections

- Not in `ProjectFilePreviewableMimeTypes` → **400** (matches the
  `BadRequestError` the binary-data controller throws for the same case)
- Larger than the preview cap → **413**

### Config

One new knob on `ProjectFilesConfig`:

| Env var | Default | Purpose |
|---|---|---|
| `N8N_PROJECT_FILES_MAX_PREVIEW_SIZE_BYTES` | 10 MiB | Largest file the preview endpoint will serve |

One value rather than a per-class pair: 10 MiB covers essentially every photo
and text file worth previewing, and the frontend truncates long text anyway
(§3). Split it per class only if that turns out to be too blunt.

### No auth change needed

The browser-id exemption added for downloads matches on
`req.baseUrl + req.route.path`, and query strings are not part of `route.path` —
so `?action=view` is already covered by the existing pattern in
[auth.service.ts](packages/cli/src/auth/auth.service.ts).

This is worth stating explicitly: the browser-id check is exactly what broke the
Download button, because a browser-driven subresource or navigation cannot send a
custom header. `<img src>` has the same constraint.

---

## 3. Frontend

### Per-row button

[ProjectFilesTable.vue](packages/frontend/editor-ui/src/features/core/projectFiles/components/ProjectFilesTable.vue)
gains an `N8nIconButton` (icon `eye`) in the actions cell, rendered only when the
row's MIME type is previewable, emitting `preview`.

One affordance only — not also duplicated into the `⋮` menu.

```
│  Name                    Size     Uploaded by      When        │
│  🖼️ logo.png             48 KB    Alex Kim      3 days ago  👁 ⋮ │
│  📄 invoice.pdf         1.2 MB    Dana Roy      2 hours ago    ⋮ │
```

### Components

| Component | Responsibility |
|---|---|
| `ProjectFilePreviewDialog.vue` | `N8nDialog`; header is the file name, footer carries **Download** and **Close** so there is always an escape hatch |
| `ProjectFilePreview.vue` | Branches on MIME type; owns loading and error states |

Renderer branches:

- **images** → `<img :src="viewUrl">`
- **`application/json`** → `VueJsonPretty` (already a dependency, used by the NDV)
- **`text/plain` · `text/csv` · `text/markdown`** → `<pre>`, text node only, never `innerHTML`

### Text truncation

Text is truncated client-side to ~200 KB, with *"Showing the beginning of this
file. Download it to see everything."* A 9 MiB CSV passes the 10 MiB server cap
and still freezes the tab inside a `<pre>`.

### Reuse decision

**Do not reuse
[BinaryDataDisplayEmbed.vue](packages/frontend/editor-ui/src/features/ndv/runData/components/BinaryDataDisplayEmbed.vue)**,
despite the visible overlap. It takes an `IBinaryData`, calls
`workflowsStore.getBinaryUrl(id, …)`, and branches on `fileType` — three
couplings to execution data that project files do not have.

Refactoring it to accept `{ url, mimeType }` is the DRY move, but it edits a
heavily-used NDV render path for a feature that does not need the change. A
~70-line dedicated renderer instead; extraction into a shared component is a
reasonable follow-up once there are two real consumers.

---

## 4. Tests

### Backend

- `ProjectFilePreviewableMimeTypes` is a strict subset of `ViewableMimeTypes`
- `action=view` on a PNG → 200 with `inline`, `nosniff`, and the sandbox CSP
- `action=view` on `application/pdf` → 400
- `action=view` on `text/html` → 400
- `action=view` above the cap → 413
- `action=download` and no `action` still return `attachment`

### Frontend

- Preview button hidden for a PDF row, shown for a PNG row
- Clicking it opens the dialog
- **A `text/plain` file whose contents are `<script>alert(1)</script>` renders as
  escaped text** — the security-relevant assertion

### e2e

Upload a PNG, click preview, assert the dialog shows an `<img>`. Run this one:
the Download bug was invisible to every integration test because the test server
injects `req.browserId` on every request, and only a real browser exercises the
missing-header path.

---

## 5. Risks

1. **Same failure mode as Download.** Preview is a browser-driven subresource
   load, so the auth path must be verified in a real browser before this is
   called done. Integration tests structurally cannot catch it.
2. **`nosniff` divergence.** Adding it here leaves `/rest/binary-data` weaker
   until it is retrofitted separately.
3. **`ViewableMimeTypes` could widen underneath us.** The subset test turns that
   into a build failure rather than a silent expansion of what the Files tab
   renders inline.

---

## 6. Deferred

| Deferred | Add when |
|---|---|
| PDF preview | The security owner signs off on a sandboxed-iframe approach, or the instance-wide policy changes |
| Audio and video preview | The content route supports HTTP Range requests |
| `image/svg+xml`, `text/html` | Never, without a sandboxed origin |
| Shared preview renderer with the NDV | A second consumer justifies extracting it |
| Preview telemetry | Someone asks what gets previewed |
