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
dotenvx run -f .env.eval -- pnpm eval:cockpit --run-all --filter <substring> --base-url http://localhost:5678
```

Then open the printed `http://localhost:<port>` (default 5679).

- `--filter` / `--tier` / `--exclude` — which cases to load (same selectors as a
  normal run; `--filter` matches many slugs by filename substring).
- `--base-url` — one or **many** dev instances, comma/space-separated. This is
  the concurrency dial (below).
- `--run-all` — dispatch every loaded case **once at startup**, so the cockpit is
  already building when you open it (equivalent to clicking **Run all**). Omit it
  to open idle and run cases by hand. Server-side and one-shot: refreshing the
  page does **not** re-trigger it.
- `--port <n>` — override the default `5679`.
- Everything else (login, model, sandbox) comes from the same env the eval CLI
  reads — see [`running-evals.md`](running-evals.md).

**Auto-login.** The cockpit logs into the primary instance server-side at startup
and primes that session onto your browser (an `n8n-auth` cookie set on its own
`/` response), so the embedded builder iframe loads **already authenticated** —
no manual sign-in. Browser cookies aren't port-scoped, so the localhost cookie
reaches the instance's iframe on its own port; this covers the common
single-instance run. With **several** `--base-url` instances only the first is
primed (each signs its own JWT, and localhost cookies can't be distinguished by
port), so sign in manually in the other iframes. If login fails at startup it's
non-fatal — the iframe shows the instance's normal sign-in and you log in by
hand.

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

## Prerequisite: an instance that allows framing

The builder is embedded in the cockpit's iframe, so the instance must **not**
send `X-Frame-Options`. n8n omits that header in three cases (server.ts): running
in **development** (`pnpm dev`), **`E2E_TESTS=true`**, or preview mode. The first
two keep a fully authenticated session, which is what the live builder needs.

The simplest path is the **same boot you already use for evals** — it sets
`E2E_TESTS=true` (for the `/rest/e2e/reset` owner seed), which *also* disables
`X-Frame-Options`, so a built-dist `pnpm start` instance frames fine; you don't
need a full `pnpm dev`. See [`running-evals.md`](running-evals.md) for that boot.

**Do not use `N8N_PREVIEW_MODE=true` to make framing work.** Preview mode skips
the authenticated frontend bootstrap (no current user is loaded), so the embedded
builder renders broken. A plain production instance (no `E2E_TESTS`, no dev)
sends `X-Frame-Options: sameorigin` and has no clean override. If the iframe
comes up blank, the instance is sending the header — the hint in the pane says so
rather than showing an empty frame.
