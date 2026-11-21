# Colour

The direction sheet deals a palette with named roles. This file is how to apply it so the page looks
decided rather than tinted.

## Contents

1. What the study measured
2. The roles
3. Proportion
4. Surfaces without lines or shadows
5. Colour fields
6. Dark pages
7. Colour and photographs
8. Contrast
9. Banned families, and what "warm" means here

## 1. What the study measured

- 41% of the studied pages are dark, 59% light. A quarter sit on pure white; 12% on pure black.
- Schemes, as the panel classed them: monochrome plus one accent 23%, light neutral 22%, dark neutral
  14%, several flat colours 13%, strictly two-tone 12%, colour carried by photographs 9%, one saturated
  field 6%.
- Buttons are neutral (black, white, grey) on 52% of sites. A coloured button is a choice, not a
  requirement.
- Gradient fills appear on 22% of the top-scored sites and 52% of the weak ones; gradient text on 2%
  against 13%.
- One site in 246 has a terracotta primary button and none has a violet one. Those are colours of
  generated pages, not of the gallery. Warm off-white grounds do occur (32 sites), nearly always with
  a dark or green ink rather than an orange accent.
- Top-scored sites change the page's field colour between sections more often (a median of two section
  grounds against one).

## 2. The roles

```css
:root {
  --bg: …;          /* the ground: most of the surface */
  --surface: …;     /* one tone step from the ground: filled panels, form fields, tiles */
  --ink: …;         /* main text and the strongest marks */
  --muted: …;       /* secondary text; still passes contrast on --bg */
  --accent: …;      /* the one accent */
  --accent-ink: …;  /* text on the accent */
  /* --field-1 … --field-n and their inks, when the palette has section fields */
}
```

Use the tokens for every colour in the build. A raw hex in a component is a second palette starting.
Do not add greys between the roles: if you need a quieter text, it is `--muted`; if you need a quieter
surface, it is `--surface`.

## 3. Proportion

Decide the shares before colouring anything and check them in the screenshot:

- **Ground:** 70–90% of the page.
- **Ink:** text and perhaps one inverted section (ink as ground, ground as ink).
- **Accent:** under 5% of any screen. It marks the action and at most one other recurring thing. The
  moment it appears in five places it stops meaning "here".

Palettes with fields (flat-loud, pastel) work differently: each section is one field at full strength
and the proportion rule applies inside each section (field, its ink, nothing else).

The accent is not for headings, icons, bullets, borders or underlines unless the direction sheet says
so. A headline is ink.

## 4. Surfaces without lines or shadows

With rules and shadows banned, a surface is told apart from the ground by tone alone:

```css
.panel { background: var(--surface); }          /* 2–6 lightness points from --bg */
.field { background: var(--surface); border: 0; } /* inputs: filled, with a clear focus state */
.field:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
```

- One step is enough. If a panel does not read, increase padding or separate with space before
  reaching for a second tone.
- Do not nest a panel inside a panel.
- Images do not need a frame. If a light photograph melts into a light ground, change the crop or set
  it on `--surface`, do not outline it.
- A thick bar (4px or more) in ink or accent is a graphic element, allowed where the direction uses
  it. A 1px line is not.

## 5. Colour fields

A section that changes the whole ground colour is the strongest colour move available, and it replaces
dividers, cards and background decoration at once.

- Fields meet edge to edge with a hard line. Nothing fades.
- Every field has its own assigned ink from the palette. Never put `--muted` on a coloured field; use
  the field's ink at full strength, or at 70% opacity for secondary text if it still passes contrast.
- Neighbouring fields should differ in lightness, not only in hue, or the page vibrates.
- Order them like chapters: open strong, rest, surprise, close dark or very light.
- The page's meta theme colour and the navigation follow the first field.

## 6. Dark pages

- Put `color-scheme: dark` on the root so form controls and scrollbars follow.
- The ground is a deep tone with a slight tint from the palette, and the ink is a soft light, not
  `#fff` on `#000`, unless the palette deals exactly that for a stark two-tone direction.
- Secondary text is where dark pages fail: check `--muted` against the ground (4.5:1).
- Depth on dark comes from a lighter surface step, never from glows or coloured light.
- Use lighter font weights than you would on a light page.

## 7. Colour and photographs

- When photographs carry the colour, the interface stays neutral and takes its ink from the darkest
  tone in the imagery.
- Do not wash a photograph with the brand colour. Either leave it alone, or commit to a real treatment
  for every image on the page (all greyscale, or all untouched).
- Text over a photograph needs a calm region. If there is none, move the text off the image. A neutral
  scrim (black or the ink colour, 30–55% opacity, flat or fading over the text area only) is the one
  gradient the inspector allows.
- A flat field sampled from a photograph (its sky, its shadow) makes a section sit with that image.

## 8. Contrast

- Body text 4.5:1 or better; display type and large numerals 3:1 or better; the dealt palettes meet
  7:1 for ink on ground.
- `inspect.mjs` computes contrast for text on flat grounds and fails anything under 2.6:1. It cannot
  see text over photographs: check those in the screenshots yourself.
- Do not lower opacity on text to make it "soft" unless you have checked the resulting ratio.
- Focus states and hover states increase contrast, never reduce it.

## 9. Banned families, and what "warm" means here

The inspector fails these:

- **Cream with terracotta.** A yellow-cream ground (roughly hue 22–62, light and noticeably
  saturated) with a rust, clay or burnt-orange accent is the house look of AI assistants and of the
  pages they generate. Either half alone is suspect; together they are unmistakable.
- **Violet and indigo.** The first wave of generated pages was purple; it still reads that way.

If the brief wants warmth, get it from a low-chroma stone, bone or putty ground (saturation under
about 15%), from a deep green, brown or oxblood ink, from photographs, or from a full warm field
(mustard, tomato red, pink) used flat and with conviction. Warmth is not beige.

If the brand itself owns one of the banned colours, it is the brand's and you keep it: use
`--keep palette`, pass `--allow palette-purple` (or the relevant rule) to the inspector, and note it in
the report.
