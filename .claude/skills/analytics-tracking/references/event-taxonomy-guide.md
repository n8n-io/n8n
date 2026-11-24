# Event Taxonomy Guide

Complete reference for naming conventions, event structure, and parameter standards.

---

## Why Taxonomy Matters

Analytics data is only as good as its naming consistency. A tracking system with `FormSubmit`, `form_submit`, `form-submitted`, and `formSubmitted` as four separate "events" is useless for aggregation. One naming standard, enforced from day one, avoids months of cleanup later.

This guide is the reference for that standard.

---

## Naming Convention: Full Specification

### Format

```
[object]_[action]
```

**Object** = the thing being acted upon (noun)
**Action** = what happened (verb, past tense or gerund)

### Casing & Characters

| Rule | ✅ Correct | ❌ Wrong |
|------|-----------|---------|
| Lowercase only | `video_started` | `Video_Started`, `VIDEO_STARTED` |
| Underscores only | `form_submit` | `form-submit`, `formSubmit` |
| Noun before verb | `plan_selected` | `selected_plan` |
| Past tense or clear state | `checkout_completed` | `checkout_complete`, `checkoutDone` |
| Specific > generic | `trial_started` | `event_triggered` |
| Max 4 words | `onboarding_step_completed` | `user_completed_an_onboarding_step_in_the_flow` |

### Action Vocabulary (Standard Verbs)

Use these verbs consistently — don't invent synonyms:

| Verb | Use for |
|------|---------|
| `_started` | Beginning of a multi-step process |
| `_completed` | Successful completion of a process |
| `_failed` | An attempt that errored out |
| `_submitted` | Form or data submission |
| `_viewed` | Passive view of a page, modal, or content |
| `_clicked` | Direct click on a specific element |
| `_selected` | Choosing from options (plan, variant, filter) |
| `_opened` | Modal, drawer, chat window opened |
| `_closed` | Modal, drawer, chat window closed |
| `_downloaded` | File download |
| `_activated` | Feature turned on for first time |
| `_upgraded` | Plan or feature upgrade |
| `_cancelled` | Intentional termination |
| `_dismissed` | User explicitly closed/ignored a prompt |
| `_searched` | Search query submitted |

---

## Complete SaaS Event Catalog

### Acquisition Events

| Event | Required Parameters | Optional Parameters |
|-------|-------------------|-------------------|
| `ad_clicked` | `utm_source`, `utm_campaign` | `utm_content`, `utm_term` |
| `landing_page_viewed` | `page_location`, `utm_source` | `variant` (A/B) |
| `pricing_viewed` | `page_location` | `referrer_page` |
| `demo_requested` | `source` (page slug or section) | `plan_interest` |
| `content_downloaded` | `content_name`, `content_type` | `gated` (boolean) |

### Acquisition → Registration

| Event | Required Parameters | Optional Parameters |
|-------|-------------------|-------------------|
| `signup_started` | — | `plan_name`, `method` |
| `signup_completed` | `method` | `user_id`, `plan_name` |
| `email_verified` | — | `method` |
| `trial_started` | `plan_name` | `trial_length_days` |
| `invitation_accepted` | `inviter_user_id` | `plan_name` |

### Onboarding Events

| Event | Required Parameters | Optional Parameters |
|-------|-------------------|-------------------|
| `onboarding_started` | — | `onboarding_variant` |
| `onboarding_step_completed` | `step_name`, `step_number` | `time_spent_seconds` |
| `onboarding_completed` | `steps_total` | `time_to_complete_seconds` |
| `onboarding_skipped` | `step_name` | `step_number` |
| `feature_activated` | `feature_name` | `activation_method` |
| `integration_connected` | `integration_name` | `integration_type` |
| `team_member_invited` | — | `invite_method` |

### Conversion Events

| Event | Required Parameters | Optional Parameters |
|-------|-------------------|-------------------|
| `plan_selected` | `plan_name`, `billing_period` | `previous_plan` |
| `checkout_started` | `plan_name`, `value`, `currency` | `billing_period` |
| `checkout_completed` | `plan_name`, `value`, `currency`, `transaction_id` | `billing_period`, `coupon_code` |
| `checkout_failed` | `plan_name`, `error_reason` | `value`, `currency` |
| `upgrade_completed` | `from_plan`, `to_plan`, `value`, `currency` | `trigger` |
| `coupon_applied` | `coupon_code`, `discount_value` | `plan_name` |

### Engagement Events

| Event | Required Parameters | Optional Parameters |
|-------|-------------------|-------------------|
| `feature_used` | `feature_name` | `feature_area`, `usage_count` |
| `search_performed` | `search_term` | `results_count`, `search_area` |
| `filter_applied` | `filter_name`, `filter_value` | `result_count` |
| `export_completed` | `export_type`, `export_format` | `record_count` |
| `report_generated` | `report_name` | `date_range` |
| `notification_clicked` | `notification_type` | `notification_id` |

### Retention Events

| Event | Required Parameters | Optional Parameters |
|-------|-------------------|-------------------|
| `subscription_cancelled` | `cancel_reason` | `plan_name`, `save_offer_shown`, `save_offer_accepted` |
| `save_offer_accepted` | `offer_type` | `plan_name`, `discount_pct` |
| `subscription_paused` | `pause_duration_days` | `pause_reason` |
| `subscription_reactivated` | — | `plan_name`, `days_since_cancel` |
| `churn_risk_detected` | — | `risk_score`, `risk_signals` |

### Support / Help Events

| Event | Required Parameters | Optional Parameters |
|-------|-------------------|-------------------|
| `help_article_viewed` | `article_name` | `article_id`, `source` |
| `chat_opened` | — | `page_location`, `trigger` |
| `support_ticket_submitted` | `ticket_category` | `severity` |
| `error_encountered` | `error_type`, `error_message` | `page_location`, `feature_name` |

---

## Custom Dimensions & Metrics

GA4 limits: 50 custom dimensions (event-scoped), 25 user-scoped, 50 item-scoped.
Prioritize the ones that matter for segmentation.

### Recommended User-Scoped Dimensions

| Dimension Name | Parameter | Example Values |
|---------------|-----------|---------------|
| User ID | `user_id` | `usr_abc123` |
| Plan Name | `plan_name` | `starter`, `professional`, `enterprise` |
| Billing Period | `billing_period` | `monthly`, `annual` |
| Account Created Date | `account_created_date` | `2024-03-15` |
| Onboarding Completed | `onboarding_completed` | `true`, `false` |
| Company Size | `company_size` | `1-10`, `11-50`, `51-200` |

### Recommended Event-Scoped Dimensions

| Dimension Name | Parameter | Used In |
|---------------|-----------|---------|
| Cancel Reason | `cancel_reason` | `subscription_cancelled` |
| Feature Name | `feature_name` | `feature_used`, `feature_activated` |
| Content Name | `content_name` | `content_downloaded` |
| Signup Method | `method` | `signup_completed` |
| Error Type | `error_type` | `error_encountered` |

---

## Taxonomy Governance

### The Tracking Plan Document

Maintain a single tracking plan document (Google Sheet or Notion table) with:

| Column | Values |
|--------|--------|
| Event Name | e.g., `checkout_completed` |
| Trigger | "User completes Stripe checkout" |
| Parameters | `{value, currency, plan_name, transaction_id}` |
| Implemented In | GTM / App code / server |
| Status | Draft / Implemented / Verified |
| Owner | Engineering / Marketing / Product |

### Change Protocol

1. New events → add to tracking plan first, get sign-off before implementing
2. Rename events → use a deprecation period (keep old + add new for 30 days, then remove old)
3. Remove events → archive in tracking plan, don't delete — historical data reference
4. Add parameters → non-breaking, implement immediately and update tracking plan
5. Remove parameters → treat as rename (deprecation period)

### Versioning

Include `schema_version` as a parameter on critical events if your taxonomy evolves rapidly:

```javascript
window.dataLayer.push({
  event: 'checkout_completed',
  schema_version: 'v2',
  value: 99,
  currency: 'USD',
  // ...
});
```

This allows filtering old vs. new schema during migrations.
