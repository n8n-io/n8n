# Tells — the dated registry

A tell is a device that makes a page read as generated. Tells are not bad design in themselves; most
began as good ideas on good sites. They became tells by being produced by default, everywhere, without
a reason. That is why this registry is dated, and why it never names a replacement font, colour or
component: every published "use this instead" list has become the next wave of tells within months.
Replacements here are procedures (draw from the library, derive from the subject), not products.

`scripts/inspect.mjs` and `scripts/lint.mjs` detect most entries. Status: **banned** means the
inspector fails the page; **warned** means it flags it and you need a reason.

## Contents

1. First wave (2023–2024)
2. Second wave (2025)
3. Third wave (2025–2026): the "fix" that became the look
4. Gallery fashion, banned as house style
5. Structural tells
6. Copy tells
7. Motion tells
8. Why removal is not enough

## 1. First wave (2023–2024)

| Tell | Status | Do instead |
| --- | --- | --- |
| Violet / indigo gradients on hero, buttons and glows | banned | The dealt palette; flat colour |
| Gradient-filled headline text | banned | Solid ink |
| Glass panels: backdrop blur, translucent cards | warned (2 or more) | Opaque surfaces one tone step from the ground |
| Glowing or gradient "Get started" button | banned | Flat button named for its action |
| Soft grey drop shadow under every card | banned | Tone step, or no box |
| Three identical feature cards, each with an icon in a rounded square | banned | The dealt section blueprint |
| Emoji as icons or bullets | banned | Words, or a real picture |
| Centred headline, subtitle, two buttons, screenshot below | no rule; the draw avoids it | The dealt hero |
| The same typeface on every generated page | warned (lint: default-font) | The dealt type system |

## 2. Second wave (2025)

| Tell | Status | Do instead |
| --- | --- | --- |
| Eyebrow / kicker: tiny tracked uppercase label above every heading | banned | Fold it into the heading, or delete |
| Pill badge above the hero headline ("New", "Beta", "Introducing") | banned | Say it in the supporting sentence |
| One word of the headline in italic serif, colour or underline | warned | One face, one colour |
| Bento grid of rounded tiles as the feature section | warned as card rows | A composed section; tiles only in the dense-tiles direction, filled, strict sizes |
| Near-black ground with one neon accent and a glow | banned via shadow, gradient | A dealt dark palette, no glow |
| Floating rounded pill navigation with blur | warned | A plain bar |
| Fake dashboard hero built from grey bars and donut charts | no rule; see imagery.md §7 | A real interface fragment, or no image |
| Decorative status dot ("Available for work", pulsing "live") | lint: bounce | Remove |
| Fade-and-rise on every section | no rule; see motion.md | One signature move |

## 3. Third wave (2025–2026): the "fix" that became the look

The remedy published for the first two waves was "warm it up and make it editorial". Models adopted
the remedy wholesale and it is now the most recognisable generated look of all.

| Tell | Status | Do instead |
| --- | --- | --- |
| Yellow-cream ground + terracotta / rust / clay accent | banned together; terracotta banned alone; cream warned | The dealt palette. Warmth from a low-chroma stone, a deep ink, a photograph, or a full warm field |
| High-contrast or soft serif display as the shortcut to "premium" | no rule | The dealt type system, whatever class it is |
| Oversized italic serif headline | no rule | As dealt |
| Broadsheet cosplay: hairline rules everywhere, zero radius, dense columns | banned via hairline | Structure from space and tone |
| "Field notes", "Quietly trusted by", "On our desks": performative labels | lint: copy | Plain section names |

## 4. Gallery fashion, banned as house style

These are common on award sites right now. In the study they appear *more* often on the top-scored
sites than on the weak ones (panel observations: monospace labels 44% against 24%, index numbering 38%
against 21%; measured thin rules 61% against 52%). They are banned here regardless, by the owner's
decision: they are the first things a generator copies from the gallery, they carry no information,
and a page built without them has to find real structure.

| Tell | Status | Do instead |
| --- | --- | --- |
| Monospace micro-labels, mono as a "technical" voice, mono captions | banned | The text face; tabular figures for data |
| Index numbering: 01 / 02 / 03, (001), "Step 02", numbered section markers | banned | Order by position, scale, or the words; `<ol>` when it is truly a list |
| Thin rules: hairline dividers, ruled grids, 1px outlined boxes and tiles | banned (boxes: 3 or more) | Space, tone steps, filled shapes, a thick bar if a bar is the idea |
| Design-tool chrome as ornament: crosshairs, crop marks, selection handles, dashed guides, rulers | banned via hairline, dashed | Remove |
| Agency micro-meta: local time, coordinates, weather, version stamps, "©2026 — Scroll", middle-dot strings | lint: copy; micro-label | Remove |
| Tiny uppercase letter-spaced captions scattered around the viewport | banned (3 or more) | Sentence case at readable size, placed with the content it describes |

Tiny tracked capitals are the one item in this group the data condemns as well: 16% of top sites
against 57% of weak ones.

## 5. Structural tells

| Tell | Status | Do instead |
| --- | --- | --- |
| Headline as a full sentence at display size, three or four lines | banned (over two lines) | A title of about five words; the rest goes below |
| Stock section order: hero, logos, features, testimonial, pricing, CTA | no rule; see copy.md §1 | The order of the argument |
| Every section the same layout family | critique.md pass 9 | Different composition per section, from the sheet |
| Everything centred | warned over 72% | Left-anchored, one centred moment |
| One medium border radius (12–16px) on everything | none | Square or fully round, chosen once |
| Nine nearly equal font sizes | warned over 9 | Five sizes, far apart |
| Invented social proof: logos, quotes, star rows, "10,000+ teams" | copy.md §5 | Real proof, or none |
| Text or a CSS box where a picture belongs | critique.md cap | A real picture, or a design that needs none |

## 6. Copy tells

Flagged by `lint.mjs`: the genre's verbs and adjectives (unlock, supercharge, seamless, elevate,
effortless, cutting-edge, all-in-one …); the correction ("not just X, it's Y"); tricolon headlines;
"Get started" and "Learn more" as labels; more than a handful of em dashes; lorem ipsum. See
`copy.md` §6.

## 7. Motion tells

Identical fade-up on every block; a dozen staggered hero entrances; hover lift on every card; bounce
easing; infinite loops that mean nothing; reveals that fail and leave a blank band. See `motion.md` §9.

## 8. Why removal is not enough

A page with every tell removed and nothing put in their place is an empty page with good manners, and
that is a tell too (the "avoidance aesthetic": anyone could guess it from the category plus the list of
things to avoid). The tells were filling a gap where an idea should have been. The order of work in
`SKILL.md` exists to fill that gap first: the idea from the subject, the dealt composition, real
pictures or committed type, and only then the checks.
