# v0 Integration PoC: Ejectability of Generated Frontends

## Summary

If a customer wants to leave v0 after building a frontend through n8n, the source
artifacts are accessible via the v0 SDK and the output is a conventional Next.js
+ Tailwind + shadcn/ui app. Ejection is technically straightforward; the friction
is operational (hosting, secrets, CI), not legal or technical lock-in. n8n can
realistically offer a "Download source" button as a low-cost trust signal.

## File access via SDK

`v0-sdk` exposes generated code in two ways. On `ChatDetail.latestVersion.files`
each entry is `{ object: 'file'; name: string; content: string; locked: boolean }`
(see `node_modules/v0-sdk/dist/index.d.ts:30-35`, `:477-482`). `name` is a path
string and `content` is the raw source — no opaque blobs. `locked` indicates
files v0 will not edit on subsequent prompts; it is metadata, not DRM. There is
also a separate top-level `files?: { lang; meta; source }[]` (line 61), which
appears to be the legacy/diff representation. Open question: whether `name`
includes directory prefixes (e.g. `app/page.tsx`) or only basenames — to be
confirmed when we make a real call.

## Download API

`v0.chats.downloadVersion({ chatId, versionId, format?: 'zip' | 'tarball',
includeDefaultFiles?: boolean })` returns an `ArrayBuffer` (lines 1146-1151).
The `includeDefaultFiles` flag almost certainly toggles inclusion of Next.js
scaffolding (`package.json`, `next.config.js`, `tailwind.config.ts`,
`tsconfig.json`); for ejection we'd want it `true`. n8n integration shape: a
controller endpoint `GET /frontend-builder/:chatId/download` calls
`downloadVersion`, sets `Content-Type: application/zip` and
`Content-Disposition: attachment`, and pipes the buffer to the response. No
state to persist.

## Dependencies and self-host effort

v0 generates Next.js (App Router) projects with React, TypeScript, Tailwind,
and shadcn/ui (Radix primitives + class-variance-authority) — all OSS, all
MIT/Apache. To self-host: `pnpm install && pnpm build && pnpm start`, or deploy
the static/SSR output to any Node host (Vercel, Netlify, Docker, n8n's own
infra). The only runtime coupling is to whatever APIs the generated code calls
— in our case n8n webhooks, which the customer already controls.

## Lock-in verdict

**Low.** Source is plain text, dependencies are OSS, output is a standard
Next.js app. The lock-in is to the *generation* experience (prompt history,
preview iframe, design system context), not the code.

## Productionisation recommendation

Yes — expose ejection. Add a "Download source (.zip)" item in the Frontend
Builder drawer's overflow menu, alongside "Open in v0". Defer auto-deploy-to-
n8n-infra to a follow-up; the download button alone is enough to defuse
lock-in concerns for procurement reviews.
