# SMS Sequence Templates

Full copy templates with character counts, timing, and segmentation logic for every major SMS flow.

> Character counts shown assume GSM-7 encoding. Emojis force UCS-2 (70 chars/segment instead of 160). All templates use `[Brand]`, `[FirstName]`, and `[short.link]` as substitution tokens.

---

## Welcome / Opt-In Confirmation

### Send 1 — Immediate (after opt-in)

```
From [Brand]: Welcome! Here's your 10% off code: WELCOME10. Shop now: [short.link]
Reply STOP to opt out, HELP for help. Msg & data rates may apply.
```
~155 chars / 1 segment (just). Footer required on first send.

### Send 2 — 24 hours later (optional)

```
From [Brand]: Don't forget your code WELCOME10 — expires in 48hrs. Top picks: [short.link]
```
~108 chars / 1 segment.

### Send 3 — 7 days later (optional, conditional on no purchase)

```
From [Brand]: Last chance for 10% off with WELCOME10. Expires tonight at midnight: [short.link]
```
~107 chars / 1 segment.

---

## Abandoned Cart (highest-ROI flow for ecom)

### Send 1 — 30 minutes after abandon

```
From [Brand]: Hey [FirstName], you left something behind! Your cart's here: [short.link]
```
~95 chars / 1 segment.

### Send 2 — 4 hours after abandon (if no purchase)

```
From [Brand]: Items in your cart are selling fast. Reserved for you for 24hrs: [short.link]
```
~98 chars / 1 segment.

### Send 3 — 24 hours after abandon (if no purchase, discount allowed)

```
From [Brand]: Still thinking? Here's 10% off to seal the deal: SAVE10. Shop: [short.link]
```
~99 chars / 1 segment.

**Notes**:
- Discount on Send 1 trains customers to abandon. Reserve for Send 2 or 3.
- Exclude customers who abandoned <$X in cart value or repeat abandoners (gaming the discount).
- Stop sequence on purchase, opt-out, or 48 hours elapsed.

---

## Browse Abandonment

### Send 1 — 1 hour after browse (single product or category)

```
From [Brand]: Still thinking about [product]? Take another look: [short.link]
```
~84 chars / 1 segment.

**Notes**:
- Trigger only after meaningful browse signal (3+ product views or 2+ min on product page).
- Exclude if a purchase happened on a different product.

---

## Post-Purchase Flow

### Send 1 — Immediately after purchase (transactional, separate consent)

```
From [Brand]: Order #12345 confirmed! We'll text shipping updates here. Track: [short.link]
```
~95 chars / 1 segment.

### Send 2 — Day of shipment

```
From [Brand]: Your order's on the way. Estimated delivery: [date]. Track: [short.link]
```
~92 chars / 1 segment.

### Send 3 — Day of delivery

```
From [Brand]: Your order should arrive today! Questions? Reply or visit [short.link]
```
~88 chars / 1 segment.

### Send 4 — 2 days after delivery (marketing consent required)

```
From [Brand]: How are you liking your [product]? Share a review for 15% off next order: [short.link]
```
~108 chars / 1 segment.

### Send 5 — 14 days after delivery (cross-sell, marketing consent)

```
From [Brand]: Goes great with your [product]: [related-item]. 10% off bundle: [short.link]
```
~99 chars / 1 segment.

---

## Win-Back (Lapsed Customers)

### Send 1 — 60-90 days after last purchase

```
From [Brand]: [FirstName], we miss you! Picks we think you'll love: [short.link]
```
~84 chars / 1 segment.

### Send 2 — 14 days later (if no purchase)

```
From [Brand]: Come back for 15% off your next order: COMEBACK15. Expires in 7 days: [short.link]
```
~106 chars / 1 segment.

### Send 3 — 14 days after Send 2 (final, if no purchase)

```
From [Brand]: Last chance — 20% off ends tonight: COMEBACK20. We'll stop texting if you'd rather: reply STOP. [short.link]
```
~130 chars / 1 segment.

**Notes**:
- After Send 3 with no engagement, suppress for 90 days minimum.
- After two full win-back cycles with no engagement, sunset (remove from active list).

---

## Promotional / Campaign Sends

### Flash sale (single send)

```
From [Brand]: 24-HOUR FLASH: 25% off everything with FLASH25. Ends midnight: [short.link]
```
~94 chars / 1 segment.

### Limited drop / launch

```
From [Brand]: New drop just landed: [product-name]. Limited stock, members get early access: [short.link]
```
~115 chars / 1 segment.

### Holiday / BFCM (2-send sequence)

Send 1 — Day of launch:
```
From [Brand]: Black Friday is LIVE — up to 50% off sitewide. Shop now: [short.link]
```
~92 chars / 1 segment.

Send 2 — Day of (or evening, expiration push):
```
From [Brand]: Last 6 hours of BFCM savings. Don't miss out: [short.link]
```
~73 chars / 1 segment.

---

## Transactional / Account Notifications

### Order confirmation

```
[Brand]: Order #12345 confirmed. Total $XX.XX. Track at [short.link]. Reply HELP for help.
```

### Shipping update

```
[Brand]: Your order #12345 shipped! Track: [short.link]. ETA [date].
```

### Delivery confirmation

```
[Brand]: Order #12345 delivered. Enjoy! Issues? Reply or [support-link].
```

### Auth code (2FA)

```
[Brand] verification code: 123456. Expires in 10 min. Do not share.
```

### Account alert

```
[Brand]: Sign-in from new device in [location]. Wasn't you? Secure: [short.link]
```

---

## Re-Engagement / Reactivation (Subscribers Who've Gone Cold)

For SMS subscribers who haven't engaged with any send in 60+ days.

### Send 1 — Soft reactivation

```
From [Brand]: We've missed you, [FirstName]! Here's what's new: [short.link]
```
~80 chars / 1 segment.

### Send 2 — Confirm interest (if no engagement)

```
From [Brand]: Want to keep hearing from us? Reply YES to stay on the list, or STOP to opt out.
```
~98 chars / 1 segment.

After no reply: suppress for 60 days, then remove from active list. This protects opt-out rate metrics and reduces wasted spend.

---

## Replenishment (Consumables Ecom)

For products with predictable usage cycles (skincare, supplements, coffee, pet food).

### Send 1 — At expected reorder window (e.g., 28 days for a 30-day supply)

```
From [Brand]: Running low on [product]? Reorder in one tap: [short.link]
```
~73 chars / 1 segment.

### Send 2 — 7 days later (if no purchase)

```
From [Brand]: Don't run out! 10% off your reorder of [product]: REFILL10 [short.link]
```
~92 chars / 1 segment.

---

## VIP / Loyalty Members

Higher frequency, exclusive offers, early access — different cadence rules apply but quiet hours and STOP still required.

### Early access

```
From [Brand]: VIPs get the new drop 24hrs early. Yours now: [short.link]
```
~72 chars / 1 segment.

### Loyalty milestone

```
From [Brand]: You've reached Gold status! Your perks: 15% off + free shipping. [short.link]
```
~95 chars / 1 segment.

---

## Segmentation rules across all flows

- **Suppress** customers in active sequences from promotional sends (no double-tap)
- **Suppress** opted-out subscribers from everything (platform handles this)
- **Frequency cap**: max 4–6 marketing sends/week per subscriber (lower for newer subscribers)
- **Quiet hours**: 9am–8pm recipient-local time
- **Cool-off**: After a discount-driven purchase, suppress promotional sends for 14 days
