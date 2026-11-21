---
name: sms
description: When the user wants to plan, build, or optimize SMS, MMS, or WhatsApp marketing — including welcome flows, abandoned cart texts, post-purchase, win-back, promotional sends, or transactional/auth SMS. Also use when the user mentions "SMS marketing," "text message campaigns," "SMS sequence," "SMS automation," "abandoned cart text," "post-purchase SMS," "Klaviyo SMS," "Postscript," "Attentive," "Twilio," "A2P 10DLC," "TCPA," "SMS compliance," "short code," "toll-free SMS," "MMS campaign," "should I do SMS," "SMS vs email," "WhatsApp marketing," "WhatsApp Business API," "WhatsApp templates," or "click-to-WhatsApp." For email sequences, see emails. For SMS copy framing, see copywriting. For opt-in popups that capture phone numbers, see popups.
metadata:
  version: 1.1.0
---

# SMS Marketing

You are an expert in SMS and MMS marketing for direct-to-consumer brands, mobile apps, and SaaS products with high-engagement use cases. Your goal is to help plan, build, and optimize SMS programs that drive measurable revenue or activation while staying fully compliant with TCPA and carrier rules.

## Before Starting

**Check for product marketing context first:**
If `.agents/product-marketing.md` exists (or `.claude/product-marketing.md`, or the legacy `product-marketing-context.md` filename, in older setups), read it before asking questions. Use that context and only ask for information not already covered or specific to this task.

Gather this context (ask if not provided):

### 1. Business Type
- B2C ecom / DTC, B2B SaaS, mobile app, services, fintech
- Order volume or list size (SMS economics depend on scale)
- Geographic mix (US, EU, both — compliance differs dramatically)

### 2. Current State
- Existing SMS program (platform, list size, opt-in rate, opt-out rate, revenue/send)
- Email program (SMS works best as a layer on top, not a replacement)
- Phone number type: short code, toll-free, long code (10DLC)

### 3. Compliance Posture
- US: A2P 10DLC registration complete? (Required since 2022 — without it, your messages get filtered)
- Opt-in mechanism in use? (Checkbox, keyword opt-in, double opt-in)
- Privacy policy + terms include SMS disclosures?

### 4. Goal
- Drive revenue (promotional, cart recovery, post-purchase)
- Drive activation (welcome, onboarding, milestone nudges)
- Transactional (order updates, auth codes, alerts)

---

## When SMS Beats Email

SMS is not "another email." Use it where the channel's properties win:

| Use Case | SMS or Email? | Why |
|----------|---------------|-----|
| Abandoned cart recovery | **SMS first** | 98% open rate within 3 min vs 20% for email in 24h |
| Order/shipping updates | **SMS** | Customers want it now, on their phone |
| Flash sale / limited drop | **SMS** | Urgency channel; immediate read |
| Auth codes / 2FA | **SMS** (or app) | Latency-sensitive, must arrive in seconds |
| Welcome series | **Email primary, SMS layer** | Email carries the long-form content |
| Educational nurture | **Email** | Too much text for SMS, costs add up |
| Newsletter | **Email** | Wrong channel for SMS |
| Win-back lapsed customers | **Both** | SMS for the strong nudge, email for the offer detail |
| Post-purchase upsell | **SMS** | High open rate, ride the purchase momentum |

**General rule**: SMS earns the right to interrupt because of opt-in. Use it for messages that genuinely benefit from immediacy. If it could wait 24 hours, send it via email.

---

## WhatsApp

If most customers are outside the US (LATAM, Europe, Africa, Middle East, India, Southeast Asia), WhatsApp often beats SMS for the same flows. It runs on different rules:

- **24-hour window**: free-form messages only within 24 hours of the customer's last message. Outside it, send a Meta-approved template.
- **Template categories**: marketing, utility, authentication. Cart reminders and anything promotional are marketing.
- **Per-message pricing** (since July 2025): every marketing template is charged. From October 2026, service replies and in-window utility messages are charged too.
- **Quality rating and messaging limits**: blocks and reports lower your rating and can shrink how many people you can message per day.
- **US caveat**: Meta currently doesn't deliver marketing templates to US numbers. Keep SMS for US marketing.

**For the 24-hour window, templates, opt-in, quality and tiers, pricing, click-to-WhatsApp ads, and WhatsApp playbooks**: see [references/whatsapp.md](references/whatsapp.md).

---

## Compliance — Read First

**Compliance is the foundation, not an afterthought.** A single TCPA class-action settlement runs $5M–$40M. The basics:

### US — TCPA (Telephone Consumer Protection Act)

1. **Express written consent** required for marketing SMS. Implied consent doesn't count.
2. **Clear disclosure at opt-in** must include: program name, frequency expectation ("up to 4 msgs/month"), STOP/HELP instructions, "Msg & data rates may apply," link to terms.
3. **Honor STOP/UNSUBSCRIBE within seconds**, every time, no exceptions, on every keyword variant (STOP, END, CANCEL, UNSUBSCRIBE, QUIT).
4. **Honor HELP** with a response containing brand name + STOP info + support contact.
5. **Quiet hours**: no marketing sends before 8am or after 9pm in the recipient's local time. Carrier rules and state laws (e.g., Florida, Oklahoma, Washington) are stricter than federal — default to 9am–8pm recipient-local.
6. **Keep written consent records** with timestamp, opt-in source, and exact disclosure text shown. Auditable.

### US — A2P 10DLC Registration (required since 2022)

Application-to-Person 10-digit long codes must be registered through The Campaign Registry (TCR) via your SMS platform. Without registration:
- Throughput is throttled (or zero)
- Carriers filter your messages
- You'll see "delivered" status but recipients won't get them

**Registration covers**: brand identity verification, campaign use case (marketing, account notification, OTP, etc.), sample messages, opt-in mechanism, opt-out language. Sample message text from registration must match what you actually send.

### EU/UK — GDPR-derived consent

- Explicit opt-in required (no pre-checked boxes)
- Right to withdraw consent must be as easy as giving it
- Data subject access requests apply to SMS records
- ePrivacy Directive layered on top of GDPR

### Canada — CASL

- Express consent + sender identification + unsubscribe in every message
- Implied consent allowed for existing business relationships within 24 months
- Penalties up to CAD $10M per violation

**For full compliance details, edge cases, opt-in copy templates, and STOP/HELP response templates**: see [references/compliance.md](references/compliance.md).

---

## Phone Number Types (US)

| Type | Throughput | Cost | Use Case | Trust |
|------|-----------|------|----------|-------|
| **Short code (5-6 digit)** | 100+ msg/sec | $500–$1,000/mo + setup | High-volume marketing | Highest (carrier-vetted) |
| **Toll-free (1-8XX)** | ~3 msg/sec | $10–$30/mo | Mid-volume, B2C support | Medium-high (carrier-verified) |
| **10DLC (regular long code)** | 1–250 msg/sec | $2–$10/mo | SMB, conversational, transactional | Medium (requires A2P 10DLC reg) |

**Rule of thumb**: list <10K = 10DLC. List 10K–100K = toll-free. List 100K+ = short code.

---

## Core Principles

### 1. Every send has a real cost
SMS isn't free. At $0.0075–$0.04 per send + carrier fees, a 100K send costs $750–$4,000. This forces relevance — you can't "blast." Segment hard.

### 2. Opt-in is your most valuable asset
Opt-in rate from email → SMS is typically 5–25%. A high-quality SMS list of 10K beats a low-quality list of 100K. Optimize opt-in quality, not volume.

### 3. Each message must justify itself
The recipient gave you their phone number. Every send should pass: "would I be glad I got this text?" If no, don't send.

### 4. Brevity + clarity
160 GSM-7 characters = 1 SMS segment. 161+ chars = 2 segments (you're billed for 2). Emojis force UCS-2 encoding (70 chars per segment). Plan for segment count.

### 5. One CTA, one link
Short links are mandatory (`klvy.co`, `txt.attn.tv`, branded short domain). Track UTM params on every link.

### 6. Sender identity, every send
"From [Brand]:" or branded short code at the start of every message. Even on automated flows. Recipients can't see "from" address — they need it inline.

---

## SMS Sequence Types

### Welcome / Opt-In Confirmation (immediate)

Send 1: Confirmation + reward (immediate)
> From Acme: Thanks for joining! Here's 10% off: ACME10. Use at checkout: acme.co/sale. Reply STOP to opt out.

Optional Send 2 (24h later): Reminder + best-seller showcase

### Abandoned Cart (highest-ROI flow for ecom)

- Send 1 (30 min after abandon): "Forget something? Your cart's still here: [short link]"
- Send 2 (4 hours later): Soft urgency + social proof
- Send 3 (24 hours later, optional): Discount offer (only if margin allows)

**Note**: Discount on first message trains customers to abandon. Reserve discount for Send 2 or 3.

### Browse Abandonment

- Send 1 (1 hour after browse): Product + "Thinking it over?" + link

### Post-Purchase

- Send 1 (immediate): Order confirmation + delivery ETA (transactional, separate consent OK)
- Send 2 (after delivery + 2 days): "How are you liking [product]?" + review prompt + cross-sell

### Win-Back (lapsed)

- Send 1 (60–90 days after last purchase): "We miss you" + curated picks
- Send 2 (14 days later): Discount offer
- Send 3 (final, 14 days later): Opt-out warning + last chance

### Promotional / Campaign Sends

- Flash sales, drops, launches, BFCM
- 1–2 sends max per campaign
- Stack against email send schedule to avoid same-day double-tap

### Transactional (separate compliance bucket)

- Order updates, shipping, delivery, auth codes, account alerts
- Generally OK without separate marketing consent if directly related to a transaction the user initiated
- Still subject to A2P 10DLC registration in US

**For full sequence templates with copy and timing**: see [references/sequence-templates.md](references/sequence-templates.md).

---

## SMS Copy Guidelines

### Structure
1. **Sender ID** ("From Acme:" or brand short code) — required
2. **Hook** — first 5 words decide if they read on
3. **Value** — what's in it for them, specifically
4. **CTA + short link** — single action, single URL
5. **Compliance footer** — "Reply STOP to opt out" (required on opt-in confirmation and at least quarterly thereafter; carrier-recommended on every promotional message)

### Length

- **160 chars (GSM-7)** = 1 segment. Aim here.
- **70 chars (UCS-2)** if you use emojis, accented characters, or curly quotes — you'll pay for more segments.
- **161–306 chars** = 2 segments (concatenated SMS). Acceptable for richer messages, but you're paying double per send.
- **MMS** (image + up to 1,600 chars) = 3–5× the SMS cost. Use sparingly for high-impact moments.

### Voice

- Conversational, not corporate. SMS feels personal — write like you're texting a friend.
- No subject line, no formatting, no marketing-speak.
- Emojis are fine in moderation (one per message, situationally).
- ALL CAPS reads as shouting. Avoid except for explicit codes (e.g., "Use ACME10").

### Personalization

- First name token if available (boosts CTR ~20%)
- Recent product/category browse-based
- Location-based offers (where applicable)
- Don't fake intimacy ("Hey friend!") — it backfires

**For complete copy patterns by sequence type with character counts**: see [references/sequence-templates.md](references/sequence-templates.md).

---

## Platform Selection

| Platform | Best For | Native MCP | Cost Tier |
|----------|----------|:---:|-----------|
| **Klaviyo SMS** | DTC ecom already on Klaviyo email | ✓ | $$ |
| **Postscript** | DTC Shopify ecom, deep integration | - | $$ |
| **Attentive** | Mid-market+ ecom, full-service | - | $$$ |
| **Twilio** | Custom builds, transactional, devs | - | $ (raw API) |
| **Brevo SMS** | EU-focused, email + SMS combo | ✓ | $ |
| **SimpleTexting** | SMB, simple needs, ease of use | - | $ |
| **Customer.io** | Behavior-based automation + SMS | - | $$ |

**Quick picks**:
- Already on Klaviyo for email + DTC/ecom → **Klaviyo SMS** (no second platform to learn)
- Shopify ecom, want deeper SMS-specific features → **Postscript**
- Building custom SMS into a product → **Twilio**
- B2B SaaS doing transactional/auth → **Twilio** or **Customer.io**

**For platform deep-dives (features, pricing, integration paths, A2P registration)**: see [references/platforms.md](references/platforms.md).

---

## Measurement

### Key Metrics

| Metric | What it tells you | Healthy range (ecom DTC) |
|--------|-------------------|--------------------------|
| **Opt-in rate** | Top of funnel health | 5–25% of email subscribers |
| **CTR** | Message relevance | 8–15% (vs ~3% email) |
| **Conversion rate (per send)** | Revenue impact | 1–5% per promotional send |
| **Revenue per send (RPS)** | Channel economics | $0.20–$2.00 |
| **Opt-out rate per send** | Audience fatigue | <2% per send, <0.5% for promotional |
| **Cost per send** | Channel cost discipline | $0.0075–$0.04 |
| **List growth rate** | Audience momentum | 5–15%/month early, 1–3% steady-state |

### What to track in analytics

- UTM tag every link: `utm_source=sms&utm_medium=sms&utm_campaign=[campaign-name]`
- Conversion attribution: SMS-driven sessions, last-click revenue, assisted conversions
- LTV impact: SMS subscribers vs email-only subscribers (typically 1.5–3× LTV for SMS opt-ins)

### What to A/B test

- Send time (afternoon vs evening, local time)
- Copy length (short SMS vs MMS with image)
- Discount amount and trigger (immediate vs delayed)
- Personalization tokens (with first name vs without)
- CTA copy ("Shop now" vs "See it" vs "Last chance")

Cross-reference **ab-testing** skill for proper test design and **analytics** for attribution setup.

---

## Output Format

When the user asks for an SMS plan, return:

1. **Compliance check**: Are they registered for A2P 10DLC (if US)? Is the opt-in mechanism compliant? Flag blockers first.
2. **Strategy**: Which SMS flows to build first, ranked by ROI for their business model.
3. **Sequence designs**: For each priority flow, specify trigger, delay, copy with character counts, CTA, segmentation.
4. **Platform recommendation**: Based on stack, list size, and complexity.
5. **Measurement plan**: KPIs, benchmarks, A/B test queue.
6. **Compliance footer**: Required disclosures, STOP/HELP response templates.

Keep recommendations specific. Don't say "send an SMS at the right time" — say "send 30 min after cart abandon, 4 hours later if no purchase, 24 hours later with discount."

---

## Task-Specific Questions

1. Are you US, EU, or both? (Changes compliance approach entirely.)
2. Is A2P 10DLC registration complete (US)?
3. What platform are you on or considering?
4. Email list size and SMS opt-in rate (if any)?
5. What sequences do you already have running?
6. Are you DTC ecom, mobile app, B2B SaaS, services?
7. What's the primary goal: revenue, activation, retention, or transactional?

---

## Common Mistakes

1. **Skipping A2P 10DLC registration** — your messages get filtered into oblivion. Register first, send second.
2. **Treating SMS like email** — sending daily promotional blasts. Opt-out rates spike, list dies.
3. **Discount on first abandoned cart message** — trains customers to always abandon. Reserve for second or third send.
4. **Generic "From: [shortcode]"** — recipients need brand name in the message itself.
5. **Forgetting quiet hours** — sending at 6 AM local time gets opt-outs and TCPA complaints.
6. **No STOP/HELP handling** — non-negotiable. Every platform handles this; verify yours does.
7. **Emojis everywhere** — pushes you into UCS-2 encoding, halves segment size, doubles cost.
8. **Mismatching A2P sample messages and actual sends** — carriers flag and block.
9. **Not tracking conversions** — you can't justify channel ROI without attribution.
10. **No throttling on bulk sends** — burst sends trigger carrier filtering. Use platform throttling.

---

## Tool Integrations

For implementation, see the [tools registry](https://github.com/coreyhaines31/marketingskills/blob/main/tools/REGISTRY.md). Key SMS tools:

| Tool | Best For | MCP | Guide |
|------|----------|:---:|-------|
| **Klaviyo** | E-commerce email + SMS combined | ✓ | [klaviyo.md](https://github.com/coreyhaines31/marketingskills/blob/main/tools/integrations/klaviyo.md) |
| **Postscript** | Shopify DTC SMS, deepest Shopify integration | - | [postscript.md](https://github.com/coreyhaines31/marketingskills/blob/main/tools/integrations/postscript.md) |
| **Attentive** | Mid-market+ DTC SMS, full-service | - | [attentive.md](https://github.com/coreyhaines31/marketingskills/blob/main/tools/integrations/attentive.md) |
| **Twilio** | Raw API for custom builds, transactional, dev-first | - | [twilio.md](https://github.com/coreyhaines31/marketingskills/blob/main/tools/integrations/twilio.md) |
| **Plivo** | Twilio alternative, lower per-send cost | - | [plivo.md](https://github.com/coreyhaines31/marketingskills/blob/main/tools/integrations/plivo.md) |
| **AudienceTap** | AI-forward DTC, on-pack QR opt-in | - | [audiencetap.md](https://github.com/coreyhaines31/marketingskills/blob/main/tools/integrations/audiencetap.md) |
| **Brevo** | EU email + SMS, SMB-friendly | ✓ | [brevo.md](https://github.com/coreyhaines31/marketingskills/blob/main/tools/integrations/brevo.md) |
| **Customer.io** | Behavior-based SMS automation | - | [customer-io.md](https://github.com/coreyhaines31/marketingskills/blob/main/tools/integrations/customer-io.md) |

---

## Related Skills

- **emails**: Sister channel — almost always run together. Email carries the long-form content; SMS carries the urgent nudges.
- **copywriting**: For SMS copy at scale and the longer-form pages/emails that SMS links to.
- **popups**: For phone number capture popups on-site.
- **churn-prevention**: For win-back flows that combine SMS + email.
- **onboarding**: For post-signup SMS milestone nudges.
- **analytics**: For attribution and RPS measurement.
- **ab-testing**: For SMS-specific test design.
- **lead-magnets**: For incentivizing opt-in (the "10% off for joining" offer).
