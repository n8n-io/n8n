# The Hook System

The first three seconds decide whether the rest of the ad exists. Hooks are the highest-leverage unit of paid creative work — and hook *diversity* is what earns incremental learning: distinct hooks reach distinct pockets of the audience, while near-identical openings mostly re-test what you already know about the same one. This reference is a complete system for generating, diagnosing, and iterating hooks — not a list of one-liners.

Use it inside Mode 1/3 generation (hooks for new concepts), Mode 2 iteration (diagnosing why an ad underperforms), and the creative strategy loop in [creative-roadmap.md](creative-roadmap.md).

---

## A Hook Is Three Components, Not a Line

In video, the hook is the simultaneous combination of:

| Component | What it is | Job |
|---|---|---|
| **Visual action** | What is literally happening on screen in seconds 0–3 | Stop the thumb |
| **Spoken line** | The first words of VO or dialogue | Open the loop |
| **Caption text** | On-screen header/overlay text | Anchor the claim for sound-off viewers |

**The no-duplication rule:** the three components must complement, never repeat. If the VO says "I stopped paying $200/mo for my gym" while the caption reads "I stopped paying $200/mo" over a static talking head, two of the three slots are wasted. Strong hooks split the work — visual shows the cancellation email, VO says the line, caption names the alternative. When writing hooks, write all three columns explicitly; a hook spec with one column filled in is a third of a hook.

Static ads collapse this to two components (visual + headline) — the same rule applies: the headline must not caption the image.

---

## The Generation Pipeline

Work top-down; hooks written without the upstream steps read like everyone else's ads.

```
Segment → Motivation → Format → Hook (three components)
```

1. **Segment** — which specific buyer this hook addresses. Not the whole ICP: a slice with a shared situation (from the Grounded Inputs corpus: reviews, comments, sales-call language). The narrower the segment, the sharper the hook.
2. **Motivation** — the single pain, desire, or objection that moves this segment, in *their* words. Pull verbatim phrases from reviews and comments; the corpus language always outperforms marketing paraphrase.
3. **Format** — the delivery vehicle: street interview, POV selfie, screen recording, unboxing, side-by-side demo, text-on-screen static, founder-to-camera, reaction stitch. Pick the format *before* writing the line — the same motivation reads completely differently as a street-interview answer vs. a confession-to-camera.
4. **Hook** — now write the three components for this segment × motivation × format cell.

**Output as a hook matrix** so coverage is visible:

```
| # | Segment | Motivation (verbatim source) | Format | Visual action | Spoken line | Caption |
```

Generate across the matrix, not down a single column — ten hooks for ten segment×motivation cells beat thirty rewordings of one cell. This is the same angle-diversity principle as the static template library: matrix diversity is audience diversity.

---

## Hook Opening Moves

A menu of proven opening structures. Cycle through them like the static templates — don't cluster on favorites:

| Move | Shape | Watch out |
|---|---|---|
| **Curiosity gap** | Withhold the noun: "The ingredient behind most 3pm crashes" | Must pay off within the ad or it's clickbait that poisons CVR |
| **Bold claim** | A specific, falsifiable statement: "This replaced my entire morning routine" | Needs substantiation on screen or in the on-ramp |
| **First-person confession** | "I was doing [common thing] completely wrong" | Reads fake without lived-in detail |
| **Contrast / before-after** | Two states shown or named in the first beat | The transformation must be visually honest — see compliance notes in SKILL.md |
| **Relatability / POV** | Mirror a hyper-specific situation: "POV: it's 3pm and you're on your fourth coffee" | Specificity is the entire mechanic; generic POV is invisible |
| **Question** | Ask the exact question the buyer types into search or ChatGPT | Use their phrasing verbatim from the corpus |
| **Countdown / gamified** | A timer or on-screen challenge that promises a payoff at the end | Payoff must exist; hold-rate collapses on cheats |
| **Proof-first** | Lead with the receipt — the result screenshot, the stat, the demo money-shot | Strongest when the proof brags by itself |
| **Choice** | Put two options in front of the viewer: "Sandler or MEDDIC for a $50K deal?" | Both options must be real ones the audience weighs; viewers who know both stay to see who wins, viewers who know neither stay to learn |
| **Old vs. new** | "We used to take elixirs. Now everyone drinks prebiotic soda. Which is better for your gut?" | Answer the question from expertise; the hook only works if the payoff takes a side |
| **Us vs. them** | "Most [role]s do X. The ones who [result] do Y." | Name a behavior the audience will recognize as what "most" people really do |
| **False assumption** | Challenge something the buyer believes they need: "You can cancel ClickFunnels" | Draws the strongest reactions, including angry ones; keep the body fair to the named product, and get legal review before naming a competitor in paid ads |
| **Declaration, then question** | State what the audience already agrees with, then doubt it: "You need to spend $20K a month recruiting on Indeed. Or do you?" | The doubt needs a real answer in the body; still being tested by the practitioners who shared it (October 2026) |

The last five are one family: **contrast**. People understand a thing by comparing it with something else, so a hook that sets up two states, two options, or two groups gives the viewer a question to stay for. That is also why AI copy leans on "it's not X, it's Y." The difference is that a good contrast hook compares two things the audience actually weighs, while the AI tell negates a claim nobody made (see the copywriting skill's AI-tells reference). Contrast hooks work best for educational content and decisions; for impulse products, lead with proof or POV instead.

---

## The Diagnostic Funnel

Each metric in the delivery funnel isolates a different component. When an ad underperforms, read the funnel to find *which part* to fix instead of scrapping the whole ad:

| Stage | Metric | If it's weak, the problem is | Fix |
|---|---|---|---|
| Stop | Thumbstop / 3-sec view rate | **Visual action** (and caption) | New visual opening; same everything else |
| Stay | Hold rate (3s → 15s / 50% view) | **The on-ramp** — what follows the hook | Rework seconds 3–15, not the hook |
| Click | CTR | Desire/offer clarity mid-ad | Sharpen the promise, CTA, or proof |
| Convert | CVR post-click | Congruence — the page doesn't continue the ad | Fix the landing page or the claim, per **cro** |

Two rules this table enforces:

- **A great thumbstop is not a great ad.** A clickbait visual that attracts the wrong viewers shows up as high thumbstop + collapsed hold/CVR. Read the whole funnel before declaring a winning hook.
- **One component per iteration.** Change the visual OR the on-ramp OR the offer framing per test cycle — matching the one-variable rule in Common Mistakes.

---

## The On-Ramp Rule

The on-ramp is seconds ~3–15: the bridge from hook to body. **A good on-ramp logically extends the hook's premise; a bad one pivots to a product pitch that abandons it.** If the hook promises "what actually causes this," the next beat must start explaining the cause — not introduce the brand story.

Corollary: **every hook test is also an on-ramp test.** Swapping a new hook onto an existing ad body usually breaks the premise-bridge; when testing hooks, re-write the on-ramp to match each one. Hold rate is the on-ramp's metric — diagnose it separately from thumbstop.

---

## Fidelity Laddering

Match production cost to evidence strength (production tiers are defined in [creative-roadmap.md](creative-roadmap.md)):

- **Hunches ship low-fidelity within a day or two:** statics, text-on-screen video, voiceover-over-b-roll, remixes of existing footage. The goal is a cheap signal on the *angle*, not a polished ad.
- **Validated angles earn high-fidelity:** creator shoots, street interviews, staged demos. Only spend production budget on hooks whose low-fi version already showed a funnel signal (even a single-metric win — a hold-rate spike on an ugly static is evidence).

Testing a hunch with an expensive shoot and testing a proven angle with a throwaway static are both mistakes — the ladder runs in one direction.

---

## Grounding Rules (inherited, non-negotiable)

Hooks inherit every grounding rule from SKILL.md: every hook cites the corpus source its motivation came from; no invented claims, stats, or testimonials; verbatim customer language over paraphrase. Additionally, mine **organic content in the niche** (top-performing TikToks/Reels/posts, via the **scraping** skill or the social listening tooling in **social**) for the audience's actual vocabulary — the words the niche uses ("GLP-1" vs. the clinical term, the slang for the pain) belong in the caption and spoken line. Organic mining is language research, not copying: take the vocabulary and the visual conventions, never a creator's specific creative.

---

## Common Failure Modes

- **Thirty rewordings of one cell** — variation without matrix coverage; diversity of segment×motivation is the point
- **Components duplicating each other** — three slots saying one thing
- **Hook tested, on-ramp inherited** — premise-bridge broken, hold rate blamed on the hook
- **Funnel read stops at thumbstop** — clickbait winners scale into CVR craters
- **Polished hunches** — high-fidelity production spent on unvalidated angles
- **Marketing-voice captions** — the corpus and the niche's organic content define the vocabulary; "revolutionary formula" appears in neither
