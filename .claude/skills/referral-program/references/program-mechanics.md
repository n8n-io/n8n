# Program Mechanics — Referral and Affiliate Design Patterns

Detailed design patterns with real-world examples. Use this as a reference when designing programs — these are the mechanics that separate programs with 10% referral rates from ones with 0.5%.

---

## The Two Fundamental Program Types

### Type A: Customer-to-Customer Referral
Your best customers refer their peers. Classic example: Dropbox, Airbnb, Uber.

**Core mechanics:**
- Referral link generated per user
- Reward given when referred user completes a qualifying action (sign up, first purchase, first month paid)
- Referrer sees their dashboard: links sent, signed up, rewards earned

**What makes it work:**
- Existing customer trust transfers. Being referred by someone you trust removes 80% of purchase skepticism.
- The referrer's reputation is on the line — they only refer people they think will benefit
- Natural social proof at the moment of conversion

### Type B: Partner / Affiliate Program
External publishers, influencers, agencies, or complementary SaaS tools promote you in exchange for commission.

**Core mechanics:**
- Unique affiliate link or coupon per partner
- Attribution tracked via cookie (30-90 day window typical)
- Payout on qualifying events (first payment, monthly recurring, flat fee)

**What makes it work:**
- Partners have existing audiences who trust them
- Content-driven promotion outlasts a single ad — a blog post with your affiliate link can generate leads for 3 years
- Commission-aligned incentives mean partners promote more when you convert better

---

## Real-World Program Patterns

### Pattern 1: Double-Sided Reward (Dropbox Model)
**How it worked:** Refer a friend = 500MB for you + 500MB for them.

**Why it worked:**
- Both sides had skin in the game
- The reward was intrinsic to the product (not a discount on something unrelated)
- The referred user's incentive made them more likely to complete registration
- Referrer felt generous, not transactional

**When to use:** When your core product has a natural "shareable" dimension. Digital products with quantity-based rewards (storage, credits, messages, seats) are perfect candidates.

**When NOT to use:** When your product has no natural unit to give. Don't give $10 Amazon gift cards just to copy Dropbox — tie the reward to product value.

---

### Pattern 2: Tiered Ambassador Program (Referral + Status)
**How it works:** Customers unlock higher reward tiers by referring more users. Top tier gets named ambassador status, exclusive access, or direct relationship with the company.

**Example structure:**
```
Bronze (1-2 referrals): $20 credit per referral
Silver (3-9 referrals): $30 credit per referral + priority support
Gold (10+ referrals): $50 credit per referral + product advisory board invite + named case study
```

**Why it works:** For highly enthusiastic customers, status beats cash. Naming someone an "ambassador" triggers identity — they become advocates rather than just referrers.

**When to use:** Strong community around the product. Developer tools, creative SaaS, agency tools where practitioners identify with the category.

---

### Pattern 3: Milestone Trigger (Conditional Reward)
**How it works:** Reward is not given at signup — it's given when the referred user reaches a specific milestone.

**Example:**
- "Your friend gets $50 when they make their first withdrawal"
- "You get 1 free month when your referral upgrades to a paid plan"

**Why it works:** Referred users are incentivized to actually use the product to unlock the reward. Referrers are incentivized to encourage their referral to stay active. Reduces reward fraud (fake accounts).

**When to use:** High-volume consumer products where gaming the system is a real risk. Financial services, marketplaces, usage-based products.

---

### Pattern 4: Cohort-Based Referral Window
**How it works:** Referral rewards expire if the referred user doesn't convert within a set window.

**Standard windows:**
- B2C: 7–14 days (high intent = fast decision)
- B2B SMB: 30 days
- B2B Enterprise: 90+ days (longer evaluation cycles)

**Why it matters:** Open-ended referral attribution creates accounting complexity and gaming risk. Time-bounded windows create urgency and clean accounting.

---

### Pattern 5: Affiliate Commission Tiers by Partner Type

Not all affiliates are equal. Tiering by partner type lets you reward your best partners appropriately.

**Example tier structure:**
```
Standard affiliates (bloggers, small newsletters):
└── 20% of first payment, 30-day cookie

Premium affiliates (high-traffic publications, active agencies):
└── 25% MRR for 12 months, 60-day cookie, co-marketing support

Strategic partners (complementary SaaS, resellers):
└── 30% MRR ongoing, white-label option, dedicated account manager
```

**Key principle:** The higher the traffic quality and deal size, the higher the commission can go. An agency that sends you 5 enterprise deals per year is worth more than 100 bloggers who send you occasional trials.

---

### Pattern 6: Product-Embedded Referral (Virality by Design)

The referral mechanism is built into the product experience, not bolted on as a "refer a friend" email.

**Examples:**
- Calendar invite: "Powered by [Product]" link in email footer that every invitee sees
- "Created with [Product]" watermark on exported documents (Canva, Notion)
- "Invite your team" prompt mid-onboarding with a clear reason to do it now
- "Share your results" on high-value output screens

**Why it works:** The referral happens at the moment of peak product value, using the product itself as the promotional vehicle. No separate "referral program" needed.

**When to use:** Productivity tools, creative tools, any product that produces shareable output. Build this alongside the product, not as an afterthought.

---

### Pattern 7: B2B Account-Based Referral

In B2B, referrals are more targeted — you're asking for warm intros to specific account types, not a spray-and-pray link share.

**How it works:**
- Identify which customers have the broadest networks in your ICP
- Equip them with a referral kit (email template, one-pager, LinkedIn intro script)
- Reward for completed intro + reward uplift for closed deal
- Keep the referrer informed on progress (increases likelihood of them championing internally)

**Example mechanics:**
```
Step 1: Customer completes an intro call → $200 gift card
Step 2: Intro converts to a demo → $500 additional
Step 3: Demo converts to a deal → 10% of first year's contract value (capped at $5,000)
```

**Why it works:** High-trust referrals from B2B customers often shorten sales cycles dramatically. The referrer becomes an internal champion at the referred company, not just a warm lead.

---

## Share Mechanics Deep Dive

### The 3 Share Channels That Drive Volume

| Channel | How It Works | Best For |
|---------|------------|---------|
| Personal referral link | User copies/shares their link to a friend | Universal |
| Direct email invite | User enters friend's email, platform sends invite on their behalf | Consumer, prosumer |
| Social share | One-click to Twitter, LinkedIn, WhatsApp with pre-filled message | Consumer, community products |

### Pre-Written Share Messages — What Works

**Works:**
> "I've been using [Product] for 3 months and it's saved me hours on [specific task]. You can get started free using my link: [link]"

**Doesn't work:**
> "Check out this amazing product I use! [link]"

The difference: specificity and personal endorsement. Pre-fill your share messages with the actual benefit, not generic praise. Make it easy for users to be specific advocates, not just sharers.

---

## Fraud Prevention

Referral fraud happens when users game the system (fake accounts, self-referrals, incentivized referrals).

**Minimum safeguards:**
- Email verification required before reward is credited
- Device fingerprinting to detect same-device self-referral
- Reward withheld until referred user completes a qualifying action (first payment, 7-day active use)
- Rate limiting on referral link sends per user

**Warning signs of fraud:**
- Referral conversion rate suddenly spikes above 60% (normal is 15–30%)
- High number of referrals from a single user (>20 in a week)
- Referrals with similar email patterns or same IP block

---

## Technology Options

### For Customer Referral Programs

| Tool | Best For | Pricing Tier |
|------|---------|-------------|
| ReferralHero | SMB SaaS, waitlist referral | $49–$199/mo |
| Viral Loops | Consumer apps, e-commerce | $49–$199/mo |
| Referral Rock | Mid-market SaaS | $175–$800/mo |
| Custom (in-house) | When you want full control + have engineering | Build cost only |

### For Affiliate Programs

| Tool | Best For | Notes |
|------|---------|-------|
| Rewardful | SaaS, Stripe-based | $49–$299/mo, easiest Stripe integration |
| PartnerStack | B2B SaaS | $500+/mo, best for partner tiers |
| Impact | Enterprise, multi-channel | Custom pricing |
| ShareASale | E-commerce, consumer | 20% of commissions + fees |

### For Product-Embedded Viral Loops
Build these in-house. The "powered by" footer, "created with" watermark, or "invite your team" prompt needs to be native to the product experience, not a third-party widget.
