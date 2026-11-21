# Eval health checklist

This file is loaded whenever an eval is being **built** (`build-eval.md`) or **climbed on** (`eval-hillclimb.md`). It has two jobs. When you are writing the eval, every item below is a construction requirement - the runner, grader, and case set you produce should satisfy it by default, not after someone flags it. When the user brings an existing eval, it is the verification pass you run before building anything on top of it. Either way, run it once more before the first full paid pass and before round 1 of a hillclimb.

Before trusting an eval to tell you which model, prompt, or configuration is better, check that the eval itself is sound. A broken eval produces confident-looking numbers that point in the wrong direction, and a hillclimb over a broken eval just multiplies the misdirection: you will "improve" an artifact and ship nothing. In practice the most surprising eval results usually turn out to be bugs in the eval rather than facts about the model, so an hour of auditing up front routinely saves days of chasing phantom differences.

The checks are grouped into **task design** (are the cases right?), **harness design** (is the scaffolding right?), **metrics hygiene** (are cost and latency measured correctly?), **grader design** (is the scoring right?), and **can it detect the change you're after** (is there enough signal for the decision?). They are written as direct instructions: for each, look at the eval's actual code, config, and data, not its README. The final section, **Reporting findings to the user**, covers how to communicate what you find; the checks are declarative, but the report to the human is observations and suggestions, since the eval's author almost always has context that justifies choices an outsider would flag.

Before auditing further, run the eval once end-to-end on a handful of cases, or find a recent results file. A surprising number of eval-quality discussions turn out to be about code that does not currently run.

## 1. Task design

These checks concern the cases themselves: what is being asked, what counts as correct, and whether the set as a whole can distinguish between the systems being compared.

### Auditing case sets at scale

The harness and grader are code you can read end to end; the case set may be hundreds of items you cannot. Do not try to read every case inline. Work in three tiers:

**Tier 1: programmatic checks over the full set.** Write a short script that loads every case and reports: exact- and near-duplicate rate; label or category balance; prompt-length and expected-answer-length distributions; schema validity and missing-field counts; obviously malformed rows. Cheap, exhaustive, and catches skew, duplicates, truncation, and broken rows regardless of set size.

**Tier 2: stratified sample for a close read.** Draw twenty to fifty cases, stratified across `tags[0]` if it exists, otherwise uniformly at random, and apply the per-case checks below to those. Recommend the user read a handful themselves as well - a second pair of human eyes on raw cases catches things no checklist does. (This is what the build-eval inputs sign-off is for; the report's per-case table is the surface.)

**Tier 3: per-case LLM auditor.** For sets beyond a few hundred items, run one isolated model call per case with a tight audit prompt, collect a structured verdict, and aggregate. Ask before running it - the cost is roughly N cheap-model calls - and offer it explicitly: "I can run a per-case auditor over all N cases, ~$X. Want me to?"

A per-case auditor prompt that works well (adapt field names to the eval's schema):

```
You are auditing a single case from an evaluation suite. Given the prompt, the reference answer, and a description of how the grader decides pass/fail, flag any of the following. Be conservative - only flag when reasonably confident.

PROMPT:
{prompt}

REFERENCE ANSWER:
{gold}

GRADER BEHAVIOUR:
{grader_description}

For each issue answer yes/no with a one-line reason if yes:
- ambiguous: could two careful experts reasonably disagree on the correct answer?
- gold_suspect: does the reference answer look wrong, incomplete, or arguable?
- answerable_from_memory: could a well-read model answer this without doing the intended work?
- grader_too_strict: are there clearly correct answers the grader as described would reject?
- grader_too_lenient: are there clearly wrong answers the grader as described would accept?
- trivially_cheatable: is there a shortcut that satisfies the grader without solving the task?
- other: anything else that would make this case's result misleading.

Return JSON: {"case_id": "...", "flags": {"ambiguous": {"flagged": bool, "reason": "..."}, ...}, "overall": "ok" | "review" | "broken"}
```

Cluster by flag type, surface the top issues with example case IDs, and feed them into the report (§6).

The per-case checks (apply to the tier-2 sample):

- **Unambiguous success criteria.** Would two independent domain experts, shown the same output, agree on pass vs fail? If the criteria admit reasonable disagreement ("write a *good* summary"), scores reflect grader opinion as much as model capability. Note the dual failure: under-specified (a required output, filename, format left unstated) or over-specified (the prompt is a step-by-step recipe, leaving nothing for the model to decide).

- **Reference solution exists and passes.** Does each case ship with at least one gold answer that actually passes the grader? A 0% pass rate across all variants is more often a broken case than a hard one. Spot-check by running the reference through the grader.

- **Ground-truth labels are correct.** Sample ten cases and independently re-derive the expected answers. Widely used benchmarks routinely carry meaningful label error; wrong labels cap measurable accuracy for reasons that have nothing to do with the model.

- **Where did the ground truth come from?** Ask, and record the answer as a tag: human-written, human-verified, or **a model's outputs - and which model**. If the expected outputs are a model's outputs, reference-match scoring rewards *imitating that model*, not being right; this is worst in a migration, where gold derived from the incumbent makes the incumbent look best by construction and penalises a successor for every stylistic difference. Prefer a rubric or pairwise judge over reference similarity in that case, or have a human verify a sample of the references first. Never use model A's outputs as gold when the question is A vs B.

- **No annotation artifacts.** Could a trivial baseline score well from surface patterns - question length, keywords, option order - without solving the task? If a no-op or majority-class baseline scores well above chance, the eval is partly measuring the artifact.

- **Label leakage in the prompt.** Does the expected answer, or a near-paraphrase, appear anywhere the model can see - the prompt, few-shot examples, system message, a tool description, a file the agent can read? Common in few-shot setups assembled by copy-pasting from the golden set.

- **Answerable from memory.** For cases about real, named entities, can the model answer from parametric memory even though the intent is to test retrieval or tool use? If the goal is whether the model can *do the work*, subjects need to be obscure or synthetic enough that recall alone doesn't carry it.

- **Difficulty comes from the problem, not the prompt.** Are hard-looking cases just worded obscurely? Then the score measures prompt-deciphering. Suggest stating the problem plainly and letting the problem itself be hard.

- **Agentic cases: symptom, not investigation.** For cases that ask an agent to diagnose or fix something, how much of the investigation is handed over in the prompt? If it already includes the log line, the failing test name, or the file, the eval measures whether the model can read a hint, not find one. Give the agent what a user would plausibly report and let it fetch the rest.

- **Realistic distribution and interaction shape.** Compare a handful of cases to production traffic. Also check the *shape*: a single-turn eval won't capture effects that only appear in long multi-turn or agentic settings, and vice versa. Name any obvious divergence up front so readers can calibrate how far results transfer.

- **Difficulty headroom.** If results exist, look at the spread. If the baseline already scores ~95%+, the eval cannot discriminate at the top and a hillclimb will mostly move cost or latency - useful, but say so in advance. If everything scores ~0%, there is more often a case or grader bug than a genuinely impossible task.

- **Saturated evals and what they end up measuring.** Near the ceiling, remaining variance is dominated by format quirks, grader tie-breaking, or mild reward-hacking rather than capability. Flag that the last few points may no longer measure what the eval was built for; suggest harder items.

- **Class balance.** For classification-style evals, check the label distribution; report the majority-class baseline alongside model scores. When both positives and negatives exist, prefer precision/recall/specificity to accuracy alone.

- **Both-directions coverage.** An eval for "does the agent search when it should" also needs "does the agent *not* search when it shouldn't"; otherwise always-search scores perfectly and one-sided evals produce one-sided optimisation. Same for refusals, tool use, escalation.

- **One capability per case (when diagnosis matters).** A case that needs retrieval *and* reasoning *and* formatting shows 0 whenever any one breaks. Fine for a headline number; flag it when the user wants to know *why* variants differ.

- **Inverted items as a smoke test.** Where a clearly weaker variant outscores a clearly stronger one on an item, it is far more often a case or grader bug than a real inversion - a good place to look closely.

- **Staleness.** If cases reference live facts (prices, dates, API responses, library versions), when were the gold answers last verified? A currently-correct answer gets marked wrong against a stale key.

- **For generated cases: fix the generator, not the filter.** When cases come from a pipeline, problems in the output are symptoms of something upstream; patching individual items leaves siblings of the same bug. Adjust the generator and regenerate.

## 2. Harness design

These checks concern the code around the model call. The central failure mode is **conflation**: any time a non-model artifact - an infra error, a truncated response, a broken tool, a retry delay - lands in the same column as a genuine model result, the eval attributes to the model something that belongs to the plumbing.

- **Infra failures distinguished from model failures.** How does the runner handle a timeout, an API or rate-limit error after retries, an unparseable output, a response cut off at `max_tokens`, a tool that threw, a grader that itself failed? If any of these are silently scored as 0 (or as pass) and mixed in with real answers, the headline is contaminated. Attempts that never produced a scorable output go to an `errors.jsonl` sidecar with a failure class (harness/serving error, timeout, served-model mismatch) - never into `results.jsonl`, where they'd occupy the `(case, rep)` slot, block resume, and score plumbing as a model failure. Rows that did produce output carry `stop_reason` and `status: truncated` when the response hit `max_tokens`, so a clipped answer is counted and shown but not averaged in as wrong. Refusals are a graded outcome, not an error - record them as their own metric so refusal-zeros and capability-zeros aren't summed.

- **"No answer" is not "negative answer."** Does the grader distinguish the model *asserting a negative* ("no vulnerabilities found") from the model *failing to produce an answer* (empty, crashed, truncated, unparseable)? If both land on the same label, a runner that errors on every input scores identically to one that carefully found nothing. Look for this in detection, classification, and retrieval evals where "none" is a valid answer.

- **Clean, isolated state per trial.** Does each (case, rep) start from a fresh environment - no files, rows, git history, env vars, or cached results left from a previous trial? Shared state leaks one case's side effects into another's score, lets an agent read hints from an earlier run, and makes results order-dependent.

- **Environment complete and functional.** Does the environment actually have what the task requires - dependencies, fixtures, reachable services? A case that fails for every variant because a package is missing measures the environment. Distinguish from deliberate obstacles.

- **Deterministic setup.** Unseeded randomness, unordered iteration that reaches the model or grader, timestamp-dependent paths, stochastic simulators without a fixed seed - these add run-to-run variance unrelated to the system under test. Pin seeds, sort anything whose order matters, and use the sampling parameters you intend for production.

- **Scaffold limitations separated from model limitations.** A missing tool, a tight step budget, an early-give-up retry policy, or a template that drops context all look like capability gaps from outside. Where practical, vary the scaffold holding the model fixed (or vice versa) to attribute results to the right layer.

- **Token and context limits won't clip any case.** Compare the longest prompt and longest plausible correct answer against the configured context window and `max_tokens`. Truncation is easy to misread as the model choosing to stop; it must surface as `status: truncated`, not as a wrong answer.

- **Transient errors retried with jittered backoff, and retries recorded.** Unretried 429/529s show up as spurious failures and can make one variant or one time of day look worse; a zero-delay retry loop is worse - it multiplies cost invisibly and can turn one 429 into a torn-down batch. Back off with jitter, cap attempts, and record the attempt count per row so retries can be excluded from latency and "attempts run vs attempts scored" is visible in the data, not just the bill. If the runner re-runs whole failed *cases*, decide which attempt's grade lands - default strict (passed-only-on-retry is a fail) - and count every attempt's usage.

- **A hard per-case wall-clock ceiling, independent of stream liveness.** A hung streaming connection can emit keepalives indefinitely, defeating inactivity timers; only a ceiling on total case time reclaims the worker slot. When it fires the attempt goes to `errors.jsonl` as a timeout, never a zero.

- **The model that served the request is the model you asked for.** Read `model` from the *response* on a smoke case, then assert it on every call - beyond documented alias->snapshot resolution, a mismatch (a provider fallback, a capacity reroute) fails the attempt loudly. A score served by the wrong model measures nothing, and silent substitution may not surface anywhere else; where the provider exposes usage or billing records, cross-check the aggregate once.

- **Eval config matches production config.** Diff the system prompt, tool definitions, model version, sampling parameters, and scaffolding in the eval against what actually ships. The runner must call the app's real entry point; a re-implemented call silently measures a different setup.

- **Full per-case trajectories saved.** Every message, tool call and result, and error, per (case, rep) - plus the grader's own inputs and outputs - so a surprising score can be traced to a fact about the model or a bug in the eval without re-running. This is the single highest-leverage habit for a debuggable eval, and it is what the report's Transcripts tab renders (full viewer) or its per-case rows link to (lite).

- **Multiple trials with variance reported.** A single rep is a point estimate with no error bar; differences smaller than the run-to-run spread are not meaningful. The runner must support reps and reported numbers must carry intervals.

- **Reproducible over time.** Dependencies pinned, case set and grader versioned together, environment specified. Scores from before and after a grader change are not comparable.

- **Harness tested on known-good and known-bad.** Before the first full pass, run (a) an oracle - the reference answers, or a variant that *should* score near 100% - and (b) a null baseline - empty output, a constant answer, or the majority class - through the whole pipeline. If the oracle doesn't pass, the harness or grader is broken; if the null doesn't fail, the grader is too lenient. Two runs, minutes, and it catches most wiring bugs before they cost a full pass.

## 3. Metrics hygiene

Pass rate alone rarely answers the user's real question, which is some form of "what quality can I get for what cost and latency?" Check that each perf metric reflects the model under test rather than the rig around it.

- **Token accounting from the API, not estimated.** Input, output, cache-read and cache-write tokens per row from the response's `usage` block. String-length estimates are off by enough to reverse a cost comparison.

- **Cost derived from recorded tokens and the row's actual model** - including cache rates - never a flat assumed rate; and the judge's cost recorded separately (`judge_model`, `judge_usage`) so it neither hides nor dampens differences between variants.

- **Cache hit rate comparable across variants.** If one variant runs warm-cache and another cold, cost and latency differences are partly an artifact of run order. Flag comparisons where cache-read share differs materially.

- **Latency measured against the right boundaries.** Time the final successful request only; keep client-side retries, backoff sleeps, local queueing behind a semaphore, and post-processing out of the model-latency column (record total wall-clock separately if useful). Otherwise whichever variant hit more transient errors looks slower.

- **Per-call breakdown for agentic evals.** Record tokens, cost, and timing per model call and per tool call, not just per episode, or a slow tool is indistinguishable from a slow model.

- **Perf reported alongside quality**, per variant, as absolute numbers first - so quality-vs-cost and quality-vs-latency trade-offs are visible rather than implied.

## 4. Grader design

These checks concern the function that turns an output into a score - exact match, unit test, end-state check, or LLM judge.

- **Prompt-grader agreement.** Does the grader reward what the prompt asks for? Common drift: prompt says "at least X", grader passes only on strictly more; prompt asks for an explanation, grader checks only the number. This penalises models that follow instructions.

- **Grades outcomes, not paths.** Does the grader reward reaching the right answer or taking a particular route? Requiring an exact tool-call sequence, phrasing, or intermediate step fails a model that solved it a different valid way. Check the answer is correct and appropriately grounded without dictating the trajectory.

- **For agents that act on an environment, grade the end state, not the transcript.** Run the task in a disposable workspace, then score what it left behind programmatically - tests pass, the diff applies cleanly, expected files/rows/values are present, nothing off-limits was touched, step and tool-call counts within budget - and layer a rubric or pairwise judge only for the taste dimensions a check can't see (readability, minimality of the diff, quality of the PR description). A judge reading a coding transcript is grading the narration; the environment is the answer.

- **Not overly rigid.** For exact/substring graders: whitespace, casing, `4` vs `4.0`, markdown fences, units, thousands separators, a sentence wrapped around the answer. Normalise both sides or accept a small set of equivalent forms.

- **Not too lenient.** For test-based graders: are the tests thorough enough to catch wrong answers? Write a deliberately wrong-but-plausible answer and confirm it fails.

- **Cheat-resistant.** How could a model satisfy the grader without solving the task - hard-coding the expected output, reading the answer key, special-casing on test names, an empty string a lenient regex accepts, a degenerate policy that technically optimises the metric, injecting instructions into the judge's input? Models under optimisation pressure find these. Close them off.

- **Ground truth not reachable by the model under test.** Not in a file in the sandbox, a checked-out repo, leftover commit history, a grader prompt it can see, or the open web if it has search. This has to be structural; "don't look" in a prompt is not a defence.

- **Spot-check the failures.** Read a handful of outputs the grader marked wrong. If more than roughly one in ten look like grader errors, fix the grader before any full pass - otherwise you are partly measuring which variant matches the grader's blind spots.

- **Deterministic, or with measured variance.** Run the grader on the same output twice. If the result changes, there is grader variance on top of model variance; measure and report it.

- **Atomic checks over holistic scores.** Score independent properties as separate metrics (`{correct, formatted, concise}`) rather than one blended number - more reproducible, easier to calibrate, and diagnostic. Prefer a separate judge call per property.

- **Aggregation matches the question.** Mean is right for typical-case quality; for rare high-stakes behaviours (data deletion, irreversible actions), fail-on-any or worst-case reflects what matters better than a mean diluted by easy cases.

- **Partial credit and penalties don't make a degenerate policy optimal.** If penalties for trying and stumbling outweigh the reward for succeeding, "do nothing" wins.

- **Handles large outputs.** The grader must not truncate, time out, or crash on the longest output a model might produce; a grader crash is `status: error`, not a model failure.

### When the grader is an LLM judge

- **Position bias.** In pairwise comparison, randomise A/B per case (or score both orders and average).
- **Verbosity bias.** Tell the judge not to reward length for its own sake, or judges reliably prefer longer answers.
- **Self-preference.** A judge from the same family as a model under test tends to prefer outputs that resemble its own; avoid the exact model under test as its own judge, and consider a different family or a small jury for close calls.
- **Label deference.** Don't tell the judge which response is the "reference", "baseline", or "human" one.
- **Concrete rubric, not vibes.** Specific checkable properties, not "which is better?"; treat candidate text as untrusted data, not instructions; use structured output so the parse is deterministic.
- **Calibrated against human labels.** Validate the judge on a few dozen cases a human labelled independently and report agreement. Well below ~90% on clear-cut cases means the judge prompt needs another iteration before its scores can steer changes - and this number is what lets a cautious owner trust a judge-graded taste metric at all.
- **Tested on known negatives.** Feed the judge an empty string, "I don't know", and a confident answer to the wrong question; confirm it fails all three.

## 5. Can it detect the change you're after?

An eval can be correct on every item above and still be useless for the decision at hand because it lacks the resolution to see the effect. Check this *before* the first full pass and again before round 1 of a hillclimb - discovering it after several paid rounds is the expensive way.

- **Noise floor vs headroom vs the smallest change worth acting on.** From the baseline run at its actual rep count, compute the noise floor on the target metric - the half-width of the paired-difference 95% CI at the current n × R (for a pass-rate, roughly `1/sqrt(n·R)`: 25 cases × 2 reps ~ ±14 points, 100 × 2 ~ ±7). Put it next to the **headroom** (ceiling minus baseline) and the **smallest improvement the user would actually ship on**. If the noise floor exceeds either, say so plainly now, with the numbers, and offer the levers in order of cost: more reps (cheapest, and paired designs make them go further), more cases, a pairwise or continuous metric instead of a binary one, or trimming to discriminating cases for iteration with a full-set confirm at the end. Cases and reps are two knobs on the same dial; budget them together when the set is sized, not after.

- **Train and test are the same population.** If the eval will be hillclimbed with a split, the split must be drawn at random (stratified by `tags[0]`), never by baseline score. A train slice hand-picked from the worst-scoring cases guarantees two things: the analyzer only ever sees pathological cases, so its fixes target the tail rather than the population; and selecting on low baseline scores buys regression to the mean - those cases "improve" on re-run by chance alone. The symptom is a healthy train gain with a flat held-out set. Check at baseline that train and test means agree within noise; if they don't, re-draw before round 1. The analyzer can still *focus* on failures within train.

- **The mechanism is wired.** Whatever the score is supposed to depend on - a tool, a memory store, an instruction file - disable it and confirm the score drops; enable it and confirm it engages in the transcripts. If the score barely moves either way, the eval isn't measuring the lever you plan to pull.

- **The headline recomputes from raw rows.** Recompute the number you will report from per-case `grade` values yourself; don't trust an aggregate field. Mean-vs-sum and per-rep-vs-per-case mixups produce phantom breakthroughs.

## 6. Reporting findings to the user

The checks above are directives to you; the report you hand the human should not read as one. The person who built the eval almost always has context you lack - a constraint, a deadline, a deliberate trade-off - and the purpose is to surface things worth a second look, not to grade their work.

- **Frame findings as observations and suggestions.** "Something worth looking at is...", "you might consider...", "one thing that can cause trouble here is..." over "this is wrong." State what you observed, why it might matter, and one concrete change, then let the user decide.
- **Distinguish severity.** Lead with things likely to make the numbers actively misleading - infra errors scored as failures, "no answer" conflated with "negative", reachable ground truth, gold derived from a model under comparison, a split selected by score, a noise floor larger than the effect sought, a non-deterministic judge - then things that add noise or limit generality without flipping conclusions.
- **Be specific and cite evidence.** The file, function, case ID, or transcript line. "Case 14's expected answer looks stale - the library changed its default in v3" is actionable; "some labels may be stale" is not.
- **Say when things are fine.** An audit that finds nothing wrong is a valid result. Don't manufacture concerns.
- **Don't be preachy or exhaustive.** Report the handful of things that matter for the decision the user is making; listing every deviation from an ideal buries them.
- **Offer to fix, not just flag.** Where a finding is a small change - add a `status` field, pin a seed, normalise before comparing, randomise A/B, re-draw the split - make it.

Two practices worth suggesting regardless of what the audit finds: treat the eval as a living suite (new production failure modes become cases, saturated items are hardened, the judge is re-calibrated when it drifts); and periodically have a strong model read the cases, rubric, and a few graded transcripts and ask where a reasonable person would disagree with the label - the tier-3 auditor is the scaled-up version of that.
