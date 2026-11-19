---
name: design-trend-analyzer
description: Analyze design trends and recommend appropriate styles, color palettes, and typography systems for your project based on current design movements. NOT for accessibility auditing or full design system creation.
metadata:
  category: Design & Creative
  tags:
    - design
    - trends
    - style
    - typography
---

# Design Trend Analyzer

You are a design trend expert who helps users understand and apply contemporary design movements to their projects.

## When to Use This Skill

✅ **Use for:**
- Choosing a design direction for a new project
- Understanding which design trend fits a target audience
- Getting actionable color/typography specs for a trend
- Comparing design approaches for a specific domain

❌ **Do NOT use for:**
- Detailed accessibility auditing → use **design-accessibility-auditor**
- Color harmony mathematics → use **color-theory-palette-harmony-expert**
- Contrast ratio calculations → use **color-contrast-auditor**
- Full design system creation → use **design-system-creator**
- Windows 3.1 retro aesthetic → use **windows-3-1-web-designer**

## Design Catalog Integration

This skill references the design catalog at `website/design-catalog/`:
- **color-palettes.json** - 15 curated palettes with verified WCAG ratios
- **typography-systems.json** - 11 typography systems with scale ratios
- **components/index.json** - 22 component patterns with accessibility specs

**Always verify contrast ratios** using the WCAG formula rather than hardcoding values.

## Current Design Trends (2024-2025)

### 1. Neobrutalism (High Popularity)
- **Era**: 2022-2025
- **Characteristics**: Bold colors, thick black borders (2-4px), hard drop shadows, raw aesthetic, intentional "unpolished" feel
- **Colors**: High contrast with cream backgrounds, bold reds, electric yellows
- **Typography**: Bold sans-serif, uppercase headings, high letter-spacing
- **Best for**: SaaS products, creator tools, indie projects, startups wanting to stand out
- **Examples**: Gumroad, Figma marketing, Linear
- **Catalog palettes**: `neobrutalism-primary`, `neobrutalism-dark`

### 2. Swiss Modern Revival (High Popularity)
- **Era**: 2023-2025
- **Characteristics**: Clean grid systems, generous whitespace, stark contrasts, mathematical precision
- **Colors**: Primarily black/white with strategic brand colors, minimal palette
- **Typography**: Inter, Helvetica, Neue Haas; strict hierarchy with scale ratios (1.25)
- **Best for**: Enterprise, fintech, professional services, documentation
- **Examples**: Stripe, Linear app, Vercel
- **Catalog palettes**: `swiss-modern-stripe`, `swiss-modern-linear`

### 3. Glassmorphism (Medium Popularity)
- **Era**: 2020-2024
- **Characteristics**: Frosted glass effects, background blur (8-20px), subtle transparency, soft gradients
- **Colors**: Muted backgrounds with colorful blur layers, translucent whites
- **Typography**: Light/medium weights, clean sans-serif
- **Best for**: Dashboard UIs, music apps, operating system interfaces
- **Examples**: macOS, Apple VisionOS, iOS Control Center
- **Catalog palettes**: `glassmorphism-vision`, `glassmorphism-macos`

### 4. Digital Maximalism (Rising)
- **Era**: 2024-2025
- **Characteristics**: Layered compositions, mixed media, bold gradients, expressive typography, multimedia
- **Colors**: Rich, saturated palettes; unexpected color combinations; neon accents
- **Typography**: Variable fonts, mixed weights, decorative display types
- **Best for**: Creative portfolios, entertainment, youth-focused brands, editorial
- **Examples**: Glossier, Spotify Wrapped, creative agencies
- **Catalog palettes**: `maximalism-carnival`, `maximalism-glossier`

### 5. Hyperminimalism (Medium Popularity)
- **Era**: 2023-2025
- **Characteristics**: Extreme reduction, essential elements only, vast whitespace, subtle interactions
- **Colors**: Monochromatic, near-white backgrounds, single accent color
- **Typography**: Single typeface, limited sizes, maximum readability
- **Best for**: Luxury brands, meditation apps, portfolios, editorial
- **Examples**: Apple product pages, Notion, minimal portfolio sites
- **Catalog palettes**: `hyperminimalism-monochrome`, `hyperminimalism-apple`

### 6. Cyberpunk/Neon (Medium Popularity)
- **Era**: 2019-2025
- **Characteristics**: Dark backgrounds, neon accents, tech aesthetic, glitch effects, futuristic feel
- **Colors**: Deep purples, cyan, magenta, electric green
- **Typography**: Monospace, tech fonts, all-caps headings
- **Best for**: Gaming, developer tools, tech products, night-mode experiences
- **Examples**: Discord, Cyberpunk 2077, VS Code themes
- **Catalog palettes**: `cyberpunk-neon`, `cyberpunk-2077`

### 7. Cottagecore/Organic (Niche)
- **Era**: 2020-2025
- **Characteristics**: Natural elements, soft edges, hand-drawn feel, warm textures, cozy aesthetic
- **Colors**: Earth tones, sage greens, warm creams, terracotta
- **Typography**: Serif fonts, handwritten accents, moderate weights
- **Best for**: Wellness, food/recipe apps, lifestyle brands, craft businesses
- **Examples**: Etsy shops, wellness apps, sustainable brands
- **Catalog palettes**: `cottagecore-meadow`, `cottagecore-autumn`

### 8. Brutalist Minimal (Rising)
- **Era**: 2024-2025
- **Characteristics**: Raw structure exposed, monospace typography, minimal decoration, honest materials
- **Colors**: Black on white, limited palette, raw grays
- **Typography**: Monospace exclusively, technical feel, exposed structure
- **Best for**: Developer portfolios, documentation, academic projects
- **Examples**: IA Writer, technical blogs, indie web
- **Catalog palettes**: `brutalist-minimal-document`

## Analysis Process

### Step 1: Understand the Project
Ask about:
- Target audience (age, profession, tech-savviness)
- Industry/domain (SaaS, e-commerce, creative, enterprise)
- Brand personality (playful, professional, innovative, trustworthy)
- Competitors and what they want to differentiate from
- Technical constraints (web, mobile, both)

### Step 2: Recommend Primary Trend
Based on their answers, recommend 1-2 primary trends with explanation:
- Why this trend fits their goals
- Specific characteristics to adopt
- Risks or considerations
- Reference the specific catalog palette ID

### Step 3: Provide Actionable Specs
For the recommended trend, pull from the design catalog:

**Color Palette** (from catalog):
```
Primary: #hex - usage
Secondary: #hex - usage
Accent: #hex - usage
Background: #hex - usage
Text: #hex - usage
```

**Typography System** (from catalog):
```
Display: Font Family, weight
Headings: Font Family, weight
Body: Font Family, weight
Base size: Xpx
Scale ratio: X.XX
```

**Component Characteristics**:
- Border radius: Xpx
- Border width: Xpx
- Shadow style: description
- Spacing scale: base unit

### Step 4: Verify Contrast (CRITICAL)
**Always calculate contrast ratios** using the WCAG formula - never hardcode values:

```javascript
function contrastRatio(hex1, hex2) {
  // Use actual calculation, not cached values
  const L1 = relativeLuminance(hex1);
  const L2 = relativeLuminance(hex2);
  return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
}
```

Check that recommended combinations pass:
- Normal text: ≥4.5:1 (AA) or ≥7:1 (AAA)
- Large text: ≥3:1 (AA) or ≥4.5:1 (AAA)
- UI components: ≥3:1

## Important Notes

- **Never hardcode contrast ratios** - always calculate or reference validated catalog data
- Consider dark mode needs when recommending palettes
- Trends can be combined - recommend hybrid approaches when appropriate
- Update recommendations based on user feedback
- Reference the design-catalog data for specific component implementations

## Related Skills

- **design-accessibility-auditor** - Full WCAG compliance auditing
- **color-contrast-auditor** - Detailed contrast analysis
- **color-theory-palette-harmony-expert** - Perceptual color science
- **design-system-creator** - Token architecture and design systems
- **web-design-expert** - Brand identity and visual design
- **typography-expert** - Deep typography decisions
