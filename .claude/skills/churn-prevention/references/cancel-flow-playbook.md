# Cancel Flow Playbook

Complete reference for designing, building, and auditing cancel flows.

---

## The Cancel Flow Decision Tree

```
Customer clicks "Cancel" or "Cancel Subscription"
         │
         ▼
   [Show Exit Survey]
   "What's the main reason you're cancelling?"
         │
    ┌────┴─────────────────────────────────────────┐
    │                                               │
 Price/Value                              Other Reasons
    │                                               │
    ▼                                               ▼
Discount offer                        Match to reason category
(1-3 month, 20-30%)                   (see mapping table)
    │                                               │
    ▼                                               ▼
[Accept?]──Yes──► Charge updated    [Accept?]──Yes──► Apply offer
    │                                    │
    No                                   No
    │                                    │
    ▼                                    ▼
[Confirm Cancel]                    [Confirm Cancel]
    │                                    │
    ▼                                    ▼
[Post-cancel page + email]          [Post-cancel page + email]
```

---

## Stage-by-Stage Templates

### Stage 1: Pre-Cancel Intercept

**When triggered:** User lands on cancel/subscription page, clicks "Cancel plan", or navigates to billing settings.

**What to show:** Brief value reminder (not a wall of guilt) + "Tell us why" framing.

**Copy template:**
```
Headline: Before you go, we want to understand
Body: Your feedback helps us improve. Take 30 seconds to tell us why 
      you're cancelling — and we might have a solution you haven't tried.
CTA: Continue to cancellation →
```

**Rules:**
- Don't block the cancel path
- Don't show this more than once per session
- Mobile: single screen, no scrolling required

---

### Stage 2: Exit Survey

**Design specs:**
- Single question, required
- Radio buttons (not checkboxes)
- 6-8 options maximum
- Optional open text at bottom: "Anything else we should know?"
- Submit advances to Stage 3 — don't show offer yet

**Copy template:**
```
What's the main reason you're cancelling?

○ It's too expensive for what I get
○ I'm not using it enough to justify the cost
○ It's missing a feature I need
○ I'm switching to a different tool
○ My project or need ended
○ It's too complicated or hard to use
○ I was just testing it out
○ Other: [text field]

[Continue →]
```

**Data capture:** Store the reason against the customer record. This is your product feedback goldmine.

---

### Stage 3: Dynamic Save Offer

**Offer-to-reason mapping (full):**

| Selected Reason | Primary Offer | Secondary (if declined) | Skip Offer |
|----------------|--------------|------------------------|------------|
| Too expensive | 30% off for 3 months | Downgrade plan | — |
| Not using it enough | 1-month pause | Usage coaching call | — |
| Missing a feature | Feature roadmap share + workaround | Human support call | If feature genuinely doesn't exist and won't exist soon |
| Switching to competitor | Competitive comparison one-pager | — | If they've clearly made the decision |
| Project ended | 2-month pause | — | — |
| Too complicated | Free onboarding session | 1:1 support call | — |
| Just testing | — | — | Always skip — wrong fit, let them go |
| Other | Human support call | — | — |

**Offer presentation template:**

```
[For price objection:]
Headline: Keep [Product] for less
Body: We'd hate to see you go over price. Here's what we can do:
      Get 30% off your next 3 months — that's [calculated dollar amount] saved.
      After 3 months, your plan returns to [original price].
CTA (accept): Claim my discount →
CTA (decline): No thanks, continue cancelling →

[For not using it enough:]
Headline: No charge for 60 days — pause your account
Body: Life gets busy. Put [Product] on hold for up to 60 days. 
      Your data stays intact, and you can resume any time. No charge during pause.
CTA (accept): Pause my account →
CTA (decline): No thanks, continue cancelling →
```

**Offer rules:**
- One offer per cancel attempt — never show multiple
- If they decline, go straight to Stage 4
- Don't re-show the same offer if they return to cancel within 30 days
- Track which offer was shown and whether it was accepted

---

### Stage 4: Cancellation Confirmation

**What to include:**
- Explicit confirmation of what will happen
- Access end date (specific date, not "end of billing period")
- Data retention policy (how long data is kept)
- Support contact in case they change their mind
- Confirmation button with clear copy

**Copy template:**
```
Your subscription will be cancelled.

Here's what happens next:
• Access continues until [specific date]
• Your data is retained for 90 days after cancellation
• After 90 days, your account data is deleted
• You can reactivate any time before [90-day date]

If you change your mind, contact [email] or reactivate at [reactivation URL].

[Confirm Cancellation]    [Go back]
```

---

### Stage 5: Post-Cancel Sequence

**Immediate: Cancellation Confirmation Email**

```
Subject: Your [Product] subscription has been cancelled

Hi [Name],

Your [Product] subscription has been cancelled as requested.

What happens next:
- Access continues until [date]
- Your data is saved for 90 days (until [date])
- To reactivate, visit: [reactivation link]

If this was a mistake or you have questions, reply to this email or visit [support link].

[Product] Team
```

**Day 7: Re-engagement Email**

```
Subject: Your [Product] account is still here

Hi [Name],

It's been a week since you cancelled. Your account and data are still intact 
until [date].

If anything changed, you can reactivate in one click — no re-setup required.

[Reactivate my account →]

No pressure — just wanted to make sure you knew the door's open.

[Product] Team
```

**Day 30: Win-Back Email (send only if triggered by product update or relevant offer)**

```
Subject: [Product] update: [specific feature they mentioned or relevant improvement]

Hi [Name],

Since you left, we shipped [specific update relevant to their cancel reason].
[2-3 sentence description of what changed.]

If [their specific problem] was why you left, it might be worth another look.

[See what's new →]    or    [Reactivate →]

[Product] Team
```

---

## Cancel Flow Audit Scorecard

Rate your existing flow on each dimension (0-10):

| Dimension | 0 pts | 5 pts | 10 pts |
|-----------|-------|-------|--------|
| **Accessibility** | Cancel requires support ticket | Cancel in settings, but buried | Cancel clearly visible in billing settings |
| **Exit survey** | None | Optional, multi-question | Required, single question, maps to offers |
| **Save offers** | None or generic discount | Offers exist but not mapped | Offers matched to exit reasons |
| **Confirmation clarity** | Confusing terms | Mentions access end date | Clear date, data policy, reactivation path |
| **Post-cancel sequence** | Nothing | One generic email | Immediate confirmation + 7-day re-engagement |
| **Dunning** | None | Basic retry only | Retry + email sequence + card updater |
| **Analytics** | No tracking | Basic cancellation count | Reason tracking, save rate, recovery rate |

**Score interpretation:**
- 60-70: Solid foundation. Fix the 0-5 rated dimensions.
- 40-59: Material revenue leaking. Prioritize survey + offer mapping.
- <40: Major opportunity. Build from scratch using this playbook.

---

## Platform Implementation Notes

### Stripe
- Use Customer Portal for cancel flow (customizable via Stripe Dashboard)
- Enable Stripe Billing webhooks: `customer.subscription.deleted`, `invoice.payment_failed`
- Stripe Radar helps filter bot-initiated failures from real card failures
- Account Updater: enabled by default on most plans — verify in Dashboard > Settings

### Chargebee / Recurly
- Both have native cancel flow builders with reason collection
- Dunning sequences configurable in-product
- Connect to your email provider (Intercom, Customer.io, etc.) via webhook

### Custom / Homegrown Billing
- Build cancel flow as a separate route (not inline in settings)
- Store `cancel_reason`, `save_offer_shown`, `save_offer_accepted` per customer
- Retry logic: implement as a background job with delay queue
