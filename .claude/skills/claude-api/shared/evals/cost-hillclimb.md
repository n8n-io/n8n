# Cost-reduction search: how to structure it

Guidance for running an eval-driven search whose central goal is **reducing cost** (at
equal-or-better quality) for a Claude-powered app - typically during a migration from an
older model and prompt to a current one. This is the procedure the hillclimb loop
(`eval-hillclimb.md`) follows when the user's Step 1 goal is cost; it assumes there is an
eval to measure quality against. Without one, use `shared/cost-optimization.md` instead - 
the no-eval checklist (caching -> input trim -> agent-loop hygiene -> output -> batch -> effort ->
model last). The lever order differs on purpose: with an eval you can *detect* that a
stronger model at lower effort is the cheaper cell, so the model × effort walk comes early
here; without one, a model swap is the riskiest change and belongs last. Where this file states a number, it
reflects measured behavior on representative benchmark evals except where a
practitioner report is noted as such, stated so you can anticipate the shape of
results; always re-measure on the user's own eval.

## The search order

Work the levers in this order. Each position exists because running it later corrupts
or wastes the steps in between.

**Step 0 - Caching health: check first, re-verify after every lever change.**
Caching is configuration, not a search lever - its health gates the accuracy of every
cost measurement below, and its dominant failure mode is silent invalidation. Quick
health check: cache breakpoints are set; the cached prefix contains no dynamic content;
`cache_read_input_tokens` is nonzero in responses. Do not restate or re-derive caching
design here - follow the skill's prompt-caching guidance (shared/prompt-caching.md
in the shipped package; its load-bearing practices: re-verify cache health after
every change, not just at setup; know what a healthy cache loop looks like in the
usage fields; and when reads drop, hunt down the specific invalidator) - but
re-run this health check after EVERY model or effort decision below. Two scoping facts matter for every
step below: the cache is per-model, and effort participates in the prompt-cache key on
the Messages API - a mid-conversation effort switch costs one full prefix rewrite
(probe-measured on a current top-tier model against the raw API: 3/3 effort switches
re-billed the full prefix; 0/9 same-effort continuations did). Reports from first-party
product surfaces that effort can be switched without losing the cache do not transfer
to API customers - the serving path differs; trust an API-side probe. The upshot: a
lever change silently converts a healthy cache into a cost regression that looks like
model behavior, so re-verify cache health after every step of the model×effort walk
(Step 2), not only at setup.

**Step 1 - Audit the existing prompt and request config.**
Dated prompt content and legacy request parameters corrupt every later comparison: in
the harder arm of a measured migration (a heavily dated, extended prompt), the model
upgrade alone moved accuracy barely at all while auditing the same prompt recovered
more than ten times the gap; the milder arm of the same migration (lightly planted
cruft) measured a ~2× gap, so the multiple scales with how dated the prompt is. A
planted legacy thinking configuration (a dated budget-tokens shape) turned out to be
rejected outright - field-level, on every current model, probe-verified - and had to
be re-authored before any comparison could run at all; the period-correct form that
does run everywhere inflates cost instead of crashing, which is worse, because nothing
forces you to notice it. Newer models follow
legacy scaffolding MORE literally, so a model swap judged under a dated prompt can
mis-rank models - and can even *add* cost. The audit is cheap, runs once, and de-noises
everything after it. Run `prompt-audit` (the procedure ships as
shared/prompt-audit.md), and check request parameters against the current API
surface (see the model-migration guide), before any measurement you intend to keep.

**Step 2 - Model × effort: walk the staircase, don't sweep the grid.**
The cheapest configuration is frequently a *stronger* model at *lower* effort: the
stronger model tends to spend fewer tokens on the same task (a measured direction,
not a fixed magnitude), so it can win on cost as well as score. That
configuration is invisible to any procedure that fixes the model at default effort and
then tunes effort - and a full factorial grid finds it only by paying for every cell,
most of them in the expensive corner. Treat model × effort as one surface and search
it with a *staircase walk*: lay the cells out with model tier on one axis and effort
on the other. Cost rises with effort within each row - across tiers the measured
cost bands can overlap (see the bottom-up exception below) - and quality rises
(weakly) along both axes, so the cells that clear a pre-registered quality floor
form an upper-right region, the cheapest acceptable cell sits near that region's
lower-left boundary, and a monotone
walk from the top-left corner traces that boundary in roughly (tiers + effort notches)
cells instead of (tiers × effort notches) - and the cells it skips are the expensive
corner. (On cheap evals the walk buys pre-registrable discipline more than dollars:
one measured program's full grid cost ~$20 all-in.) Scope note: the "stronger model at lower effort" pattern is measured at list
prices on ordinary-sized tasks and is benchmark-dependent - the walk verifies it on
the user's own eval rather than assuming it.

*Set up the grid.* Rows are model tiers ordered by capability; columns are effort
notches (low -> high). Two regularities make the walk work, and one of them is the
load-bearing assumption to name in the plan: within a row, cost rises with effort
(measured in every row of both programs behind this guide); and at fixed effort,
quality rises with tier (held in every measured pair - where it bends, the walk
mis-prunes, which is part of what the registered confirm exists to catch). Quality
along the *effort* axis is only weakly monotone - in one measured family the high
notch drew below low on single-run screens (a tie within the measured ~±6 noise
band, while costing 1.7× the tokens) - so the walk never leans on it. The frontier tier above the
default top row, where one exists, sits *outside* the grid as an extension: it has
repeatedly priced above the top row's medium cell (~7× the eventual winner in one
measured migration), so treat it as a quality probe, not a cost candidate - the
cost-plausibility screen below is the test that decides this per workload.

*Round-0 diagnostic (before the grid spends anything).* From the baseline repeats
already run for the noise bar, read two signals out of the transcripts: output-token
share and turns per task. The third signal - effort sensitivity - costs one or two
cheap cells on the *old* model at a different effort. Output-heavy, multi-turn, and
effort-sensitive -> expect the winner near the top rows' low cells and budget repeats
there. Input-heavy, single-shot, effort-flat -> the exception class, where per-token
price dominates; the entry cell is the same, but expect to step down quickly and
budget repeats for the bottom rows. The diagnostic sets where repeats get spent,
never where the walk enters.

*Cost-plausibility screen (what "cost-plausible" means).* Project each candidate
tier's low cell from billing texture at matched effort - the tier's token prices
times a low-effort texture, which the round-0 diagnostic already bought on the old
model; if only the baseline's own-effort texture exists, discount it by the measured
round-0 effort ratio before applying the bar. (This is rule 4's effort-matching
requirement applied at screen time: a profile at a different effort overstates a low
cell by roughly the effort ratio, and at the screen the overstatement lands on the
silent-exclusion side.) A tier moves out to the above-grid extension only when the
evidence is overdetermined: no projection within the documented error band brings
its low cell in under the next tier down's medium cell - a bare point estimate
cannot establish "can't"; measured projection errors have run ~2× optimistic and
2.8× pessimistic - AND no measured or reported token-economy evidence suggests the
tier closes that gap in this workload's regime (smarter tiers spend fewer tokens per task, but how much is regime- and
pair-dependent, and the measured economies so far are single-draw readings - treat
them as direction, not magnitude). The screen is one-sided by design: when in doubt the tier stays in
the grid, because the walk makes inclusion errors cheap (the entry probe is that
tier's cheapest cell, and a fail prunes a whole column) while exclusion errors are
silent (only the on-fail extension trigger can catch one). Record the screen's
verdict and its basis in the pre-registration.

*Enter at the highest cost-plausible new-generation tier at low effort.* Three
reasons. Only the top-left corner gives an unambiguous walk - a pass prunes in one
direction and a fail prunes in the other, while from the bottom-left corner a fail
leaves two uphill directions and no way to choose without probing both. The entry
probe is the top tier's cheapest cell, so it is budget-bounded. And it doubles as the
regime test: if the whole top row fails the floor, the eval sits at or above the
models' capability frontier - upgrading is a quality story, not a cost story; stop
searching for savings and say so. (One honest cost: the top row *before the first
pass* has no incumbent, so its rightward walk is cost-unbounded by construction.
That is the regime probe's price.)

*The walk.*

- **Pass at (tier k, effort e):** record the cell as the incumbent with cost c*, drop
  the rest of row k, and step *down* a tier - from here on, only into cells projected
  under c*. The row-drop needs no quality assumption at all: every cell rightward of
  a pass costs more than the pass, so it cannot beat the incumbent whether or not it
  clears the floor. That makes the rule robust to effort non-monotonicity.
- **Fail at (tier k, effort e):** presume every lower tier at effort e also fails
  (the tier-monotonicity assumption above) and step *right*. Once an incumbent
  exists, step only into cells projected under c*, and cap the rightward walk at one
  or two notches - quality in effort is too weakly monotone to chase further.
- **Overlap probes:** after a fail-then-pass on tier k, cells of tier k-1 projected
  under c* may still be probed. This overlap - the smaller model working hard against
  the smarter model barely trying - is the only place the walk branches.
- **Extension trigger (the one upward move):** if the top row's low cell fails and
  the row's passing cells price near the above-grid extension tier, probe the
  extension's low cell before stopping. This is also the only recovery path for a
  tier the screen wrongly excluded - project it effort-matched (rule 4).
- **Stop** when no unprobed cell projects under c* and the extension trigger is
  quiet. The incumbent is the answer.

In one sentence: enter at the highest cost-plausible new-generation tier at low
effort; step down on pass, right on fail; prune by incumbent cost; the frontier
tier's low cell is the on-fail extension above the grid, and the old model at low is
the round-0 diagnostic below it.

*Decision machinery the walk cannot run without.*

1. **The floor is pre-registered before round 1** - for example the baseline's best
   repeat, with the rationale stated - never the baseline mean read after the fact.
   In one measured migration the registered floor was set above the baseline mean
   precisely because a one-repeat score at or just under that mean is as likely
   below baseline as at it - such a read is not admissible evidence of parity.
2. **Promotion needs n >= 2 near the floor.** Any cell about to become the incumbent
   whose margin over the floor is inside the noise bar gets a second run before c*
   moves. The errors are asymmetric and the expensive one is the false *pass*: a
   lucky pass sets c* and prunes the true winner, a lower tier failing says nothing
   about whether the pass above it was real, and the final confirm catches the error
   only after the pruned cells are gone. (Measured: a winner that passed at 11 of 20
   at one repeat drew 6 of 20 later on the identical configuration.) A false fail
   just sends the walk one cell right - cheaper, and the next rule covers it.
3. **Fails inside the noise bar of the floor get re-tested** before the walk steps
   right on their account.
4. **Pruning is calibrated deferral, not deletion.** Project a cell's cost from
   billing texture - the tier's token prices times a measured token profile MATCHED
   TO THE CANDIDATE'S EFFORT (a low-effort candidate projects from a low-effort
   cell's banked texture; the incumbent's profile at a different effort overstates
   the candidate by roughly the effort ratio - a measured case read 2.8× too high on
   an incumbent-at-higher-effort basis, and the effort-matched projection reversed
   the verdict to cheaper-than-incumbent) - and never from priors alone: early
   projections in one measured program ran ~2× optimistic, and optimistic
   projections *under*-prune. A pruned cell is deferred; re-admit it if the
   projections recalibrate.

*What the walk looks like on real evals.* Replaying the two measured migrations
behind this guide: on the ordinary-workload eval the walk reaches the eventual winner
in two cells - the entry cell passes at low, and the tier below passes at low once
the prompt is clean (under the surviving cruft it failed there, and was rescued by
the Step 4 re-probe - see that step's caveat) - and then asks the one question the
actual program never did, the next tier further down; the frontier-tier cell that
program did run plays the declared quality-probe role below. On the frontier-hard eval the entry cell fails the floor, and the same
tier's medium cell passes - one point over the floor, inside the noise bar, which is
exactly the case rule 2 above exists for: it gets a second run before it promotes to
incumbent. (The confirm's later 11, 6, 11 spread on that identical configuration is
the demonstration - a one-point margin at one repeat can be a 6.) The walk then steps down to the
mid tier's low cell - a probe the actual program never fired (projected cheaper than
the cells it did) - and on a fail would step right into the mid tier's medium cell,
which the program did fire: it came in under the incumbent's cost and failed badly.
There the walk stops, pruning without running it the mid tier's high cell, which the
actual program paid real money to learn was priced above the incumbent. (That program's winner read -46% vs the same model's high setting and -43% vs the
old-model baseline on fresh-run means, where the single cheapest selection pass read
-50%/-48% on the same comparisons: report the fresh-run means, never the favorable
end of a spread. Both arms were costed from the eval harness's own token ledger; with
both arms re-priced the way the API bills cached tokens (exact token counts from the
cache breakpoints), the reductions run a few points smaller - ~-40% on the baseline
comparison - and the arms compare like-for-like either way.) The frontier-hard case is also the cautionary half: the winner's
pre-registered confirm FAILED its stability clause - the identical configuration drew
11 of 20 on the selection pass and then 11, 6, and 11 across the three fresh confirm
runs - so the honest verdict was "cost cut firm,
mean quality comparable within noise, NOISIER than baseline", and the headline had to
be the confirm's number, not the selection round's. Which regime you are in decides
whether upgrading is a cost lever or a quality lever; the entry cell is what tells
you, in one bounded probe.

*Per-cell honesty rules (they apply to every probe in the walk):*

- **Single-run reads are pass/fail evidence, not rankings.** A single eval pass can
  swing several points on sampling alone (a recorded small-set example: ~8 points,
  ±6 across repeats). The honest single-run signals are *telemetry* - realized
  thinking tokens, output tokens, and tool rounds per case - not small score deltas.
  Measure the noise bar BEFORE the walk (repeat runs of the incumbent config, or
  pass@k over existing results files), so the floor margin and the promotion rule
  have a number to work with.
- **Confirm the effort dial is alive before crediting a rightward step.** Effort
  curves are per-model-family and not always monotonic: measured cases include a
  family where medium beat high, and a score curve with a knee that endpoint
  sampling cannot see. If a step right does not change realized thinking tokens, the
  dial is dead for that family - further rightward cells are the same cell at a
  higher price, so treat the row as exhausted.
- **Walk cost readings are cache-cold.** Cells never share cache - the cache is
  per-model and effort participates in the cache key (Step 0) - so production cost
  will be cheaper than walk cost by the cache rate; either warm each cell or
  annotate the readings. Keep effort fixed within any session whose cost is being
  measured, or cache invalidation noise lands in the effort arm's numbers.
- **State the billing basis per cell.** An eval harness's cost ledger can differ from
  what an API customer pays - a harness may count cache reads and writes differently
  from how the API bills them (exact token counts from the cache breakpoints) - and
  the same run can differ materially in reported cost across accountings. Check how
  the ledger prices cache reads and writes before quoting absolute costs; ratios
  between cells on the same basis are more robust than absolutes.

*Declare a quality probe, or the ceiling goes unmeasured.* By construction the walk
never fires the expensive corner, so a migration that passes early never learns what
the top tier at high effort would have bought. If that number is wanted - it usually
is, once - run the top-right cell, or the above-grid frontier tier at low, as ONE
declared quality-reference cell outside the cost walk, marked as such in the plan.
Skippable on tight budgets.

*When entering from the bottom is defensible.* Two cases. (1) Steady-state tuning - 
already on a current-generation model with a tuned prompt, just trimming: sweep
effort downward from where you are, but ALWAYS add the single next-tier-up-at-low
probe. The blind spot it closes: a bottom-up sweep that finds quality fine and cost
high at a lower tier never escalates, so the cheaper-better cell one tier up at low
is never tested. The measured billing overlap is why this is unsafe to skip: in one
program the top tier's low cell drew per-run costs both below and above the mid
tier's medium cell across two draws (~0.8× and ~1.5× its cost, the mid cell itself
a single draw) while solving more cases in both - adjacent tiers' measured cost
bands overlap, so tier order cannot be trusted to give cost order
(overlap evidence for the hazard, not an observed firing of the blind spot itself:
in that program the mid tier's cell also failed the floor, so even a bottom-up sweep
would have escalated). (2) A total budget of a cell or two plus a round-0 diagnostic
reading "exception class": go straight to the same-tier successor at low and accept
the risk of missing the inversion.

(For what the effort knob is and when the top of the range earns its cost, see the
skill's effort-level guidance - a pending skill update, not yet in the shipped
package; this section is about how to SEARCH it.)

**Step 3 - Prompt-hillclimb on the frozen model.**
Prompt wins do not transfer across models - measured gains of +30 and +15 points on two
model families were each model-specific, and one newer model's failure mode was not
prompt-addressable at all. Hillclimbing the prompt before the model is frozen wastes
the climb. Run the loop per the hillclimb guide, with the cost-specific rules below.

Do not assume the prompt is where the cost lives. The Step 1 audit tells you what is
*wrong* with a prompt; only measurement tells you what the wrongness *costs*. In one
measured case a dated opener full of turn-inflating ritual (forced plan files,
re-read-after-every-edit, full test suite after every change) audited as an obvious
cost win - and the cleaned opener failed to save anything: both cleanup cells landed
above the CEILINGS of their pre-registered 80% cost intervals (the cleaned cell's
point prediction was a ~32% cut), and inside the incumbent's own identical-config cost
spread measured later (so "cost more" is within noise; "missed its pre-registered
cost interval entirely" is the solid finding). The engagement census (below) showed the
forced-reasoning ritual was fully ignored while a plan-file instruction was genuinely
obeyed in 17 of 20 runs - and deleting all of it saved nothing, because per-run cost
was bound by turn count and context growth, not by opener text. That is sharper than
"models ignore dead text": even the obeyed scaffolding was not where the cost lived.
Pre-register the falsifier before the cleanup round - "if the cleaned prompt does not
come in under a named cost bar, the prompt lever is exhausted here, say so" - so a
no-win closes the lever with a recorded finding instead of inviting another round of
edits at the same dead wall.

**Step 4 - After the prompt climb, re-probe one cell down-left.**
One effort notch lower, or one tier lower at the effort that just passed. Cleanup can
make a previously failing cheaper cell viable, so the walk's verdict on those cells
expires when the prompt changes: in one measured migration the mid tier's low cell
went from 0.64 under the dated prompt to 0.98 after the transcript-driven cleanup on
the frozen model. Honest caveat: that rescue came
from the round-3 transcript-driven cleanup; whether the lighter pre-grid mechanical
audit (Step 1) alone recovers such cells is untested - the earlier program's arc
suggests it recovers much of the gap (audited cells scored far above swap-only cells
on the same eval), but treat that as suggestive, not measured, for this specific
re-probe. One cell, not a re-opened search: if it passes under the incumbent's cost,
it becomes the configuration the confirm tests; if not, the incumbent stands.

**Step 5 - Final effort re-sample = the registered joint confirm.**
After the prompt climb (and the Step 4 re-probe, if it promoted a cheaper cell),
re-sample effort around the chosen point at n>=3 and make that
run the pre-registered confirm of the full (model, prompt, effort) configuration - the
three adoption gates below, registered before it fires, on held-out cases if any exist.
This is the number to report. (The prompt winner was selected at the earlier effort
point; the direct prompt×effort interaction is unmeasured, so a prompt tuned under rich
thinking may not hold at lower effort - the joint confirm is the insurance.)

**Step 6 - Multi-model topologies only behind a task-shape preflight - usually never.**
Across every measured comparison, one strong model at the right effort beat every team
shape on the cost-score plane: cheap tokens pay by *substitution* (the cheap model does
the work instead), never by *addition* (a helper alongside a strong lead) - a strong
lead pays roughly an order of magnitude in its own tokens to consume cheap help. The
bar for any topology candidate is the model×effort frontier from Step 2 ("does this
beat what the effort dial gives for free?"). Documented exceptions worth a preflight:
the executor is constrained to be cheap or non-Claude (then one up-front plan call by
the strong model, with zero mid-run interaction, can pay); the executor is genuinely
weak (advisors pay below the lead's tier, with a floor); or the task has a visible,
checkable artifact (verification transfers; capability does not).

## Adoption gates - register before round 1

A candidate change (prompt edit, effort cut, model swap) is adopted only if ALL three
pre-registered gates pass:

1. **Quality band** - held-out score within a named band of the incumbent (state the
   band before running).
2. **Cost margin** - strictly cheaper beyond a registered margin, measured at the
   stated pricing basis.
3. **Mechanism** - the *predicted* mechanism appears in the measurements (e.g. "this
   edit removes duplicate lookups" must show up as fewer tool calls, not just a lower
   bill). A cost tie with the right mechanism and a cost win with the wrong mechanism
   are both rejections: the first is an edit that didn't bite, the second is an
   unexplained confound that will not survive contact with production.

The final joint confirm (Step 5 of the search order) reports against these same gates;
three sequential selections, each made on the data that chose it, overstate the
combined win, so the confirm's number - not the per-round selection scores - is the
headline.

## Measurement discipline

- **Noise bar first.** Before round 1, answer "how big must a delta be to be believed?"
  with a number, from repeat runs of the unchanged config. The same baseline repeats
  feed the round-0 diagnostic of the model×effort walk (Step 2): read output-token
  share and turns per task out of their transcripts while measuring the bar. If the tuned artifact is
  itself a stochastic generation (e.g. a built index or wiki, not a fixed prompt),
  measure *build* variance with a no-change rebuild control before judging any edit.
- **Selection set != holdout.** The split whose score picks winners each round is a
  selection set, even if the guide calls it "test". Pre-register confirm runs for the
  headline and expect train->holdout shrinkage.
- **Pricing basis discipline.** Lock and state the pricing basis up front (which price
  sheet, whether cache-adjusted, promo vs standard). The same run's reported cost can
  diverge severalfold across bases - cached input bills at a tenth of the fresh-input
  price, so cache-adjusted and flat accountings of one run separate fast at high
  cache rates. Do paper arithmetic with the rate card before spending:
  it can exclude whole configurations with zero eval runs.
- **Register cost in the objective.** An optimizer optimizes exactly what is
  registered: a quality-only climb raised cost per deliverable by 75% in one measured
  search. If the goal is cost-subject-to-quality, the gates above ARE the objective - 
  write them into the plan sign-off.
- **One lever per round, frozen arm.** Move exactly one axis per round so wins and
  regressions are attributable.
- **Make the optimizer predict before it measures.** Require, in each round's
  proposal, a point estimate and an 80% interval for every cell - on score AND cost - 
  plus named falsifiers ("if X happens, the lever is dead; say so"). Compare outcomes
  to intervals after each round, and shift and widen the next round's intervals after
  misses. This turns every round into a correction of the optimizer's own predictions: in
  one measured search the optimizer's round-2 cells both landed just below its solved
  intervals; it said so, re-centered, and the falsifier it registered for round 3 is
  what caught the prompt-lever no-win cleanly.
- **Verify serving identity and wiring before believing any arm.** Record the model id
  from the *response*, not the config; confirm usage fields are present per case; run
  on an eval surface that reports them; disable any auto-retry scoring that passes on
  either attempt. A result without wiring receipts is not evidence.
- **Audit graders before believing persistent failures.** Re-grading has shrunk a
  claimed +9-point win to +3 in a measured case. When a case fails every round, suspect
  the grader before grinding prompt content at it.
- **Routers price only on the full traffic frame.** A difficulty-router evaluated on a
  hard subset self-defeats (everything routes to the big model and you pay the routing
  overhead for nothing); its savings exist only on the full distribution, and are
  paper-only until the predictor is tested.

## What drives prompt cost (measured mechanics)

- **Cost scales with extra actions triggered, not prompt length.** In one measured
  decomposition, a single extra tool round added roughly a third of the per-case
  cost, while longer-but-inert prompt text was nearly free - *when cached*.
- **Census engagement before trimming.** Before editing scaffold instructions, count
  in existing transcripts the artifacts each instruction demands (plan-file writes,
  forced reasoning blocks, capped or repeated reads, per-edit suite runs, narration
  phrases) - and subtract the prompt's own occurrences of each marker, or static text
  masquerades as engagement. Near-zero corrected counts mean the model is ignoring
  that text: dead weight, nearly free while cached, and deleting it will not cut cost.
  Expect mixed pictures - in the measured case the forced-reasoning ritual counted
  zero everywhere while a plan-file instruction was engaged in 17 of 20 runs. A
  two-cell ablation (cleaned opener vs cleaned-plus-ritual) is cheap and settles
  whether a suspect block is load-bearing: here the two cells landed within 2% on cost
  and tied exactly on the held quality gate (the partial-credit diagnostic moved, a
  reminder that "tied" is metric-relative) - the ritual was dead weight at the scale
  the test could detect.
- **The expensive patterns are action-triggering instructions.** "Verify twice"
  (+48% per-case cost via duplicate lookups and re-deliberation) and "be maximally
  thorough" (+39% via unneeded tool calls) together cost roughly twice as much as all
  other measured cost-adding patterns combined. Audit for instructions that trigger
  redundant actions before trimming words.
- **Charge a prompt edit its own token mass at the real cache-adjusted price.** A
  standing directive that rides every request must net positive against its own mass:
  one measured 650-character directive produced exactly the predicted behavior change
  and still only tied on cost, because its per-request mass canceled the saving.
- **Brevity caps save money through shorter replies** - a reply-quality tradeoff to
  surface to the user, not a free win. Flag the median reply-length change alongside
  the cost saving.
- **Output tokens are the latency lever too.** In latency-bound products, output-token
  prompting rises in priority: one customer self-reported ~11% output-token cuts with
  quality flat-or-up (a practitioner report, not a benchmark measurement), and streamed
  tokens are directly perceived latency.

## Stopping rules

- **Prompt rounds:** wins come in rounds 1-2; stop when two consecutive variants fail
  to beat the incumbent beyond the noise band; cap at ~3-4 rounds per model.
- **Effort:** savings saturate stepwise (each step down saves less while variance
  grows). Stop inside the noise band. Remember lowered effort doesn't fail fixed cases - 
  failures MOVE between runs ("shallower thinking fails wherever the margin is thin"),
  so effort-cut decisions need aggregate non-inferiority over multiple runs, never
  per-case reads.
- **The model×effort walk:** stops itself - when no unprobed cell projects under the
  incumbent's cost and the extension trigger is quiet, the incumbent is the answer.
  Do not keep probing "to be sure";
  the declared quality-reference cell is the sanctioned way to buy information
  outside the walk.
- **Overall:** when the joint confirm passes its gates, ship; when it fails, report the
  best gated configuration honestly rather than re-searching on the confirm data.
