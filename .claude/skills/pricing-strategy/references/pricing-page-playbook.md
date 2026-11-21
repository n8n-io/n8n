# Pricing Page Playbook

Design specs, copy frameworks, and conversion tactics for SaaS pricing pages.

---

## What a Pricing Page Actually Has to Do

One job: get the right customer to click the right plan's CTA. Everything on the page should serve that job or get removed.

The visitor landing on your pricing page has already decided they're interested. They're now asking:
1. "Which plan is for me?"
2. "Is it worth the price?"
3. "What's the catch?"

Your page answers those three questions, in that order.

---

## Page Structure (Scroll Order)

### Above the Fold

**Billing toggle (monthly/annual)**
- Default to annual if annual is your preference (most conversions happen here)
- Show savings clearly: "Save 20%" badge, not just the math
- Position toggle at the top, before plan cards

**Plan cards (3-column)**
```
┌─────────────┬─────────────┬─────────────┐
│   Starter   │    Pro      │ Enterprise  │
│             │ ★ Popular   │             │
│   $29/mo    │   $99/mo    │  Custom     │
│             │             │             │
│ For small   │ For growing │ For teams   │
│ teams       │ teams       │ needing     │
│             │             │ control     │
│ • Feature   │ • Feature   │ • Feature   │
│ • Feature   │ • Feature   │ • Feature   │
│ • Feature   │ • Feature   │ • Feature   │
│             │             │             │
│ [Start free]│[Start free] │[Contact us] │
└─────────────┴─────────────┴─────────────┘
```

**Each plan card must include:**
- Plan name (customer-segment-oriented, not just "Basic/Pro")
- Price (with billing period and per-seat notation if applicable)
- 1-line positioning sentence ("For growing teams who need X")
- 4-6 bullet differentiators (what they get at this tier)
- CTA button (clear, action-oriented — not just "Sign Up")
- "Most popular" / "Recommended" badge on middle tier

### Below the Fold

**Full Feature Comparison Table**
- Exhaustive list of all features
- Group by category: Core, Collaboration, Analytics, Admin, Support
- Use ✅ / ❌ or checkmarks/dashes — no conditional language
- Sticky header so plan names stay visible while scrolling
- Make this scannable, not a wall of text

**Social Proof Section**
- 3 customer quotes relevant to each tier if possible
- Company logos of recognizable customers
- Stats if they're real: "Trusted by 10,000+ teams"

**FAQ Section (5-7 questions)**

Non-negotiable FAQs:
1. "Can I cancel anytime?" → Yes. Cancel from settings. No calls required.
2. "What happens at the end of my trial?" → We'll ask if you want to continue.
3. "Can I switch plans?" → Yes, upgrade or downgrade anytime. Prorated billing.
4. "What payment methods do you accept?" → Credit card, invoice for annual enterprise.
5. "Is my data secure?" → SOC 2 Type II / ISO 27001 / brief security statement.
6. "What if I need more than the top plan offers?" → Talk to us: [link to enterprise form].

**Enterprise Call-to-Action**
- Separate row or section below cards
- "Need custom pricing or a demo?" → [Talk to Sales] button
- Who it's for: teams over X seats, specific compliance needs, custom contracts

---

## Copy Frameworks

### Plan Names

Avoid generic names if possible. Named plans anchor to identity, not just price.

| Generic | Better | Why |
|---------|--------|-----|
| Free / Basic / Pro | Solo / Studio / Agency | Maps to customer segment |
| Starter / Growth / Enterprise | Developer / Team / Business | Maps to use case |
| Individual / Team / Organization | Creator / Collaborator / Company | Maps to role |

If your categories are genuinely vague, stick with simple names. Don't force creative names that confuse.

### CTA Copy

Match the CTA to the ask:

| Context | CTA |
|---------|-----|
| Has a free trial | "Start free trial" |
| Freemium | "Get started free" |
| No trial, direct purchase | "Get [Plan Name]" |
| Enterprise / contact sales | "Talk to us" or "Get a demo" |
| Annual commitment, high price | "Schedule a call" |

Avoid:
- "Sign Up" — generic, no value
- "Subscribe" — sounds like a newsletter
- "Buy Now" — transactional, not benefit-oriented
- "Learn More" — on a pricing page, this is a dead end

### Pricing Display

| Scenario | How to Show It |
|----------|---------------|
| Monthly pricing | "$99/month" |
| Annual pricing, billed monthly | "$83/month, billed annually" |
| Annual pricing, billed upfront | "$996/year" with "/mo equivalent" note |
| Per-seat | "$15/user/month" |
| Usage-based | "From $0.002 per call" |
| Enterprise | "Custom" or "Starting at $X" |

Always show annual savings as a percentage OR dollar amount (whichever is larger visually).

---

## Conversion Tactics

### Anchoring

**Price anchoring:** The first number shown sets the reference frame. If you show a $500/month plan first, $99 feels cheap.

If you want to push the middle tier:
- Show plans left-to-right: Premium → Pro (recommended) → Starter
- OR highlight the middle tier with visual treatment (larger card, border, color)
- The eye goes to the visually differentiated option

### The "Recommended" Badge

Don't just label the middle tier. Make it visually obvious:
- Darker background or brand color
- Slightly taller card
- "Most Popular" or "Recommended for Most Teams" label
- First CTA in the tab order

### Annual Toggle Default

Research consistently shows defaulting to annual pricing increases annual plan take rate. Show the toggle, but default to annual.

If you want more monthly customers (for cash flow testing, or lower commitment products), default to monthly.

### Pricing Page SEO Consideration

Pricing pages often rank for "[Company] pricing" queries. This matters because:
- Competitors may be running ads on your brand pricing keywords
- The page needs to load fast and be well-structured
- Include your pricing in structured data (JSON-LD Schema: PriceSpecification)

---

## Pricing Page Audit Checklist

Score each item 0-2 (0 = missing, 1 = exists but weak, 2 = done well):

**Above the Fold**
- [ ] Billing toggle visible
- [ ] Annual savings shown clearly
- [ ] Three plan cards with clear differentiation
- [ ] "Most popular" / recommended tier highlighted
- [ ] CTA per plan

**Content**
- [ ] Full feature comparison table
- [ ] FAQ section (5+ questions)
- [ ] Social proof / logos
- [ ] Enterprise CTA

**Copy**
- [ ] Plan names are meaningful (not just Basic/Pro)
- [ ] Price is unambiguous (per user? per month? billed how?)
- [ ] CTAs are action-oriented
- [ ] Positioning line per plan

**Trust**
- [ ] Security badges (if B2B)
- [ ] Money-back guarantee or cancellation policy visible
- [ ] "Cancel anytime" stated explicitly

**Score interpretation:**
- 22-24: Strong page. Test specific elements.
- 16-21: Good foundation. Fix weak sections.
- <16: Material gaps. Rebuild using this playbook.

---

## Pricing Page A/B Test Ideas

**High impact, easier to test:**
1. Default billing toggle (annual vs. monthly)
2. "Most popular" badge placement
3. CTA copy (Start free trial vs. Get Pro)
4. Price display ($/mo vs. $/year)

**Medium impact, more setup:**
5. Plan name messaging (segment-based vs. feature-based)
6. Number of features shown in above-fold cards (3 vs. 6)
7. Social proof placement (above vs. below fold)
8. FAQ accordion vs. expanded

**High impact, harder to execute:**
9. Actual price points (statistical significance takes longer)
10. Three tiers vs. two tiers
11. Adding vs. removing free tier

**Minimum traffic for pricing tests:** 500+ visitors per variant per week. Below that, results won't be statistically meaningful.
