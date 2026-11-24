# Static Ad Template Library

Structural templates for static (image) ad creative. Each is a layout framework with slots for brand-specific copy — the structure is proven; the inputs make it yours.

Use these when generating static ad concepts at volume (Meta, Instagram, LinkedIn, display). Cycle through **all** templates rather than clustering on 2-3 favorites: template diversity is angle diversity, and the winner is usually not the one you'd have picked by hand.

## Unicorn Scaler vs. Supporting Cast (read tiers this way)

Each template carries a **tier (S–F)** and a **funnel role**, distilled from Dara Denney's ranking of 51 Meta creative formats. The organizing question behind the tiers isn't "does it work" but **"is this a *unicorn scaler* that punctures net-new cold audiences, or a *supporting-cast member* that converts people already in mid/low-funnel?"**

- **Unicorn scalers** (S/A) reliably scale into cold, net-new audiences. Only a handful do this — reach for these first when you need fresh reach.
- **Supporting cast** (B/C) mostly convert mid-funnel. This is not a demotion: a B-tier template can still be your best converter for warm traffic. **Don't kill a good supporting-cast format for failing to scale cold — that was never its job.** Build a portfolio.
- **Decayed** (D–F) formats have fatigued, carry rights/compliance risk, or "do not convert" anymore. Flagged inline so you don't waste a batch on them.

Read tiers as *priority-of-reach*, not *quality*. When cold-scaling is the goal, weight the batch toward S/A. When feeding mid-funnel and retargeting, the B-tier supporting cast is exactly right.

The tiers here cover **statics only**. For the full S–F map across *all* Meta creative formats — including the video/UGC/partnership formats that dominate the top of the ranking (partnership ads, VSLs, yapper ads, authority ads) — see `references/meta-creative-formats.md`, the format map. This library is the static slice of that larger picture.

## How to Use This Library

1. **Ground first.** Read the inputs corpus (winning ads, reviews, ad comments, brand voice) before generating anything. See "Grounded Inputs" in SKILL.md.
2. **Cycle templates, weighted by tier.** For a batch of N concepts, spread across the full template set. When the goal is cold net-new reach, weight toward the S/A tiers (Founder Message, Origin Story, Grid Static); when feeding mid-funnel and retargeting, the B-tier supporting cast is exactly right. Skip the decayed D–F formats unless you have a specific reason.
3. **Fill slots from source material.** Every variation pulls its copy from a real review, a winning ad pattern, or an ad comment — and cites which one.
4. **Write the visual description.** Each concept includes enough visual direction that a designer or image-generation tool can produce it without guessing.

## Generation Rules

- Every variation must include: **template name, headline copy, body copy, visual description, source grounding**
- Source grounding = which review, winning ad, or comment this concept is based on
- Never produce a variation without source grounding — no invented claims, stats, or testimonials
- Pull copy directly from customer language whenever possible; don't paraphrase reviews into marketing-speak
- Match the brand voice doc on tone, not generic direct-response voice
- Real names, real stats, real quotes only — fabricated social proof is a compliance and trust violation

---

## The Templates

Each template is tagged **Tier** (S–F priority-of-reach) and **Role** (cold-scaler vs. supporting cast). See the framing note above.

### 1. Headline Statement

Bold one-line claim. Single product hero shot. Minimal background. The headline does all the work.

- **Tier**: B — **Role**: mid-funnel supporting cast. OG print-era format; only cranks with *amazing* messaging, and pairs best with a Callout treatment (see below).
- **Structure**: One dominant text line (60%+ of visual weight), product image, logo small
- **Copy slot**: One claim specific enough to stop the scroll
- **DTC example**: "The last greens powder you'll ever buy."
- **SaaS example**: "Close your books in 3 days, not 3 weeks."
- **Source it from**: Your strongest winning-ad hook or the most repeated benefit in reviews

### 2. Us vs. Them

Side-by-side comparison. Competitor or "old way" on the left (grayed out), your product on the right (full color). 4-6 comparison rows.

- **Tier**: B — **Role**: mid-funnel supporting cast. "Us vs. them" reliably sneaks into a brand's top 8; converts well for people already weighing you against an alternative, but rarely the format that opens cold net-new reach.
- **Structure**: Two columns, check/cross marks per row, your side visually alive
- **Copy slot**: Comparison rows — each row a real differentiator, not filler
- **DTC example**: "Their multivitamin: 13 ingredients. Ours: 60."
- **SaaS example**: "Spreadsheets: 6 hours a week. Us: 6 minutes."
- **Source it from**: Reviews that mention switching, or comments comparing you to a competitor

### 3. Stat Callout

One dominant number takes up 60% of the visual. Supporting context below.

- **Tier**: C — **Role**: situational supporting cast. Statistics statics work for luxury/retail brands and awareness/traffic objectives, but under-deliver on direct-response D2C ROI. Use when the number *is* the differentiator, not as a default.
- **Structure**: Giant stat, one line of context, product or logo anchor
- **Copy slot**: A real, defensible number — measurement beats superlative
- **DTC example**: "97% of users feel a difference in 14 days."
- **SaaS example**: "11 hours saved per rep, per week."
- **Source it from**: Case studies, product analytics, or survey data — never invent the number

### 4. Review Card

A five-star testimonial styled as a screenshotted product review. Reviewer name, star rating, date.

- **Tier**: E — **Role**: decayed. Testimonial statics mostly disappoint ("marketers are bad at them") *unless* the review is a genuine golden-nugget — a specific, surprising, verbatim line that couldn't be invented. Skip generic 5-star praise; reserve this for the one review that stops you cold.
- **Structure**: Looks like a native review UI (G2, Trustpilot, Amazon, App Store — match where your buyers read reviews)
- **Copy slot**: A real review, verbatim — the artifact's credibility is its realism
- **DTC example**: A Trustpilot card: "I've tried 6 of these. This is the only one I reordered."
- **SaaS example**: A G2-styled card: "Killed 4 tools and replaced them with this."
- **Source it from**: `inputs/reviews/` verbatim — with permission where the platform requires it

### 5. Testimonial Stack

Three customer quotes arranged vertically, photo + name + one-line quote each.

- **Tier**: E — **Role**: decayed (same class as Review Card). A stack of testimonials is still a stack of testimonials — only worth the slot if all three quotes are golden-nugget specific and each covers a *different* objection. If they're interchangeable praise, cut it.
- **Structure**: Three short rows; quotes must be scannable in 2 seconds each
- **Copy slot**: Three quotes covering *different* objections or benefits — not the same praise three times
- **DTC example**: Three customers on results, taste, and convenience
- **SaaS example**: Three roles (IC, manager, exec) each praising their own outcome
- **Source it from**: Reviews — pick for coverage, not just enthusiasm

### 6. Before / After

Split image with arrow between. Transformation framing — product results, workflow, or visual proof.

- **Tier**: B — **Role**: mid-funnel supporting cast. Before/afters (and their cousin, progression ads) convert well for people already problem-aware; they show the payoff but rarely open cold reach on their own.
- **Structure**: Two panels, arrow or divider, minimal copy labeling each state
- **Copy slot**: Label the states in the customer's words ("Sunday-night spreadsheet dread" → "Reports send themselves")
- **DTC example**: Skin, energy, space — the classic visual transformation
- **SaaS example**: Cluttered 6-tab workflow → one clean dashboard
- **Compliance note**: Before/after claims are regulated in health, finance, and beauty — verify platform policy before using
- **Source it from**: Transformation language in reviews ("I used to X, now I Y")

### 7. Problem / Solution

Pain point on top (text or image), product as the answer below.

- **Tier**: B — **Role**: mid-funnel supporting cast. Close kin to objection-handling, which "works fast" and lands in most brands' top 15. Strongest when the pain is phrased in the customer's exact words.
- **Structure**: Two zones — tension above, relief below
- **Copy slot**: The pain in the customer's exact words, then the product's one-line answer
- **DTC example**: "Tired of 6 supplements every morning?" → one scoop visual
- **SaaS example**: "Your CRM knows nothing about product usage." → integration screenshot
- **Source it from**: The most common pain phrasing in `inputs/reviews/` — verbatim beats paraphrase

### 8. Founder Message

Handwritten-style or plain-text note from the founder. Conversational, personal tone.

- **Tier**: S — **Role**: unicorn cold-scaler. Founder content is the single most reliable *first* top performer at any production level — telling the story of *why* you built the brand auto-connects with same-problem cold audiences. The static "founder's letter" variant cranks hard during sales periods. Reach for this first.
- **Structure**: Note-style layout, founder name/photo, no product glamour shot
- **Copy slot**: "I built this because..." — one honest paragraph, no marketing polish
- **DTC example**: "Hey, I made this because every 'healthy' snack was secretly candy."
- **SaaS example**: "I ran RevOps for 6 years. This is the tool I kept wishing existed."
- **Source it from**: The actual founding story — this template collapses if fabricated

### 9. Feature Spotlight (Ingredient Spotlight)

Product hero in the center, 4-6 callout boxes around the edges highlighting key components.

- **Tier**: B — **Role**: mid-funnel supporting cast. This is a *callout* treatment — one of the most reliable static levers; pairs with Headline Statement. When the callouts teach rather than sell, it tips into educational-infographic territory (also B, below).
- **Structure**: Center image, radiating callouts, each callout 3-6 words
- **Copy slot**: The components buyers actually ask about — not your full feature list
- **DTC example**: Product bottle with callouts per key ingredient and what it does
- **SaaS example**: Dashboard screenshot with callouts on the 4 features reviews mention most
- **Source it from**: Which features/ingredients appear most in reviews and comments

### 10. Press Mention

"As seen in" with publication logos and a pull quote.

- **Tier**: F — **Role**: decayed, avoid. Press statics were champions years ago; they're now a rights/permissions nightmare — major outlets (Vogue et al.) actively pursue unlicensed logo use. The legal exposure outweighs the lift. If you have genuine, licensed coverage, a single quote inside another format is safer than a logo wall. Default: don't build these.
- **Structure**: Logo row + one strong quote + product anchor
- **Copy slot**: A real quote from real coverage
- **DTC example**: "The category's first genuinely new idea in years." — [publication]
- **SaaS example**: Analyst or industry-newsletter quote with the outlet's logo
- **Compliance note**: Only use logos of outlets that actually covered you; check their logo-usage terms
- **Source it from**: Actual press, podcasts, newsletters, or analyst mentions

### 11. Lifestyle Hero

Product in use in a real environment. Minimal copy. Aspirational, not salesy.

- **Tier**: B — **Role**: mid-funnel supporting cast. The organic-native look (mirror-selfie / flat-lay / "hot-girl IG story" energy for consumer brands) reads native and supports well, but doesn't reliably open cold reach by itself. For apparel specifically, see the Mood Board variant below.
- **Structure**: One photograph does the work; a short line and logo at most
- **Copy slot**: 5-8 words, identity-flavored ("Mornings, handled.")
- **DTC example**: Product on a kitchen counter mid-routine
- **SaaS example**: The tool on-screen in a real work moment (standup, close call, ship day)
- **Source it from**: Winning ads' visual patterns; identity language in reviews

### 12. Numbered List

"5 reasons [audience] are switching to [brand]." Icons next to each point.

- **Tier**: E — **Role**: decayed. Listicle statics worked a year or two ago and have gone flat lately. If you must, an *educational infographic* (below) is the healthier evolution of the same "teach in one frame" instinct. Don't lead a batch with this.
- **Structure**: Numbered rows, icon + short line each, product anchor at bottom
- **Copy slot**: Each reason a distinct angle — pain, outcome, proof, differentiator, price
- **DTC example**: "5 reasons runners switched to [brand] this year"
- **SaaS example**: "4 reasons finance teams are leaving [legacy tool]"
- **Source it from**: Aggregate the most common switching reasons across reviews

### 13. FAQ Card

A common objection as the question, answered directly.

- **Tier**: B — **Role**: mid-funnel supporting cast. This is objection-handling in static form — one of the fastest-working supporting formats, top-15 for most brands. The objection *as customers phrase it* is the whole hook.
- **Structure**: Question prominent, answer concise, product anchor
- **Copy slot**: The objection *as customers phrase it* — the recognition is the hook
- **DTC example**: "But does it work for sensitive skin? Yes. We tested it on 200 people with eczema."
- **SaaS example**: "Will this survive our security review? SOC 2 Type II, SSO, EU hosting."
- **Source it from**: `inputs/comments/` — the objections people post publicly under your ads

### 14. Competitor Callout

Name a specific competitor (or the category default) and explain the difference. Bold but factual.

- **Tier**: B — **Role**: mid-funnel supporting cast. A sharper "us vs. them" / callout hybrid; converts comparison-shoppers already in your consideration set. Great for warm/mid-funnel, not a cold-reach opener.
- **Structure**: Their name vs. yours, one clear axis of difference
- **Copy slot**: A difference you can defend with facts — comparative claims invite scrutiny
- **DTC example**: "Like [competitor], minus the 14g of sugar."
- **SaaS example**: "[Competitor] charges per seat. We don't."
- **Compliance note**: Comparative advertising must be truthful and substantiatable; some platforms restrict naming competitors
- **Source it from**: Competitor mentions in reviews and comments — customers name the alternative for you

### 15. Origin Story

Founder photo with the why-we-built-this narrative. Longer copy than other formats.

- **Tier**: S — **Role**: unicorn cold-scaler (same founder-content family as Founder Message). The specific origin moment auto-connects with same-problem cold audiences; this is the one long-copy static that reliably opens net-new reach. Pairs well with warm/retargeting too.
- **Structure**: Portrait or team photo, 2-3 short paragraphs, product secondary
- **Copy slot**: The specific moment or frustration that started it — specificity is the credibility
- **DTC example**: "We spent 2 years and 47 batches getting this right. Here's why."
- **SaaS example**: "We were the customer. The tool we needed didn't exist, so we built it."
- **Source it from**: The real story — pairs with warm/retargeting audiences better than cold

### 16. Grid Static (Multi-SKU / Bundle)

A tidy grid of your product line, a bundle, or a collection — one clean frame, multiple SKUs. Optional "shop the set" line.

- **Tier**: A — **Role**: cold-scaler. Easy to make and a proven low-hanging-fruit test — a top performer at a 9-figure brand. Scales because it shows range and lets a cold viewer self-select the SKU that fits them. First static to try when you have more than one product.
- **Structure**: 4–9 product tiles on a neutral ground, consistent lighting/crop, small logo + optional bundle price
- **Copy slot**: Minimal — a collection name or a "build your bundle" line; the products do the talking
- **DTC example**: A 3×3 grid of every flavor with a "Try the whole lineup" bundle price
- **SaaS example**: A grid of the plan's included tools/integrations — "one subscription, all of it"
- **Source it from**: Which SKUs/bundles reviews and comments cluster around; lead with the requested combinations

### 17. Callout

Product hero with 3–5 short labels pointing at specific parts — the "what makes this different" annotated directly on the image.

- **Tier**: B — **Role**: mid-funnel supporting cast. One of the most durable static levers; pairs with Headline Statement and underpins Feature Spotlight. Cheap to iterate, reads fast.
- **Structure**: Center product, leader lines to 3–5 labels, each label 2–5 words
- **Copy slot**: The attributes buyers actually ask about — not spec-sheet filler
- **DTC example**: A shoe with callouts on the sole, the material, the weight
- **SaaS example**: A dashboard screenshot with callouts on the three features reviews cite most
- **Source it from**: The features/attributes that recur in reviews and ad comments

### 18. Mood Board (Apparel)

A curated collage — product, texture, setting, palette — assembled like a Pinterest board. Identity over information.

- **Tier**: B — **Role**: mid-funnel supporting cast, apparel/lifestyle. Great for fashion and home brands where the *vibe* is the product; sells the world the buyer is opting into.
- **Structure**: 3–6 tiles mixing product shots, fabric/texture, and aspirational scene; cohesive palette
- **Copy slot**: A short identity line at most ("Quiet luxury, everyday.")
- **DTC example**: A capsule wardrobe laid out with the season's palette and a location shot
- **SaaS example**: Rarely applicable — use Lifestyle Hero instead unless the brand sells an aesthetic
- **Source it from**: Winning ads' visual language; identity/aesthetic words in reviews

### 19. Educational Infographic

A single frame that *teaches* something true — a mechanism, a comparison, a "how it works" — styled to read as content, not an ad.

- **Tier**: B — **Role**: mid-funnel supporting cast, and under-used. It masquerades as content, so it earns attention the hard-sell formats don't. The healthier evolution of the (now-decayed) Listicle.
- **Structure**: A diagram, cycle, or labeled cross-section; minimal brand until the anchor
- **Copy slot**: One genuine, checkable teaching point — never a fabricated stat or mechanism
- **DTC example**: "How [ingredient] actually gets absorbed" as a simple three-step diagram
- **SaaS example**: A "before vs. after your stack" workflow map showing where the tool slots in
- **Compliance note**: Educational framing raises the bar on truth — every claim in the graphic must be substantiatable
- **Source it from**: The mechanism questions in comments ("but how does it work?") and documented product facts

### 20. Challenging Your Beliefs

Leads with a contrarian statement that names a limiting belief the persona holds, then flips it. Confrontational hook, resolved below.

- **Tier**: B — **Role**: mid-funnel supporting cast. Works when you genuinely know the persona's limiting beliefs; needs a specific, earned reframe (in video it wants B-roll — as a static it wants a crisp visual contrast).
- **Structure**: Bold belief-statement up top, the flip below, product as the proof
- **Copy slot**: The belief in the customer's words, then the fact that corrects it. State the fact; don't stage a "You don't need X. You need Y." reveal (an AI tell)
- **DTC example**: "Most people quit protein powder by week three. Ours is a 90-calorie gummy you'll actually take."
- **SaaS example**: "The average team has 40 dashboards and reads three. [Product] sends those three numbers to Slack every morning."
- **Source it from**: Objections and misconceptions surfaced in comments and reviews

### 21. Tweet / Reddit Screenshot

A single tweet or Reddit post styled as a native screenshot — real social proof as the creative, strongest when used as the *first frame*.

- **Tier**: B — **Role**: mid-funnel supporting cast; especially effective as a hook/first frame. Sweet spot around the $100k–250k monthly spend range where fresh angles matter.
- **Structure**: A pixel-accurate tweet/Reddit card — avatar, handle, timestamp, engagement counts
- **Copy slot**: A real post, verbatim — an unprompted mention or your own best-performing organic line
- **DTC example**: A screenshotted Reddit comment: "been using [X] for 3 months, actually works"
- **SaaS example**: A tweet from a real user describing the exact outcome
- **Compliance note**: Use real posts with permission where required; never fabricate a social screenshot — a faked tweet is a trust and platform violation
- **Source it from**: Real social mentions, your own organic posts, or `inputs/comments/`

### 22. Ugly / Handwriting / Post-it

Deliberately low-polish — handwritten note, sticky note, or plain-text-on-a-photo. The anti-designed look reads native and urgent.

- **Tier**: B — **Role**: supporting cast, and a sales-period specialist. These crush during sales/promo windows precisely because they look thrown-together and time-sensitive. Rotate in for BFCM, launches, and flash sales; don't run them as an always-on default.
- **Structure**: One scrappy element (post-it, marker note, screenshot) over product or plain ground
- **Copy slot**: A blunt, human line — the offer or the reason, in plain words
- **DTC example**: A post-it reading "40% off ends tonight. Don't forget." slapped on the product
- **SaaS example**: A "note to self: cancel the other tool" scrawl before the switch
- **Source it from**: The offer itself; the plain way a customer would remind a friend

---

## Per-Concept Output Format

Each generated concept follows this structure:

```markdown
## Concept [N]: [Template Name]

**Headline**: [the headline copy]
**Body**: [supporting copy, if the template uses it]
**Visual**: [layout description specific enough to design or generate from]
**Image prompt**: [prompt for the image tool, if generating — see generative-tools.md]
**Grounded in**: [which review / winning ad / comment this traces to, quoted or named]
```

Record each concept's **tier** alongside its template so the reviewer sees the funnel role at a glance. For a batch, add an `INDEX.md` listing every concept with its template type, tier, and grounding source, so the reviewer can scan 50 concepts in two minutes.

## Batch Distribution

For a standard 50-concept batch: spread variations across the template set, but let tier and funnel goal shape the weighting rather than distributing evenly. For a cold-reach batch, over-index on the S/A tiers (Founder Message, Origin Story, Grid Static); for a warm/retargeting batch, lean on the B-tier supporting cast (Callout, FAQ Card, Before/After, Competitor Callout). Skip the D–F decayed formats (Press Mention, Testimonial statics, Numbered List) unless you have a specific reason. If performance data shows certain templates consistently winning for this brand, shift to 60% proven templates / 40% full-cycle coverage — but never drop coverage to zero. Fatigue is why you're generating daily; the template that's tired next month is the one you're scaling today.
