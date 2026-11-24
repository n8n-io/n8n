# Referral Program Examples

Real-world examples of successful referral programs.

## Contents
- Dropbox (Classic)
- Uber/Lyft
- Morning Brew
- Notion
- Incentive Types Comparison
- Incentive Sizing Framework
- Viral Coefficient & Metrics (Key Metrics, Calculating Referral Program ROI)

## Dropbox (Classic)

**Program:** Give 500MB storage, get 500MB storage

**Why it worked:**
- Reward directly tied to product value
- Low friction (just an email)
- Both parties benefit equally
- Gamified with progress tracking

---

## Uber/Lyft

**Program:** Give $10 ride credit, get $10 when they ride

**Why it worked:**
- Immediate, clear value
- Double-sided incentive
- Easy to share (code/link)
- Triggered at natural moments

---

## Morning Brew

**Program:** Tiered rewards for subscriber referrals
- 3 referrals: Newsletter stickers
- 5 referrals: T-shirt
- 10 referrals: Mug
- 25 referrals: Hoodie

**Why it worked:**
- Gamification drives ongoing engagement
- Physical rewards are shareable (more referrals)
- Low cost relative to subscriber value
- Built status/identity

---

## Notion

**Program:** $10 credit per referral (education)

**Why it worked:**
- Targeted high-sharing audience (students)
- Product naturally spreads in teams
- Credit keeps users engaged

---

## Incentive Types Comparison

| Type | Pros | Cons | Best For |
|------|------|------|----------|
| Cash/credit | Universally valued | Feels transactional | Marketplaces, fintech |
| Product credit | Drives usage | Only valuable if they'll use it | SaaS, subscriptions |
| Free months | Clear value | May attract freebie-seekers | Subscription products |
| Feature unlock | Low cost to you | Only works for gated features | Freemium products |
| Swag/gifts | Memorable, shareable | Logistics complexity | Brand-focused companies |
| Charity donation | Feel-good | Lower personal motivation | Mission-driven brands |

---

## Incentive Sizing Framework

**Keep the incentive inside the total acquisition budget:**
```
Total Referral CAC = Total Reward Cost + Other Acquisition Cost
Max Total Reward Cost = max(0, Target CAC - Other Acquisition Cost)
```

Use costs per newly acquired paying customer over the same cohort and period. Total reward cost includes both sides of a two-sided reward; other acquisition cost includes allocated tool, campaign, and management costs. Estimate the actual cost or foregone contribution of credits and free months consistently, rather than treating their face value as cash cost or ignoring it.

**Example:**
- Lifetime revenue: $1,200; gross margin: 70% → lifetime gross profit: $840
- Target total referral CAC: $200
- Other acquisition cost per acquired customer: $40
- Maximum combined reward cost: $200 - $40 = $160 (for example, $80 cash to each side)
- Total referral CAC: $160 + $40 = $200

The old $640 reward would produce $680 CAC with these other costs, exceeding the $200 target. Lifetime gross profit helps assess whether the chosen acquisition budget is viable; it is not the reward budget minus target CAC. Check retention, refunds, and cash payback before committing the budget. If other costs already meet or exceed target CAC, pause or redesign the program; a zero remaining reward budget does not make an already over-budget acquisition acceptable.

For the CAC cost/cohort definition, see [Stripe's CAC calculation guide](https://stripe.com/resources/more/cac-in-saas).

**Typical referral rewards:**
- B2C: $10-50 or 10-25% of first purchase
- B2B SaaS: $50-500 or 1-3 months free
- Enterprise: Higher, often custom

---

## Viral Coefficient & Metrics

### Key Metrics

**Viral coefficient (K-factor):**
```
K = Invitations × Conversion Rate

K > 1 = Viral growth (each user brings more than 1 new user)
K < 1 = Amplified growth (referrals supplement other acquisition)
```

**Example:**
- Average customer sends 3 invitations
- 15% of invitations convert
- K = 3 × 0.15 = 0.45

**Referral rate:**
```
Referral Rate = (Customers who refer) / (Total customers)
```

Benchmarks:
- Good: 10-25% of customers refer
- Great: 25-50%
- Exceptional: 50%+

**Referrals per referrer:**

Benchmarks:
- Average: 1-2 referrals per referrer
- Good: 2-5
- Exceptional: 5+

### Calculating Referral Program ROI

```
Referral program return = (Incremental contribution before program costs - Program costs) / Program costs

Contribution before program costs = Net referred revenue - Serving / product costs
Program costs = Reward economic cost + Allocated tool / campaign costs + Management hours × Loaded hourly cost
```

Use the same cohort and observation window for revenue and costs. Net revenue accounts for refunds and discounts; serving/product costs include the costs needed to deliver the referred customer's purchase. Value credits consistently and avoid subtracting a discount in both net revenue and reward cost. Report the ratio as a percentage when multiplying by 100. With zero program cost the ratio is undefined; report contribution and costs separately.

**Illustrative margin check:** $10,000 net referred revenue at 20% contribution margin yields $2,000 contribution before program costs. With $3,000 program cost, return is ($2,000 - $3,000) / $3,000 = **−33.3%**, despite a revenue-minus-program-cost ratio of +233.3%. Revenue is not profit; see [Google's ROI explanation](https://support.google.com/google-ads/answer/1722066?hl=en).

Referral attribution does not prove all referred sales are incremental. Estimate the counterfactual with a suitable holdout or other defensible design. If you only have attributed sales, label the result **attributed contribution return**, state the incrementality assumption, and do not claim causal program ROI. Separate observed cash recovery from projected lifetime contribution.

**Track separately:**
- Cost per referred customer (CAC via referral)
- LTV of referred customers (often higher than average)
- Payback period for referral rewards
