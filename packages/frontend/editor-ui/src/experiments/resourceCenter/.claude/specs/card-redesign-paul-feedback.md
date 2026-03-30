# Resource Center Card Redesign — Paul's Feedback (2026-03-17)

## Context
Paul reviewed the 3 card variants and chose **Variant B (Accent Border)** as the winner. This spec implements his feedback on top of variant B, removes variants A and C, and adds search/filtering.

## Changes

### 1. Remove variants A and C
- Remove `CardVariant` type export and `variant` prop from `ResourceCard.vue`
- Remove all variant A (Header Strip) and variant C (Spotlight) template + styles
- Keep only variant B markup, rename classes from `accent*` to simpler names
- Remove variant switcher UI from `ResourceCenterView.vue`
- Remove `VARIANT_STORAGE_KEY`, `CARD_VARIANTS`, `cardVariant` ref, `setVariant` function
- Remove variant prop from all `<ResourceCard>` usages
- Update tests to remove `describe.each` over variants — test single design only

### 2. Ready-to-run cards: greytone icon + CTA button
**Only applies to cards with `item.type === 'ready-to-run'`.**

- Add a large (~32px) **greytone node icon** on the left side of the card
  - Use the first resolved node type's icon
  - Render in muted grey using CSS `filter: grayscale(1) opacity(0.5)` or similar
  - If no node types resolve, show nothing (no placeholder)
- Add a green **"Run workflow"** CTA button at the bottom
  - Background: `var(--color--success)`, text: white
  - Small play triangle icon + "Run workflow" text
  - `font-size: --font-size--2xs`, `padding: 4px 12px`, `border-radius: --radius`
- Layout: card becomes a horizontal layout for ready-to-run
  - Left: greytone icon (centered vertically)
  - Right: pill badge, title, CTA button (stacked vertically)
- Remove the "No setup needed" metadata (CTA already signals actionability)
- Keep `nodeTypes` resolution for the greytone icon

### 3. Remove left color border, enhance pill
- Remove `border-left: 4px solid` and all `accent_<type>` color classes
- Increase pill badge background opacity from 18% → 25%
- Card keeps `--color--background--light-3` background
- Card keeps `border: var(--border)` and `border-radius: var(--radius--lg)`

### 4. Node icons: max 2, allowlist only
**Applies to template and ready-to-run cards.**

Add a priority allowlist of display names:
```typescript
const PRIORITY_NODE_DISPLAY_NAMES = new Set([
  'Google Sheets',
  'AI Agent',
  'Gmail',
  'OpenAI',
  'Slack',
  'Telegram',
  'Google Gemini',
  'Anthropic Chat Model',
  'Airtable',
  'Google Drive',
  'Webhook',
  'Code',
  'n8n Form',
  'Microsoft Excel 365',
  'Notion',
  'Supabase',
  'Discord',
  'Postgres',
]);
```

- Filter `resolvedNodeTypes` to only include nodes whose `displayName` is in the allowlist
- Sort by priority order (Set iteration order = insertion order)
- Cap at **2** icons
- For ready-to-run cards, use only the **first** icon (greytone, large)
- For template cards, show up to 2 inline at bottom-right of metadata row (existing position)

### 5. Search bar + type filter pills
**In ResourceCenterView.vue:**

Add above all sections:
- **Search input**: text input with search icon, placeholder "Search templates and guides..."
  - Filters all cards across all sections by case-insensitive title substring match
  - When search is active, collapse section headers and show flat results
  - Debounce input (use `getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH)`)
- **Filter pills** next to search: All, Templates, Videos
  - "All" = default, shows everything
  - "Templates" = `type === 'template'` and `type === 'ready-to-run'`
  - "Videos" = `type === 'video'`
  - No "Beginner" filter for now (insufficient content)
  - Styled as rounded pills, active pill has filled background
- Ready-to-run section is included in filtering (not exempt)
- When both search + filter active, apply both (AND logic)
- Show "No results" message when filters produce empty results

### 6. Ready-to-run section: 2-column layout
- Ready-to-run ("Get Started") section uses a **2-column grid** instead of 3-column
- Other sections stay 3-column
- This matches Paul's mockup where ready-to-run cards are wider/more prominent

## Files to modify
1. `ResourceCard.vue` — remove variants A/C, implement items 2-4
2. `ResourceCenterView.vue` — remove switcher, add search/filter, 2-column grid
3. `__tests__/ResourceCard.test.ts` — simplify tests, remove variant parameterization
4. i18n strings if needed for "Run workflow", "Search templates and guides...", filter labels

## Out of scope
- "Building Prompts" filter category (no content yet)
- Node icon run animation (future iteration)
- "See all →" links on sections
