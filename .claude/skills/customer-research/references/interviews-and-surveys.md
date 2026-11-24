# Customer Research — Interviews & Surveys (Primary Research)

Going to the source. Mode 2 mines what customers already said in public; this is Mode 3 — you *ask*. Customer research is your marketing cheat code, and the highest-signal version is talking to customers directly.

Three primary-research pillars, best used together:
1. **Video calls** — deep, unstructured, follow-the-thread (this file)
2. **Surveys** — broad, quantified, benchmarkable (this file)
3. **Online sleuthing** — Sales Safari and watering-hole mining (see `references/source-guides.md`)

---

## The First Rule of Customer Research

> The first rule of customer research: you do not talk about customer research.

Keep it casual. The moment a customer thinks they're in "a research study" they perform — they give you the polished, socially-acceptable answer instead of the real one. Frame calls as a chat, not an interview. Don't lead. Don't pitch. Don't defend the product. You're there to listen and learn how they actually think, talk, and decide.

**Prove yourself wrong, not right.** The point of research is not validation — it's disconfirmation. Go in trying to *break* your assumptions, not confirm them. If you only look for evidence you're right, you'll find it, and it'll be worthless.

- **Dropbox example**: the team assumed users would care most about sync *speed*. Research aimed at disproving the assumption revealed users cared more that files were *reliably there and safe* than about raw speed. Chasing the confirmation would have optimized the wrong thing.
- Ask questions that could return an answer you don't want to hear. If none of your questions can prove you wrong, rewrite them.

---

## Sales Safari (Amy Hoy)

Amy Hoy's **Sales Safari**: go where your audience already congregates and observe them in the wild, without interrupting. It's structured online sleuthing — read threads, reviews, comments, and forum posts to mine four things:

| Mine for | What you're capturing |
|----------|-----------------------|
| **Pains** | The problems, frustrations, and workarounds they describe unprompted |
| **Jargon** | The exact words, phrases, and shorthand they use — copy gold |
| **Recommendations** | What they tell each other to buy, try, or avoid |
| **Worldview** | Their beliefs, biases, and how they see themselves and the problem |

Safari is passive (you observe) where interviews are active (you ask). Run it first: it tells you what to ask about, and in whose words. For per-platform search operators and extraction tips, see `references/source-guides.md`.

---

## Customer Interviews (Video Calls)

### Recruit your best customers

Don't interview whoever answers first. Interview the customers you want *more of*. Segment your CRM and prioritize by:

- **High deal size** — the accounts worth the most
- **Short sales cycle** — they "got it" fast; their language converts fast
- **Low churn / high retention** — they got real, lasting value

Recruitment methods, in order of leverage:
1. **Segment the CRM** by the three signals above and pull a shortlist
2. **Ask sales and CS for referrals** — they know who loves the product and who articulates why
3. **Always close every call with**: *"Who else should we talk to?"* — the single most reliable way to compound your interview pipeline

### Incentives

- **$50 per call** (~30 min); **$5 per survey response**
- Aim for **10 calls, be happy with 5.** Signal saturates fast — by call 5-6 you'll hear the same themes repeat. Don't stall the project waiting for a perfect sample.
- Offer the incentive up front; it dramatically lifts response rate and shows you value their time. Gift cards work fine.

### Outreach email template

Keep it short, casual, specific, and low-commitment. Not a "research study."

```
Subject: Quick favor — 30 min, on us

Hi [First name],

I'm [name] from [company]. I'm trying to get better at helping customers
like you, and I'd love to steal 30 minutes to hear how [product area] is
actually working for you — what's good, what's annoying, what you wish
were different. No pitch, no agenda.

As a thank you I'll send you a $50 [Amazon/Visa] gift card.

Are you free [day] or [day] this week? Here's my calendar: [link]

Thanks either way,
[Name]
```

Notes:
- "No pitch, no agenda" and "what's annoying" signal you actually want the truth.
- One clear ask, two concrete time options, a booking link. Remove friction.
- Never say "customer research study."

---

## Keep Asking Why (5-Why Laddering)

The first answer is never the real answer. **Keep Asking Why** — ladder each response down 3-5 levels until you hit the root motivation, the business outcome, or the emotional driver. Surface answers are features; the bottom of the ladder is why they pay and why they stay.

**Worked example** — laddering a churn signal to NRR:

- **Q: Why did you downgrade your plan last quarter?**
  - "We weren't using the advanced reports."
- **Why weren't you using them?**
  - "Nobody on the team knew how to build one."
- **Why didn't anyone learn?**
  - "The person who set us up left, and onboarding never got re-run for the new hires."
- **Why did that matter enough to downgrade?**
  - "Without the reports, my boss couldn't see the ROI, so at renewal it looked like an easy cost to cut."
- **Why is that the real risk?**
  - "If leadership can't see value, we churn — and if we *had* seen it, we'd probably have added seats, not cut them."

The surface answer was "we don't use reports." The root is an **onboarding gap that quietly converts an expansion (NRR up) into a contraction or churn (NRR down)**. You can't fix "they don't use reports." You can fix re-onboarding new hires and surfacing ROI to the buyer — which is the difference between contraction and net revenue retention.

**Pain points vs. passion points.** Ladder for both. Pain points are what's broken and what they'll pay to escape. Passion points are what they love, brag about, and would be "very disappointed" to lose. Passion points drive retention and referrals; pains drive acquisition. Capture both in their words.

---

## Surveys

### The PMF Survey (Sean Ellis / Superhuman)

The single most useful survey question, from Sean Ellis and popularized by Superhuman's Rahul Vohra:

> **"How would you feel if you could no longer use [product]?"**
> - Very disappointed
> - Somewhat disappointed
> - Not disappointed
> - N/A — I no longer use it

**The 40% benchmark**: if **40% or more** of users answer **"very disappointed,"** you likely have product/market fit. Below 40%, keep iterating. **Superhuman reached 58%** by engineering their roadmap around this metric — segmenting on the "very disappointed" cohort, doubling down on what that cohort loved, and converting the "somewhat disappointed" fence-sitters.

Run it as a recurring pulse, not once. Follow the core question with:
- *"What type of person do you think would most benefit from [product]?"* (sharpens ICP)
- *"What is the main benefit you receive from [product]?"* (your positioning, in their words)
- *"How can we improve [product] for you?"* (roadmap fuel from fence-sitters)

Segment every answer by the "very disappointed" cohort vs. the rest — that cohort is your true market.

### Survey design guardrails

- Keep it short — every extra question drops completion.
- Prefer open-ended for language mining; multiple-choice answers are artifacts of the options you gave.
- Don't lead. A question that telegraphs the answer you want returns the answer you want, not the truth.
- $5/response incentive lifts completion; deliver it on submit.

---

## Case Anchors

- **Airbnb (host photography)**: research revealed listings failed because the *photos* were bad, not the pricing or copy. Airbnb sent photographers to shoot host homes — a fix nobody would have guessed without talking to the market. Research points at problems you can't see from inside.
- **Dropbox (confirmation bias)**: assumed sync speed mattered most; disconfirming research showed reliability/safety of files mattered more. Prove yourself wrong.
- **Superhuman (PMF survey)**: engineered the roadmap around the "very disappointed" metric, 40% → 58%.

---

## Where This Fits

- **Analyze what you gather** with the Mode 1 extraction framework in `SKILL.md` (jobs to be done, pains, triggers, outcomes, language, alternatives) and the confidence guardrails.
- **Mine public sources** (the passive Safari half) via `references/source-guides.md`.
- Interview + survey signal is **first-party and high-confidence** — weight it above scraped online sources when they conflict.
