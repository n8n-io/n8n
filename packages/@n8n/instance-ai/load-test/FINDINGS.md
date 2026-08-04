# Instance AI concurrency — memory findings

Results from three sweeps run with the load harness in this directory: one at
2-turn conversations and two identical repeats at 4-turn, each across
N = 1, 5, 10 concurrent users. See [README.md](./README.md) for how to run it and
what each phase measures.

Measured **2026-08-04**. Point-in-time numbers from one machine and one
configuration — re-measure after significant changes to the agent, the sandbox
provider, or the model.

## TL;DR

- **Absolute peak memory is what to quote, and it reproduces well** (within 3.2%
  across identical runs). A single-main instance peaks at **~625 MB with 1
  concurrent builder, ~635 MB with 5, and ~720–740 MB with 10** on 4-turn
  conversations.
- **~12 MB per additional concurrent builder, with 20 MB as a safe ceiling.**
  Measured endpoint-to-endpoint (N=1 → N=10) this comes out at 14.4 / 13.2 / 10.1
  MB/user across three sweeps — consistent. Only the *least-squares fit over three
  points* was unreliable (13.61 vs 10.32 on identical runs, heap slope flipping
  sign), because it leans on a noisy middle point and a GC-inflated N=1 anchor.
  See [Per-user cost](#per-user-cost--what-can-and-cannot-be-said).
- **No per-thread leak.** Retained heap after a full lifecycle and forced GC is
  **0.38–0.73 MB per user**, reproduced across all three sweeps. Per-thread
  structures release cleanly.
- **Conversation length adds peak, not retention.** Doubling turns raised peak RSS
  ~60–75 MB at N=10 but left retained heap unchanged.
- **Memory is not the constraint at this scale.** Budget ~1 GB for 10 concurrent
  builders and you have headroom. Build *latency* is what degrades.
- **Validated on cloud, including an OOM and its fix.** On a **640 MB** limit: N=5
  passed (604 MB, 94%), N=10 × 2 turns passed with an 18 MB margin (622 MB, 97%),
  and N=10 × 4 turns **OOM-crashed twice**. Raising the limit to **1280 MB** made the
  same workload pass at **736–745 MB (58%)** across three runs, which quantifies the
  crash: idle alone is **495 MB**, load adds **~240 MB**, and a 640 MB pod was ~96 MB
  short. **640 MB supports ~5 concurrent builders; 1280 MB handles 20 at 68%** (875 MB)
  and projects to 30–40. Idle cost dominates at small sizes, and load scales
  sub-linearly at ~14 MB per additional user — which matches the local estimate. Cloud looked flatter
  than local above N=5 only because local's 664 MB exceeds the limit; that is the
  ceiling, not efficiency. See
  [Cloud validation](#cloud-validation--local-numbers-hold).

## Environment

| | |
| --- | --- |
| n8n | local dev from source, single main, no workers |
| DB | sqlite (`~/.n8n/database.sqlite`) |
| Platform | macOS (so no `n8n_process_pss_bytes`; `/rest/e2e/memory-maps` is Linux-only) |
| Model | `anthropic/claude-sonnet-4-6` |
| Sandbox | enabled, Daytona |
| Env | `N8N_METRICS=true`, `E2E_TESTS=true`, `NODE_OPTIONS=--expose-gc`, `N8N_INSTANCE_AI_BUILDER_SANDBOX_TTL_MS=0` |
| Cases | `hourly-health-check`, `webhook-sample-api`, `health-ping`, round-robin |

Stabilization used the `forced-gc` tier throughout, and the instance was **warmed**
before each sweep (see [RSS is a high-water mark](#rss-is-a-high-water-mark)).

```bash
pnpm loadtest:instance-ai --sweep 1,5,10 --max-turns 4 --ramp 5s \
  --max-cost-usd 30 --max-wall-clock 90m --timeout-ms 900000 \
  --cases hourly-health-check,webhook-sample-api,health-ping
```

## All measurements

Every level of every sweep reached full concurrency and completed every
conversation (16/16 per sweep), so no run is disqualified.

| sweep | N | baseline RSS | **peak RSS** | peak heapUsed | retained heap/user | cost |
| --- | --: | --: | --: | --: | --: | --: |
| 2-turn | 1 | 455.48 | **534.45** | 341.26 | 1.90 | $0.57 |
| 2-turn | 5 | 532.61 | **604.39** | 343.54 | 0.98 | $2.75 |
| 2-turn | 10 | 479.56 | **663.78** | 348.72 | 0.44 | $6.18 |
| 4-turn A | 1 | 374.42 | **621.22** | 429.34 | 0.73 | $0.92 |
| 4-turn A | 5 | 570.16 | **627.41** | 359.88 | 0.42 | $4.18 |
| 4-turn A | 10 | 462.36 | **740.30** | 442.20 | 0.38 | $7.90 |
| 4-turn B | 1 | 390.88 | **626.16** | 430.33 | 0.57 | $0.95 |
| 4-turn B | 5 | 557.27 | **638.63** | 344.40 | 0.49 | $4.15 |
| 4-turn B | 10 | 605.33 | **716.94** | 384.34 | 0.38 | $8.64 |

Cost: $9.50 for the 2-turn sweep, $13.00 and $13.74 for the 4-turn repeats
($0.59 and ~$0.83 per conversation — the extra turns cost only ~1.4×, not 2×,
because prompt caching absorbs the growing context).

## Cloud validation — local numbers hold

Run on a dedicated cloud test instance (`stage-app.n8n.cloud`, Linux, sqlite,
single main, no other traffic) with a **hard memory limit of 640 MB**, driven with
`--no-metrics` because `/metrics` is blocked at the network level there; memory was
read from Grafana.

| N | turns | local peak RSS | cloud peak RSS | delta |
| --: | --: | --: | --: | --: |
| 5 | 2 | 604.39 MB | **~604 MB** | ~0 |
| 10 | 2 | 663.78 MB | **~622 MB** | −42 MB |

At N=5 the agreement is within the resolution of a Grafana read, despite local
being a macOS dev-mode process and cloud a Linux container. **So the local
harness is a valid proxy** — iterate locally, confirm on cloud.

At N=10 cloud came in **42 MB lower**, i.e. it scales *better* than local:

| segment | local | cloud |
| --- | --: | --: |
| 5 → 10 users | 11.9 MB/user | **3.6 MB/user** |

Neither run OOMed; the pod never restarted (`/healthz` polled every 4–5 s
throughout both runs, zero non-200s).

**Cloud did not scale better — it ran out of room.** The instance's hard limit is
**640 MB**, and local's N=10 figure (663.78 MB) is *above* that. So cloud could not
have reached it: as RSS approached the limit V8 had to collect harder rather than
grow. The apparently flat 3.6 MB/user over 5→10 is the ceiling asserting itself,
not efficiency, and it should **not** be extrapolated.

This is the same mechanism measured locally, where GC frequency scaled ~5× with
concurrency and *suppressed* the sampled heap peak (see
[Why the slope is unstable](#why-the-slope-is-unstable)) — except here it is forced
by a container limit rather than by allocation pressure alone.

Consequences:

- **The 42 MB gap is not headroom.** It is the difference between what the workload
  wanted and what the pod allowed.
- **Expect GC thrashing before OOM.** Approaching the limit, the failure mode is
  slower builds — already visible in the tail — then either a container OOM kill or
  a V8 `heap out of memory` crash.
- **Local remains a valid upper-bound proxy** for what the workload *wants*; the
  cloud reading tells you what it *gets*.

Latency matched local and degrades in the tail rather than the median:

| N | cloud median | cloud max |
| --: | --: | --: |
| 5 | 86 s | 101 s |
| 10 | 83 s | 132 s |

The median barely moved while the max grew 31%, consistent with the local
finding that concurrency shows up as slow outliers, not uniform slowdown.

### OOM confirmed at N=10 — and it is non-deterministic

### Resolved by doubling the limit to 1280 MB

The instance limit was raised from 640 MB to **1280 MB** (pro1 size) and the same
N=10 × 4-turn configuration that had crashed twice was re-run:

| limit | N | turns | peak | outcome |
| --: | --: | --: | --: | --- |
| 640 MB | 10 | 4 | wants 736–745 | **OOM, 2 of 2** |
| 1280 MB | 10 | 4 | 687 MB (54%) | pass — still warming |
| 1280 MB | 10 | 4 | **745 MB** (58%) | pass |
| 1280 MB | 10 | 4 | **736 MB** (58%) | pass — from a settled 495 MB baseline |

All three passed 10/10 with every user completing all four turns.

**This closes the OOM explanation quantitatively: the workload wants 687–745 MB and
the pod had 640.** A 47–105 MB shortfall, and it manifested in turn 1 because that
is where the concurrent start-up peak lands.

**The peak plateaus at ~736–745 MB and memory is released afterwards.** Runs 2 and
3 agree within 1.2%, and run 3 reached 736 MB starting from a **settled 495 MB
baseline** rather than inheriting a watermark — so the figure is a real ceiling, not
accumulation. Run 1's 687 MB was the low outlier of an instance still warming.

After load the instance **stabilises back at 495 MB**, i.e. it gives back ~240 MB.
Consistent with the local finding that RSS holds pages transiently but does release
(697 → 383 MB when idle). No accumulation across repeated runs.

Consequences:

- **Cloud is not reliably leaner than local.** An earlier reading suggested a
  30–50 MB advantage, but run 2 lands inside the local 717–740 MB projection. Treat
  local and cloud as equivalent for sizing.
- **Quote a range, not a point.** N=10 × 4 turns wants **~690–750 MB** on this
  configuration.
- **The watermark plateaus** — three runs, the last from a settled baseline, all
  landing at 736–745 MB (bar the first, still warming). Repeated bursts do not
  accumulate. Genuinely sustained/continuous load is still untested, but the
  burst-then-idle cycle is now well characterised.

### Scaling to N=20 — load is sub-linear

| N | peak | load above idle | avg/user | marginal |
| --: | --: | --: | --: | --: |
| idle | 495 MB | — | — | — |
| 10 | 736–745 MB | ~241 MB | 24 MB | — |
| 20 | **875 MB** | ~380 MB | 19 MB | **13.9 MB/user** |

N=20 passed on 1280 MB at **68% utilisation**, with the Grafana trace showing a
clean rise → plateau → fall (no accumulation). Doubling the users added only 58%
more load memory, so **load scales sub-linearly** — consistent with the declining
marginal cost measured locally (17.5 then 11.9 MB/user across a 2-turn sweep).

**The marginal rate agrees with the local estimate.** 13.9 MB/user here versus
~12 MB/user from the local endpoint estimator — two independent measurements on
different platforms by different methods. That is the strongest corroboration in
this document for the per-user figure.

Cautious extrapolation at ~14 MB/user marginal: N=30 ≈ 1015 MB (79%), N=40 ≈
1155 MB (90%). So **1280 MB plausibly supports 30–40 concurrent builders**, far
more than the 24 MB/user *average* at N=10 would suggest. Untested above N=20.

**875 MB is a lower bound.** Three users hit
`409 "A run is already active for this thread"` on a follow-up turn and abandoned
their conversation early (two ended `runs=3/2`), so N=20 did not deliver a full
4-turn load. See the harness note below.

Latency at N=20: median 150 s, max 192 s (versus 143/183 s at N=10) — the tail
continues to be where concurrency shows up.

### Harness note: 409 on follow-up turns at high concurrency

At N=20, `waitForAllActivity` judged a turn complete while the server still
considered the run active, so the next `sendMessage` was rejected:

```
[multi-turn] sendMessage failed (409): "A run is already active for this thread" — exiting loop
```

Two consequences, both worth fixing before running above N=20:

- **Under-delivered load is reported as success.** Those conversations count toward
  `conversations completed 20/20` even though they sent fewer turns. Users whose
  `runStarts != runFinishes` should be reported as degraded.
- **A 409 abandons the conversation** rather than waiting and retrying. A short
  retry would let it continue instead of silently reducing the load.

It is also a genuine signal: under 20-way concurrency the server takes longer to
settle a run than the driver's readiness check assumes.

### The budget, decomposed

| quantity | measured |
| --- | --: |
| idle baseline (no users connected) | **495 MB** |
| peak at N=10 × 4-turn conversations | **736–745 MB** |
| load-induced growth | **~241 MB for 10 builders (~24 MB/user)** |

This decomposition explains the OOM arithmetically. On a 640 MB pod, a 495 MB idle
baseline leaves ~145 MB for a load that needs ~241 MB — **roughly 96 MB short**,
which is why it died, and why it died during concurrent start-up rather than later.

**Idle cost dominates.** Roughly 500 MB is consumed before any user arrives, so
small plans are constrained by the baseline rather than by per-user cost. That is
also why doubling to 1280 MB worked so decisively: it doubles headroom for load
while the fixed cost stays put.

Note the ~24 MB/user here is *peak-minus-idle at fixed N*, not the marginal
per-user figure (~12 MB, see
[Per-user cost](#per-user-cost--what-can-and-cannot-be-said)) — the difference is
fixed per-run overhead that the first builder pays.

Sizing guidance for cloud, measured:

| limit | supported concurrent builders (4-turn conversations) | utilisation |
| --- | --- | --- |
| 640 MB | **~5** | ~94% at N=5 |
| 1280 MB | **20 measured**, 30–40 projected | 68% at N=20 |

Latency at N=10 × 4 turns across the three runs: median 128 / 137 / 143 s, max
173 / 142 / 183 s. Drift within noise rather than a trend, and as everywhere else
in this work it is the tail that moves while the median holds.

### The workable ceiling is 5 concurrent builders

Every cloud run on the 640 MB instance:

| N | turns | outcome |
| --: | --: | --- |
| 1 | 2 | pass |
| 5 | 2 | pass — peak 604 MB (**94%**) |
| **5** | **4** | **pass** — 5/5, all `runs=4/4`, full-length conversations |
| 10 | 2 | pass — peak 622 MB (**97%**), 18 MB margin |
| 10 | 4 | **OOM, 2 of 2 attempts** (32–45 s in, during turn 1) |

**5 concurrent builders is the workable ceiling, and it holds for realistic
multi-turn conversations** — the N=5 4-turn run completed all four turns for all
five users with zero `/healthz` failures, despite local projecting 627–639 MB
against the 640 MB limit.

Latency at N=5/4-turn stayed tight: median 134 s, max 146 s. Compare N=10/2-turn,
where the median was 83 s but the max stretched to 132 s — five users barely
contend, ten do.

Three N=10 attempts on the 640 MB instance:

| run | turns | pre-warmed | outcome |
| --: | --: | :-: | --- |
| 1 | 2 | yes | survived, peak 622 MB (**97%** of limit) |
| 2 | 4 | partly (prior run 9 min earlier) | **OOM 45 s into load** |
| 3 | 4 | yes — clean 1-user build first | **OOM 32 s into load** |

```
run 3:  load started 12:47:55.8Z    healthz 502/503 from 12:48:28Z  (32 s)
        all 10 conversations then hung until the 900 s timeout, reported 0/10
```

Both crashes happened **during turn 1**, before any workflow was created (the
manual sweeps found 10 orphaned threads and **0 workflows** each time). Cloud
turn-1 builds take ~56 s, so no second turn had begun. **A 4-turn and a 2-turn run
are doing identical work at that point**, so the turn count is not the cause.

Run 3 was deliberately pre-warmed with a successful single-user build (1/1,
workflow built and deleted, no restart) to rule out first-run lazy init — which
locally costs +80–123 MB and would dwarf an 18 MB margin. It OOMed anyway, and
*sooner*.

What this shows:

- **N=10 is not viable on 640 MB.** Two of three attempts crashed the pod, and the
  one that survived did so with an 18 MB margin.
- **The pressure is run *start-up*, not accumulation.** Dying before any workflow
  exists points at the cost of 10 concurrent agent runs initialising — prompts,
  tool registries, sandbox handles, model streams — not at build artifacts or
  conversation history. This is the most useful lead for reducing the footprint.
- **97% utilisation is not a pass.** Treat the 622 MB reading as a run that
  happened to survive.
- **Cold start is not the explanation**, per run 3.

Practical consequence: **do not size for N=10 on 640 MB**, and treat a margin in
the tens of MB as inside this workload's variance.

### Harness behaviour on a server OOM

The harness survives the target dying and reports correctly — both crashed runs
ended with:

```
[WARN] [u0..u9] conversation failed: Run timed out after 900000ms
       conversations completed  0 / 10
       Report written
```

**But it only notices when the per-conversation timeout expires.** When the server
dies the SSE streams simply go silent, so every conversation hangs for the full
`--timeout-ms` — 15 minutes here — before failing. During that window the log sits
at `[phase] load` with no output, which looks indistinguishable from a healthy
long-running build. (That fooled the author of this document into believing the
driver had been killed, and into manually sweeping the threads mid-hang — which is
why those runs show 10 cleanup failures: `deleteThread` then 404'd on threads that
were already gone.)

Two things worth improving before the harness is used for OOM testing in anger:

- **Fail fast when the target is unreachable.** A liveness check during the load
  phase would turn a 15-minute hang into a prompt, correctly-labelled failure. Use
  a short `--timeout-ms` in the meantime.
- **Detect restarts without `/metrics`.** The built-in detector reads
  `n8n_process_start_time_seconds`, so it cannot fire in `--no-metrics` mode —
  which is exactly the mode cloud requires; note `server restarted mid-run` read
  `no` for both crashes. Polling `/healthz` (done manually here) should be folded
  into the tool.

### Starter-plan headroom

Starter is **768 MB**. Against it:

Against this instance's **640 MB** hard limit:

| scenario | peak | % of 640 MB | headroom |
| --- | --: | --: | --: |
| 5 builders, 2 turns | ~604 MB (measured) | **94%** | 36 MB |
| 10 builders, 2 turns | ~622 MB (measured) | **97%** | **18 MB** |
| 10 builders, 4 turns | **OOM-crashed the pod, 2 of 2 attempts** (32–45 s, in turn 1) | >100% | none |

**A 640 MB instance is effectively saturated by 5 concurrent builders.** At 10 it
survived one run on 18 MB of headroom and **OOM-crashed on the next** — see
[OOM confirmed](#oom-confirmed-at-n10--and-it-is-non-deterministic). N=10 is not
viable on 640 MB.

For the general plan sizing (starter is 768 MB), the 2-turn numbers leave ~146 MB
free at N=10 — but note those numbers were themselves measured under a 640 MB
ceiling, so they represent *suppressed* demand, not what the workload would use
given room.

Measured on cloud: **10 concurrent builders reach 97% of a 640 MB limit on one run
and OOM-crash the pod on the next.** 5 builders sit at 94%. The failure is
non-deterministic at that margin, and it happens during run start-up rather than
after any build completes.

### Measuring on cloud without /metrics

`/metrics` is unauthenticated so it is firewalled on cloud. `--no-metrics` drives
the traffic and prints phase boundaries to paste into a Grafana range:

```
Phase boundaries (UTC) — memory not sampled; use these in Grafana
  baseline             12:15:24.219Z  ->  12:15:24.219Z
  threads-open         12:15:25.221Z  ->  12:15:25.221Z
  post-load-idle       12:17:08.586Z  ->  12:17:08.586Z   <- load ran between these two
  sse-closed           12:17:08.595Z  ->  12:17:08.595Z
  post-cleanup         12:17:10.178Z  ->  12:17:10.178Z
```

In that mode the harness cannot measure retention (no forced GC), cannot verify
concurrency (that comes from the active-runs gauge), and cannot enforce
`--max-cost-usd` (spend comes from metrics). `--max-turns` and
`--max-wall-clock` remain the only guardrails. **`E2E_TESTS=true` plus
`NODE_OPTIONS=--expose-gc` would restore forced GC even on a production-mode
instance** — the e2e controller is gated on `E2E_TESTS` alone, with no NODE_ENV
check — so a test instance can have full methodology parity if `/metrics` is
reachable.

### Cloud provisioning gotcha: SMTP

If SMTP is configured but broken, invitations fail in a way that looks unrelated.
n8n only attaches `inviteAcceptUrl` to the API response when the mailer neither
sent nor threw; a broken SMTP **throws**, so the URL is dropped and there is no
way to accept the invite (the token is a signed JWT and can't be forged).

Fix: **`N8N_EMAIL_MODE=`** (empty). The mailer is then never constructed,
`invite()` returns `{emailSent: false}` instead of throwing, and the URL is
included. Confirmed: provisioning went from 0/1 to 2 invited, 0 failed.

## Reproducibility — what survived a repeat

The two 4-turn sweeps ran with identical flags against the same warm instance,
from near-identical baselines (382 vs 374 MB idle RSS).

**Reproduced well:**

| metric | run A | run B | difference |
| --- | --: | --: | --: |
| peak RSS @ N=1 | 621.22 | 626.16 | 0.8% |
| peak RSS @ N=5 | 627.41 | 638.63 | 1.8% |
| peak RSS @ N=10 | 740.30 | 716.94 | 3.2% |
| retained heap/user | 0.73 / 0.42 / 0.38 | 0.57 / 0.49 / 0.38 | all ~0.4–0.7 MB |

**Did not reproduce:**

| metric | 2-turn | 4-turn A | 4-turn B |
| --- | --: | --: | --: |
| fitted RSS slope | 14.27 MB/user (r² 0.988) | 13.61 (r² 0.839) | 10.32 (r² 0.893) |
| fitted heap slope | +0.84 | +2.05 | **−4.57** |

So **absolute peaks and retention are solid; the three-point least-squares fit is
not.** The 2-turn sweep's r² of 0.988 was luck — a negative heap slope on the third
run makes that unambiguous. Note this indicts the *estimator*, not the underlying
quantity: the endpoint estimator recovers a consistent 10–14 MB/user from the same
data (see [Per-user cost](#per-user-cost--what-can-and-cannot-be-said)).

### Why the slope is unstable

Marginal cost per additional user, derived from peak RSS:

| sweep | 1 → 5 users | 5 → 10 users |
| --- | --: | --: |
| 2-turn | 17.5 MB/user | 11.9 MB/user |
| 4-turn A | 1.5 MB/user | 22.6 MB/user |
| 4-turn B | 3.1 MB/user | 15.7 MB/user |

The relationship isn't linear, and the shape isn't even consistent between turn
counts. The cause is that **the N=1 anchor is inflated by lazy GC**, which
flattens 1→5 and steepens 5→10.

GC frequency scales strongly with concurrency, and committed heap moves
*inversely* to it:

| N | GCs per 2s sample (A / B) | peak heapTotal (A / B) |
| --: | --: | --: |
| 1 | 0.45 / 0.40 | 516 / 521 MB |
| 5 | 1.54 / 0.94 | 487 / 494 MB |
| 10 | 2.22 / 1.66 | 565 / 510 MB |

At N=1 a single uninterrupted conversation creates little pressure, so V8 defers
collection and lets committed heap grow to ~520 MB. At N=5 it collects 2–3× more
often and holds heap *lower* (~490 MB) despite five times the work. Because RSS
includes committed heap, this inflates the N=1 peak RSS and corrupts any slope
anchored on it — and it's why peak `heapUsed` at N=1 (429 MB) reads *higher* than
at N=5 (~350 MB).

**Consequence: peak-under-load figures measure GC scheduling as much as demand.**
Trust them as reproducible upper bounds at a given N. Differentiating them is only
safe over a *wide* span: the GC distortion is a roughly fixed ~40–60 MB offset on
the N=1 point, which swamps a 4-user segment but is tolerable spread across the
full 1→10 range — hence the endpoint estimator below.

### How to get a trustworthy slope

1. **More points, especially at the low end** — 1, 2, 3, 5, 8, 10. The 1→5 gap is
   where the curve bends and three points can't see it.
2. **Restart the instance between levels**, so each starts from an identical
   warmed baseline instead of inheriting the previous level's watermark
   (374 → 570 → 462 MB within one sweep). The harness can't do this itself — it's
   a pure HTTP client by design — so it needs an external wrapper.
3. **Interleave and repeat levels** (1,5,10,1,5,10,…) to average out drift.

Until then, use the endpoint estimator below, and quote the measured peak at the N
you care about.

## Per-user cost — what can and cannot be said

Three estimators of the same quantity, from the same data, ranked by stability:

| estimator | 2-turn | 4-turn A | 4-turn B | spread |
| --- | --: | --: | --: | --- |
| **endpoint, (peak@10 − peak@1)/9** | **14.4** | **13.2** | **10.1** | 10–14 ✅ |
| least-squares over N=1,5,10 | 14.27 | 13.61 | 10.32 | 10–14, but r² 0.84–0.99 ⚠️ |
| segment 1→5 | 17.5 | 1.5 | 3.1 | 1.5–17.5 ❌ |
| segment 5→10 | 11.9 | 22.6 | 15.7 | 11.9–22.6 ❌ |

The **endpoint estimator is the one to use.** It spans the widest baseline and so
averages over both problems that wreck the others: the noisy N=5 middle point, and
the GC-inflated N=1 anchor (which is *inside* the span rather than pivoting it).

So:

- **Central estimate: ~12 MB per additional concurrent builder** (mean 12.6,
  range 10.1–14.4 across three sweeps at two conversation lengths).
- **Conservative ceiling: 20 MB/user.** Only one figure in the entire dataset
  exceeds it (22.6 for one 5→10 segment), and that's the least reliable estimator.
- **Planning formula:** `~600 MB base + 20 MB × concurrent builders`. At N=10 that
  predicts 800 MB against 717–740 MB observed, so it errs safe.

Scope conditions, which matter as much as the number:

- Valid for **N ≤ 10** on this configuration. The curve is non-linear; don't
  extrapolate far past it.
- **Transient, not retained** — this is peak-while-building. Retained memory per
  user after the thread closes is ~0.4 MB (see below).
- **"Concurrent builder" means actively running a build**, not merely connected.
  An idle user holding an SSE connection costs essentially nothing.

What still can't be said: the *shape* of the curve between 1 and 10, so no
confident per-user figure at N=2 or N=20. That needs the denser sweep described
below.

## What to use for sizing

| concurrent builders | peak RSS, 2-turn | peak RSS, 4-turn |
| --: | --: | --: |
| 1 | ~534 MB | ~625 MB |
| 5 | ~604 MB | ~635 MB |
| 10 | ~664 MB | ~720–740 MB |

Ten people building simultaneously with realistic multi-turn conversations peaks
around **740 MB**. Budget ~1 GB for comfortable headroom.

As a formula: **`~600 MB base + 20 MB × concurrent builders`**, which errs safe
(predicts 800 MB at N=10 vs 717–740 observed). Don't extrapolate far past N=10 —
the curve is non-linear.

## No per-thread leak

The most solid result here, reproduced across all three sweeps. Per-user retained
heap after conversation → SSE closed → thread deleted → forced GC:

| sweep | N=1 | N=5 | N=10 |
| --- | --: | --: | --: |
| 2-turn | 1.90 MB | 0.98 MB | 0.44 MB |
| 4-turn A | 0.73 MB | 0.42 MB | 0.38 MB |
| 4-turn B | 0.57 MB | 0.49 MB | 0.38 MB |

It stays ~0.4–1.9 MB and *decreases* with N, i.e. fixed measurement noise rather
than per-user retention. Corroborated by three identical N=1 runs where heap
returned to within 0.5 MB of baseline (279.27 → 279.30 MB in one case).

So `RunStateRegistry.suspendedRuns`, the 500-event/2 MB `InProcessEventBus.store`
and the `DurableEventLog` coalesce buffers all release correctly on thread delete —
including at 4 turns, so it doesn't accumulate with conversation length either.
This was the main risk going in and it is not a problem.

## Where the memory actually goes

Retained heap per user is ~0.4 MB while peak RSS is hundreds of MB above an empty
instance, and `nonHeapOverheadMB` (`rss − heapTotal`) reached ~390 MB. The bulk of
the cost sits **outside the JS heap** and is fully released afterwards.

The split can't be quantified precisely from these runs, because peak `heapUsed`
is GC-timing dependent and can't be cleanly subtracted from peak RSS. Suspects for
the non-heap portion: the sandbox client, TLS/HTTP buffers for streaming model
responses, and allocator fragmentation from large short-lived buffers.

**Heap snapshots will not explain this.** On Linux,
`GET /rest/e2e/memory-maps` (`E2E_TESTS=true`, parses `/proc/self/smaps`) would
attribute it per mapping; it returns nothing useful on macOS, which is why these
runs couldn't break it down further.

## RSS is a high-water mark

**Don't read per-run RSS deltas as leaks, and always warm the instance first.**

Three identical N=1 runs from a cold instance:

| run | residual RSS | residual heap | peak RSS |
| --- | --: | --: | --: |
| 1 (cold) | +258.67 MB | +123.22 MB | 572.97 MB |
| 2 (warm) | +89.86 MB | +0.03 MB | 528.63 MB |
| 3 (warm) | +44.78 MB | −0.49 MB | 560.63 MB |

The residual halves each run while the absolute peak stays flat. Two effects:

1. **First-run lazy init** — the +123 MB heap on run 1 is one-time process-global
   cache (prompts, knowledge base, node descriptions, tool/skill registries, the
   models.dev cost catalog). It collapsed to +0.03 MB on the warm re-run.
   Confirmed again after a later restart: +81.81 MB, then +2.52 MB.
2. **RSS tracks the working-set watermark** — the process grows toward the peak it
   needs and holds those pages. "Residual" is the baseline creeping toward a peak
   that already existed.

RSS *does* eventually return: the instance fell from 697 MB to 383 MB while idle
between sweeps. The watermark is slow, not permanent.

Practical rule: **one throwaway build after any restart before measuring**, and
compare absolute peaks, not deltas.

## Metrics from this harness that are NOT trustworthy

Recording these so nobody quotes them:

- **Fitted slopes** (`sweep.rss.slopeMBPerUser`, `sweep.heap.slopeMBPerUser`) —
  did not reproduce; see above.
- **`perUserIdle` (RSS)** — ranged −118 MB to +4.7 MB across runs. Both `baseline`
  and `threads-open` sit on the RSS watermark, so their difference is noise. The
  *heap* half is stable and ~zero (0–0.16 MB), which is the real finding: **an
  idle SSE-connected user with an empty thread costs essentially no heap.** An
  earlier "~4.7 MB per idle user" figure came from a single noisy sample.
- **`residualLeak` / `residualPerUser` (RSS)** — same watermark problem; one level
  reported −49.95 MB. Only the heap column is meaningful.
- **`freedByDeleteThread` (RSS)** — consistently ~0, drowned in watermark noise.
- **Peak `heapUsed`** — GC-scheduling artifact, see above.

In short: **trust absolute peak RSS at a given N, and heap for retention.**

## Latency degrades more than memory

Build wall-clock per user:

| sweep | N=1 | N=5 (med/max) | N=10 (med/max) |
| --- | --: | --: | --: |
| 2-turn | 61 s | 66 / 102 s | 87 / 154 s |
| 4-turn A | 99 s | 128 / 144 s | 112 / 133 s |
| 4-turn B | 121 s | 120 / 162 s | 127 / 176 s |

At 2 turns, median build time grew ~43% from N=1 to N=10 and the slowest user took
2.5× the fastest. At 4 turns the median doesn't climb monotonically, but the tail
does — slowest user 176 s.

Event-loop lag stayed in the 100–175 ms band throughout with no clear trend
(4-turn B peaked at N=5, not N=10) despite GC activity scaling ~4×. V8 absorbs the
load without stalling the loop, so the slowdown is more likely contention in the
builder/sandbox path or model-side latency. **If anything limits concurrency here
it is latency, not memory** — that deserves a dedicated investigation with
per-tool-call timings rather than more memory sweeps.

## SSE traffic per user

Stable across concurrency and roughly proportional to turns: **~150–160 KB per
2-turn conversation, ~250–300 KB per 4-turn**, at ~230–305 events. The driver
retains ~36–38 events (6–7:1 prune). Total server→client volume stayed under 3 MB
even at N=10, so the streaming path is not a memory factor at this scale.

## Harness bugs found and fixed during these runs

1. **The sweep regressed on the wrong phase.** It originally fit
   `post-load-idle`, which for a high-water-mark metric is non-monotonic — N=5
   read *below* N=1, giving r² 0.459. Now fits `load-peak`, with a regression test
   pinning both against real measurements. (Deeper lesson from the repeat: fixing
   the input phase improved the fit but did not make it reproducible.)
2. **Build cases must not call third-party endpoints.** `hourly-ip-check` used
   `httpbin.org/get`, which started returning 503. Because the agent *executes*
   the workflow to verify it, that triggered remediation retries and injected
   unpredictable token spend and duration. Cases now target the instance's own
   `/healthz` via a `{baseUrl}` placeholder.
3. **`--max-turns` above the case ceiling silently ran shorter conversations.**
   Cases ship 3 follow-ups, so 4 is the maximum; asking for 8 quietly ran 4. Now
   warns loudly via `maxDeliverableTurns()`.
4. **`--max-cost-usd` applies per concurrency level, not per run.** The default of
   5 would have killed the N=10 level. Arguably it should scale with `--users`.
5. **`--max-wall-clock` covers the whole sweep, not each level.** The 20-minute
   default would abort a multi-level sweep partway.

## Not yet covered

- **A slope worth trusting** — needs more points at the low end plus per-level
  instance restarts (see [above](#how-to-get-a-trustworthy-slope)).
- **Conversations beyond 4 turns.** 4 is the current case ceiling and did not
  increase retention. Crossing the observational-memory compression threshold
  (`N8N_INSTANCE_AI_OBSERVER_MESSAGE_TOKENS`, default 30k tokens estimated as
  chars/4) likely needs 8+ turns, which means writing more follow-ups.
- **Postgres, multi-main, Linux.** Instance AI doesn't support queue/multi-main
  today, but Postgres and Linux are what production runs — and Linux would unlock
  `/rest/e2e/memory-maps` for non-heap attribution.
- **Sustained load.** Every run here is a burst then idle. A soak test would show
  whether the watermark keeps climbing under continuous traffic.
- **N > 10.** The curve is non-linear; don't extrapolate.
- **The latency question**, which now looks more interesting than the memory one.
