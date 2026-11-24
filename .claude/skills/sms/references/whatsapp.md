# WhatsApp Business Platform Reference

Adapted from a contribution by @Inflimity (PR #516).

> Platform facts below are **as of 2026-10** and sourced from Meta's developer docs (links in [Sources](#sources)). Meta changes pricing and limits often. Check the pricing page before quoting costs to a client.

---

## When WhatsApp Fits vs SMS

WhatsApp is the default messaging app in most of Latin America, Europe, Africa, the Middle East, and South and Southeast Asia. In the US and Canada, SMS still reaches more people.

| Situation | Better fit | Why |
|-----------|-----------|-----|
| Customers mostly in LATAM, EMEA, India, SEA | **WhatsApp** | It's where conversations already happen |
| Customers mostly in the US | **SMS** | Meta does not currently deliver marketing templates to US (+1) numbers |
| Rich product messages (images, buttons, lists) | **WhatsApp** | Native interactive formats, no MMS surcharge |
| Two-way sales or support conversations | **WhatsApp** | Threaded chat, reply buttons, human handoff |
| Paid social is a major acquisition channel | **WhatsApp** | Click-to-WhatsApp ads open a free window |
| Simple one-way alerts, auth codes, US-heavy list | **SMS** | Simpler setup, universal reach |
| Multi-country program | **Both** | WhatsApp where adoption is high, SMS as fallback |

**Ask first**: where are the customers? If more than half are in the US, WhatsApp marketing is a support or transactional layer at best until Meta lifts the US marketing restriction.

---

## App vs Platform

- **WhatsApp Business app**: free, manual, one phone or a few linked devices. Fine for a solo operator answering chats. Not built for automation or large broadcasts.
- **WhatsApp Business Platform (Cloud API)**: programmatic sending, templates, webhooks, automation. You access it directly through Meta or through a Business Solution Provider (BSP).

BSPs include messaging APIs (Twilio, Infobip, Sinch, MessageBird/Bird), WhatsApp-focused tools (Wati, Interakt, AiSensy), chat automation tools (ManyChat, respond.io), and lifecycle platforms that added WhatsApp (Klaviyo, Brevo, Customer.io). Pick based on your existing stack, the markets you send to, and whether you need a no-code flow builder. All of them pass through Meta's per-message fees; most add a markup or platform fee on top.

---

## The 24-Hour Customer Service Window

- **Window opens** when the customer messages you. It lasts 24 hours from their latest message. Each new customer message resets it.
- **Inside the window**: you can send free-form messages (text, media, interactive buttons and lists) without pre-approval.
- **Outside the window**: you can only send a **pre-approved template**. Free-form sends fail (error 131047, "Re-engagement message").

Design flows around this. A cart recovery message 1 hour after abandonment is almost always outside a window, so it must be an approved template.

---

## Template Categories

Every template is one of three categories. Meta checks the category you pick.

| Category | What qualifies | Examples |
|----------|---------------|----------|
| **Marketing** | Anything promotional, awareness, or retargeting | Offers, launches, back-in-stock, **abandoned cart reminders**, re-engagement |
| **Utility** | Non-promotional AND specific to the user's request or account (or critical to them) | Order confirmation, shipping update, appointment reminder, billing notice |
| **Authentication** | One-time passcodes only, using Meta's pre-built formats | Login codes, verification codes |

Rules that trip people up:

- **Cart reminders are marketing**, even when the user asked to be reminded. Meta's guidelines list "You left {{items}} in your cart" as a retargeting example.
- **Mixed content becomes marketing.** An order update with a promo code, or a feedback survey with a discount, is a marketing template.
- **Auto-recategorization.** Since April 9, 2025, a template submitted as utility that Meta judges to be marketing is approved as marketing. Meta also re-reviews approved templates and recategorizes them (usually with 1 day's notice, none for repeat misuse).
- **Appeals**: you have 60 days from creation or a category change to request review.
- **Authentication templates** can't contain URLs, media, or emojis.

**Template anatomy**: optional header (text, image, video, document), body with variables like `{{1}}`, optional footer (often the opt-out line), and optional buttons (quick reply, URL, phone, copy-code). Submit realistic sample values for every variable. Vague samples are a common rejection cause.

---

## Opt-In and Opt-Out

Meta requires opt-in before you message someone. The opt-in should clearly tell the person they'll get messages from **your business**, and it must comply with local law (GDPR, LGPD, India's DPDP Act, TCPA, and so on). Meta allows a general business opt-in, but naming WhatsApp explicitly is the safer practice and what many laws effectively expect, so do it unless you have a reason not to.

You can collect it through a website form, checkout checkbox, SMS, IVR, in person, or inside a WhatsApp chat. Meta recommends separate opt-ins (or one opt-in that names the categories) for order updates vs offers.

Sample checkout opt-in (unchecked by default):

> [ ] Send me order updates and offers from Acme on WhatsApp. You can opt out anytime.

**Opt-out handling:**

- Add a quick reply button like `Stop promotions` to every marketing template, or a footer like "Reply STOP to opt out"
- When someone opts out, flag them in your CRM immediately and stop all marketing templates
- Send one confirmation: "You're unsubscribed from Acme offers. Reply START to rejoin."
- Keep sending utility messages they still need (order updates) if they opted in to those separately

An easy opt-out protects you. If the only way to stop your messages is the Block button, people will block, and blocks drive your quality rating down.

---

## Quality Rating and Messaging Limits

### Quality rating

Each phone number has a quality rating based on how recipients responded to your messages over the **past 7 days**: blocks, reports, and the reasons given ("Didn't sign up," "Spam," "No longer needed").

| Rating | Meaning |
|--------|---------|
| **Green (High)** | Healthy, eligible to scale |
| **Yellow (Medium)** | Warning, negative feedback rising |
| **Red (Low)** | Number goes to **Flagged** status |

If a Flagged number recovers to medium or high within 7 days, nothing changes. If it doesn't, your **messaging limit drops one level**.

Templates have their own quality ratings too. New or low-quality marketing and utility templates get **paced** (Meta holds part of a send to collect feedback first). Bad feedback **pauses** the template, and held messages fail.

### Messaging limits

The messaging limit is how many **unique users** you can reach with template messages **outside** a service window in a rolling 24 hours. The limit is now shared across your whole **business portfolio**, not set per phone number, so one busy number can use up the allowance for all of them.

| Tier | Unique users per 24h |
|------|---------------------|
| Starting default | 250 |
| After verification or scaling | 2,000 |
| Next levels | 10,000 → 100,000 → Unlimited |

- **250 to 2,000**: complete business verification, or deliver 2,000 high-quality template messages to unique users within 30 days
- **Above 2,000**: automatic when you've used at least half your current limit in the last 7 days with high-quality messages across all numbers and templates. Upgrades land within about 6 hours.
- Replies inside a service window don't count toward the limit

### Per-user marketing limits

Meta also caps how many marketing templates **one person** receives from all businesses, based on their recent read rate. Blocked sends return error 131049. Wait at least 24 hours before retrying. A marketing message sent inside an open service window doesn't count toward this cap.

### Warming up a new number

1. Get business verification done first. It makes the account eligible to scale toward 2,000, but Meta still approves or denies the increase after a quality review, so check the actual limit before scheduling sends
2. Send your first templates to recent, high-intent opt-ins (buyers from the last 30 days, people who messaged you)
3. Scale volume over 1-2 weeks as the number stays green
4. Spread big sends over hours instead of firing everything at once
5. Watch block reasons in WhatsApp Manager after every campaign

---

## Message Formats

| Format | Limits | Best for |
|--------|--------|----------|
| **Reply buttons** | Up to 3 buttons, 20 chars each | Yes/no, pick a path, opt-out |
| **List message** | Up to 10 rows across up to 10 sections, row titles 24 chars | Product categories, booking slots, qualification |
| **URL / call buttons** (templates) | Opens a link or starts a call | Checkout, tracking, support line |
| **Media header** | Image, video, or document | Product shots, drops, receipts |
| **Catalog / product messages** | Pulls from a Meta commerce catalog | Browsing and buying in chat |

Copy guidelines:

- Keep each bubble to 1-3 short sentences (roughly under 60 words)
- Use buttons instead of pasting raw URLs
- WhatsApp formatting works: `*bold*`, `_italic_`, line breaks
- One or two emojis are fine. Unlike SMS, they don't change cost
- Name your brand in the first line of templates, since many users won't have your number saved

---

## Pricing (as of 2026-10)

Meta moved from conversation-based pricing to **per-message pricing on July 1, 2025**. You pay per delivered message, at a rate set by message category and the recipient's country code.

| Message type | How it's charged |
|--------------|-----------------|
| **Marketing template** | Charged on every delivery, inside or outside a service window |
| **Utility template** | Charged outside a window. Inside an open window it was free from July 1, 2025 until **October 1, 2026**, when Meta began charging for it |
| **Authentication template** | Charged per delivery; check the current rate card for in-window treatment in your market |
| **Service message** (free-form reply) | Free from November 1, 2024. From **October 1, 2026**, each business phone number gets **1,000 free service messages a month** (no rollover); after that, they're charged per message at the same rate as utility/authentication in that market, with no volume tiers |
| **Meta Business Agent** (Meta's AI agent) | Charged per token from August 1, 2026, about $2 per 1M tokens. Never free |
| **Anything in a free entry point window** | Free (see below) |

**Volume tiers**: utility and authentication rates drop as monthly volume grows, measured across your whole portfolio per market. Tiers reset each calendar month. Marketing has no volume tiers, but the Marketing Messages API lets you set a max price per delivery.

**Practical math**: rates differ a lot by country. Marketing is the most expensive category in every market, often several times the utility rate. Pull current rates from Meta's rate cards (or your BSP's, which include their markup) and model cost per recovered order before launching a flow.

The October 2026 changes mean support conversations beyond the first 1,000 a month per number, and in-window order updates, now cost money. If your old business case assumed "replies are free," redo it.

---

## Click-to-WhatsApp Ads

Click-to-WhatsApp (CTWA) ads run on Facebook and Instagram and open a WhatsApp chat with your business when tapped.

**Free entry point window**: when someone messages you from a CTWA ad or a Facebook Page call-to-action button and you reply within 24 hours, a free entry point window opens from the time you respond. Meta says it may stay open for up to 7 days (as of 2026-10). While it's open, Meta doesn't charge for marketing, utility, authentication, or service messages; Meta Business Agent messages are still charged. Check the window's actual expiry in your delivery data rather than assuming the maximum.

How to use it:

1. **Hook the ad on a reason to chat**: a quiz, sizing help, a quote, a code to claim
2. **Pre-fill the user's first message**: "Hi! I'd like my 15% welcome code."
3. **Reply fast with buttons**: 2-3 qualifying questions as reply buttons
4. **Convert or hand off while the free window is open**: checkout link, booking link, or a live rep
5. **Ask for marketing opt-in in the chat** so you can follow up with templates later

---

## Playbooks

### 1. Abandoned cart recovery

- **Trigger**: 45-60 minutes after abandonment, only for contacts with WhatsApp marketing opt-in
- **Type**: marketing template (outside the window, and cart reminders are marketing by definition)
- **Exit**: stop on purchase, opt-out, or 48 hours
- **Second touch** (optional, 24 hours): only if the first wasn't read or clicked, and hold any discount until here

```text
Header: [product image]
Body: Hi {{1}}, it's Acme. You left {{2}} in your cart. We're holding it for you, but stock is limited.
Footer: Reply STOP to opt out
Buttons: [URL: Finish checkout] [Quick reply: I have a question]
```

"I have a question" opens a service window. Route it to the support handoff below.

### 2. Welcome (after opt-in or CTWA)

- **Trigger**: immediately after opt-in, or the first inbound message from an ad
- **Type**: free-form if they just messaged you (window open), otherwise a marketing template

```text
Hi {{1}}, welcome to Acme! Here's your code: WELCOME15. What are you shopping for today?
Buttons: [Skincare] [Haircare] [Just browsing]
```

Each button routes to 2-3 product picks with a checkout link. Ask for marketing opt-in here if they came from an ad.

### 3. Re-engagement / win-back

- **Audience**: opted-in customers with no purchase in 60-90 days
- **Type**: marketing template
- **Frequency**: 1-2 marketing sends per month to this segment. More gets you blocks and per-user limit errors

```text
Hi {{1}}, it's Acme. Your {{2}} usually runs out around now. Want us to set aside a refill?
Buttons: [Yes, reorder] [Not now] [Stop promotions]
```

"Not now" suppresses them for 30 days. "Stop promotions" opts them out.

### 4. Support handoff

- **Trigger**: a help button, a keyword like "agent," or the bot failing to match twice
- **Type**: service messages (window open). These are charged from October 1, 2026, so resolve in as few messages as you can

```text
Got it. Connecting you with someone from our team. Typical reply time is under 10 minutes between 9am and 6pm.
```

Pass the cart or order context to the agent so the customer doesn't repeat themselves. Outside staffed hours, say when a person will reply and offer an FAQ list. If the reply goes past 24 hours, you'll need a utility template to answer.

---

## Sources

All accessed 2026-10.

- Pricing: https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing
- Pricing updates for service and utility messages (Oct 2026): https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/non-template-messages
- Messaging limits: https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits
- Phone number quality rating: https://www.facebook.com/business/help/896873687365001
- Template categorization: https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-categorization
- Template pacing: https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-pacing
- Per-user marketing limits (incl. US restriction): https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/marketing-templates/per-user-limits/
- Opt-in: https://developers.facebook.com/documentation/business-messaging/whatsapp/getting-opt-in
- Reply buttons: https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/interactive-reply-buttons-messages
- List messages: https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/interactive-list-messages
- Click-to-WhatsApp ads: https://developers.facebook.com/documentation/ads-commerce/marketing-api/ad-creative/messaging-ads/click-to-whatsapp
