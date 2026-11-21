# Local Business Schema Types — Reference Guide

Complete schema.org reference for local service businesses. All examples are JSON-LD format.

---

## 1. LocalBusiness + HomeAndConstructionBusiness

Use on: homepage, contact page, all location/service pages.
This is the most important schema for local businesses — it establishes your entity in Google's knowledge graph.

```json
{
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "HomeAndConstructionBusiness"],
  "name": "Smart Solution Appliances",
  "url": "https://smartsolutionappliances.com",
  "telephone": "(415) 555-0100",
  "priceRange": "$$",
  "image": "https://smartsolutionappliances.com/logo.png",
  "description": "Professional appliance repair in San Francisco. Same-day service for washers, dryers, refrigerators, dishwashers, and ovens.",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "123 Market Street",
    "addressLocality": "San Francisco",
    "addressRegion": "CA",
    "postalCode": "94102",
    "addressCountry": "US"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "37.7749",
    "longitude": "-122.4194"
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": "https://schema.org/Monday",
      "opens": "08:00",
      "closes": "18:00"
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["https://schema.org/Tuesday", "https://schema.org/Wednesday", "https://schema.org/Thursday", "https://schema.org/Friday"],
      "opens": "08:00",
      "closes": "18:00"
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": "https://schema.org/Saturday",
      "opens": "09:00",
      "closes": "15:00"
    }
  ],
  "areaServed": [
    {"@type": "Place", "name": "San Francisco"},
    {"@type": "Place", "name": "Richmond District"},
    {"@type": "Place", "name": "Mission District"}
  ],
  "sameAs": [
    "https://www.yelp.com/biz/smart-solution-appliances-san-francisco",
    "https://www.facebook.com/smartsolutionappliances"
  ],
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "bestRating": "5",
    "worstRating": "1",
    "ratingCount": "124"
  }
}
```

**Notes:**
- `HomeAndConstructionBusiness` is the most specific type for appliance repair, HVAC, plumbing. Use it alongside `LocalBusiness`.
- `areaServed` should list all neighborhoods/cities you serve — helps with broader service-area queries.
- `aggregateRating` pulls star snippet if you have enough reviews. Do NOT fabricate — Google cross-checks with GBP.
- Run `scripts/schema_generator.py --type local-business` to generate for your business.

---

## 2. Service (per service page)

Use on: individual service pages (washer-repair, dryer-repair, etc.) and service area pages.

```json
{
  "@context": "https://schema.org",
  "@type": "Service",
  "serviceType": "Appliance Repair",
  "provider": {
    "@type": "LocalBusiness",
    "name": "Smart Solution Appliances",
    "telephone": "(415) 555-0100",
    "url": "https://smartsolutionappliances.com"
  },
  "areaServed": {
    "@type": "Place",
    "name": "Richmond District, San Francisco"
  },
  "description": "Professional appliance repair in the Richmond District. Same-day service for washers, dryers, refrigerators, dishwashers, and ovens. All major brands serviced."
}
```

---

## 3. FAQPage

Use on: any page with a FAQ section. High impact — Google shows FAQ rich results (expandable Q&A in search).

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How quickly can you reach the Richmond District for appliance repair?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "We offer same-day service in the Richmond District. Call before noon for a same-afternoon appointment."
      }
    },
    {
      "@type": "Question",
      "name": "Do you offer a warranty on appliance repairs?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. All repairs come with a 90-day parts and labor warranty."
      }
    },
    {
      "@type": "Question",
      "name": "What appliance brands do you service?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "We service all major brands including Samsung, LG, Whirlpool, GE, Bosch, Maytag, KitchenAid, Frigidaire, and Electrolux."
      }
    }
  ]
}
```

**Notes:**
- Max 5 Q&A pairs for FAQ rich results (Google truncates beyond 5 in the SERP).
- Each answer should be 30-250 words. Too short = not useful. Too long = not shown.
- Validate at: search.google.com/test/rich-results

---

## 4. HowTo (for how-to content)

Use on: blog posts or guides like "How to Know if Your Washing Machine Needs Repair."

```json
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "How to Tell if Your Washing Machine Needs Professional Repair",
  "description": "Five signs your washer needs a repair technician, not a DIY fix.",
  "step": [
    {
      "@type": "HowToStep",
      "name": "Check for error codes",
      "text": "Modern washers display error codes on the control panel. Look up your model's error code in the manual — E1, E2, F codes usually indicate internal component failure requiring a technician."
    },
    {
      "@type": "HowToStep",
      "name": "Listen for unusual sounds",
      "text": "Loud grinding, banging, or squealing during the spin cycle often indicates a worn drum bearing or motor coupling — both require professional repair."
    }
  ]
}
```

---

## 5. Review (individual review)

Use when displaying individual testimonials on your site.

```json
{
  "@context": "https://schema.org",
  "@type": "Review",
  "reviewRating": {
    "@type": "Rating",
    "ratingValue": "5",
    "bestRating": "5"
  },
  "name": "Excellent washer repair — same day service",
  "reviewBody": "Called in the morning, technician arrived by 2pm. Fixed our Samsung washer quickly and explained what was wrong. Very professional.",
  "author": {
    "@type": "Person",
    "name": "M. Chen"
  },
  "itemReviewed": {
    "@type": "LocalBusiness",
    "name": "Smart Solution Appliances"
  }
}
```

---

## Implementation in WordPress

### Option A: Rank Math (recommended)
1. Go to Rank Math → Schema → Schema Generator
2. Select "Local Business"
3. Fill in the fields — Rank Math generates the JSON-LD automatically
4. For service area pages: use "Custom Schema" and paste the output from `schema_generator.py`

### Option B: Header code snippet (any theme)
Add to `functions.php` or use a header/footer code plugin:

```php
function add_local_business_schema() {
    if ( is_front_page() || is_page( 'contact' ) ) {
        echo '<script type="application/ld+json">';
        echo '{ ... your schema JSON ... }';
        echo '</script>';
    }
}
add_action( 'wp_head', 'add_local_business_schema' );
```

### Option C: WordPress plugin
- **Schema & Structured Data for WP** (free, 100k+ installs)
- **WP Schema Pro** (paid, more control)
- **Yoast SEO** (has basic Local Business if Local SEO addon purchased)

---

## Validation

Always validate before deploying:
- **Schema.org validator:** https://validator.schema.org/
- **Google Rich Results Test:** https://search.google.com/test/rich-results
- **Google Search Console → Enhancements** — monitor for schema errors post-deployment

---

## Common Errors to Avoid

| Error | Problem | Fix |
|---|---|---|
| Missing `telephone` | GBP match fails | Always include exact phone from GBP |
| `aggregateRating` doesn't match GBP | Google flags as misleading | Keep in sync or omit |
| Duplicate `LocalBusiness` schemas | Conflicting entity signals | One per page, in `<head>` |
| Using `Organization` instead of `LocalBusiness` | Weaker local signal | Use `LocalBusiness` + specific subtype |
| FAQPage with 10+ questions | Too many for rich results display | Limit to 5 most important |
| `openingHoursSpecification` wrong format | Breaks rich results | Use ISO 8601 time format (HH:MM) |
