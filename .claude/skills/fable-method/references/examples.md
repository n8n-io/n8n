# Worked examples: one per ask shape

Each example shows the loop applied end to end, with the two steps weak models most often fake (Step 1's definition of done and Step 5's observed verification) spelled out concretely.

## 1. Trivial (gate, no loop)

**Ask:** "Rename `getUsrData` to `getUserData` in api.ts."

One file, under 10 lines, no new behavior, no searching needed: trivial. Make the edits (definition plus call sites in that file), run the typecheck or build the project already uses, report: "Renamed, 3 call sites updated, `tsc` clean." Done in three sentences. No classification table, no plan.

If the rename turned out to cross files (search shows 14 call sites in 6 files), the gate fails retroactively: say so and enter the full loop at Step 1 with a checklist.

## 2. Question / assessment

**Ask:** "Why is the dashboard slow?"

- **Step 0:** assessment. Deliverable is a diagnosis. Change nothing.
- **Step 1:** done = a cause backed by observations; every claim citable to a file and line or a measurement.
- **Step 2:** in one parallel batch: the data-fetching hook, the render path, and a look at what network requests actually fire (run the app or read the query configuration). Surprise check: is the slowness where you assumed?
- **Step 3:** one cause, one recommended fix. "It could be several things" is not a finding.
- **Step 6:** "The dashboard refetches all 12 widgets on every keystroke: `useDashboard.ts:41` has no debounce and the query cache key includes the raw search string. Fix would be a 300ms debounce plus a normalized cache key. Want me to make that change?" No files were touched; the offer at the end is the only bridge to a task.

## 3. Task

**Ask:** "Fix the failing date test."

- **Step 0:** task. Deliverable is the fixed code, verified.
- **Step 1:** done = the full suite passes, including `test_format_date`. Verification = the suite run's output.
- **Step 2:** read the test and the function it exercises in one batch. Surprise: the test is correct; `formatDate` drops the timezone offset. Stated to the user, since it changes where the fix goes.
- **Step 4:** one edit in `formatDate`. Nothing else touched.
- **Step 5:** full suite run: 42 passed. Both halves: the target test passes, and the rest of the suite still passes.
- **Step 6:** "The test was right: `formatDate` dropped the timezone offset (`dates.ts:27`). Fixed in one line; all 42 tests pass (output below)."

## 4. Plan-first

**Ask:** "Analyze how my projects configure X and propose a global standard."

- **Step 0:** plan-first: the user said "propose", and applying a standard across projects is a wide blast radius. Deliverable is a plan; stop after presenting it.
- **Step 1:** done = a plan the user can approve; each planned step names its own verification (for a config rollout: the file exists, the per-project files still lint/build, a diff summary per project).
- **Step 2:** parallel: find every config instance, read them all in one batch, fetch any external reference the user named. Tabulate what the projects actually do; the frequency table is the evidence.
- **Step 3:** one proposed standard. Conflicts between projects are named, each with a recommended resolution, not silently averaged.
- **Deliver the plan. Stop.** Steps 4-6 happen only after approval, and then the execution is surgical: precise edits per project, a measured before/after, and a report that includes what was intentionally left alone and why.
