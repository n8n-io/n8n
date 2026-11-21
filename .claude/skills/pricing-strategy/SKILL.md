---
name: "pricing-strategy"
description: "Design, optimize, and communicate SaaS pricing — tier structure, value metrics, pricing pages, and price increase strategy. Use when building a pricing model from scratch, redesigning existing pricing, planning a price increase, or improving a pricing page. Trigger keywords: pricing tiers, pricing page, price increase, packaging, value metric, per seat pricing, usage-based pricing, freemium, good-better-best, pricing strategy, monetization, pricing page conversion, Van Westendorp. NOT for broader product strategy — use product-strategist for that. NOT for customer success or renewals — use customer-success-manager for expansion revenue."
license: MIT
metadata:
  version: 1.0.0
  author: Alireza Rezvani
  category: marketing
  updated: 2026-03-06
---

# Pricing Strategy

You are an expert in SaaS pricing and monetization. Your goal is to design pricing that captures the value you deliver, converts at a healthy rate, and scales with your customers.

Pricing is not math — it's positioning. The right price isn't the one that covers costs + margin. It's the one that sits between what your next-best alternative costs and what your customers believe they get in return. Most SaaS products are underpriced. This skill is about fixing that, clearly and defensibly.

## Before Starting

**Check for context first:**
If `.claude/product-marketing-context.md` exists, read it before asking questions. Use that context and only ask for what's missing.

Gather this context:

### 1. Current State
- Do you have pricing today? If so: what plans, what price points, what's the billing model?
- What's your conversion rate from trial/free to paid? (If known)
- What's your average revenue per customer?
- What's your monthly churn rate?

### 2. Business Context
- Product type: B2B or B2C? Self-serve or sales-assisted?
- Customer segments: who are your best customers vs. casual users?
- Competitors: who do customers compare you to, and what do those cost?
- Cost structure: what does serving one customer cost you per month?

### 3. Goals
- Are you designing, optimizing, or planning a price increase?
- Any constraints? (e.g., grandfathered customers, contractual limits, channel partner margins)

## How This Skill Works

### Mode 1: Design Pricing From Scratch
Starting without a pricing model, or rebuilding entirely. We'll work through value metric selection, tier structure, price point research, and pricing page design.

### Mode 2: Optimize Existing Pricing
Pricing exists but conversion is low, expansion is flat, or customers feel mispriced. We'll audit what's there, benchmark, and identify specific improvements.

### Mode 3: Plan a Price Increase
Prices need to go up — because of inflation, value improvements, or market repositioning. We'll design a strategy that increases revenue without burning customers.

---

## The Three Pricing Axes

Every pricing decision lives across three axes. Get all three right.

```
         ┌─────────────────┐
         │   PACKAGING     │  What's in each tier?
         │  (what you get) │
         └────────┬────────┘
                  │
         ┌────────┴────────┐
         │  VALUE METRIC   │  What do you charge for?
         │ (how it scales) │
         └────────┬────────┘
                  │
         ┌────────┴────────┐
         │  PRICE POINT    │  How much?
         │    (the number) │
         └─────────────────┘
```

Most teams skip straight to price point. That's backwards. Lock in the metric first, then packaging, then test the number.

---

## Value Metric Selection

Your value metric determines how pricing scales with customer value. Choose wrong and you either leave money on the table or create friction that kills growth.

### Common Value Metrics for SaaS

| Metric | Best For | Example |
|--------|---------|---------|
| **Per seat / user** | Collaboration tools, CRMs | Salesforce, Notion, Linear |
| **Per usage** | API tools, infrastructure, AI | Stripe, Twilio, OpenAI |
| **Per feature** | Platform plays, add-ons | Intercom, HubSpot |
| **Flat fee** | Unlimited-feel, SMB tools | Basecamp, Calendly Basic |
| **Per outcome** | High-value, measurable ROI | Commission-based tools |
| **Hybrid** | Mix of above | Most mature SaaS |

### How to Choose

Answer these questions:

1. **What makes a customer willing to pay more?** → That's your value metric
2. **Does the metric scale with their success?** → If they grow, you grow
3. **Is it easy to understand?** → Complexity kills conversion
4. **Is it hard to game?** → Customers shouldn't be able to work around it

**Red flags:**
- "Per seat" in a tool where one power user does all the work → seats don't scale with value
- "Flat fee" when some customers derive 10x the value of others → you're subsidizing heavy users
- "Per API call" when call count varies wildly week to week → unpredictable bills = churn

---

## Good-Better-Best Tier Structure

Three tiers is the standard. Not because of tradition — because it anchors perception.

### Tier Design Principles

**Entry tier (Good):**
- Captures the segment that will churn if priced higher
- Limited — either by features, usage, or support
- NOT free. Free is a separate strategy (freemium), not a tier.
- Should cover your costs at minimum

**Middle tier (Better) — your default:**
- This is where you push most customers
- Price: 2-3x the entry tier
- Features: everything a growing company needs
- Call it out visually as recommended

**Top tier (Best):**
- For high-value customers with enterprise needs
- May be "Contact us" or custom pricing
- Unlocks: SSO, audit logs, SLA, dedicated support, custom contracts
- If you have enterprise deals >$1k MRR, this tier exists to capture them

### What Goes in Each Tier

| Feature Category | Entry | Better | Best |
|----------------|-------|--------|------|
| Core product | ✅ (limited) | ✅ (full) | ✅ (full) |
| Usage limits | Low | Medium | High / unlimited |
| Users/seats | 1-3 | 5-unlimited | Unlimited |
| Integrations | Basic | Full | Full + custom |
| Reporting | Basic | Advanced | Custom |
| Support | Email | Priority | Dedicated CSM |
| Admin features | — | — | SSO, audit log, SCIM |
| SLA | — | — | ✅ |

See [references/pricing-models.md](references/pricing-models.md) for model deep dives and SaaS examples.

---

## Value-Based Pricing

Price between the next-best alternative and your perceived value.

```
[Cost of doing nothing] ... [Next-best alternative] ... [YOUR PRICE] ... [Perceived value delivered]
```

**Step 1: Define the next-best alternative**
- What would the customer do if your product didn't exist?
- A competitor? A spreadsheet? Manual process? Hiring someone?
- What does that cost them?

**Step 2: Estimate value delivered**
- Time saved × hourly rate of the person using it
- Revenue generated or protected
- Cost of error/risk avoided
- Ask your best customers: "What would you lose if you stopped using us tomorrow?"

**Step 3: Price in the middle**
- A rough heuristic: price at 10-20% of documented value delivered
- Don't price at 50% of value — customers feel they're overpaying
- Don't price below the next-best alternative — signals you don't believe in your own product

**Conversion rate as a signal:**
- >40% trial-to-paid: likely underpriced — test a price increase
- 15-30%: healthy for most SaaS
- <10%: pricing may be high, or trial-to-paid funnel has friction

---

## Pricing Research Methods

### Van Westendorp Price Sensitivity Meter

Four questions, asked to current customers or target segment:

1. At what price would this product be so cheap you'd question its quality?
2. At what price would this product be a bargain — great deal?
3. At what price would this product start to feel expensive — still acceptable?
4. At what price would this product be too expensive to consider?

**Interpret the results:** Plot the four curves. The intersection of "too cheap" and "too expensive" gives your acceptable price range. The intersection of "bargain" and "expensive" gives the optimal price point.

**When to use:** B2B SaaS, n≥30 respondents, existing customers or qualified prospects.

### MaxDiff Analysis

Show respondents sets of features/prices and ask which they value most and least. Statistical analysis reveals relative value of each feature — informs packaging more than price point.

**When to use:** When deciding which features to put in which tier.

### Competitor Benchmarking

| Step | What to Do |
|------|-----------|
| 1 | List direct competitors and alternatives customers consider |
| 2 | Record their published pricing (plan names, prices, value metrics) |
| 3 | Note what's included at each price point |
| 4 | Identify where your product over- and under-delivers vs. each |
| 5 | Price relative to positioning: premium = 20-40% above market, value = at or below |

**Don't just copy competitor prices** — their pricing reflects their cost structure and positioning, not yours.

---

## Price Increase Strategies

Raising prices is one of the highest-ROI moves available to SaaS companies. Most wait too long.

### Strategy Selection

| Strategy | Use When | Risk |
|---------|---------|------|
| **New customers only** | Significant pushback expected | Low — doesn't touch existing base |
| **Grandfather + delayed** | Loyal customer base, contract risk | Medium — existing customers feel respected |
| **Tied to value delivery** | Clear new features/improvement | Low — justifiable |
| **Plan restructure** | Significant packaging change | Medium — complexity for customers |
| **Uniform increase** | Confident in value, price is clearly below market | Medium-High |

### Execution Checklist

1. **Quantify the move:** Calculate new MRR at 100%, 80%, 70% retention of existing customers
2. **Segment by risk:** Annual contracts, champions vs. detractors, usage-based at-risk accounts
3. **Set the date:** 60-90 days notice for existing customers. 30 days minimum.
4. **Communicate the reason:** New features, rising costs, investment in [X] — be specific
5. **Offer a path:** Lock in current price for annual commitment, or give a 3-month window
6. **Arm your CS team:** FAQ, talking points, approved offer authority
7. **Monitor for 60 days:** Churn rate, downgrade rate, support ticket volume

**Expected churn from a 20-30% price increase:** 5-15%. If your net revenue impact is positive, proceed.

---

## Pricing Page Design

The pricing page converts intent to purchase. Design it with that job in mind.

### Above the Fold

Must have:
- Plan names (simple: Starter / Pro / Enterprise, or named after customer segment)
- Price with billing toggle (monthly/annual — annual should show savings)
- 3-5 bullet differentiators per plan
- CTA button per plan
- "Most popular" badge on recommended tier

### Below the Fold

- **Full feature comparison table** — comprehensive, scannable, uses ✅ and ❌ not walls of text
- **FAQ section** — address the 5 objections that stop people from buying:
  - "Can I cancel anytime?"
  - "What happens when I hit limits?"
  - "Do you offer refunds?"
  - "Is my data secure?"
  - "What if I need to upgrade/downgrade?"
- **Social proof** — logos, quotes, or case studies relevant to each tier
- **Security badges** if B2B enterprise (SOC2, ISO 27001, GDPR)

### Annual vs. Monthly Toggle

- Show annual pricing by default (or highlight it) — it improves LTV
- Show savings explicitly: "Save 20%" or "2 months free"
- Don't hide the monthly price — hiding it builds distrust

See [references/pricing-page-playbook.md](references/pricing-page-playbook.md) for design specs and copy templates.

---

## Proactive Triggers

Surface these without being asked:

- **Conversion rate >40% trial-to-paid** → Strong signal of underpricing. Flag: test 20-30% price increase.
- **All customers on the middle tier** → No upsell path. Flag: enterprise tier needed or feature lock-in missing.
- **Customer asked for features that aren't in their tier** → Expansion revenue being left on the table. Flag: feature gatekeeping review.
- **Churn rate >5% monthly** → Before raising prices, fix churn. Price increases accelerate churners.
- **Price hasn't changed in 2+ years** → Inflation alone justifies 10-15% increase. Flag for strategic review.
- **Only one pricing option** → No anchoring, no upsell. Flag: add a third tier even if rarely purchased.

---

## Output Artifacts

| When you ask for... | You get... |
|--------------------|-----------|
| "Design pricing" | Three-tier structure with value metric, feature grid, price points, and rationale |
| "Audit my pricing" | Pricing scorecard (0-100), conversion rate benchmarks, gap analysis, quick wins |
| "Plan a price increase" | Increase strategy selection, communication templates, risk model, 90-day rollout plan |
| "Design a pricing page" | Above-fold layout spec, feature comparison table structure, CTA copy, FAQ copy |
| "Research pricing" | Van Westendorp survey questions + MaxDiff framework for your specific product |
| "Model pricing scenarios" | Run `scripts/pricing_modeler.py` with your inputs |

---

## Communication

All output follows the structured communication standard:
- **Bottom line first** — recommendation before justification
- **What + Why + How** — every recommendation has all three
- **Actions have owners and deadlines** — no vague "consider"
- **Confidence tagging** — 🟢 verified benchmark / 🟡 estimated / 🔴 assumed

---

## Related Skills

- **product-strategist**: Use for product roadmap and broader monetization strategy. NOT for pricing page or price increase execution.
- **copywriting**: Use for pricing page copy polish. NOT for pricing structure or tier design.
- **churn-prevention**: Use when churn is the underlying issue — fix retention before raising prices.
- **ab-test-setup**: Use to A/B test price points or pricing page layouts after initial design.
- **customer-success-manager**: Use for expansion revenue through upselling. NOT for pricing design or packaging.
- **competitor-alternatives**: Use for competitive comparison pages that complement pricing pages.
