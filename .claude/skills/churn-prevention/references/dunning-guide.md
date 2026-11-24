# Dunning Guide

Payment recovery strategies, retry logic, and email sequences for involuntary churn.

---

## Why Involuntary Churn Matters

At most SaaS companies, 20-40% of all churn comes from failed payments — not customer decisions. The customer didn't choose to leave. Their card expired, got replaced, hit a limit, or was flagged by their bank. Most of these situations are recoverable within 7-14 days.

**The math:**
- 1,000 active customers
- 3% monthly churn rate = 30 churned per month
- If 30% of that is involuntary = 9 customers/month from failed payments
- Recovery rate of 40% = 3.6 customers saved/month
- At $100 MRR: $360/month recovered, $4,320/year — from just fixing dunning

That's before touching voluntary churn.

---

## Failure Mode Taxonomy

Not all payment failures are equal. Categorize before deciding how to retry:

| Failure Type | Decline Code | Recovery Approach |
|-------------|-------------|-------------------|
| **Insufficient funds** | `insufficient_funds` | Retry in 3-5 days (balance usually replenishes) |
| **Card expired** | `expired_card` | Card updater first; email to update card |
| **Card replaced** | `card_not_supported`, network updated | Card updater handles this automatically |
| **Do not honor** | `do_not_honor` | Retry once in 3 days; email to contact bank |
| **Fraud flagged** | `fraudulent` | Email immediately; don't retry — let customer resolve |
| **Card lost/stolen** | `lost_card`, `stolen_card` | Email immediately; do not retry |
| **Generic decline** | `generic_decline` | Retry 2x over 7 days; then email |

**Rule:** Never retry fraudulent, lost, or stolen card declines. It increases chargeback risk.

---

## Retry Schedule

Optimal timing based on card network research:

```
Day 0:  Payment fails (initial charge)
Day 3:  Retry 1 — highest recovery rate (3-7 days is the sweet spot)
Day 8:  Retry 2 — catches monthly paycycle refills
Day 13: Retry 3 — final automated attempt
Day 16: Cancel subscription (if not recovered)
```

**Stripe-specific configuration:**

In Stripe Billing settings (Dashboard > Billing > Subscriptions and emails):
```
Smart Retries: Enable (Stripe uses ML to pick retry timing)
   OR
Manual schedule: 3 days, 5 days, 7 days
Subscription behavior after all retries: Cancel subscription
```

**Alternative for maximum recovery:**
If using Smart Retries (Stripe), disable manual schedule — they conflict.
Smart Retries uses real-time card network data and typically outperforms fixed schedules.

---

## Card Updater Services

These services update card details automatically when banks issue new cards:

| Provider | Service Name | Config Required |
|---------|-------------|-----------------|
| Stripe | Account Updater | Enabled by default. Verify in Dashboard > Settings > Card account updater |
| Braintree | Account Updater | Must enable in Control Panel > Processing > Account Updater |
| Recurly | Account Updater | Available on Professional and above |
| Chargebee | Smart Dunning | Bundled with Chargebee; enable in configuration |

**Expected impact:** 15-25% of involuntary churn prevented before dunning emails are needed.

---

## Dunning Email Sequence

Five emails. Each one escalates slightly in urgency. No guilt, no shame — these are operational communications.

---

### Email 1 — Day 0: "Payment failed"

**Goal:** Inform, make it easy to fix.

```
Subject: Your [Product] payment didn't go through

Hi [Name],

We weren't able to process your [Product] subscription payment of [amount].

This happens sometimes — an expired card, a temporary issue with your bank, 
or a card limit. Easy to fix.

Update your payment details here:
[Update payment method →]

If you need help, reply to this email.

[Product] Team

---
Payment amount: [amount]
Billing date: [date]
Next retry: [date + 3 days]
```

**Notes:**
- Send within 1 hour of failure
- Include specific amount and date — vague emails get ignored
- Mention the next retry date — some customers will wait for the retry to see if it clears

---

### Email 2 — Day 3: "Retry coming up"

**Goal:** Catch people before the retry so they can update the card first.

```
Subject: [Product] — we'll try your payment again tomorrow

Hi [Name],

We're going to attempt your [Product] payment of [amount] again tomorrow 
([specific date]).

If your card details have changed, update them now so the retry goes through:
[Update payment method →]

If the retry fails, we'll reach out again.

[Product] Team
```

**Notes:**
- Send day before the retry, not day of
- Short email — one job, one CTA
- Some payment processors let you trigger a manual retry immediately after card update — mention this if yours does

---

### Email 3 — Day 7: "We tried again — still failing"

**Goal:** Add urgency, soften tone, offer help.

```
Subject: [Product] payment still failing — action needed

Hi [Name],

We've attempted to process your [Product] subscription twice now, 
and the payment hasn't gone through.

Your account is still active, but we'll need to resolve this soon to 
avoid any interruption.

A few common fixes:
• Check if your card has expired and update it
• Contact your bank if the card is being declined unexpectedly
• Use a different card if this one is no longer working

Update payment details:
[Update payment method →]

Still having trouble? Reply to this email and we'll help you sort it out.

[Product] Team
```

**Notes:**
- Shift from notification to problem-solving
- List common causes — helps customers self-diagnose
- Offer human help — some people have legitimate confusion

---

### Email 4 — Day 12: "Final notice"

**Goal:** Create urgency without being threatening. Be clear about what happens.

```
Subject: [Product] account at risk — payment needed by [specific date]

Hi [Name],

We've made multiple attempts to process your [Product] subscription, 
and we haven't been able to reach your card.

Your account will be cancelled on [specific date] if we don't receive payment.

Here's what you'll lose access to:
• [Key feature / data point]
• [Key feature / data point]
• Your [X] months of [data/history/usage]

This is our last reminder before cancellation.

Update payment now:
[Update payment method →]

Need to talk to someone? [Book a call] or reply here.

[Product] Team
```

**Notes:**
- Use a specific date — "soon" doesn't create urgency, "March 15" does
- List what they lose — tangible is more motivating than abstract
- Offer human escalation — some churn at this stage is recoverable by a support person

---

### Email 5 — Day 16: "Account cancelled"

**Goal:** Inform, leave the door open, make reactivation easy.

```
Subject: Your [Product] account has been cancelled

Hi [Name],

We've cancelled your [Product] subscription as of today. Your card could 
not be charged for [amount] after multiple attempts.

Your data is saved for 90 days (until [date]).

To reactivate:
[Reactivate my account →]

You'll be able to pick up where you left off — all your data will be intact.

If you think this was an error, reply to this email and we'll sort it out.

[Product] Team
```

**Notes:**
- No blame, no guilt — this is a notification, not a scolding
- Make reactivation frictionless — one click, not a new signup flow
- Data retention timeline gives them a reason to act within 90 days

---

## Dunning Metrics to Track

| Metric | What it measures | Target |
|--------|-----------------|--------|
| **Recovery rate** | Failed payments recovered / total failed | 25-40% |
| **Recovery by email** | Which email in the sequence converts most | Track per email |
| **Recovery by retry** | Which retry attempt succeeds most | Usually retry 1 (day 3) |
| **Time to recovery** | Days from first failure to payment | <10 days is good |
| **Card updater hit rate** | Cards auto-updated before manual outreach | 15-25% of failures |

---

## Third-Party Dunning Tools

For teams who want plug-and-play dunning without building it:

| Tool | Best For | Pricing Model |
|------|---------|--------------|
| **Churnkey** | Stripe users, full cancel flow + dunning | Revenue share |
| **ProfitWell Retain** | Stripe + Braintree, analytics-heavy | % of recovered revenue |
| **Stunning** | Stripe-native, email-focused | Flat monthly |
| **Recurly** | Already on Recurly | Built-in |
| **Chargebee Smart Dunning** | Already on Chargebee | Built-in |

**When to use a third-party tool:** If you're <$500k MRR and don't have engineering bandwidth to build retry logic + email sequences, a tool pays for itself quickly. Above that threshold, build it in-house for more control.
