# Type

Typography is most of what a visitor sees and most of what makes a page look designed or assembled.
The direction sheet deals you a type system (faces, weights, settings). This file is how to use it.

## Contents

1. What the study measured
2. The scale: few sizes, far apart
3. Setting display type
4. Setting text
5. Loading the fonts properly
6. One family or two
7. Details that separate set type from typed text
8. Mistakes the inspector cannot see

## 1. What the study measured

From 202 measurable sites out of the 247 studied (Chrome, 1440×900 and 390×844):

| | Median | Middle half | Note |
| --- | --- | --- | --- |
| Hero headline size | 72px (5.0vw) | 43–109px | Top-scored sites: 6.0vw median |
| Largest type on the page | 6.4vw | up to 10.4vw | Top-scored sites 8.4vw, weak sites 5.0vw |
| Hero headline on a phone | 40px | 32–59px | |
| Hero tracking | -0.01em | -0.03 to 0 | Tighter as size grows |
| Hero leading | 1.0 | 0.95–1.1 | |
| Body size | 16px | 14–18px | |
| Headline ÷ body size | 4.3 | | Top-scored sites 4.7 |
| Typefaces in real use | 2 | 31% use one, 45% two, 22% three | |
| Hero weight | regular 48%, medium 18%, bold or heavier 22% | | Big type does not need to be bold |
| Hero in capitals | 24% | | |
| Hero centred | 39% | | 52% on the weak sites |

Two things to take from it. First, size contrast is the main lever and the best sites pull it harder.
Second, weight is not: half of the heroes are set in a regular weight. Scale and spacing make type
confident; bold is one option among several.

## 2. The scale: few sizes, far apart

The panel described about 30 of the 114 strongest sites as using two or three type sizes with nothing
in between, and none as using a graded five- or six-step scale. So: one display size, one text size
and a small size carry the page; a lead size and a heading size exist for when they are needed. Five
is the ceiling. The common failure is nine sizes that are all near each other (16, 18, 20, 24, 28,
32…), which reads as mush. Choose steps that are clearly different:

```css
:root {
  --step-small: clamp(0.8125rem, 0.79rem + 0.1vw, 0.875rem);   /* 13–14px  captions, legal */
  --step-body:  clamp(1.0625rem, 1rem + 0.25vw, 1.1875rem);    /* 17–19px  paragraphs */
  --step-lead:  clamp(1.25rem, 1.1rem + 0.7vw, 1.625rem);      /* 20–26px  supporting line, large body */
  --step-head:  clamp(2rem, 1.3rem + 3.2vw, 4rem);             /* 32–64px  section headings */
  --step-display: clamp(3rem, 1rem + 9vw, 9rem);               /* set by the hero blueprint */
}
```

- `--step-display` belongs to the direction. A monument wordmark is 16–24vw; a quiet instrument's
  headline is 28px. Use the size the hero blueprint gives, as a `clamp()` so it scales with the
  viewport but is bounded on phones and very wide screens.
- Keep the gap: the display size should be at least four times the body size on desktop, and nothing
  should sit between `--step-lead` and `--step-head` unless the design truly needs a sixth size.
- Resist a "subheading" size for every card and label. If two sizes look almost the same, make them
  the same.

## 3. Setting display type

Large type exposes spacing that is invisible at text size. Apply all of these to anything over 40px:

```css
.display {
  font-size: var(--step-display);
  line-height: 0.95;              /* 0.85–1.05; tighter for capitals and condensed faces */
  letter-spacing: -0.035em;       /* -0.02 to -0.05em; use the value on the direction sheet */
  font-kerning: normal;
  text-wrap: balance;
  max-width: 14ch;                /* choose the measure so lines break where you want */
  margin: 0;
}
```

- **Tracking scales with size.** The larger the type, the tighter it needs to be; a value right for
  120px will choke 32px. Set tracking per step, not once for all headings.
- **Leading below 1.0 needs checking.** Look for collisions between descenders and the ascenders or
  accents of the next line. Two-line headlines make this easy to verify by eye.
- **All capitals** want slightly open tracking (0 to +0.03em) even at display size, and leading around
  0.9.
- **Optical alignment.** Big letters with round or diagonal left edges (O, C, A, T, W) look indented.
  Pull the headline left by about 0.04–0.06em (`margin-left: -0.05em`) so it aligns optically with the
  text beneath it.
- **Viewport-wide type.** For a line that must span the screen, size it in `vw` and verify at 390 and
  1440; set `white-space: nowrap` and let the container clip rather than wrap. Calculate the size from
  the character count: `font-size ≈ container width ÷ (characters × k)` with k from `copy.md` §2.
- Never add a text shadow, an outline stroke, or a gradient fill to display type.

## 4. Setting text

```css
body { font-size: var(--step-body); line-height: 1.5; font-kerning: normal; text-rendering: optimizeLegibility; }
p { max-width: 62ch; text-wrap: pretty; margin: 0; }
p + p { margin-top: 0.9em; }
.lead { font-size: var(--step-lead); line-height: 1.35; max-width: 40ch; }
small, .caption { font-size: var(--step-small); line-height: 1.45; }
```

- Measure: 45–75 characters. Wider than that and the eye loses the next line; the inspector warns
  past about 88.
- Leading: 1.45–1.6 for body, tighter (1.3–1.4) for the larger lead size, looser for long reading.
- Secondary text is the same face in a softer ink (`--muted`), not a lighter weight and not smaller
  than 13px.
- Do not centre paragraphs longer than three lines. Do not justify.
- Light text on a dark ground looks heavier: drop one weight step or add 0.01em tracking, and raise
  leading slightly.

## 5. Loading the fonts properly

The sheet gives a `<link>` tag. Use it exactly; do not swap in a face you prefer.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="…from the direction sheet…" rel="stylesheet">
```

```css
:root {
  --font-display: "Family From Sheet", "Helvetica Neue", Arial, sans-serif;
  --font-text: "Family From Sheet", Georgia, serif;
}
```

- Request only the weights you use (usually two or three in total).
- Always give a fallback stack of the same broad kind (sans for sans, serif for serif).
- In a framework, use its font loader with the same family and weights (`next/font/google`, or a
  self-hosted `@font-face` with `font-display: swap`). Fontshare faces load from the
  `api.fontshare.com` stylesheet on the sheet.
- After building, `inspect.mjs` reports the families that actually rendered. If it warns that a face
  did not load, the screenshots show a fallback and nothing you judge from them is real. Fix the link
  first.

## 6. One family or two

A third of the studied sites use a single family for everything, and it is the safest way to look
coherent. When the dealt system has two faces:

- Give each a job and never swap them: one sets headlines, the other sets everything else.
- Do not introduce a third face for labels, numbers or quotes.
- Do not mix two faces inside one headline.
- Italic is for titles of works and real emphasis inside paragraphs, never as decoration.

## 7. Details that separate set type from typed text

- Curly quotes and apostrophes, real dashes, a real ellipsis (see `copy.md` §7).
- `font-variant-numeric: tabular-nums` for prices, tables, dates in columns; `oldstyle-nums` suits
  serif body text.
- `text-underline-offset: 0.18em; text-decoration-thickness: 0.07em` on links, so underlines clear the
  descenders.
- `hyphens: none` on headings. `overflow-wrap: anywhere` only on long URLs or emails.
- A heading belongs to the text after it: space above a heading is at least twice the space below.
- `::selection { background: var(--accent); color: var(--accent-ink); }` and a visible
  `:focus-visible` outline in the accent, so even the browser's own states belong to the design.
- Do not change weight on hover; the line reflows.

## 8. Mistakes the inspector cannot see

- A headline that passes the two-line rule but breaks badly: one orphan word on line two, or a break
  that splits a phrase ("Stools for small / kitchens"). Author the break.
- Display type so tight that letters touch, or so loose it falls apart.
- A confident hero followed by section headings almost as large. Keep one size dominant per screen.
- Body text set in the display face when that face was drawn for large sizes only.
- Everything bold. If every line is emphasised, none is.
