---
name: no-ai-design-slop
description: Prevent and remove generic AI-generated design defaults, incoherent visual choices, and established UI defects while creating, revising, or reviewing websites, apps, screenshots, mockups, and design code. Use as a passive quality gate during UI work or for an explicit anti-slop cleanup; preserve the chosen art direction instead of forcing a neutral redesign.
---

# No Design Slops

Act as a passive design quality gate. Keep the product's direction, personality, and useful choices. Catch generic defaults and design failures before they compound.

## Core Judgment

Slop is not a color, font, gradient, card, or animation. It is a choice made by reflex rather than for the product.

Treat a choice as suspect when several of these are true:

- it could be pasted into an unrelated product unchanged
- it repeats a familiar generated-design pattern
- it conflicts with the local design system or nearby sections
- it communicates no useful information, state, action, hierarchy, or brand meaning
- it competes with content, weakens trust, or makes the interface harder to use

Do not guess whether AI made the artifact. Judge the visible result.

## Apply Passively

For every applicable design task:

1. Read the local instructions, tokens, `DESIGN.md`, screenshots, references, and existing components before choosing a direction.
2. Identify the product, audience, primary task, primary action, content hierarchy, and one visual thesis for the surface.
3. Preserve established decisions unless the user asks for a redesign.
4. During implementation, run the compact gates below whenever adding a section, component, effect, or state.
5. Render the result at relevant viewports and inspect the actual interface, not only the source.
6. Remove or correct the highest-impact problem created or exposed by the work.

For a narrow edit, do not widen the task into a site audit. Fix the requested surface and avoid introducing new slop. For a full page, redesign, anti-slop pass, or detailed review, read [ARTICLE.md](ARTICLE.md) and use the relevant catalog sections.

If the user asks only for a formal review, use the separate `audit-ai-design-slop` workflow and do not edit the artifact.

## Design Principles

### Start from context

- Prompt and design from evidence: product content, real constraints, references, and the local system.
- Use references to extract hierarchy, pacing, contrast, material, and interaction principles. Do not copy identity, layout, assets, or copy.
- When no system exists, define a compact one before polishing: type roles, spacing rhythm, palette, radii, borders, shadows, imagery, icons, and motion.

### Choose one coherent idea

- Give each viewport one focal point and each flow one clear primary action.
- Let typography, media, color, material, and motion support the same visual thesis.
- Prefer one strong authored moment over many unrelated effects.
- Use contrast and asymmetry deliberately; do not neutralize character in the name of cleanliness.

### Make relationships visible

- Use proximity before containers. Related items sit closer than unrelated items.
- Use hierarchy before labels. Size, weight, placement, and contrast should do more work than pills, eyebrows, numbers, and captions.
- Use depth only when the interface has a real layering model.
- Let repeated components express a real repeated content type, not a convenient template.

### Make the product specific

- Choose sections from the product's story, buying journey, and usage flow instead of a default landing-page sequence.
- Show real product behavior, useful screenshots, or honest placeholders. Do not manufacture proof.
- Art-direct imagery and iconography to the subject. Generic stock, abstract SVG filler, and default icon tiles are not substitutes for product meaning.
- Adapt imported patterns to the current typography, palette, shape language, and density.

### Make motion explain something

- Motion may explain state, causality, hierarchy, continuity, or spatial change.
- Do not animate merely to prove that the page is interactive.
- Keep reading and controls stable. Support reduced motion and complete static states.

## Compact Quality Gates

Before keeping a choice, check:

- **System:** Does it use the established type, color, spacing, radius, icon, and motion language?
- **Hierarchy:** Is the most important content or action obvious without decorative labels?
- **Composition:** Are alignment, balance, proximity, overlap, and negative space intentional at every relevant viewport?
- **Typography:** Are roles distinct, readable, and optically spaced without oversized tracking or forced display treatments?
- **Color and material:** Does each gradient, glow, glass layer, border, shadow, and accent have a clear role?
- **Product truth:** Are imagery, copy, metrics, screenshots, logos, and states specific and honest?
- **Interaction:** Are active, hover, focus, loading, empty, error, disabled, selected, and success states present when needed?
- **Motion and access:** Does motion help, remain performant, preserve input, and respect reduced-motion preferences?

## Removal Test

For every suspect element:

1. Name it precisely: selected state, eyebrow, radial light, nested card, icon tile, marquee, fake proof, clipped popover, or another concrete pattern.
2. State what job it performs.
3. Remove it mentally. If meaning, state, action, hierarchy, or brand character survives and clarity improves, delete it.
4. If deletion creates a real loss, make the smallest correction using the existing system.
5. Add a replacement only when the interface needs one. Do not compensate with a new effect.

## Boundaries

- Do not treat a technique as slop in isolation.
- Do not replace a distinctive choice with a fashionable neutral template.
- Do not prescribe a new font, palette, layout, component library, or art direction unless the task authorizes it.
- Do not turn every content block into a card or every improvement into decoration.
- Do not add new sections, effects, colors, fonts, assets, or dependencies during a cleanup unless they solve a demonstrated loss.
- Do not remove useful density, edge, humor, asymmetry, or expressive motion merely because it is unusual.
- Do not invent customers, metrics, testimonials, awards, ratings, product screens, or activity.

## Verification

Before finishing:

- compare the rendered result with the local system and supplied references
- inspect the primary flow, relevant states, and responsive breakpoints
- confirm that text does not clip, overlap, overflow, or lose contrast
- confirm that controls remain labeled, reachable, stable, and responsive
- confirm that every remaining decorative layer has a defensible role
- confirm that the result is more specific to this product, not merely more fashionable

Report the material removals or corrections and why they improved the design. Do not return an AI-authorship guess or a generic numeric taste score.
