# SMS Platform Reference

Deep-dive on the major SMS marketing platforms — features, pricing, A2P 10DLC support, and integration paths.

> Pricing is approximate and changes regularly. Always confirm at the vendor's site before committing.

---

## Klaviyo SMS

**Best for**: DTC ecom brands already using Klaviyo for email.

### Key features
- Native integration with Klaviyo email and segmentation
- Shared subscriber profile across email + SMS
- Built-in A2P 10DLC registration
- Flow builder shared with email flows
- Conversational SMS (two-way) supported

### Pricing
- Bundled with Klaviyo plans, billed per SMS credit
- US: ~$0.0075–$0.015 per SMS; MMS ~$0.04
- Free tier: 150 SMS credits/month on lower email tiers

### Integration paths
- Direct Shopify, WooCommerce, BigCommerce, Magento integration
- API for custom platforms
- MCP server available

### Compliance
- A2P 10DLC registration handled in-platform
- Toll-free and short code provisioning available (short code adds $1,000+/mo)
- Quiet hours enforced per recipient time zone (configurable)

### Watch out for
- Email + SMS combined billing can spike fast on large lists
- Short code costs are real overhead; only worthwhile for 100K+ active SMS subscribers

---

## Postscript

**Best for**: Shopify-native DTC brands wanting SMS-specific tooling and onboarding support.

### Key features
- Deep Shopify integration (the deepest of any SMS platform)
- Strong abandoned cart and browse abandonment automations
- AI Reply (auto-reply trained on brand voice)
- Conversational SMS / live agent
- Audiences pulled from Shopify customer data

### Pricing
- Tiered plans: Starter (free, 1K msgs/mo), Growth ($100+/mo), Professional, Enterprise
- Pay-per-send adds on top: ~$0.015 per SMS, ~$0.04 per MMS

### Integration paths
- Shopify-first; limited support for non-Shopify
- API + webhooks available

### Compliance
- A2P 10DLC handled in-platform
- Strong opt-in compliance tools (popup builder, keyword opt-in)
- Quiet hours enforced

### Watch out for
- Steep cost increase past Starter tier
- Less useful if you're not on Shopify

---

## Attentive

**Best for**: Mid-market and enterprise DTC brands wanting full-service SMS.

### Key features
- Full-service: dedicated CSM, copy support, strategy
- Conversational SMS at scale
- Concierge sales-via-SMS
- Strong analytics and attribution
- Identity resolution (matching anon site visitors to phone numbers)

### Pricing
- Custom contracts; typically $1K–$10K+/mo + per-send fees
- Annual contracts standard
- Pricing rarely makes sense for <50K SMS subscribers

### Integration paths
- Shopify, BigCommerce, Salesforce Commerce Cloud, custom
- Robust API

### Compliance
- Full A2P 10DLC managed
- Best-in-class compliance tooling and audit support
- Short code provisioning included on most plans

### Watch out for
- Contract terms can lock you in for 12+ months
- Overkill for early-stage brands

---

## Twilio

**Best for**: Custom builds, transactional SMS, B2B SaaS embedding SMS into products, developers.

### Key features
- Raw SMS API
- Pay-per-send pricing, no platform fees
- Massive global coverage (200+ countries)
- Programmable Voice, WhatsApp Business, RCS available alongside
- Studio (visual flow builder) for non-code automation

### Pricing
- US 10DLC SMS: $0.0079 per message
- US toll-free SMS: $0.0079 per message
- US short code SMS: $0.0079 per message + $1,000/mo lease
- MMS: ~$0.02
- Carrier surcharges layered on top (~$0.005 per US 10DLC)
- A2P 10DLC registration: ~$15 brand + $10/mo per campaign

### Integration paths
- API-first (REST + SDKs in Node, Python, Ruby, Go, etc.)
- No native ecom integrations — you build them

### Compliance
- A2P 10DLC registration in-platform but you do the work
- TwilioSendGrid (separate product) handles email-side compliance
- Quiet hours and STOP/HELP handling must be implemented by you

### Watch out for
- You're responsible for compliance — no hand-holding
- No native segmentation, deliverability dashboards, or marketing UI
- Best paired with Customer.io, Segment, or a custom orchestration layer

---

## Brevo (formerly Sendinblue)

**Best for**: EU-based brands, email + SMS combo, SMB-friendly.

### Key features
- Combined email + SMS + WhatsApp on one platform
- EU-headquartered, GDPR-native
- Generous free tier for email; SMS pay-per-send
- Marketing automation flows
- CRM included

### Pricing
- Free tier: 300 emails/day; SMS pay-per-send
- US SMS: ~$0.015 per message
- EU SMS: varies by country, ~€0.04–€0.07

### Integration paths
- Direct integrations: Shopify, WooCommerce, WordPress, Magento
- API + Zapier
- MCP server available

### Compliance
- GDPR + ePrivacy built-in
- A2P 10DLC for US (less polished than dedicated US platforms)

### Watch out for
- US SMS features lag behind Klaviyo/Postscript
- Best if you're EU-first or already on Brevo for email

---

## SimpleTexting

**Best for**: SMB, services businesses, simple campaign blasts, low-volume.

### Key features
- Easy-to-use UI
- Keyword opt-in for grassroots list building
- Built-in landing pages for opt-in
- Simple automation

### Pricing
- Plans start ~$30/mo for 500 credits, scaling up
- US SMS only

### Integration paths
- Zapier, Make, native to a few apps
- API available but basic

### Compliance
- A2P 10DLC handled
- TCPA tooling

### Watch out for
- Limited automation depth vs Klaviyo/Postscript
- Best for low-complexity, low-volume use cases (gyms, salons, real estate)

---

## Plivo

**Best for**: Custom SMS builds where per-send cost matters; Twilio-style API at a lower price point.

### Key features
- Direct Twilio competitor with similar surface area
- Powerpack for bulk sending with sticky sender across number pools
- A2P 10DLC handled in-platform
- WhatsApp, voice available alongside SMS
- SDKs for major languages

### Pricing
- US 10DLC SMS: ~$0.0055/msg (typically 20–30% under Twilio)
- US short code SMS: similar + monthly lease
- MMS: ~$0.02
- Phone number rental: ~$0.80/mo local, ~$1/mo toll-free

### Integration paths
- API-first (REST + SDKs)
- No native ecom integrations — you build them

### Compliance
- A2P 10DLC managed in-platform
- Compliance plumbing (STOP/HELP, quiet hours) is your responsibility — same model as Twilio

### Watch out for
- Smaller ecosystem than Twilio (fewer ancillary products, integrations, community resources)
- WhatsApp tooling less mature

---

## AudienceTap

**Best for**: DTC brands wanting AI-forward creative tooling or on-pack QR opt-in as a primary acquisition channel.

> Newer platform — verify current capabilities, pricing, and API surface before committing.

### Key features
- SMS + email on one platform (similar combined model to Klaviyo)
- AI creative generation (SMS copy, subject lines, image variants)
- On-pack QR code opt-in: insert cards in shipped orders that drive SMS list growth
- Shopify, BigCommerce, headless commerce integrations
- A2P 10DLC managed in-platform
- Identity resolution and segmentation

### Pricing
- Tiered by subscriber count + send volume
- Per-send pricing comparable to other DTC SMS platforms

### Integration paths
- API access on Growth+ tiers
- Direct ecom integrations
- Webhooks for events

### Compliance
- A2P 10DLC handled in-platform
- TCPA tooling — verify enterprise-scale depth before committing for large lists

### Watch out for
- Newer entrant — fewer reference customers, less battle-tested at high volume than incumbents
- Some features rolled out recently — confirm what's GA vs beta before relying on them

---

## Customer.io

**Best for**: B2B SaaS, behavior-based automation, multi-channel orchestration (email + SMS + push).

### Key features
- Trigger SMS off product events (signup, milestone, churn risk)
- Powerful audience segmentation
- Workflow builder
- Real-time data sync via API/webhooks

### Pricing
- Plans start ~$150/mo, scaling with profile count
- SMS via Twilio integration or native (varies)

### Integration paths
- API-first
- Direct integrations with Segment, Heap, Mixpanel, etc.

### Compliance
- A2P 10DLC via Twilio if using native integration
- Granular subscription/consent management

### Watch out for
- Less ecom-tailored than Klaviyo/Postscript
- Best for product-led SaaS or apps with deep event tracking

---

## Quick selection table

| Stack / Goal | Recommended | Why |
|--------------|------------|-----|
| Shopify ecom, already on Klaviyo | **Klaviyo SMS** | One platform, one subscriber profile |
| Shopify ecom, SMS-first focus | **Postscript** | Deepest Shopify + SMS-specific features |
| Mid-market ecom, want concierge support | **Attentive** | Full-service team + tooling |
| Custom platform, B2B SaaS, transactional | **Twilio** | API-first, full control |
| Custom build, cost-sensitive | **Plivo** | ~20–30% cheaper than Twilio per send |
| DTC wanting AI creative or on-pack QR opt-in | **AudienceTap** | AI-forward; insert-card opt-in is unique |
| EU-based SMB | **Brevo** | GDPR-native, EU-friendly pricing |
| Local services SMB, simple campaigns | **SimpleTexting** | Easy UI, low overhead |
| Product-led SaaS with event tracking | **Customer.io** | Behavior-based triggers |

---

## A2P 10DLC: what your platform should handle

Whatever you pick, confirm your platform handles:

- [ ] Brand and campaign registration with TCR
- [ ] Sample message text aligned with what you actually send
- [ ] Opt-in flow documentation submitted to carriers
- [ ] Trust score visibility (and a path to improve it)
- [ ] Throughput appropriate to your list size and send frequency
- [ ] STOP/HELP keyword handling
- [ ] Quiet hours by recipient time zone
- [ ] Suppression list management
- [ ] Consent record retention with timestamps

All major platforms above handle these. Twilio does the lowest-level work and pushes more responsibility onto you.
