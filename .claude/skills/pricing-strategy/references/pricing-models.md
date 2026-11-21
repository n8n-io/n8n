# Pricing Models — Deep Dive

Comprehensive reference for SaaS pricing models with real-world examples and when to use each.

---

## Model 1: Per-Seat / Per-User

**How it works:** Price is multiplied by the number of users who access the product.

**Best for:**
- Collaboration tools where more users = more value
- CRMs where every sales rep needs access
- Tools where the organization is the buyer and seats map to headcount

**Examples:** Salesforce ($25-300/seat/mo), Linear ($8/seat/mo), Figma ($12/seat/mo), Notion ($8/seat/mo)

**Expansion mechanics:** Automatic as companies hire. No upsell conversation needed — new hire gets a seat, revenue grows.

**Failure modes:**
- Single-power-user tools (one person does all the work, team just views results) → seat pricing punishes the customer for your product's design
- Tools used by contractors or external stakeholders → billing becomes a negotiation
- Products where sharing credentials is easy and enforcement is hard

**Seat pricing variants:**

| Variant | Description | Example |
|---------|-------------|---------|
| Named seat | Specific user assigned to each license | Salesforce |
| Concurrent seat | N users can be logged in simultaneously | Legacy enterprise software |
| Creator/viewer split | Creators pay, viewers free or low-cost | Figma, Miro |
| Minimum seat count | Plan requires minimum X seats | Most enterprise deals |

**Tip:** Creator/viewer pricing is powerful for B2B tools where one team creates and dozens consume. It drives virality (free viewers) while capturing revenue from actual users.

---

## Model 2: Usage-Based (Consumption)

**How it works:** Customer pays for what they use — API calls, storage, compute, messages sent, emails delivered.

**Best for:**
- Infrastructure and developer tools
- AI/ML tools where compute cost scales with usage
- Communication platforms (email, SMS, video)
- Products where usage is highly variable across customers

**Examples:** Stripe (2.9% + $0.30/transaction), Twilio ($0.0075/SMS), AWS (varies), OpenAI ($0.002-0.06/1K tokens)

**Expansion mechanics:** Natural — as customer grows, their usage grows, revenue grows without any action. Best CAC:LTV dynamics in SaaS.

**Failure modes:**
- Unpredictable bills → customers cap usage to avoid overages → you've engineered your own ceiling
- High churn during market downturns → when usage drops, revenue drops
- Hard to forecast for both you and the customer

**Usage pricing variants:**

| Variant | Description | Example |
|---------|-------------|---------|
| Pure consumption | Pay only for what you use | AWS Lambda |
| Prepaid credits | Buy credits, consume at your pace | OpenAI, Resend |
| Committed use + overage | Flat fee with usage ceiling, then per-unit | Stripe, Twilio volume |
| Tiered usage | Lower per-unit price at higher volumes | Mailchimp email tiers |

**Hybrid approach:** Most mature usage-based companies add a platform fee (small flat monthly charge) to ensure revenue floor and reduce churn from low-usage months.

---

## Model 3: Feature-Based (Tiered Flat Fee)

**How it works:** Different bundles of features at different flat price points. The Good-Better-Best model.

**Best for:**
- Products with clear feature differentiation between customer segments
- Markets where predictable spend matters (CFOs love this)
- SMB-to-enterprise products where enterprise features are genuinely different

**Examples:** HubSpot (Starter/Professional/Enterprise), Intercom (Starter/Pro/Premium), most SaaS

**Expansion mechanics:** Requires upsell motion — customer has to outgrow a tier and move up. Less automatic than usage-based but more predictable.

**Failure modes:**
- Feature tiers that don't match actual customer needs → customers cluster in one tier, none move
- Enterprise features that aren't compelling enough to justify the jump → stuck mid-market
- Too many tiers → analysis paralysis

---

## Model 4: Flat Fee

**How it works:** One price, everything included, unlimited use.

**Best for:**
- Small tools with predictable cost structure
- Markets where simplicity is the differentiator
- Products where usage genuinely doesn't vary much

**Examples:** Basecamp ($99/mo flat), Transistor.fm (by podcast, not listeners), Calendly Basic

**Expansion mechanics:** None. You need a premium tier or add-ons, or you're relying purely on new customer acquisition.

**Failure modes:**
- Heavy users subsidized by light users → heavy users stay forever, light users churn → adverse selection
- No path to grow revenue with existing customers → stuck unless you add tiers or raise prices

**When flat fee works:** When your cost to serve is genuinely flat, or when market positioning around simplicity is worth more than the revenue you'd capture with usage-based pricing.

---

## Model 5: Freemium

**Note:** Freemium is an acquisition strategy, not a pricing model. It's compatible with any of the above.

**How it works:** Free tier with limited functionality, paid tiers above.

**Best for:**
- Developer tools (PLG)
- Collaboration tools that spread virally
- Products where network effects increase value with more users

**Examples:** Slack, Notion, Figma, GitHub, Airtable

**The freemium math:**
- Free users cost money to serve
- You need paid conversion rate high enough to cover free users
- Rule of thumb: 2-5% free-to-paid conversion is viable at scale, 1-2% usually isn't

**Free vs. trial vs. freemium:**

| Model | Description | Best For |
|-------|-------------|---------|
| Free forever tier | Permanently limited free plan | PLG, viral loops |
| Time-limited trial | Full access for 14-30 days | Sales-assisted, complex products |
| Usage-limited trial | Full access until limit hit | Developer tools, AI |
| Freemium | Permanently limited, upsell to paid | Bottoms-up enterprise |

---

## Model 6: Hybrid Pricing

Most mature SaaS companies end up with hybrid pricing. Common combinations:

| Combination | Example |
|------------|---------|
| Platform fee + per seat | Base access + user licenses |
| Platform fee + usage | Monthly minimum + overage |
| Feature tiers + usage | Plan determines included usage, overage above |
| Per seat + usage | Seat license + volume pricing for heavy users |

**When to go hybrid:**
- You have both fixed infrastructure costs and variable serving costs
- You want revenue floors (platform fee) + upside (usage)
- Different customer segments have very different value profiles

---

## Pricing Model Selection Framework

Answer these questions to identify the right model:

**1. Does value scale with users?**
- Yes, linearly → per-seat
- Yes, but not linearly → creator/viewer or per-seat with role tiers

**2. Does value scale with usage?**
- Yes, measurably → usage-based
- Yes, but usage is hard to measure → feature tiers with usage caps

**3. Is your customer a small business wanting simplicity?**
- Yes → flat fee or simple 2-3 tier feature pricing
- No → skip flat fee, go feature or usage-based

**4. Do you have enterprise customers with governance/compliance needs?**
- Yes → enterprise tier required (even if "Contact us")
- No → three tiers max

**5. Is this a developer/technical product?**
- Yes → usage-based or consumption with free tier is the market norm
- No → feature tiers with flat fee is more accessible

---

## Pricing Model Benchmarks

| Metric | Early Stage | Growth | Scale |
|--------|------------|--------|-------|
| **Trial-to-paid rate** | 15-25% | 20-35% | 25-40% |
| **Annual vs monthly mix** | 30-50% annual | 40-60% annual | 50-70% annual |
| **Expansion revenue** | 0-10% of MRR | 10-20% | 20-40% |
| **Price increase frequency** | Ad hoc | Annually | Annually |
| **Churn rate (monthly)** | 2-8% | 1-4% | 0.5-2% |

**The LTV:CAC rule:** LTV should be ≥3x CAC. If it's below 3x, pricing or retention (or both) needs fixing.
