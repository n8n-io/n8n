---
name: seo-visibility-expert
description: Comprehensive SEO, discoverability, and AI crawler optimization for web projects. Use for technical SEO audits, llms.txt/robots.txt setup, schema markup, social launch strategies (Product Hunt,
  HN, Reddit), and Answer Engine Optimization (AEO). Activate on 'SEO', 'discoverability', 'llms.txt', 'robots.txt', 'Product Hunt', 'launch strategy', 'get traffic', 'be found', 'search ranking'. NOT for
  paid advertising, PPC campaigns, or social media content creation (use marketing skills).
allowed-tools: Read,Write,Edit,Bash,Glob,Grep,WebFetch,WebSearch
metadata:
  category: Business & Monetization
  pairs-with:
  - skill: claude-ecosystem-promoter
    reason: Promote with SEO backing
  - skill: technical-writer
    reason: SEO-optimized documentation
  tags:
  - seo
  - llms-txt
  - discoverability
  - product-hunt
  - aeo
---

# SEO & Visibility Expert

Get your web projects discovered by both traditional search engines AND AI systems.

## Quick Start

1. **Create llms.txt** at site root → AI crawlers find your content
2. **Add JSON-LD schema** → Rich snippets in search results
3. **Verify robots.txt** → Allow good bots, block bad ones
4. **Generate sitemap.xml** → Help crawlers index everything
5. **Check Core Web Vitals** → PageSpeed Insights score &gt;90
6. **Add Open Graph tags** → Beautiful social previews

## When to Use

**Use for:**
- Technical SEO audits and fixes
- llms.txt for AI crawlers
- Schema.org/JSON-LD structured data
- Launch strategies (Product Hunt, HN, Reddit)
- Core Web Vitals optimization

**NOT for:**
- Paid advertising/PPC campaigns
- Social media content creation
- Email marketing campaigns

## The Modern Discovery Stack

```
┌─────────────────────────────────────────────┐
│          AI ANSWER ENGINES                  │
│  ChatGPT, Claude, Perplexity, Google AI     │
│  → llms.txt, structured data, AEO           │
├─────────────────────────────────────────────┤
│          TRADITIONAL SEARCH                 │
│  Google, Bing, DuckDuckGo                   │
│  → Technical SEO, content, backlinks        │
├─────────────────────────────────────────────┤
│          SOCIAL DISCOVERY                   │
│  Product Hunt, HN, Reddit, Twitter/X        │
│  → Launch timing, community, narratives     │
└─────────────────────────────────────────────┘
```

## Technical SEO Essentials

### Metadata Must-Haves

```html
<!-- Every page needs these -->
<title>Primary Keyword | Brand Name</title>
<meta name="description" content="150-160 chars with keywords">
<link rel="canonical" href="https://yoursite.com/page">

<!-- Open Graph for social -->
<meta property="og:title" content="Title for social shares">
<meta property="og:image" content="https://yoursite.com/og-image.png">
```

### URL Rules
- Lowercase, hyphen-separated
- Include primary keyword
- Keep under 60 characters
- No query parameters for content pages

## AI Crawler Optimization (AEO)

### llms.txt Quick Template

```markdown
# Your Site Name

> Brief tagline describing what you do

## Overview
2-3 sentences for AI systems.

## Key Features
- Feature 1: Description
- Feature 2: Description

## Documentation
- [Getting Started](/docs/getting-started)
- [API Reference](/docs/api)
```

### robots.txt for AI Era

```
# AI Crawlers - Allow them!
User-agent: GPTBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: PerplexityBot
Allow: /

# Sitemaps
Sitemap: https://yoursite.com/sitemap.xml
```

**Decision tree:**
- Want AI to reference your content? → Allow GPTBot, Claude-Web
- Training data concerns? → Disallow Google-Extended

## Social Launch Quick Guide

### Product Hunt
- Launch at **12:01 AM PST** exactly
- Best days: Tuesday, Wednesday, Thursday
- Never ask for upvotes directly → "Would love your feedback!"
- See `references/launch-checklists.md` for full checklist

### Hacker News
- Post 6-8 AM PST, Tuesday-Thursday
- Title: `Show HN: [Tool] – [Plain English description]`
- Be technical, humble, genuine
- Respond to every comment

### Reddit
- Participate before promoting (90/10 rule)
- Find niche subreddits for your domain
- r/SideProject, r/webdev, r/InternetIsBeautiful

## Core Web Vitals Targets

| Metric | Good | Needs Work | Poor |
|--------|------|------------|------|
| LCP (Largest Contentful Paint) | &lt;2.5s | 2.5-4s | &gt;4s |
| INP (Interaction to Next Paint) | &lt;200ms | 200-500ms | &gt;500ms |
| CLS (Cumulative Layout Shift) | &lt;0.1 | 0.1-0.25 | &gt;0.25 |

**Quick fixes:** Optimize images (LCP), minimize JS (INP), set explicit dimensions (CLS)

## Anti-Patterns

### 1. "Build It and They Will Come"
**Symptom:** Great product, zero traffic
**Fix:** Spend 50% of time on marketing/distribution

### 2. Ignoring AI Crawlers
**Symptom:** No llms.txt, blocking AI user agents
**Fix:** Create llms.txt, allow AI crawlers in robots.txt

### 3. Keyword Stuffing
**Symptom:** Unnatural keyword repetition
**Fix:** Write for humans first, keywords naturally

### 4. Launch and Abandon
**Symptom:** Big launch, then silence
**Fix:** Build in public, regular updates, consistent presence

### 5. No Schema Markup
**Symptom:** Plain search results, no rich snippets
**Fix:** Add JSON-LD for your content type (see references)

### 6. Ignoring Mobile
**Symptom:** Desktop-only testing
**Fix:** Mobile-first indexing is default. Test on devices.

## Measurement

**Free tools:**
- Google Search Console - Search performance
- PageSpeed Insights - Core Web Vitals
- Schema Validator - Structured data testing

**Track these:**
1. Organic search impressions/clicks
2. Referral traffic from social launches
3. Core Web Vitals scores
4. AI citations (search your brand in ChatGPT/Claude)

## Reference Files

| File | Contents |
|------|----------|
| `references/llms-txt-examples.md` | Full llms.txt examples for SaaS, docs, OSS, blogs |
| `references/schema-templates.md` | JSON-LD templates for all content types |
| `references/launch-checklists.md` | Detailed checklists for PH, HN, Reddit |

---

**Covers:** Technical SEO | AI Crawler Optimization | Social Launch Strategy | Core Web Vitals | Schema Markup

**Use with:** content-marketer (content strategy) | web-design-expert (landing pages) | indie-monetization-strategist (conversion)
