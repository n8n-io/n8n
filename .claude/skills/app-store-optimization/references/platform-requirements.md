# Platform Requirements Reference

Technical specifications and metadata requirements for Apple App Store and Google Play Store.

---

## Table of Contents

- [Apple App Store Requirements](#apple-app-store-requirements)
- [Google Play Store Requirements](#google-play-store-requirements)
- [Visual Asset Specifications](#visual-asset-specifications)
- [Localization Requirements](#localization-requirements)
- [Compliance Guidelines](#compliance-guidelines)

---

## Apple App Store Requirements

### Metadata Character Limits

| Field | Character Limit | Notes |
|-------|----------------|-------|
| App Name (Title) | 30 characters | Visible in search results |
| Subtitle | 30 characters | iOS 11+ only, appears below title |
| Promotional Text | 170 characters | Editable without app update |
| Description | 4,000 characters | Not indexed for search |
| Keywords Field | 100 characters | Comma-separated, no spaces after commas |
| What's New | 4,000 characters | Release notes for updates |
| Developer Name | 255 characters | Company or individual name |
| Support URL | Required | Must be valid HTTPS URL |
| Privacy Policy URL | Required | Must be valid HTTPS URL |

### Keyword Field Optimization Rules

1. **No duplicates** - Words in title are already indexed
2. **No plurals** - Apple indexes both singular and plural forms
3. **No spaces after commas** - Wastes character space
4. **No brand names** - Violates App Store guidelines
5. **No category names** - Already indexed via category selection

**Example - Efficient keyword field:**
```
task,todo,checklist,reminder,productivity,organize,schedule,planner,goals,habit
```

**Example - Inefficient keyword field (avoid):**
```
task manager, todo list, productivity app, task tracking
```

### App Store Connect Metadata Fields

| Category | Field | Required |
|----------|-------|----------|
| **App Information** | Name | Yes |
| | Subtitle | No |
| | Category | Yes |
| | Secondary Category | No |
| | Content Rights | Yes |
| | Age Rating | Yes |
| **Version Information** | Description | Yes |
| | Keywords | Yes |
| | Promotional Text | No |
| | What's New | Yes (for updates) |
| | Support URL | Yes |
| | Marketing URL | No |
| **Pricing** | Price Tier | Yes |
| | Availability | Yes |

### Age Rating Content Descriptors

| Content Type | None | Infrequent | Frequent |
|--------------|------|------------|----------|
| Cartoon Violence | 4+ | 9+ | 12+ |
| Realistic Violence | 9+ | 12+ | 17+ |
| Sexual Content | 12+ | 17+ | 17+ |
| Profanity | 4+ | 12+ | 17+ |
| Alcohol/Drug Reference | 12+ | 17+ | 17+ |
| Gambling | 12+ | 17+ | 17+ |
| Horror/Fear | 9+ | 12+ | 17+ |

---

## Google Play Store Requirements

### Metadata Character Limits

| Field | Character Limit | Notes |
|-------|----------------|-------|
| App Title | 50 characters | Increased from 30 in 2021 |
| Short Description | 80 characters | Visible on store listing |
| Full Description | 4,000 characters | Indexed for search keywords |
| Developer Name | 64 characters | Organization or individual |
| Developer Email | Required | Public support contact |
| Privacy Policy URL | Required | Must be valid HTTPS URL |

### Description Keyword Strategy

Google Play has no separate keyword field. Keywords are extracted from:

1. **App Title** - Highest weight, most important
2. **Short Description** - High weight, visible in search
3. **Full Description** - Medium weight, use naturally throughout
4. **Developer Name** - Low weight but indexed

**Keyword Density Guidelines:**
- Primary keyword: 2-3% density in full description
- Secondary keywords: 1-2% each
- Avoid keyword stuffing (>5% triggers spam detection)

### Google Play Console Metadata

| Category | Field | Required |
|----------|-------|----------|
| **Store Listing** | Title | Yes |
| | Short Description | Yes |
| | Full Description | Yes |
| | App Icon | Yes |
| | Feature Graphic | Yes |
| | Screenshots | Yes (min 2) |
| | Video | No |
| **Store Settings** | App Category | Yes |
| | Tags | No |
| | Contact Email | Yes |
| | Privacy Policy | Yes |
| **Content Rating** | IARC Questionnaire | Yes |

### Content Rating (IARC)

| Rating | Age | Description |
|--------|-----|-------------|
| PEGI 3 / Everyone | 3+ | Suitable for all ages |
| PEGI 7 / Everyone 10+ | 7+ | Mild violence, comic mischief |
| PEGI 12 / Teen | 12+ | Moderate violence, mild language |
| PEGI 16 / Mature 17+ | 16+ | Intense violence, strong language |
| PEGI 18 / Adults Only | 18+ | Extreme content |

---

## Visual Asset Specifications

### App Icon Requirements

**Apple App Store:**

| Device | Size | Format |
|--------|------|--------|
| iPhone | 1024x1024 px | PNG, no alpha |
| iPad | 1024x1024 px | PNG, no alpha |
| App Store | 1024x1024 px | PNG, no alpha |
| Spotlight | 120x120 px | PNG |
| Settings | 87x87 px | PNG |

**Google Play Store:**

| Asset | Size | Format |
|-------|------|--------|
| App Icon | 512x512 px | PNG, 32-bit |
| Feature Graphic | 1024x500 px | PNG or JPG |
| Promo Graphic | 180x120 px | PNG or JPG |
| TV Banner | 1280x720 px | PNG or JPG |

### Screenshot Requirements

**Apple App Store:**

| Device | Portrait | Landscape |
|--------|----------|-----------|
| iPhone 6.9" | 1320x2868 px | 2868x1320 px |
| iPhone 6.5" | 1290x2796 px | 2796x1290 px |
| iPhone 5.5" | 1242x2208 px | 2208x1242 px |
| iPad Pro 12.9" | 2048x2732 px | 2732x2048 px |
| iPad 10.5" | 1668x2224 px | 2224x1668 px |

- Minimum: 2 screenshots per device
- Maximum: 10 screenshots per device
- Format: PNG or JPG, no alpha channel
- First 3 screenshots are critical (most users don't scroll)

**Google Play Store:**

| Device | Dimensions | Notes |
|--------|------------|-------|
| Phone | 320-3840 px | Min 2:1 aspect ratio |
| 7" Tablet | 320-3840 px | Min 2:1 aspect ratio |
| 10" Tablet | 320-3840 px | Min 2:1 aspect ratio |
| Chromebook | 320-3840 px | Optional |
| TV | 320-3840 px | For TV apps only |

- Minimum: 2 screenshots
- Maximum: 8 screenshots
- Format: PNG or JPG
- No transparency or borders

### App Preview Video

**Apple App Store:**
- Duration: 15-30 seconds
- Resolution: Match device screenshot size
- Format: M4V, MP4, MOV
- Frame rate: 30 fps
- Audio: Optional but recommended

**Google Play Store:**
- YouTube video link only
- No duration limit (recommend under 2 minutes)
- Landscape orientation preferred
- Must not contain age-restricted content

---

## Localization Requirements

### Priority Markets by Revenue

| Rank | Market | Language Code |
|------|--------|---------------|
| 1 | United States | en-US |
| 2 | Japan | ja |
| 3 | United Kingdom | en-GB |
| 4 | Germany | de-DE |
| 5 | China | zh-Hans (iOS), zh-CN (Android) |
| 6 | South Korea | ko |
| 7 | France | fr-FR |
| 8 | Canada | en-CA, fr-CA |
| 9 | Australia | en-AU |
| 10 | Russia | ru |

### Apple App Store Localization

Supported localizations: 40+ languages

| Language | Locale Code |
|----------|-------------|
| English (US) | en-US |
| English (UK) | en-GB |
| Spanish | es-ES |
| Spanish (Mexico) | es-MX |
| French | fr-FR |
| German | de-DE |
| Japanese | ja |
| Korean | ko |
| Simplified Chinese | zh-Hans |
| Traditional Chinese | zh-Hant |

### Google Play Store Localization

Supported localizations: 75+ languages

Each locale requires:
- Title (50 chars)
- Short description (80 chars)
- Full description (4,000 chars)
- Screenshots (can reuse or localize)

---

## Compliance Guidelines

### Apple App Store Review Guidelines Summary

| Category | Key Requirements |
|----------|------------------|
| **Safety** | No objectionable content, privacy protection |
| **Performance** | App must work as described, no crashes |
| **Business** | Accurate app description, clear pricing |
| **Design** | Follow Human Interface Guidelines |
| **Legal** | Comply with local laws, proper licensing |

**Common Rejection Reasons:**
1. Bugs and crashes (50%+ of rejections)
2. Broken links or placeholder content
3. Misleading app descriptions
4. Privacy policy missing or incomplete
5. In-app purchase issues

### Google Play Developer Policies

| Policy Area | Requirements |
|-------------|--------------|
| **Restricted Content** | No hate speech, violence, gambling (without license) |
| **Privacy** | Data collection disclosure, privacy policy |
| **Monetization** | Clear pricing, compliant IAPs |
| **Ads** | No deceptive ads, proper disclosure |
| **Store Listing** | Accurate description, no keyword stuffing |

**Common Suspension Reasons:**
1. Policy violation (content, ads, permissions)
2. Repetitive content (clone apps)
3. Impersonation (fake apps)
4. Intellectual property infringement
5. Malicious behavior

### Privacy Requirements

**Apple (App Tracking Transparency):**
- ATT prompt required for tracking
- Privacy nutrition labels mandatory
- Data collection disclosure required

**Google (Data Safety):**
- Data safety section mandatory
- Data collection and sharing disclosure
- Security practices declaration

---

## Quick Reference Card

### Apple vs Google Comparison

| Attribute | Apple App Store | Google Play Store |
|-----------|-----------------|-------------------|
| Title Length | 30 chars | 50 chars |
| Subtitle | 30 chars | N/A |
| Short Description | N/A | 80 chars |
| Full Description | 4,000 chars | 4,000 chars |
| Keywords Field | 100 chars | N/A (in description) |
| Promotional Text | 170 chars | N/A |
| Icon Size | 1024x1024 px | 512x512 px |
| Min Screenshots | 2 | 2 |
| Max Screenshots | 10 | 8 |
| Review Time | 24-48 hours | 1-7 days |
| Metadata Update | Requires review | 1-2 hours to index |
