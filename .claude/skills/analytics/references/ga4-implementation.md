# GA4 Implementation Reference

Detailed implementation guide for Google Analytics 4.

## Contents
- Configuration (data streams, enhanced measurement events, recommended events)
- Custom Events (gtag.js implementation, Google Tag Manager)
- Conversions Setup (creating conversions, conversion values)
- Custom Dimensions and Metrics (when to use, setup steps, examples)
- Audiences (creating audiences, audience examples)
- Debugging (DebugView, real-time reports, common issues)
- Data Quality (filters, cross-domain tracking, session settings)
- Integration with Google Ads (linking, audience export)

## Configuration

### Data Streams

- One stream per platform (web, iOS, Android)
- Enable enhanced measurement for automatic tracking
- Configure data retention (2 months default, 14 months max)
- Enable Google Signals (for cross-device, if consented)

### Enhanced Measurement Events (Automatic)

| Event | Description | Configuration |
|-------|-------------|---------------|
| page_view | Page loads | Automatic |
| scroll | 90% scroll depth | Toggle on/off |
| click | Outbound link click (`outbound: true`); cross-domain measurement domains are excluded | Toggle on/off |
| view_search_results | Search results page with a configured search query parameter | Configure query parameters |
| video_start, video_progress, video_complete | Embedded YouTube start, progress and completion | Toggle on/off; JS API support required |
| file_download | PDF, docs, etc. | Configurable extensions |

Use these exact names in event filters and triggers. The option labels "outbound clicks", "site search" and "video engagement" are not automatic event names. For video, report starts, progress milestones and completions separately; adding all three counts double-counts a viewing journey. A custom event with one of the old labels needs its own implementation. Verify enabled options and observed parameters in DebugView before expecting data.

Contract: [Google enhanced measurement events](https://support.google.com/analytics/answer/9216061).

### Recommended Events

Use Google's predefined events when possible for enhanced reporting:

**All properties:**
- login, sign_up
- share
- search

**E-commerce:**
- view_item, view_item_list
- add_to_cart, remove_from_cart
- begin_checkout
- add_payment_info
- purchase, refund

**Games:**
- level_up, unlock_achievement
- post_score, spend_virtual_currency

Reference: https://support.google.com/analytics/answer/9267735

---

## Custom Events

### gtag.js Implementation

```javascript
// Recommended event (your plan's signup_completed maps to GA4's sign_up)
gtag('event', 'sign_up', {
  'method': 'email',
  'plan': 'free'
});

// Event with value
gtag('event', 'purchase', {
  'transaction_id': 'T12345',
  'value': 99.99,
  'currency': 'USD',
  'items': [{
    'item_id': 'SKU123',
    'item_name': 'Product Name',
    'price': 99.99
  }]
});

// User properties
gtag('set', 'user_properties', {
  'user_type': 'premium',
  'plan_name': 'pro'
});

// User ID (for logged-in users)
gtag('config', 'GA_MEASUREMENT_ID', {
  'user_id': 'USER_ID'
});
```

### Google Tag Manager (dataLayer)

```javascript
// Internal event name; a GTM GA4 Event tag sends it to GA4 as sign_up
dataLayer.push({
  'event': 'signup_completed',
  'method': 'email',
  'plan': 'free'
});

// Set user properties
dataLayer.push({
  'user_id': '12345',
  'user_type': 'premium'
});

// E-commerce purchase
dataLayer.push({
  'event': 'purchase',
  'ecommerce': {
    'transaction_id': 'T12345',
    'value': 99.99,
    'currency': 'USD',
    'items': [{
      'item_id': 'SKU123',
      'item_name': 'Product Name',
      'price': 99.99,
      'quantity': 1
    }]
  }
});

// Clear ecommerce before sending (best practice)
dataLayer.push({ ecommerce: null });
dataLayer.push({
  'event': 'view_item',
  'ecommerce': {
    // ...
  }
});
```

---

## Conversions Setup

### Creating Conversions

1. **Collect the event** - Ensure event is firing in GA4
2. **Mark as conversion** - Admin > Events > Mark as conversion
3. **Set counting method**:
   - Once per session (leads, signups)
   - Every event (purchases)
4. **Import to Google Ads** - For conversion-optimized bidding

### Conversion Values

```javascript
// Event with conversion value
gtag('event', 'purchase', {
  'value': 99.99,
  'currency': 'USD'
});
```

Or set default value in GA4 Admin when marking conversion.

---

## Custom Dimensions and Metrics

### When to Use

**Custom dimensions:**
- Properties you want to segment/filter by
- User attributes (plan type, industry)
- Content attributes (author, category)

**Custom metrics:**
- Numeric values to aggregate
- Scores, counts, durations

### Setup Steps

1. Admin > Data display > Custom definitions
2. Create dimension or metric
3. Choose scope:
   - **Event**: Per event (content_type)
   - **User**: Per user (account_type)
   - **Item**: Per product (product_category)
4. Enter parameter name (must match event parameter)

### Examples

| Dimension | Scope | Parameter | Description |
|-----------|-------|-----------|-------------|
| User Type | User | user_type | Free, trial, paid |
| Content Author | Event | author | Blog post author |
| Product Category | Item | item_category | E-commerce category |

---

## Audiences

### Creating Audiences

Admin > Data display > Audiences

**Use cases:**
- Remarketing audiences (export to Ads)
- Segment analysis
- Trigger-based events

### Audience Examples

**High-intent visitors:**
- Viewed pricing page
- Did not convert
- In last 7 days

**Engaged users:**
- 3+ sessions
- Or 5+ minutes total engagement

**Purchasers:**
- Purchase event
- For exclusion or lookalike

---

## Debugging

### DebugView

Enable with:
- URL parameter: `?debug_mode=true`
- Chrome extension: GA Debugger
- gtag: `'debug_mode': true` in config

View at: Reports > Configure > DebugView

### Real-Time Reports

Check events within 30 minutes:
Reports > Real-time

### Common Issues

**Events not appearing:**
- Check DebugView first
- Verify gtag/GTM firing
- Check filter exclusions

**Parameter values missing:**
- Custom dimension not created
- Parameter name mismatch
- Data still processing (24-48 hrs)

**Conversions not recording:**
- Event not marked as conversion
- Event name doesn't match
- Counting method (once vs. every)

---

## Data Quality

### Filters

Admin > Data streams > [Stream] > Configure tag settings > Define internal traffic

**Exclude:**
- Internal IP addresses
- Developer traffic
- Testing environments

### Cross-Domain Tracking

For multiple domains sharing analytics:

1. Admin > Data streams > [Stream] > Configure tag settings
2. Configure your domains
3. List all domains that should share sessions

### Session Settings

Admin > Data streams > [Stream] > Configure tag settings

- Session timeout (default 30 min)
- Engaged session duration (10 sec default)

---

## Integration with Google Ads

### Linking

1. Admin > Product links > Google Ads links
2. Enable auto-tagging in Google Ads
3. Import conversions in Google Ads

### Audience Export

Audiences created in GA4 can be used in Google Ads for:
- Remarketing campaigns
- Customer match
- Similar audiences
