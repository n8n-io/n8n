# Apps spike — vertical slice

Proves the two riskiest, previously-unverified assumptions behind the
"Apps as an Instance AI artifact" design (see the Notion architecture page
and `goals/webpage-node/plan.md` on `hackweek-n8nable-planning`), by actually
running them against a real local sandbox and a real n8n instance — not by
reasoning about whether they'd probably work.

## What's proven

1. **The sandbox can build a real Vite + React app.** `npm install` and
   `npm run build` both succeed inside the real `n8n-sandbox-service` (local
   Docker stack, no cloud credentials). This was NOT already known — the
   sandbox docs position it as "build and runtime-skill work," not a general
   workload platform, and no Node version or npm/Vite support was documented
   anywhere.
2. **A sandbox-built app can call back into n8n and render real workflow
   data.** A React app, written and built entirely inside the sandbox,
   copied out, and served by n8n itself at `/apps/:namespace/`, makes a live
   `fetch()` call to a real n8n workflow execution and renders the real
   (not mocked, not baked-in-at-build-time) response — confirmed visually in
   a real browser, twice, with a fresh timestamp each time.

Reproduce with `packages/@n8n/agents/spike-validate-sandbox-build.mjs` and
`spike-validate-roundtrip.mjs` — see the comment at the top of each for
requirements (a running local sandbox stack + a running n8n instance with a
webhook-triggered workflow).

## Hot reload: investigated further, refines (doesn't confirm) plan.md Phase 7

plan.md's Phase 7 said live HMR needs new background-process + port-exposure
infrastructure "bigger than Elias's research assumed." Pushed on this
further, against the real sandbox API (not just the client library):

- **Background execution turns out to already work at the raw HTTP API
  level.** `POST /sandboxes/:id/executions` returns immediately with an
  `exec_id` while the command keeps running server-side — confirmed with a
  real `npm run dev` (Vite) that stayed alive, and its output/status stayed
  queryable via `GET .../executions/:execId` afterward. The client library
  (`@n8n/agents`'s `SandboxProcessManager`) just doesn't expose this yet; the
  server already can. This is a smaller gap than Phase 7 assumed.
- **Port exposure is still genuinely missing** — no `/ports`, `/proxy`, or
  `/expose` endpoint exists on the sandbox-service API today, confirming that
  part of Phase 7.
- **As a spike-only hack** (`spike-tcp-relay.mjs`, `spike-scaffold-devserver.mjs`
  — throwaway, NOT a design for the real feature), reached into the sandbox's
  container via `docker exec <runner-dind> nc <sandbox-ip> <port>`, relayed
  through a local Node TCP server, and loaded Vite's dev server directly in a
  real browser through it — proving the network path is achievable in
  principle, ahead of Phase 7 building it properly.
- **Vite's WebSocket HMR channel connected successfully** through that hacky
  relay (`[vite] connected.` in the console) — so a raw byte-level relay
  doesn't break the HMR protocol itself.
- **Root-caused the "live updates don't push" symptom — and it's good news.**
  The first attempts edited the file either before any browser had loaded the
  page through that Vite instance, or after restarting Vite (which wipes its
  module graph) — in both cases Vite logs `[no modules matched] src/App.jsx`
  and correctly has nothing to push. Redone in the right order (start Vite
  once → load the page for real in a browser, which registers the module via
  React Fast Refresh's `[self-accepts]` → edit the file, no restart) Vite's
  own debug log (`DEBUG=vite:hmr`, streamed through the executions API) shows
  the full correct sequence: `[file change]` → `[vite] hmr update /src/App.jsx`.
  **Vite's HMR pipeline (detect → compute → send) genuinely works inside this
  sandbox once exercised correctly.**
  - The remaining gap is narrower than it looked: the computed update still
    didn't visibly reach the browser through the spike's own relay. The most
    likely cause is that `docker exec -i <container> nc <ip> <port>` buffers
    the small binary WebSocket push frame somewhere in Docker's non-tty attach
    stream — `stdbuf` (the usual fix) isn't installed in this minimal
    container image, so the exact buffering point wasn't isolated further.
    A real proxy — Elias's own research already specifies Go's
    `httputil.ReverseProxy`, which explicitly passes WebSocket upgrades
    without this kind of ad-hoc buffering — should not hit this at all.
  - **Net effect: hot reload is substantially de-risked, not blocked.** The
    piece that was genuinely unverified (does the HMR mechanism work at all
    in this sandbox environment) now has direct, positive evidence. What's
    left is exactly the already-scoped Phase 7 engineering work (a real
    port-proxy, not a relay hack) — there's no new fundamental blocker found.

## What's real, committable code (not just validation scripts)

- `packages/@n8n/instance-ai/src/tools/apps.tool.ts` — `create`/`publish`
  actions. Building the app's own files is deliberately NOT this tool's job —
  the agent uses the existing `workspace_write_file`/`workspace_execute_command`
  tools directly, per the `app-builder` skill.
- `packages/@n8n/instance-ai/skills/app-builder/SKILL.md` — the skill that
  tells the agent how to scaffold, build, and publish an app.
- `packages/cli/src/modules/app-spike/serve-app-spike.ts` +
  `abstract-server.ts` — serves a published app's static files at
  `/apps/:namespace{/*path}`.

Both new pieces typecheck cleanly (`pnpm typecheck` in `packages/@n8n/instance-ai`
and `packages/cli`), and the serving route was smoke-tested end-to-end inside
a real running n8n process (not just typechecked) — see the git log for
exactly what was verified vs. only typechecked.

## Deliberate shortcuts (do not mistake these for the production design)

- **Storage**: apps are held in an in-memory `Map` (lost on server restart)
  and published files land in a fixed local directory
  (`/tmp/n8n-app-spike-served/<namespace>/` by default,
  `N8N_APP_SPIKE_SERVE_DIR` to override) read straight off disk — not the
  `App`/`AppVersion`/`AppBinding` entities the real plan calls for.
- **No auth, no bindings enforcement**: the serving route is fully public,
  and there's no allow-list checking which workflows an app may call — the
  round-trip proof above used a webhook directly, standing in for
  `@n8n/app-sdk`'s `runWorkflow()`.
- **No shadcn/ui, no theme, no live HMR, no editing tiers, no App Builder UI.**
  Every change is a manual write-files-then-rebuild cycle.

None of this is wired through a live chat conversation with Instance AI yet —
the `apps` tool and `app-builder` skill are written to the existing
conventions (matching `data-tables.tool.ts`/`workspace.tool.ts` and existing
`SKILL.md` files) and typecheck, but haven't been exercised end-to-end via a
real orchestrator session in this pass. That's the natural next slice.
