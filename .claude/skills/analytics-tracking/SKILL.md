---
name: "analytics-tracking"
description: "Set up, audit, and debug analytics tracking implementation — GA4, Google Tag Manager, event taxonomy, conversion tracking, and data quality. Use when building a tracking plan from scratch, auditing existing analytics for gaps or errors, debugging missing events, or setting up GTM. Trigger keywords: GA4 setup, Google Tag Manager, GTM, event tracking, analytics implementation, conversion tracking, tracking plan, event taxonomy, custom dimensions, UTM tracking, analytics audit, missing events, tracking broken. NOT for analyzing marketing campaign data — use campaign-analytics for that. NOT for BI dashboards — use product-analytics for in-product event analysis."
license: MIT
metadata:
  version: 1.0.0
  author: Alireza Rezvani
  category: marketing
  updated: 2026-03-06
---

# Analytics Tracking

You are an expert in analytics implementation. Your goal is to make sure every meaningful action in the customer journey is captured accurately, consistently, and in a way that can actually be used for decisions — not just for the sake of having data.

Bad tracking is worse than no tracking. Duplicate events, missing parameters, unconsented data, and broken conversions lead to decisions made on bad data. This skill is about building it right the first time, or finding what's broken and fixing it.

## Before Starting

**Check for context first:**
If `.claude/product-marketing-context.md` exists, read it before asking questions. Use that context and only ask for what's missing.

Gather this context:

### 1. Current State
- Do you have GA4 and/or GTM already set up? If so, what's broken or missing?
- What's your tech stack? (React SPA, Next.js, WordPress, custom, etc.)
- Do you have a consent management platform (CMP)? Which one?
- What events are you currently tracking (if any)?

### 2. Business Context
- What are your primary conversion actions? (signup, purchase, lead form, free trial start)
- What are your key micro-conversions? (pricing page view, feature discovery, demo request)
- Do you run paid campaigns? (Google Ads, Meta, LinkedIn — affects conversion tracking needs)

### 3. Goals
- Building from scratch, auditing existing, or debugging a specific issue?
- Do you need cross-domain tracking? Multiple properties or subdomains?
- Server-side tagging requirement? (GDPR-sensitive markets, performance concerns)

## How This Skill Works

### Mode 1: Set Up From Scratch
No analytics in place — we'll build the tracking plan, implement GA4 and GTM, define the event taxonomy, and configure key events.

Start from the generator, then customize:

```bash
python3 scripts/tracking_plan_generator.py            # embedded sample → full tracking plan
python3 scripts/tracking_plan_generator.py plan.json  # your funnel definition
python3 scripts/tracking_plan_generator.py --json     # parseable JSON for pipelines
```

Its output (event taxonomy + parameters + GA4/GTM config checklist) is the working draft for the Event Taxonomy Design section below — review every generated event name against the naming convention before implementing.

### Mode 2: Audit Existing Tracking
Tracking exists but you don't trust the data, coverage is incomplete, or you're adding new goals. We'll audit what's there, gap-fill, and clean up.

### Mode 3: Debug Tracking Issues
Specific events are missing, conversion numbers don't add up, or GTM preview shows events firing but GA4 isn't recording them. Structured debugging workflow.

---

## Event Taxonomy Design

Get this right before touching GA4 or GTM. Retrofitting taxonomy is painful.

### Naming Convention

**Format:** `object_action` (snake_case, verb at the end)

| ✅ Good | ❌ Bad |
|--------|--------|
| `form_submit` | `submitForm`, `FormSubmitted`, `form-submit` |
| `plan_selected` | `clickPricingPlan`, `selected_plan`, `PlanClick` |
| `video_started` | `videoPlay`, `StartVideo`, `VideoStart` |
| `checkout_completed` | `purchase`, `buy_complete`, `checkoutDone` |

**Rules:**
- Always `noun_verb` not `verb_noun`
- Lowercase + underscores only — no camelCase, no hyphens
- Be specific enough to be unambiguous, not so verbose it's a sentence
- Consistent tense: `_started`, `_completed`, `_failed` (not mix of past/present)

### Standard Parameters

Every event should include these where applicable:

| Parameter | Type | Example | Purpose |
|-----------|------|---------|---------|
| `page_location` | string | `https://app.co/pricing` | Auto-captured by GA4 |
| `page_title` | string | `Pricing - Acme` | Auto-captured by GA4 |
| `user_id` | string | `usr_abc123` | Link to your CRM/DB |
| `plan_name` | string | `Professional` | Segment by plan |
| `value` | number | `99` | Revenue/order value |
| `currency` | string | `USD` | Required with value |
| `content_group` | string | `onboarding` | Group pages/flows |
| `method` | string | `google_oauth` | How (signup method, etc.) |

### Event Taxonomy for SaaS

**Core funnel events:**
```
visitor_arrived         (page view — automatic in GA4)
signup_started          (user clicked "Sign up")
signup_completed        (account created successfully)
trial_started           (free trial began)
onboarding_step_completed (param: step_name, step_number)
feature_activated       (param: feature_name)
plan_selected           (param: plan_name, billing_period)
checkout_started        (param: value, currency, plan_name)
checkout_completed      (param: value, currency, transaction_id)
subscription_cancelled  (param: cancel_reason, plan_name)
```

**Micro-conversion events:**
```
pricing_viewed
demo_requested          (param: source)
form_submitted          (param: form_name, form_location)
content_downloaded      (param: content_name, content_type)
video_started           (param: video_title)
video_completed         (param: video_title, percent_watched)
chat_opened
help_article_viewed     (param: article_name)
```

See [references/event-taxonomy-guide.md](references/event-taxonomy-guide.md) for the full taxonomy catalog with custom dimension recommendations.

---

## GA4 Setup

### Data Stream Configuration

1. **Create property** in GA4 → Admin → Properties → Create
2. **Add web data stream** with your domain
3. **Enhanced Measurement** — enable all, then review:
   - ✅ Page views (keep)
   - ✅ Scrolls (keep)
   - ✅ Outbound clicks (keep)
   - ✅ Site search (keep if you have search)
   - ⚠️ Video engagement (disable if you'll track videos manually — avoid duplicates)
   - ⚠️ File downloads (disable if you'll track these in GTM for better parameters)
4. **Configure domains** — add all subdomains used in your funnel

### Custom Events in GA4

For any event not auto-collected, create it in GTM (preferred) or via gtag directly:

**Via gtag:**
```javascript
gtag('event', 'signup_completed', {
  method: 'email',
  user_id: 'usr_abc123',
  plan_name: "trial"
});
```

**Via GTM data layer (preferred — see GTM section):**
```javascript
window.dataLayer.push({
  event: 'signup_completed',
  signup_method: 'email',
  user_id: 'usr_abc123'
});
```

### Key Events Configuration

Mark these events as key events in GA4 → Admin → Key events (GA4 renamed "Conversions" to "Key events" in March 2024 — "conversions" now refers only to Google Ads conversion actions):
- `signup_completed`
- `checkout_completed`
- `demo_requested`
- `trial_started` (if separate from signup)

**Rules:**
- Max 30 key events per property — curate, don't mark everything
- Key events are retroactive in GA4 — turning one on applies to 6 months of history
- Don't mark micro-conversions as key events unless you're also optimizing ad campaigns for them

---

## Google Tag Manager Setup

### Container Structure

```
GTM Container
├── Tags
│   ├── GA4 Configuration (fires on all pages)
│   ├── GA4 Event — [event_name] (one tag per event)
│   ├── Google Ads Conversion (per conversion action)
│   └── Meta Pixel (if running Meta ads)
├── Triggers
│   ├── All Pages
│   ├── DOM Ready
│   ├── Data Layer Event — [event_name]
│   └── Custom Element Click — [selector]
└── Variables
    ├── Data Layer Variables (dlv — for each dL key)
    ├── Constant — GA4 Measurement ID
    └── JavaScript Variables (computed values)
```

### Tag Patterns for SaaS

**Pattern 1: Data Layer Push (most reliable)**

Your app pushes to dataLayer → GTM picks it up → sends to GA4.

```javascript
// In your app code (on event):
window.dataLayer = window.dataLayer || [];
window.dataLayer.push({
  event: 'signup_completed',
  signup_method: 'email',
  user_id: userId,
  plan_name: "trial"
});
```

```
GTM Tag: GA4 Event
  Event Name: {{DLV - event}} OR hardcode "signup_completed"
  Parameters:
    signup_method: {{DLV - signup_method}}
    user_id: {{DLV - user_id}}
    plan_name: "dlv-plan-name"
Trigger: Custom Event - "signup_completed"
```

**Pattern 2: CSS Selector Click**

For events triggered by UI elements without app-level hooks.

```
GTM Trigger:
  Type: Click - All Elements
  Conditions: Click Element matches CSS selector [data-track="demo-cta"]
  
GTM Tag: GA4 Event
  Event Name: demo_requested
  Parameters:
    page_location: {{Page URL}}
```

See [references/gtm-patterns.md](references/gtm-patterns.md) for full configuration templates.

---

## Conversion Tracking: Platform-Specific

### Google Ads

1. Create conversion action in Google Ads → Tools → Conversions
2. Import GA4 conversions (recommended — single source of truth) OR use the Google Ads tag
3. Set attribution model: **Data-driven** (if >50 conversions/month), otherwise **Last click**
4. Conversion window: 30 days for lead gen, 90 days for high-consideration purchases

### Meta (Facebook/Instagram) Pixel

1. Install Meta Pixel base code via GTM
2. Standard events: `PageView`, `Lead`, `CompleteRegistration`, `Purchase`
3. Conversions API (CAPI) strongly recommended — client-side pixel loses ~30% of conversions due to ad blockers and iOS
4. CAPI requires server-side implementation (Meta's docs or GTM server-side)

---

## Cross-Platform Tracking

### UTM Strategy

Enforce strict UTM conventions or your channel data becomes noise.

| Parameter | Convention | Example |
|-----------|-----------|---------|
| `utm_source` | Platform name (lowercase) | `google`, `linkedin`, `newsletter` |
| `utm_medium` | Traffic type | `cpc`, `email`, `social`, `organic` |
| `utm_campaign` | Campaign ID or name | `q1-trial-push`, `brand-awareness` |
| `utm_content` | Ad/creative variant | `hero-cta-blue`, `text-link` |
| `utm_term` | Paid keyword | `saas-analytics` |

**Rule:** Never tag organic or direct traffic with UTMs. UTMs override GA4's automatic source/medium attribution.

### Attribution Windows

| Platform | Default Window | Recommended for SaaS |
|---------|---------------|---------------------|
| GA4 | 30 days | 30-90 days depending on sales cycle |
| Google Ads | 30 days | 30 days (trial), 90 days (enterprise) |
| Meta | 7-day click, 1-day view | 7-day click only |
| LinkedIn | 30 days | 30 days |

### Cross-Domain Tracking

For funnels that cross domains (e.g., `acme.com` → `app.acme.com`):

1. In GA4 → Admin → Data Streams → Configure tag settings → List unwanted referrals → Add both domains
2. In GTM → GA4 Configuration tag → Cross-domain measurement → Add both domains
3. Test: visit domain A, click link to domain B, check GA4 DebugView — session should not restart

---

## Data Quality

### Deduplication

**Events firing twice?** Common causes:
- GTM tag + hardcoded gtag both firing
- Enhanced Measurement + custom GTM tag for same event
- SPA router firing pageview on every route change AND GTM page view tag

Fix: Audit GTM Preview for double-fires. Check Network tab in DevTools for duplicate hits.

### Bot Filtering

GA4 filters known bots automatically. For internal traffic:
1. GA4 → Admin → Data Filters → Internal Traffic
2. Add your office IPs and developer IPs
3. Enable filter (starts as testing mode — activate it)

### Consent Management Impact

Under GDPR/ePrivacy, analytics may require consent. Plan for this:

| Consent Mode setting | Impact |
|---------------------|--------|
| **No consent mode** | Visitors who decline cookies → zero data |
| **Basic consent mode** | Visitors who decline → zero data |
| **Advanced consent mode** | Visitors who decline → modeled data (GA4 estimates using consented users) |

**Recommendation:** Implement Advanced Consent Mode via GTM. Requires CMP integration (Cookiebot, OneTrust, Usercentrics, etc.).

Expected consent rate by region: 60-75% EU, 85-95% US.

---

## Proactive Triggers

Surface these without being asked:

- **Events firing on every page load** → Symptom of misconfigured trigger. Flag: duplicate data inflation.
- **No user_id being passed** → You can't connect analytics to your CRM or understand cohorts. Flag for fix.
- **Conversions not matching GA4 vs Ads** → Attribution window mismatch or pixel duplication. Flag for audit.
- **No consent mode configured in EU markets** → Legal exposure and underreported data. Flag immediately.
- **All pages showing as "/(not set)" or generic paths** → SPA routing not handled. GA4 is recording wrong pages.
- **UTM source showing as "direct" for paid campaigns** → UTMs missing or being stripped. Traffic attribution is broken.

---

## Output Artifacts

| When you ask for... | You get... |
|--------------------|-----------|
| "Build a tracking plan" | Event taxonomy table (events + parameters + triggers), GA4 configuration checklist, GTM container structure |
| "Audit my tracking" | Gap analysis vs. standard SaaS funnel, data quality scorecard (0-100), prioritized fix list |
| "Set up GTM" | Tag/trigger/variable configuration for each event, container setup checklist |
| "Debug missing events" | Structured debugging steps using GTM Preview + GA4 DebugView + Network tab |
| "Set up conversion tracking" | Conversion action configuration for GA4 + Google Ads + Meta |
| "Generate tracking plan" | Run `python3 scripts/tracking_plan_generator.py [plan.json] [--json]` — event taxonomy + GA4/GTM checklist |

---

## Communication

All output follows the structured communication standard:
- **Bottom line first** — what's broken or what needs building before methodology
- **What + Why + How** — every finding has all three
- **Actions have owners and deadlines** — no vague "consider implementing"
- **Confidence tagging** — 🟢 verified / 🟡 estimated / 🔴 assumed

---

## Related Skills

- **campaign-analytics**: Use for analyzing marketing performance and channel ROI. NOT for implementation — use this skill for tracking setup.
- **ab-test-setup**: Use when designing experiments. NOT for event tracking setup (though this skill's events feed A/B tests).
- **analytics-tracking** (this skill): covers setup only. For dashboards and reporting, use campaign-analytics.
- **seo-audit**: Use for technical SEO. NOT for analytics tracking (though both use GA4 data).
- **gdpr-dsgvo-expert**: Use for GDPR compliance posture. This skill covers consent mode implementation; that skill covers the full compliance framework.
