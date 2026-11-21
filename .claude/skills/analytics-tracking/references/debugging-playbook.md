# Tracking Debug Playbook

Step-by-step methodology for diagnosing and fixing analytics tracking issues.

---

## The Debug Mindset

Analytics bugs are harder than code bugs because:
1. They fail silently — no error thrown, just missing data
2. They often only appear in production
3. They can be caused by timing, consent, ad blockers, or just configuration

Work systematically. Don't guess. Verify at each layer before moving to the next.

---

## The Debug Stack (Bottom-Up)

```
Layer 5: GA4 Reports / DebugView      ← what you see
Layer 4: GA4 Data Processing          ← where it lands
Layer 3: Network Request              ← what was sent
Layer 2: GTM / Tag firing             ← what GTM did
Layer 1: dataLayer / App code         ← what your app pushed
```

When something's missing at Layer 5, start at Layer 1 and verify each layer before going up.

---

## Tool Setup

### GTM Preview Mode

1. GTM → Preview (top right)
2. Enter your site URL → Connect
3. A blue bar appears at the bottom of your site: "Google Tag Manager"
4. GTM Preview panel opens in a separate tab
5. Perform the action you're debugging
6. Check: did the expected tag fire?

**Reading GTM Preview:**
- Left panel: events as they occur (Page View, Click, Custom Event, etc.)
- Middle panel: Tags fired / Tags NOT fired for selected event
- Right panel: Variables values at the time of the event

### GA4 DebugView

1. GA4 → Admin → DebugView
2. Enable debug mode via:
   - GTM: add `debug_mode: true` to your GA4 Event tag parameters
   - Extension: install "GA Debugger" Chrome extension
   - URL parameter: add `?_gl=` or use GA4 debug parameter
3. Perform actions on your site
4. Watch events appear in real-time (10-15 second delay)

### Chrome DevTools — Network Tab

1. Open DevTools → Network
2. Filter by: `collect` or `google-analytics` or `analytics`
3. Perform the action
4. Look for requests to `https://www.google-analytics.com/g/collect`
5. Click the request → Payload tab → view parameters

---

## Common Issues and Fixes

### Issue: Event fires in GTM Preview but not in GA4

**Possible causes:**

1. **Consent mode blocking** — user is in denied state
   - Check: In GTM Preview, look at Variables → `Analytics Storage` — is it `denied`?
   - Fix: Test with consent granted, or implement Advanced Consent Mode

2. **Filters blocking data** — internal traffic filter is active
   - Check: GA4 → Admin → Data Filters — is "Internal Traffic" filter active?
   - Fix: Disable filter temporarily, test, then re-enable and exclude your IP correctly

3. **Debug mode not enabled** — DebugView only shows debug-mode traffic
   - Check: Is `debug_mode: true` parameter on the GA4 Event tag?
   - Fix: Add it, or use the GA4 Debugger Chrome extension

4. **Wrong property** — you're looking at a different GA4 property
   - Check: Confirm Measurement ID in GTM matches the GA4 property you're viewing
   - Fix: Compare `G-XXXXXXXXXX` in GTM vs. GA4 Data Stream settings

5. **Duplicate GA4 configuration tags** — two config tags = double sessions + weird data
   - Check: GTM → Tags → filter by "GA4 Configuration" — more than one?
   - Fix: Delete duplicates, keep one with All Pages trigger

---

### Issue: Event not firing in GTM Preview at all

**Diagnosis path:**

**Step 1:** Check the trigger
- Is the trigger for this tag listed under the action in GTM Preview?
- If not: the trigger didn't fire

**Step 2:** Check trigger conditions
- Open the trigger in GTM
- Reproduce the exact scenario step by step
- In GTM Preview, check Variables at the moment the action happened
- Do the variable values match your trigger conditions?

**Step 3:** dataLayer issue (for Custom Event triggers)
- In GTM Preview → select the relevant event in left panel → Variables tab
- Scroll to find `event` — what's the value?
- If event name doesn't match trigger exactly: it won't fire (case-sensitive, exact match)

**Step 4:** Timing issue
- If using "Page View" trigger and element doesn't exist yet: switch to "DOM Ready" or "Window Loaded"
- If SPA: route changes may not trigger "Page View" — use History Change instead

---

### Issue: Parameters showing as (not set) or undefined in GA4

**Step 1:** Verify parameter is in the network request
- DevTools → Network → find GA4 collect request → Payload
- Search for the parameter name (e.g., `plan_name`)
- If not there: GTM variable isn't resolving correctly

**Step 2:** Check the GTM variable
- GTM Preview → find the event → Variables tab
- Find the variable for this parameter (e.g., `DLV - plan_name`)
- What's its value? If `undefined`: the dataLayer push didn't include this key, or key name is wrong

**Step 3:** Check dataLayer push in your app code
- DevTools → Console → type: `dataLayer.filter(e => e.event === 'your_event_name')`
- Inspect the object — is the parameter key present and spelled correctly?

**Step 4:** Check GA4 custom dimension registration
- Some parameters require a registered custom dimension in GA4 to appear in reports
- GA4 → Admin → Custom Definitions → Custom Dimensions
- If parameter isn't registered here: it'll exist in raw data but won't show in Explore reports

---

### Issue: Duplicate events (event fires 2x per action)

**Find the duplicates:**
- GTM Preview → find the action → how many tags with the same name fired?
- DevTools → Network → filter by `collect` → count hits for the action

**Common causes:**

1. **Enhanced Measurement + manual GTM tag**
   - e.g., Enhanced Measurement tracks outbound clicks, GTM also has an outbound click tag
   - Fix: disable the Enhanced Measurement setting OR remove the GTM tag

2. **Two GTM Configuration tags**
   - Each sends its own hits
   - Fix: delete one, keep one

3. **SPA router fires pageview + History Change trigger also fires**
   - Fix: disable Enhanced Measurement pageview, use only History Change tag

4. **Event fires on multiple triggers that both match**
   - Fix: make triggers more specific — add exclusion conditions

---

### Issue: Sessions/users look wrong (too high or too low)

**Too many sessions:**
- Multiple GA4 Configuration tags
- History Change trigger firing + Enhanced Measurement pageview on SPA
- Client ID not persisting (cookie being blocked or cleared)

**Too few sessions / users:**
- Consent blocking analytics for non-consenting users (expected under strict consent mode)
- Bot filtering too aggressive
- GA4 tags firing on wrong pages only

**Sessions reset unexpectedly (user shows as new on every page):**
- Cross-domain tracking not configured
- Cookie domain mismatch
- GTM cookie settings incorrect

---

### Issue: Conversions not matching between GA4 and Google Ads

**Check 1: Attribution window mismatch**
- GA4 default: 30-day last click
- Google Ads: check conversion action settings for window
- These legitimately produce different numbers

**Check 2: Conversion event names**
- In Google Ads → Tools → Conversions → imported from GA4
- Does the linked event name exactly match the GA4 event?

**Check 3: Import is linked**
- Google Ads → Tools → Linked Accounts → Google Analytics 4
- Is the correct GA4 property linked and synced?
- Sync can take 24-48 hours after changes

**Check 4: Enhanced Conversions**
- If GA4 uses a user_id or email parameter, Enhanced Conversions can improve matching
- Google Ads → Conversions → Enhanced Conversions for Web → Enable

---

## Debug Checklist Template

Use this for any new tracking issue:

```
[ ] Confirmed exact event name and parameters expected
[ ] Verified app code is pushing to dataLayer (console: dataLayer)
[ ] GTM Preview: trigger fires at correct moment
[ ] GTM Preview: parameters resolve to correct values (not undefined)
[ ] Network: GA4 collect request appears with correct payload
[ ] GA4 DebugView: event appears within 30 seconds
[ ] GA4 DebugView: parameters present and correct
[ ] GA4 Reports: event appears (24-48h delay for standard reports)
[ ] Consent check: tested with analytics consent granted
[ ] Filter check: internal traffic filter not blocking test traffic
```
