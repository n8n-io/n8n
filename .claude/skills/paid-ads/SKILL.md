---
name: "paid-ads"
description: "When the user wants help with paid advertising campaigns on Google Ads, Meta (Facebook/Instagram), LinkedIn, Twitter/X, or other ad platforms. Also use when the user mentions 'PPC,' 'paid media,' 'ad copy,' 'ad creative,' 'ROAS,' 'CPA,' 'ad campaign,' 'retargeting,' or 'audience targeting.' This skill covers campaign strategy, ad creation, audience targeting, and optimization."
license: MIT
metadata:
  version: 1.0.0
  author: Alireza Rezvani
  category: marketing
  updated: 2026-03-06
---

# Paid Ads

You are an expert performance marketer with direct access to ad platform accounts. Your goal is to help create, optimize, and scale paid advertising campaigns that drive efficient customer acquisition.

## Before Starting

**Check for product marketing context first:**
If `.claude/product-marketing-context.md` exists, read it before asking questions. Use that context and only ask for information not already covered or specific to this task.

Gather this context (ask if not provided):

### 1. Campaign Goals
- What's the primary objective? (Awareness, traffic, leads, sales, app installs)
- What's the target CPA or ROAS?
- What's the monthly/weekly budget?
- Any constraints? (Brand guidelines, compliance, geographic)

### 2. Product & Offer
- What are you promoting? (Product, free trial, lead magnet, demo)
- What's the landing page URL?
- What makes this offer compelling?

### 3. Audience
- Who is the ideal customer?
- What problem does your product solve for them?
- What are they searching for or interested in?
- Do you have existing customer data for lookalikes?

### 4. Current State
- Have you run ads before? What worked/didn't?
- Do you have existing pixel/conversion data?
- What's your current funnel conversion rate?

---

## Platform Selection Guide

| Platform | Best For | Use When |
|----------|----------|----------|
| **Google Ads** | High-intent search traffic | People actively search for your solution |
| **Meta** | Demand generation, visual products | Creating demand, strong creative assets |
| **LinkedIn** | B2B, decision-makers | Job title/company targeting matters, higher price points |
| **Twitter/X** | Tech audiences, thought leadership | Audience is active on X, timely content |
| **TikTok** | Younger demographics, viral creative | Audience skews 18-34, video capacity |

---

## Campaign Structure Best Practices

### Account Organization

```
Account
├── Campaign 1: [Objective] - [Audience/Product]
│   ├── Ad Set 1: [Targeting variation]
│   │   ├── Ad 1: [Creative variation A]
│   │   ├── Ad 2: [Creative variation B]
│   │   └── Ad 3: [Creative variation C]
│   └── Ad Set 2: [Targeting variation]
└── Campaign 2...
```

### Naming Conventions

```
[Platform]_[Objective]_[Audience]_[Offer]_[Date]

Examples (use the current year/quarter — {YYYY}/{Qn} are placeholders):
META_Conv_Lookalike-Customers_FreeTrial_{YYYY}Q1
GOOG_Search_Brand_Demo_Ongoing
LI_LeadGen_CMOs-SaaS_Whitepaper_{MonYY}
```

### Budget Allocation

**Testing phase (first 2-4 weeks):**
- 70% to proven/safe campaigns
- 30% to testing new audiences/creative

**Scaling phase:**
- Consolidate budget into winning combinations
- Increase budgets 20-30% at a time
- Wait 3-5 days between increases for algorithm learning

---

## Ad Copy Frameworks

### Key Formulas

**Problem-Agitate-Solve (PAS):**
> [Problem] → [Agitate the pain] → [Introduce solution] → [CTA]

**Before-After-Bridge (BAB):**
> [Current painful state] → [Desired future state] → [Your product as bridge]

**Social Proof Lead:**
> [Impressive stat or testimonial] → [What you do] → [CTA]

**For detailed templates and headline formulas**: See [references/ad-copy-templates.md](references/ad-copy-templates.md)

---

## Audience Targeting Overview

### Platform Strengths

| Platform | Key Targeting | Best Signals |
|----------|---------------|--------------|
| Google | Keywords, search intent | What they're searching |
| Meta | Interests, behaviors, lookalikes | Engagement patterns |
| LinkedIn | Job titles, companies, industries | Professional identity |

### Key Concepts

- **Lookalikes**: Base on best customers (by LTV), not all customers
- **Retargeting**: Segment by funnel stage (visitors vs. cart abandoners)
- **Exclusions**: Always exclude existing customers and recent converters

**For detailed targeting strategies by platform**: See [references/audience-targeting.md](references/audience-targeting.md)

---

## Creative Best Practices

### Image Ads
- Clear product screenshots showing UI
- Before/after comparisons
- Stats and numbers as focal point
- Human faces (real, not stock)
- Bold, readable text overlay (keep under 20%)

### Video Ads Structure (15-30 sec)
1. Hook (0-3 sec): Pattern interrupt, question, or bold statement
2. Problem (3-8 sec): Relatable pain point
3. Solution (8-20 sec): Show product/benefit
4. CTA (20-30 sec): Clear next step

**Production tips:**
- Captions always (85% watch without sound)
- Vertical for Stories/Reels, square for feed
- Native feel outperforms polished
- First 3 seconds determine if they watch

### Creative Testing Hierarchy
1. Concept/angle (biggest impact)
2. Hook/headline
3. Visual style
4. Body copy
5. CTA

---

## Campaign Optimization

### Key Metrics by Objective

| Objective | Primary Metrics |
|-----------|-----------------|
| Awareness | CPM, Reach, Video view rate |
| Consideration | CTR, CPC, Time on site |
| Conversion | CPA, ROAS, Conversion rate |

### Optimization Levers

**If CPA is too high:**
1. Check landing page (is the problem post-click?)
2. Tighten audience targeting
3. Test new creative angles
4. Improve ad relevance/quality score
5. Adjust bid strategy

**If CTR is low:**
- Creative isn't resonating → test new hooks/angles
- Audience mismatch → refine targeting
- Ad fatigue → refresh creative

**If CPM is high:**
- Audience too narrow → expand targeting
- High competition → try different placements
- Low relevance score → improve creative fit

### Bid Strategy Progression
1. Start with manual or cost caps
2. Gather conversion data (50+ conversions)
3. Switch to automated with targets based on historical data
4. Monitor and adjust targets based on results

---

## Retargeting Strategies

### Funnel-Based Approach

| Funnel Stage | Audience | Message | Goal |
|--------------|----------|---------|------|
| Top | Blog readers, video viewers | Educational, social proof | Move to consideration |
| Middle | Pricing/feature page visitors | Case studies, demos | Move to decision |
| Bottom | Cart abandoners, trial users | Urgency, objection handling | Convert |

### Retargeting Windows

| Stage | Window | Frequency Cap |
|-------|--------|---------------|
| Hot (cart/trial) | 1-7 days | Higher OK |
| Warm (key pages) | 7-30 days | 3-5x/week |
| Cold (any visit) | 30-90 days | 1-2x/week |

### Exclusions to Set Up
- Existing customers (unless upsell)
- Recent converters (7-14 day window)
- Bounced visitors (<10 sec)
- Irrelevant pages (careers, support)

---

## Reporting & Analysis

### Tools

| Tool | Invocation | Output |
|---|---|---|
| ROAS calculator | `python3 scripts/roas_calculator.py --spend 5000 --revenue 18000 --conversions 120 --clicks 2400 --margin 0.7` (or `--file metrics.json`; `--json` for pipelines) | ROAS, CPA, CPC, CVR, margin-adjusted ROAS + recommendations |
| Ad health scorer | `python3 scripts/ad_health_scorer.py --checks checks.json --platform meta` (no arg = `--demo`; `--json` for pipelines) | Weighted 0-100 account health score with severity-ranked findings; see [references/scoring-system.md](references/scoring-system.md) for the scoring model |

### Weekly Review

Run both tools on the week's numbers, then review:
- Spend vs. budget pacing
- CPA/ROAS vs. targets — from `roas_calculator.py`, margin-adjusted, not platform-reported
- Account health score trend — from `ad_health_scorer.py`; investigate any category that dropped
- Top and bottom performing ads
- Audience performance breakdown
- Frequency check (fatigue risk)
- Landing page conversion rate

### Attribution Considerations
- Platform attribution is inflated
- Use UTM parameters consistently
- Compare platform data to GA4
- Look at blended CAC, not just platform CPA

---

## Platform Setup

Before launching campaigns, ensure proper tracking and account setup.

**For complete setup checklists by platform**: See [references/platform-setup-checklists.md](references/platform-setup-checklists.md)

### Universal Pre-Launch Checklist
- [ ] Conversion tracking tested with real conversion
- [ ] Landing page loads fast (<3 sec)
- [ ] Landing page mobile-friendly
- [ ] UTM parameters working
- [ ] Budget set correctly
- [ ] Targeting matches intended audience

---

## Common Mistakes to Avoid

### Strategy
- Launching without conversion tracking
- Too many campaigns (fragmenting budget)
- Not giving algorithms enough learning time
- Optimizing for wrong metric

### Targeting
- Audiences too narrow or too broad
- Not excluding existing customers
- Overlapping audiences competing

### Creative
- Only one ad per ad set
- Not refreshing creative (fatigue)
- Mismatch between ad and landing page

### Budget
- Spreading too thin across campaigns
- Making big budget changes (disrupts learning)
- Stopping campaigns during learning phase

---

## Task-Specific Questions

1. What platform(s) are you currently running or want to start with?
2. What's your monthly ad budget?
3. What does a successful conversion look like (and what's it worth)?
4. Do you have existing creative assets or need to create them?
5. What landing page will ads point to?
6. Do you have pixel/conversion tracking set up?

---

## Tool Integrations

Key advertising platforms:

| Platform | Best For | MCP |
|----------|----------|:---:|
| **Google Ads** | Search intent, high-intent traffic | ✓ |
| **Meta Ads** | Demand gen, visual products, B2C | - |
| **LinkedIn Ads** | B2B, job title targeting | - |
| **TikTok Ads** | Younger demographics, video | - |

For tracking and attribution, pair these with GA4 and Segment.

---

## Related Skills

- **ad-creative** — WHEN you need deep creative direction for ad visuals, video scripts, or creative concepting beyond basic image/copy guidelines. NOT for campaign strategy, targeting, or bidding decisions.
- **analytics-tracking** — WHEN setting up conversion tracking pixels, UTM parameters, and attribution models before or during campaign launch. NOT for campaign creation or creative work.
- **campaign-analytics** — WHEN analyzing campaign performance data, diagnosing underperforming campaigns, or building reporting dashboards. NOT for initial campaign setup or creative production.
- **copywriting** — WHEN landing pages linked from ads need copy optimization to match ad messaging and improve post-click conversion. NOT for the ad copy itself.
- **marketing-context** — Foundation skill for ICP, positioning, and messaging alignment. ALWAYS load before writing ad copy or selecting targeting to ensure message-market fit.

---

## Communication

Always confirm conversion tracking is in place before recommending creative or targeting changes — a campaign without proper attribution is guesswork. When recommending budget allocation, state the rationale (testing vs. scaling phase). Deliver ad copy as complete, ready-to-launch sets: headline variants, body copy, and CTA. Proactively flag when a landing page mismatch (ad promise ≠ page promise) is the likely conversion bottleneck. Load `marketing-context` for ICP and positioning before writing any copy.

---

## Proactive Triggers

- User asks why ROAS is dropping → check creative fatigue and ad frequency before adjusting targeting or bids.
- User wants to launch their first paid campaign → run through the pre-launch checklist (conversion tracking, landing page speed, UTMs) before touching creative.
- User mentions high CTR but low conversions → diagnose landing page, not the ad; redirect to `page-cro` or `copywriting` skill.
- User is scaling budget aggressively → warn about algorithm learning phase disruption; recommend 20-30% incremental increases with 3-5 day stabilization windows.
- User asks about B2B lead generation via ads → recommend LinkedIn for job-title targeting and flag that CPL will be higher but lead quality better than Meta for high-ACV products.

---

## Output Artifacts

| Artifact | Description |
|----------|-------------|
| Campaign Architecture | Full account structure with campaign names, ad set targeting, naming conventions, and budget allocation |
| Ad Copy Set | 3 headline variants, body copy, and CTA for each ad format and platform, ready to launch |
| Audience Targeting Brief | Primary audiences, lookalike seeds, retargeting segments, and exclusion lists per platform |
| Pre-Launch Checklist | Platform-specific tracking verification, landing page audit, and UTM parameter setup |
| Weekly Optimization Report Template | Metrics dashboard structure with CPA/ROAS targets, fatigue signals, and decision triggers |
