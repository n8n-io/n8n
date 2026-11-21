# Measurement Framework — Referral Program Metrics, Benchmarks, and Optimization Playbook

The metrics that tell you if your referral program is working, what's broken, and what to fix first.

---

## The Core Metric Stack

Track these weekly. Everything else is secondary.

| Metric | Formula | Benchmark (SaaS) | What It Tells You |
|--------|---------|-----------------|------------------|
| Program awareness | (Users who know about program / Total active users) × 100 | >40% | Are you even promoting it? |
| Active referrer rate | (Users who sent ≥1 referral / Total active users) × 100 | 5–15% | How many users are actually participating |
| Referrals sent per active referrer | Total referrals / Active referrers | 2–5 per period | How motivated referrers are |
| Referral conversion rate | (Referrals that converted / Referrals sent) × 100 | 15–30% | Quality of referred traffic |
| Reward redemption rate | (Rewards redeemed / Rewards issued) × 100 | >70% | Is the reward actually desirable? |
| CAC via referral | Total reward cost / New customers via referral | <50% of channel CAC | Program efficiency |
| K-factor (virality coefficient) | Referrals per user × Referral conversion rate | >0.5 for meaningful growth | Is it self-sustaining? |

---

## Benchmarks by Stage and Model

### Early-Stage SaaS (<$1M ARR)
| Metric | Expected | Strong |
|--------|---------|--------|
| Active referrer rate | 2–5% | >8% |
| Referral conversion rate | 10–20% | >25% |
| CAC via referral vs. paid | 30–50% of paid CAC | <25% of paid CAC |

### Growth-Stage SaaS ($1M–$10M ARR)
| Metric | Expected | Strong |
|--------|---------|--------|
| Active referrer rate | 5–10% | >12% |
| Referral contribution to new signups | 10–20% | >25% |
| Referral contribution to revenue | 5–15% | >20% |

### Consumer / Prosumer Products
| Metric | Expected | Strong |
|--------|---------|--------|
| Active referrer rate | 8–20% | >25% |
| Referral conversion rate | 20–40% | >50% (with double-sided reward) |
| K-factor | 0.3–0.7 | >1.0 (true viral loop) |

### B2B Mid-Market (ACV $10k+)
| Metric | Expected | Strong |
|--------|---------|--------|
| Active referrer rate | 3–8% | >10% |
| Referral conversion rate | 20–40% (warm intros convert higher) | >50% |
| Average deal size via referral vs. standard | Similar | 20–40% higher (trust shortens negotiation) |

---

## Diagnosing the Broken Stage

### Diagnosis Framework

```
Is referral rate low?
  └── Is awareness low? → Promote the program
  └── Is trigger placement wrong? → Move to better moment
  └── Is reward insufficient? → Test higher reward
  └── Is share flow too complex? → Simplify

Is referral conversion low?
  └── Is the landing page cold? → Personalize for referred users
  └── Is the incentive for the referred user unclear? → Make it above the fold
  └── Is signup friction high? → Reduce required fields

Is reward redemption low?
  └── Is reward notification delayed? → Send immediately on qualifying event
  └── Is reward type wrong? → Test cash vs. credit vs. feature unlock
  └── Is the redemption process complex? → Auto-apply credits, remove steps
```

---

## The Optimization Playbook

Work in this order. Don't try to fix everything at once.

### Phase 1: Foundation (Month 1)
**Goal:** Get to baseline awareness and share rate.

1. Audit whether users know the program exists
2. Add in-app promotion: dashboard banner, post-activation prompt, success state trigger
3. Add referral program to the weekly/monthly activation email
4. Ensure share flow works on mobile

**Success gate:** Program awareness >30%, Active referrer rate >3%

### Phase 2: Trigger Optimization (Month 2)
**Goal:** Ask at the right moment, not just any moment.

1. Map all current trigger points
2. Move or add trigger to first aha moment (define aha moment first)
3. A/B test: trigger after aha vs. trigger after 7-day retention
4. Add NPS-linked trigger: score of 9-10 → immediate referral ask

**Success gate:** Active referrer rate increases by 30% over Phase 1

### Phase 3: Incentive Tuning (Month 3)
**Goal:** Right reward, right timing, right delivery.

1. Survey churned referrers — why did they stop?
2. Test single-sided vs. double-sided if not already tested
3. Test reward type: credit vs. cash vs. feature unlock
4. Add reward status widget to dashboard: "You've earned $X. [View details]"
5. Reduce reward payout delay — reward immediately on qualifying event, not month-end

**Success gate:** Reward redemption rate >70%, CAC via referral <40% of paid CAC

### Phase 4: Conversion of Referred Users (Month 4)
**Goal:** Referred users should convert at 2× organic rate.

1. Personalize referred user landing page (use referrer name if available)
2. Highlight referred user's incentive above the fold — don't bury it
3. A/B test: direct to product vs. direct to dedicated referral landing page
4. Add "referred by" onboarding track: faster to aha, lower time to first value

**Success gate:** Referred user conversion rate 20%+ (vs. organic baseline)

### Phase 5: Scale and Gamification (Month 5+)
**Goal:** Turn your top 5% of referrers into a real advocacy channel.

1. Identify top referrers — reach out personally
2. Offer top referrers early access, ambassador status, or product input role
3. Launch tiered reward structure
4. Quarterly referral challenges: "Top 10 referrers this quarter win X"

---

## CAC via Referral — Full Calculation

```
CAC via referral = (Reward cost per referral × Successful referrals) + Program overhead costs
                   ───────────────────────────────────────────────────────────────────────────
                              New customers acquired via referral

Where:
- Reward cost per referral = referrer reward + referred user reward
- Program overhead = platform cost + engineering time + support time (amortized)
- Successful referrals = referrals that converted to paying customer
```

**Example:**
- 200 referrals sent → 40 conversions (20% conversion rate)
- Referrer reward: $30 per successful referral
- Referred user reward: $20 (discount on first month)
- Platform cost: $100/mo, engineering: $500/mo (amortized) → $600/mo overhead
- Program overhead per conversion: $600 / 40 = $15

**CAC via referral** = ($30 + $20) × 40 + $600 / 40 = **$65 per customer**

Compare to paid CAC, and you know if the program is worth it.

Use `scripts/referral_roi_calculator.py` to model this for your numbers.

---

## Affiliate-Specific Metrics

| Metric | Formula | Benchmark |
|--------|---------|-----------|
| Active affiliate rate | Active affiliates / Enrolled affiliates | 20–40% |
| Revenue per active affiliate | Total affiliate revenue / Active affiliates | Varies by niche |
| Affiliate-driven CAC | Commission paid / New customers via affiliate | Should be <standard CAC |
| Top affiliate concentration | Revenue from top 20% of affiliates | Normal if 80%+ of revenue from top 20% |
| Average cookie-to-conversion time | Days from click to first payment | Benchmark against your sales cycle |

**Warning sign:** If >80% of affiliate revenue is from 1–2 partners, you have concentration risk. One partner leaving could tank the channel overnight. Diversify proactively.

---

## Reporting Template

Weekly referral program summary:

```
REFERRAL PROGRAM — Week of [DATE]

Active referrers: X (↑/↓ vs. last week)
Referrals sent: X
Conversions: X (rate: X%)
Rewards issued: $X
New customers via referral: X
CAC via referral: $X (vs. $X paid CAC)

TOP THIS WEEK:
- [Name/segment] sent 12 referrals, 4 converted
- [Trigger optimization test] is showing +18% referrer rate

ISSUES:
- [What's broken and the plan to fix it]

NEXT ACTION:
- [One thing we're doing this week to improve the program]
```
