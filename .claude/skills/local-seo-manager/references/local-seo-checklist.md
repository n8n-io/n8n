# Local SEO Checklist — 80 Points

Complete reference checklist for service-area businesses. Use alongside the `local-seo-manager` skill for full audits.

---

## 1. Google Business Profile (GBP) — 25 Points

### Category & Identity
- [ ] Primary category is the most specific available (e.g., "Appliance Repair Service")
- [ ] 3-5 secondary categories added for all major service lines
- [ ] Business name matches legal name exactly — no keyword stuffing
- [ ] Short name (if applicable) is clean and brand-aligned

### Contact & Location
- [ ] Address matches all directory listings character-for-character
- [ ] Phone is a local area-code number (not 1-800)
- [ ] Website URL is correct + uses UTM tracking (`?utm_source=gmb&utm_medium=organic`)
- [ ] Service area defined correctly (for SABs: no physical address shown)
- [ ] Hours are accurate — including holiday hours

### Content
- [ ] Description uses primary keyword in first sentence (750 char max)
- [ ] Description mentions 3-5 services by name
- [ ] Description mentions city/metro area
- [ ] Description has NO promotional language ("best," "#1," "guaranteed")
- [ ] All services listed in Services section with descriptions
- [ ] Products added (if applicable)
- [ ] At least one Q&A seeded and answered by the business

### Photos
- [ ] Logo uploaded (400×400px min)
- [ ] Cover photo uploaded (1024×576px min)
- [ ] 10+ interior/exterior/team/work photos
- [ ] Photos geotagged (use GeoImgr.com before upload)
- [ ] New photo added at least monthly

### Posts & Activity
- [ ] At least 1 Google Post per week
- [ ] Posts include a call-to-action button
- [ ] Response rate on reviews = 100%
- [ ] Average rating ≥ 4.5 stars

---

## 2. NAP Consistency — 10 Points

- [ ] Name identical across Google, Yelp, BBB, Apple Maps, Bing
- [ ] Phone format consistent (prefer: (XXX) XXX-XXXX)
- [ ] Address abbreviations consistent (St. or Street — pick one, use everywhere)
- [ ] Website URL consistent (with or without trailing slash, www vs non-www)
- [ ] Listed on all Tier 1 directories: Google, Apple Maps, Bing Places
- [ ] Listed on all Tier 2 directories: Yelp, BBB, Angi, HomeAdvisor
- [ ] Listed on relevant Tier 3: Facebook, Yellow Pages, Nextdoor, Thumbtack
- [ ] Old/duplicate listings claimed and removed or merged
- [ ] No listings with outdated phone numbers (old numbers still live)
- [ ] Run `scripts/nap_checker.py` — zero mismatches in Tier 1 directories

---

## 3. On-Page Local SEO — 20 Points

### Homepage
- [ ] Title tag: `[Primary Service] in [City] | [Business Name]`
- [ ] Meta description: Includes service + city + phone or CTA
- [ ] H1 includes primary keyword + city
- [ ] NAP in footer (text format, matches GBP exactly)
- [ ] Google Maps embed on contact/location page
- [ ] LocalBusiness schema in `<head>` (run `scripts/schema_generator.py`)
- [ ] Phone number as `<a href="tel:+1XXXXXXXXXX">` (click-to-call)

### Service Area Pages
- [ ] One dedicated page per major service area (city/neighborhood)
- [ ] Each page ≥ 1,000 words (use `scripts/service_area_generator.py` for briefs)
- [ ] Each page has a unique opening paragraph (not duplicated)
- [ ] Each page has 2+ neighborhood-specific references
- [ ] Each page has a FAQ section (5 Q&A pairs minimum)
- [ ] FAQPage schema on each service area page
- [ ] Service area pages linked from main navigation or sitemap

### Internal Linking
- [ ] Main service page links to all service area pages
- [ ] Service area pages cross-link to adjacent neighborhoods
- [ ] All service area pages in XML sitemap

---

## 4. Review Strategy — 10 Points

- [ ] Review request process in place (ask after every completed job)
- [ ] QR code or short link for easy review submission
- [ ] 50+ reviews on Google (100+ in competitive markets)
- [ ] Respond to 100% of reviews — positive and negative
- [ ] Response time < 48 hours
- [ ] No incentivized reviews (violates Google TOS)
- [ ] Reviews spread across multiple platforms (not just Google)
- [ ] Negative reviews addressed professionally — no arguing
- [ ] Flag spam reviews via GBP dashboard
- [ ] Review velocity: aim for 2-5 new reviews per month minimum

---

## 5. Technical SEO — 15 Points

- [ ] Mobile-friendly (test: search.google.com/test/mobile-friendly)
- [ ] Page speed: LCP < 2.5s on mobile (test: pagespeed.web.dev)
- [ ] CLS < 0.1 (layout shift on load — often image sizing issue)
- [ ] HTTPS everywhere — no mixed content warnings
- [ ] No broken links (especially on service area pages)
- [ ] Canonical tags on all service area pages (prevent duplicate content)
- [ ] XML sitemap submitted to Google Search Console and Bing Webmaster
- [ ] robots.txt does NOT block important pages
- [ ] AI crawlers allowed (GPTBot, ClaudeBot, PerplexityBot) — local businesses benefit from AI Overview citations
- [ ] No 4xx or 5xx errors on key pages
- [ ] Structured data valid — no errors in Google Rich Results Test
- [ ] Hreflang NOT needed (single-language, single-country business)
- [ ] 301 redirects in place for any changed URLs
- [ ] Google Analytics + Search Console connected and receiving data
- [ ] GBP linked to Google Analytics (via UTM tagging minimum)

---

## Quick Wins (Highest ROI, Lowest Effort)

These items return the most ranking improvement per hour of work:

1. **Respond to all unanswered reviews** — immediate GBP ranking signal
2. **Add photos to GBP** — 5 new photos takes 10 minutes, boosts profile completeness
3. **Fix Tier 1 NAP mismatches** — Google, Apple Maps, Bing — 30 minutes per listing
4. **Add LocalBusiness schema** — `schema_generator.py` generates it in 30 seconds
5. **Create one new service area page per week** — compound effect over 3-6 months
6. **Seed 5 Q&A pairs in GBP** — you write the question AND answer = controlled content

---

## Scoring

- 70-80 checks: Strong local SEO foundation — focus on content and review velocity
- 50-69 checks: Solid base with gaps — prioritize NAP and technical fixes
- 30-49 checks: Foundational work needed — start with GBP and Tier 1 citations
- Under 30: Major gaps — GBP audit + NAP correction are immediate priorities
