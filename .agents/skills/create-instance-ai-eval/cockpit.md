# The co-review cockpit (collaborative mode)

Collaborative mode boots a small **local co-review server** so the driver and the
agent calibrate cases together against a live instance. It builds **many cases
concurrently** and, for whichever case the driver selects, shows the case JSON,
its expectations, and the live Instance AI builder side-by-side. It's a
throwaway, localhost-only tool — no auth, dies with the session.

It reuses the same runner the eval CLI uses (`runWorkflowTestCase`), so a case
built in the cockpit is graded exactly as it would be in a normal run.

## Launch

```bash
cd packages/@n8n/instance-ai
dotenvx run -f .env.eval -- pnpm eval:cockpit --filter <substring> --base-url http://localhost:5678
```

Then open the printed `http://localhost:<port>` (default 5679).

- `--filter` / `--tier` / `--exclude` — which cases to load (same selectors as a
  normal run; `--filter` matches many slugs by filename substring).
- `--base-url` — one or **many** dev instances, comma/space-separated. This is
  the concurrency dial (below).
- Everything else (login, model, sandbox) comes from the same env the eval CLI
  reads — see [`running-evals.md`](running-evals.md).

## The layout

**Left rail — case list.** Every loaded case with a live status badge
(idle / queued / building / grading / done ✅❌), plus **Run all**, **Run
selected**, and a concurrency input. Clicking a row selects it and retargets the
detail panes on the right. Background cases keep running while you work on one.

**Right — three panes, scoped to the selected case:**

1. **Case** — the case JSON in an editor. **Validate** checks it against the
   schema (inline errors); **Run this case** builds just this one. Edits save to
   the case file on disk.
2. **Expectations** — the case's `outcomeExpectations` / `processExpectations` /
   `executionScenarios`, overlaid with ✅/❌ and the judge's reasoning once the
   case has been built. Each red carries a **keep / loosen / drop** control — the
   calibration gate (below).
3. **Instance AI** — the live n8n builder for the selected case, embedded in an
   iframe. Watch the build materialize, or type into the builder yourself to
   probe a variation before encoding it. The iframe follows your selection: only
   the selected case is framed; the rest advance via their status badges.

## Concurrency

The cockpit runs cases concurrently using the eval runner's existing lane model:

- **One `--base-url`** → a single lane, up to the per-instance build cap
  (`MAX_CONCURRENT_BUILDS`, 4) concurrent builds. Simple: one `pnpm dev`.
- **Several `--base-url`s** → one lane per instance, cases spread across them for
  true parallelism (as the CLI does with `partitionRoundRobin`). Requires that
  many dev instances running.

Single-instance concurrency can queue or false-timeout builds under load (see the
calibration notes in [`SKILL.md`](SKILL.md) — "A build can time out"). If you hit
that, add another `--base-url` rather than pushing one instance harder.

## The calibrate loop

1. Select a case → read its expectations and watch/drive its build in the iframe.
2. When it finishes, the expectations pane shows what passed and what went red.
3. For each red, classify it — real capability gap, harness limitation, or noise
   (see [`SKILL.md`](SKILL.md) "A red is signal") — and pick **keep / loosen /
   drop**. The cockpit writes the decision back into the case `description` using
   the standard `Harness note:` / `Capability-gap finding:` prefix so the corpus
   stays greppable.
4. This is the trust-critical gate: the driver confirms every meaning-flipping
   verdict; the agent never silently commits one.

## Prerequisite: a dev-mode instance (framing)

**Run the cockpit against an instance started in development (`pnpm dev`).** In
development mode n8n does not send `X-Frame-Options`, so the builder can be
embedded in the cockpit's iframe with a fully authenticated session — which is
exactly what the live builder needs.

**Do not use `N8N_PREVIEW_MODE=true` to make framing work.** Preview mode skips
the authenticated frontend bootstrap (no current user is loaded), so the embedded
builder renders broken. A production-mode instance sends
`X-Frame-Options: sameorigin` and has no clean override, so the cockpit is a
dev-instance tool. If the iframe comes up blank, the instance isn't in dev mode —
the cockpit will say so rather than show an empty pane.
