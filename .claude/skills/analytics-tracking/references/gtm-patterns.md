# GTM Patterns for SaaS

Common Google Tag Manager configurations for SaaS applications.

---

## Container Architecture

### Naming Convention

Use consistent naming or GTM becomes a black box within 6 months.

```
Tags:     [Platform] - [Event Name]           e.g., "GA4 - signup_completed"
Triggers: [Type] - [Description]             e.g., "DL Event - signup_completed"
Variables: [Type] - [Parameter Name]         e.g., "DLV - plan_name"
```

### Required Variables (Create These First)

| Variable Name | Type | Value |
|--------------|------|-------|
| `CON - GA4 Measurement ID` | Constant | `G-XXXXXXXXXX` |
| `CON - Environment` | Constant | `production` |
| `JS - Page Path` | Custom JavaScript | `function() { return window.location.pathname; }` |
| `JS - User ID` | Custom JavaScript | `function() { return window.currentUserId || undefined; }` |

### GA4 Configuration Tag

**One tag, fires on All Pages:**

```
Tag Type: Google Analytics: GA4 Configuration
Measurement ID: {{CON - GA4 Measurement ID}}
Fields to Set:
  - user_id: {{JS - User ID}}
Trigger: All Pages
```

---

## Pattern Library

### Pattern 1: Data Layer Push Event

The most reliable pattern. Your app pushes structured data; GTM listens.

**In your application code:**
```javascript
// Call this function on any trackable event
function trackEvent(eventName, parameters) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: eventName,
    ...parameters
  });
}

// Example: after successful signup
trackEvent('signup_completed', {
  signup_method: 'email',
  user_id: newUser.id,
  plan_name: 'trial'
});
```

**In GTM:**

1. Create Data Layer Variables for each parameter:
   - `DLV - signup_method` → Data Layer Variable → `signup_method`
   - `DLV - user_id` → Data Layer Variable → `user_id`
   - `DLV - plan_name` → Data Layer Variable → `plan_name`

2. Create Trigger:
   - Type: Custom Event
   - Event Name: `signup_completed`
   - Name: `DL Event - signup_completed`

3. Create Tag:
   - Type: Google Analytics: GA4 Event
   - Configuration Tag: GA4 Config tag
   - Event Name: `signup_completed`
   - Event Parameters:
     - `method`: `{{DLV - signup_method}}`
     - `user_id`: `{{DLV - user_id}}`
     - `plan_name`: `{{DLV - plan_name}}`
   - Trigger: `DL Event - signup_completed`

---

### Pattern 2: Click Event on Specific Element

Use when you can't modify app code and need to track a specific CTA.

**GTM Setup:**

1. Enable `Click - All Elements` built-in variables (if not enabled):
   - GTM → Variables → Configure → Enable: Click Element, Click ID, Click Classes, Click Text

2. Create Trigger:
   - Type: Click - All Elements
   - Fire On: Some Clicks
   - Conditions:
     - Click Element matches CSS selector: `[data-track="demo-cta"]`
     OR
     - Click Text equals "Request a Demo"
   - Name: `Click - Demo CTA`

3. Create Tag:
   - Type: GA4 Event
   - Event Name: `demo_requested`
   - Event Parameters:
     - `page_location`: `{{Page URL}}`
     - `click_text`: `{{Click Text}}`
   - Trigger: `Click - Demo CTA`

**Best practice:** Add `data-track` attributes to important elements in your HTML rather than relying on brittle CSS selectors or text matching.

```html
<button data-track="demo-cta" data-track-source="pricing-hero">
  Request a Demo
</button>
```

---

### Pattern 3: Form Submission Tracking

Two approaches depending on whether the form submits via JavaScript or full page reload.

**For JavaScript-handled forms (AJAX/fetch):**
- Use Pattern 1 (dataLayer push) after successful form submission callback

**For traditional form submit:**

1. Create Trigger:
   - Type: Form Submission
   - Check Validation: ✅ (only fires if form passes HTML5 validation)
   - Enable History Change: ✅ (for SPAs)
   - Fire On: Some Forms
   - Conditions: Form ID equals `contact-form` OR Form Classes contains `js-track-form`
   - Name: `Form Submit - Contact`

2. Create Tag:
   - Type: GA4 Event
   - Event Name: `form_submitted`
   - Parameters:
     - `form_name`: `contact`
     - `page_location`: `{{Page URL}}`
   - Trigger: `Form Submit - Contact`

---

### Pattern 4: SPA Page View Tracking

Single-page apps often don't trigger standard page view events on route changes.

**Approach A: History Change trigger (simplest)**

1. Create Trigger:
   - Type: History Change
   - Name: `History Change - Route`

2. Create Tag:
   - Type: GA4 Event
   - Event Name: `page_view`
   - Parameters:
     - `page_location`: `{{Page URL}}`
     - `page_title`: `{{Page Title}}`
   - Trigger: `History Change - Route`

**Important:** Disable the default pageview in your GA4 Configuration tag if using this, or you'll get duplicates on initial load.

**Approach B: dataLayer push from router (more reliable)**

```javascript
// In your router's navigation handler:
router.afterEach((to, from) => {
  window.dataLayer.push({
    event: 'page_view',
    page_path: to.path,
    page_title: document.title
  });
});
```

---

### Pattern 5: Scroll Depth Tracking

For content engagement measurement:

**Option A: Use GA4 Enhanced Measurement (90% depth only)**
- Enable in GA4 → Data Streams → Enhanced Measurement → Scrolls
- Fires when user scrolls 90% down the page
- No GTM configuration needed

**Option B: Custom milestones via GTM**

1. Create Trigger for each depth:
   - Type: Scroll Depth
   - Vertical Scroll Depths: 25, 50, 75, 100 (percent)
   - Enable for: Some Pages → Page Path contains `/blog/`
   - Name: `Scroll Depth - Blog`

2. Create Tag:
   - Type: GA4 Event
   - Event Name: `content_scrolled`
   - Parameters:
     - `scroll_depth_pct`: `{{Scroll Depth Threshold}}`
     - `page_location`: `{{Page URL}}`
   - Trigger: `Scroll Depth - Blog`

---

### Pattern 6: Consent Mode Integration

For GDPR compliance — connect your CMP to GTM.

**Basic Consent Mode (blocks all when declined):**

```javascript
// In your CMP callback:
window.dataLayer.push({
  event: 'cookie_consent_update',
  ad_storage: 'denied',         // or 'granted'
  analytics_storage: 'denied',  // or 'granted'
  functionality_storage: 'denied',
  personalization_storage: 'denied',
  security_storage: 'granted'   // always granted
});
```

**Advanced Consent Mode (modeled data for declined users):**

Add to `<head>` BEFORE GTM loads:
```javascript
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}

// Default all to denied
gtag('consent', 'default', {
  ad_storage: 'denied',
  analytics_storage: 'denied',
  wait_for_update: 500  // ms to wait for CMP to initialize
});
```

Then update when user consents:
```javascript
gtag('consent', 'update', {
  analytics_storage: 'granted'
});
```

---

## GTM Version Control

### Version Naming Convention

```
v1.0 - Initial setup: GA4 + core events
v1.1 - Add: checkout tracking
v1.2 - Fix: duplicate pageview on SPA
v2.0 - Overhaul: new event taxonomy + Meta Pixel
```

### Publishing Protocol

1. Test in GTM Preview mode — verify events fire correctly
2. Test in GA4 DebugView — confirm parameters are captured
3. Test with GTM's "What changed?" diff view
4. Add version notes (what changed + why)
5. Publish to production
6. Verify in GA4 Realtime view post-publish

### Environments

Create a staging environment in GTM (Admin → Environments):
- Development: test changes without affecting production
- Staging: validate before publish
- Production: live

Share staging GTM snippet with your dev team so they test against the same container.

---

## Common GTM Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Tag fires on "All Pages" when it should be scoped | Inflated event counts | Add page conditions to trigger |
| Data Layer Variable path is wrong | Parameter shows as `undefined` | Use GTM Preview to inspect dataLayer structure |
| GA4 Configuration tag fires multiple times | Duplicate sessions/users | Check all triggers — should be one trigger, "All Pages" |
| Enhanced Measurement conflicts with custom tags | Duplicate outbound click events | Disable conflicting Enhanced Measurement settings |
| Trigger fires before DOM ready | Element not found errors | Change trigger type from "Page View" to "DOM Ready" or "Window Loaded" |
| Form trigger doesn't fire | Form uses AJAX or custom submit | Switch to dataLayer push after submit callback |
