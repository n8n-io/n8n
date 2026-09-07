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
