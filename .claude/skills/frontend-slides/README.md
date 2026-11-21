# Frontend Slides

A coding-agent skill for creating stunning HTML presentations — from scratch or by converting PowerPoint files. It is packaged as a Claude Code plugin, and the core `SKILL.md` can also be read by other coding agents with filesystem and shell access.

## 📺 Watch the Walkthrough & Tutorial

New here? This beginner-friendly video walks you through the whole thing, start to finish.

<a href="https://www.youtube.com/watch?v=372Iksaz8b0" title="Frontend Slides — walkthrough & tutorial (beginner-friendly)">
  <img src="https://img.youtube.com/vi/372Iksaz8b0/maxresdefault.jpg" alt="Watch the Frontend Slides walkthrough and tutorial on YouTube" width="100%" />
</a>

> ▶️ **[Watch on YouTube →](https://www.youtube.com/watch?v=372Iksaz8b0)** (beginner-friendly walkthrough and tutorial)

## What This Does

**Frontend Slides** helps non-designers create beautiful web presentations without knowing CSS or JavaScript. It uses a "show, don't tell" approach: instead of asking you to describe your aesthetic preferences in words, it generates visual previews and lets you pick what you like.

Here is a deck about the skill, made through the skill:

https://github.com/user-attachments/assets/ef57333e-f879-432a-afb9-180388982478

### Key Features

- **Zero Dependencies** — Single HTML files with inline CSS/JS. No npm, no build tools, no frameworks.
- **Visual Style Discovery** — Can't articulate design preferences? No problem. Pick from generated visual previews.
- **PPT Conversion** — Convert existing PowerPoint files to web, preserving all images and content.
- **Anti-AI-Slop** — Curated distinctive styles that avoid generic AI aesthetics (bye-bye, purple gradients on white).
- **Bold Template Pack** — Optional design-forward templates from `beautiful-html-templates`, loaded progressively so safe presets still work as the default fallback.
- **Production Quality** — Accessible, fixed 16:9, well-commented code you can customize.

## Installation

### Via Claude Code Custom Marketplace Source

Install directly from this public GitHub repo. Run these as two separate Claude Code messages; do not paste both lines into the prompt at once.

```text
/plugin marketplace add https://github.com/zarazhangrui/frontend-slides
```

After that finishes, run:

```text
/plugin install frontend-slides@frontend-slides
```

Use the HTTPS URL. The shorter `zarazhangrui/frontend-slides` form may make Claude Code try SSH, which can fail if GitHub is not already in your `known_hosts` file.

Then use it by typing `/frontend-slides:frontend-slides` in Claude Code. Claude Code namespaces plugin-installed skills as `/plugin-name:skill-name`.

### Claude Code Manual Installation

Copy the skill files to your Claude Code skills directory:

```bash
# Create the skill directory
mkdir -p ~/.claude/skills/frontend-slides/scripts

# Copy the user-facing skill files
cp SKILL.md STYLE_PRESETS.md viewport-base.css html-template.md animation-patterns.md ~/.claude/skills/frontend-slides/
cp -R bold-template-pack ~/.claude/skills/frontend-slides/
cp scripts/extract-pptx.py scripts/deploy.sh scripts/export-pdf.sh ~/.claude/skills/frontend-slides/scripts/
```

Or clone directly:

```bash
git clone https://github.com/zarazhangrui/frontend-slides.git ~/.claude/skills/frontend-slides
```

Then use it by typing `/frontend-slides` in Claude Code. Standalone skills are not namespaced.

### Other Coding Agents

Agents such as Codex, Kimi Code, OpenCode, Gemini CLI, or other local coding assistants can use the same core skill. The simplest path is to send the agent this GitHub repo link and ask it to use the Frontend Slides skill:

```text
https://github.com/zarazhangrui/frontend-slides
```

If the agent can read GitHub repos or browse files, it should start from `SKILL.md` and load only the referenced support files it needs:

- `STYLE_PRESETS.md`
- `viewport-base.css`
- `html-template.md`
- `animation-patterns.md`
- `bold-template-pack/`
- `scripts/`

Some agents can also install the skill for you if they have filesystem access and a known local skills directory. If not, they can still follow `SKILL.md` directly for the current session.

The Claude Code plugin gives Claude Code a custom marketplace-source install flow and `/frontend-slides:frontend-slides` command. Other agents usually do not use that command surface.

## Usage

### Create a New Presentation

```text
/frontend-slides:frontend-slides

> "I want to create a pitch deck for my AI startup"
```

If installed manually as a standalone Claude Code skill, use `/frontend-slides` instead.

In non-Claude agents, ask the agent to use the Frontend Slides skill and point it at this repo or `SKILL.md`.

The skill will:

1. Ask about your content (slides, messages, images)
2. Generate 3 visual style previews for you to compare, inferring the vibe from your brief unless you already named one
3. Let you pick the visual direction
4. Create the full presentation in your chosen style
5. Open it in your browser

### Convert a PowerPoint

```text
/frontend-slides:frontend-slides

> "Convert my presentation.pptx to a web slideshow"
```

The skill will:

1. Extract all text, images, and notes from your PPT
2. Show you the extracted content for confirmation
3. Let you pick a visual style
4. Generate an HTML presentation with all your original assets

## Included Styles

### Dark Themes

- **Bold Signal** — Confident, high-impact, vibrant card on dark
- **Electric Studio** — Clean, professional, split-panel
- **Creative Voltage** — Energetic, retro-modern, electric blue + neon
- **Dark Botanical** — Elegant, sophisticated, warm accents

### Light Themes

- **Notebook Tabs** — Editorial, organized, paper with colorful tabs
- **Pastel Geometry** — Friendly, approachable, vertical pills
- **Split Pastel** — Playful, modern, two-color vertical split
- **Vintage Editorial** — Witty, personality-driven, geometric shapes

### Specialty

- **Neon Cyber** — Futuristic, particle backgrounds, neon glow
- **Terminal Green** — Developer-focused, hacker aesthetic
- **Swiss Modern** — Minimal, Bauhaus-inspired, geometric
- **Paper & Ink** — Literary, drop caps, pull quotes

### Bold Template Pack

The skill also includes 34 optional bold design systems from
`beautiful-html-templates`, such as **Neo-Grid Bold**, **Editorial Tri-Tone**,
**Creative Mode**, **Broadside**, **Signal**, and **Vellum**.

During style discovery, the preview set is:

- 1 safe preset from `STYLE_PRESETS.md`
- at least 1 bold template option from `bold-template-pack/selection-index.json`
- 1 wildcard option, either another bold template or a self-generated custom design

The agent reads the compact bold template index first, then loads only the
shortlisted candidates' small `preview.md` cards for title-slide previews. It
loads the full `design.md` for exactly one bold template only after the user
picks that template for the final deck. If the user picks a custom wildcard,
the agent expands that preview's own CSS and layout system into the full deck.

## Bold Template Gallery

Frontend Slides can now draw from the 34 bold design systems in [`beautiful-html-templates`](https://github.com/zarazhangrui/beautiful-html-templates). Three screenshots per template show how each visual system handles different slide layouts. Click any template name to inspect the source template library.

### [Soft Editorial](https://github.com/zarazhangrui/beautiful-html-templates/tree/main/templates/soft-editorial/)

<p>
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/soft-editorial-4.png" width="32.5%" alt="Soft Editorial — slide 4" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/soft-editorial-6.png" width="32.5%" alt="Soft Editorial — slide 6" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/soft-editorial-10.png" width="32.5%" alt="Soft Editorial — slide 10" />
</p>

> Cormorant Garamond serif on warm paper with sage, blush, and lemon accents.

### [Editorial Forest](https://github.com/zarazhangrui/beautiful-html-templates/tree/main/templates/editorial-forest/)

<p>
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/editorial-forest-1.png" width="32.5%" alt="Editorial Forest — slide 1" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/editorial-forest-2.png" width="32.5%" alt="Editorial Forest — slide 2" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/editorial-forest-5.png" width="32.5%" alt="Editorial Forest — slide 5" />
</p>

> Forest green, dusty pink, and warm cream in Source Serif 4 — quiet, intentional quarterly-review aesthetic.

### [Pin & Paper](https://github.com/zarazhangrui/beautiful-html-templates/tree/main/templates/pin-and-paper/)

<p>
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/pin-and-paper-1.png" width="32.5%" alt="Pin & Paper — slide 1" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/pin-and-paper-11.png" width="32.5%" alt="Pin & Paper — slide 11" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/pin-and-paper-3.png" width="32.5%" alt="Pin & Paper — slide 3" />
</p>

> Yellow paper with safety-pin illustrations, ink-blue handwritten Caveat, paper-grain texture.

### [Sakura Chroma](https://github.com/zarazhangrui/beautiful-html-templates/tree/main/templates/sakura-chroma/)

<p>
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/sakura-chroma-1.png" width="32.5%" alt="Sakura Chroma — slide 1" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/sakura-chroma-3.png" width="32.5%" alt="Sakura Chroma — slide 3" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/sakura-chroma-4.png" width="32.5%" alt="Sakura Chroma — slide 4" />
</p>

> Vintage Japanese cassette-package aesthetic: cream paper, diagonal rainbow ribbons, condensed bold type, JIS-style spec checkboxes.

### [Stencil & Tablet](https://github.com/zarazhangrui/beautiful-html-templates/tree/main/templates/stencil-tablet/)

<p>
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/stencil-tablet-1.png" width="32.5%" alt="Stencil & Tablet — slide 1" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/stencil-tablet-3.png" width="32.5%" alt="Stencil & Tablet — slide 3" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/stencil-tablet-8.png" width="32.5%" alt="Stencil & Tablet — slide 8" />
</p>

> Bone paper with stencil-cut headlines and a six-color earth palette: archaeology meets brand.

### [Cobalt Grid](https://github.com/zarazhangrui/beautiful-html-templates/tree/main/templates/cobalt-grid/)

<p>
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/cobalt-grid-1.png" width="32.5%" alt="Cobalt Grid — slide 1" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/cobalt-grid-3.png" width="32.5%" alt="Cobalt Grid — slide 3" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/cobalt-grid-5.png" width="32.5%" alt="Cobalt Grid — slide 5" />
</p>

> Electric cobalt italic serifs on a graph-paper canvas, anchored by stair-stepped pixel-glitch decorations and slim hairline rules.

### [Vellum](https://github.com/zarazhangrui/beautiful-html-templates/tree/main/templates/vellum/)

<p>
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/vellum-1.png" width="32.5%" alt="Vellum — slide 1" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/vellum-4.png" width="32.5%" alt="Vellum — slide 4" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/vellum-8.png" width="32.5%" alt="Vellum — slide 8" />
</p>

> Deep navy canvas with warm-yellow italic Cormorant serifs and a single dusty teal accent. A quiet, scholarly aesthetic.

### [Emerald Editorial](https://github.com/zarazhangrui/beautiful-html-templates/tree/main/templates/emerald-editorial/)

<p>
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/emerald-editorial-1.png" width="32.5%" alt="Emerald Editorial — slide 1" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/emerald-editorial-3.png" width="32.5%" alt="Emerald Editorial — slide 3" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/emerald-editorial-6.png" width="32.5%" alt="Emerald Editorial — slide 6" />
</p>

> Magazine-cover business deck: emerald + navy + paper with double-rule masthead ornaments and a heavy Bodoni-style display serif.

### [Neo-Grid Bold](https://github.com/zarazhangrui/beautiful-html-templates/tree/main/templates/neo-grid-bold/)

<p>
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/neo-grid-bold-1.png" width="32.5%" alt="Neo-Grid Bold — slide 1" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/neo-grid-bold-3.png" width="32.5%" alt="Neo-Grid Bold — slide 3" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/neo-grid-bold-8.png" width="32.5%" alt="Neo-Grid Bold — slide 8" />
</p>

> Editorial neo-brutalism with a single neon yellow accent on off-white paper.

### [Editorial Tri-Tone](https://github.com/zarazhangrui/beautiful-html-templates/tree/main/templates/editorial-tri-tone/)

<p>
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/editorial-tri-tone-1.png" width="32.5%" alt="Editorial Tri-Tone — slide 1" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/editorial-tri-tone-4.png" width="32.5%" alt="Editorial Tri-Tone — slide 4" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/editorial-tri-tone-3.png" width="32.5%" alt="Editorial Tri-Tone — slide 3" />
</p>

> Three-color editorial system: dusty pink, mustard cream, and deep burgundy, set in Bricolage + Instrument Serif.

### [Creative Mode](https://github.com/zarazhangrui/beautiful-html-templates/tree/main/templates/creative-mode/)

<p>
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/creative-mode-1.png" width="32.5%" alt="Creative Mode — slide 1" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/creative-mode-4.png" width="32.5%" alt="Creative Mode — slide 4" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/creative-mode-6.png" width="32.5%" alt="Creative Mode — slide 6" />
</p>

> Cream paper canvas with confident multi-color (green, pink, orange, yellow) accents and Archivo Black display.

### [Monochrome](https://github.com/zarazhangrui/beautiful-html-templates/tree/main/templates/monochrome/)

<p>
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/monochrome-1.png" width="32.5%" alt="Monochrome — slide 1" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/monochrome-4.png" width="32.5%" alt="Monochrome — slide 4" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/monochrome-12.png" width="32.5%" alt="Monochrome — slide 12" />
</p>

> Ivory ledger paper with all-black type; Lora serif headlines, Jost body, no color at all.

### [People's Platform (Block & Bold)](https://github.com/zarazhangrui/beautiful-html-templates/tree/main/templates/peoples-platform/)

<p>
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/peoples-platform-1.png" width="32.5%" alt="People's Platform (Block & Bold) — slide 1" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/peoples-platform-4.png" width="32.5%" alt="People's Platform (Block & Bold) — slide 4" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/peoples-platform-8.png" width="32.5%" alt="People's Platform (Block & Bold) — slide 8" />
</p>

> Activist poster energy: blue, orange, red on cream, with Alfa Slab + Caveat Brush.

### [Pink Script — After Hours](https://github.com/zarazhangrui/beautiful-html-templates/tree/main/templates/pink-script/)

<p>
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/pink-script-1.png" width="32.5%" alt="Pink Script — After Hours — slide 1" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/pink-script-4.png" width="32.5%" alt="Pink Script — After Hours — slide 4" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/pink-script-8.png" width="32.5%" alt="Pink Script — After Hours — slide 8" />
</p>

> Black canvas, hot pink accent, pearl-cream paper, Instrument Serif headlines: late-night editorial luxury.

### [8-Bit Orbit](https://github.com/zarazhangrui/beautiful-html-templates/tree/main/templates/8-bit-orbit/)

<p>
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/8-bit-orbit-1.png" width="32.5%" alt="8-Bit Orbit — slide 1" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/8-bit-orbit-6.png" width="32.5%" alt="8-Bit Orbit — slide 6" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/8-bit-orbit-5.png" width="32.5%" alt="8-Bit Orbit — slide 5" />
</p>

> Pixel-art neon arcade aesthetic on a deep navy void.

### [BlockFrame](https://github.com/zarazhangrui/beautiful-html-templates/tree/main/templates/block-frame/)

<p>
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/block-frame-1.png" width="32.5%" alt="BlockFrame — slide 1" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/block-frame-4.png" width="32.5%" alt="BlockFrame — slide 4" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/block-frame-8.png" width="32.5%" alt="BlockFrame — slide 8" />
</p>

> Neobrutalist deck with pastel-neon color blocks and chunky black borders.

### [Blue Professional](https://github.com/zarazhangrui/beautiful-html-templates/tree/main/templates/blue-professional/)

<p>
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/blue-professional-1.png" width="32.5%" alt="Blue Professional — slide 1" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/blue-professional-6.png" width="32.5%" alt="Blue Professional — slide 6" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/blue-professional-8.png" width="32.5%" alt="Blue Professional — slide 8" />
</p>

> Cream paper background with electric cobalt blue accents; clean modern professional.

### [Bold Poster](https://github.com/zarazhangrui/beautiful-html-templates/tree/main/templates/bold-poster/)

<p>
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/bold-poster-1.png" width="32.5%" alt="Bold Poster — slide 1" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/bold-poster-4.png" width="32.5%" alt="Bold Poster — slide 4" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/bold-poster-8.png" width="32.5%" alt="Bold Poster — slide 8" />
</p>

> Editorial poster aesthetic with massive Shrikhand display and a single fire-engine red accent.

### [Broadside](https://github.com/zarazhangrui/beautiful-html-templates/tree/main/templates/broadside/)

<p>
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/broadside-1.png" width="32.5%" alt="Broadside — slide 1" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/broadside-4.png" width="32.5%" alt="Broadside — slide 4" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/broadside-13.png" width="32.5%" alt="Broadside — slide 13" />
</p>

> Dark editorial canvas with a single fire orange accent and bilingual Latin/Chinese type stack.

### [Capsule](https://github.com/zarazhangrui/beautiful-html-templates/tree/main/templates/capsule/)

<p>
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/capsule-1.png" width="32.5%" alt="Capsule — slide 1" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/capsule-4.png" width="32.5%" alt="Capsule — slide 4" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/capsule-8.png" width="32.5%" alt="Capsule — slide 8" />
</p>

> Modular pill-shaped cards on warm bone with a full pastel-pop palette.

### [Cartesian](https://github.com/zarazhangrui/beautiful-html-templates/tree/main/templates/cartesian/)

<p>
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/cartesian-1.png" width="32.5%" alt="Cartesian — slide 1" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/cartesian-4.png" width="32.5%" alt="Cartesian — slide 4" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/cartesian-8.png" width="32.5%" alt="Cartesian — slide 8" />
</p>

> Quiet warm-neutral palette with classical Playfair serifs; tasteful and unhurried.

### [Coral](https://github.com/zarazhangrui/beautiful-html-templates/tree/main/templates/coral/)

<p>
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/coral-1.png" width="32.5%" alt="Coral — slide 1" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/coral-4.png" width="32.5%" alt="Coral — slide 4" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/coral-8.png" width="32.5%" alt="Coral — slide 8" />
</p>

> Cream and coral on near-black, set in oversized Bebas Neue.

### [Daisy Days](https://github.com/zarazhangrui/beautiful-html-templates/tree/main/templates/daisy-days/)

<p>
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/daisy-days-1.png" width="32.5%" alt="Daisy Days — slide 1" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/daisy-days-4.png" width="32.5%" alt="Daisy Days — slide 4" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/daisy-days-8.png" width="32.5%" alt="Daisy Days — slide 8" />
</p>

> Cheerful pastel deck with hand-drawn daisies, stars, and rainbows. Friendly, soft, and warm.

### [Grove](https://github.com/zarazhangrui/beautiful-html-templates/tree/main/templates/grove/)

<p>
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/grove-1.png" width="32.5%" alt="Grove — slide 1" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/grove-4.png" width="32.5%" alt="Grove — slide 4" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/grove-8.png" width="32.5%" alt="Grove — slide 8" />
</p>

> Forest-green canvas with cream type, classical Playfair serifs, and a single rust accent.

### [Mat](https://github.com/zarazhangrui/beautiful-html-templates/tree/main/templates/mat/)

<p>
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/mat-1.png" width="32.5%" alt="Mat — slide 1" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/mat-4.png" width="32.5%" alt="Mat — slide 4" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/mat-8.png" width="32.5%" alt="Mat — slide 8" />
</p>

> Dark sage canvas with bone paper and burnt-orange accent; mid-century modern with wood undertones.

### [Playful](https://github.com/zarazhangrui/beautiful-html-templates/tree/main/templates/playful/)

<p>
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/playful-1.png" width="32.5%" alt="Playful — slide 1" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/playful-6.png" width="32.5%" alt="Playful — slide 6" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/playful-8.png" width="32.5%" alt="Playful — slide 8" />
</p>

> Sun-warm peach background with Syne display: a friendly indie launch deck.

### [Raw Grid](https://github.com/zarazhangrui/beautiful-html-templates/tree/main/templates/raw-grid/)

<p>
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/raw-grid-1.png" width="32.5%" alt="Raw Grid — slide 1" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/raw-grid-4.png" width="32.5%" alt="Raw Grid — slide 4" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/raw-grid-8.png" width="32.5%" alt="Raw Grid — slide 8" />
</p>

> Neo-brutalist deck with thick borders, offset shadows, and a pink/sage/ink palette.

### [Retro Windows](https://github.com/zarazhangrui/beautiful-html-templates/tree/main/templates/retro-windows/)

<p>
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/retro-windows-1.png" width="32.5%" alt="Retro Windows — slide 1" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/retro-windows-4.png" width="32.5%" alt="Retro Windows — slide 4" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/retro-windows-8.png" width="32.5%" alt="Retro Windows — slide 8" />
</p>

> Windows 95 chrome: gray title bars, MS Sans Serif, pixel typography, full nostalgia.

### [Retro Zine](https://github.com/zarazhangrui/beautiful-html-templates/tree/main/templates/retro-zine/)

<p>
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/retro-zine-1.png" width="32.5%" alt="Retro Zine — slide 1" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/retro-zine-4.png" width="32.5%" alt="Retro Zine — slide 4" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/retro-zine-8.png" width="32.5%" alt="Retro Zine — slide 8" />
</p>

> Beige paper with green accent and Bebas Neue + Caveat: a riso-printed zine in HTML form.

### [Scatterbrain](https://github.com/zarazhangrui/beautiful-html-templates/tree/main/templates/scatterbrain/)

<p>
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/scatterbrain-1.png" width="32.5%" alt="Scatterbrain — slide 1" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/scatterbrain-4.png" width="32.5%" alt="Scatterbrain — slide 4" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/scatterbrain-8.png" width="32.5%" alt="Scatterbrain — slide 8" />
</p>

> Post-it inspired: pastel sticky notes, Caveat handwriting, Shrikhand and Zilla Slab type stack.

### [Signal](https://github.com/zarazhangrui/beautiful-html-templates/tree/main/templates/signal/)

<p>
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/signal-1.png" width="32.5%" alt="Signal — slide 1" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/signal-18.png" width="32.5%" alt="Signal — slide 18" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/signal-8.png" width="32.5%" alt="Signal — slide 8" />
</p>

> Deep navy canvas with bone paper and a single muted-gold accent; institutional with quiet weight.

### [Studio](https://github.com/zarazhangrui/beautiful-html-templates/tree/main/templates/studio/)

<p>
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/studio-1.png" width="32.5%" alt="Studio — slide 1" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/studio-4.png" width="32.5%" alt="Studio — slide 4" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/studio-8.png" width="32.5%" alt="Studio — slide 8" />
</p>

> Black canvas with electric-yellow type; high-voltage design studio aesthetic.

### [Biennale Yellow](https://github.com/zarazhangrui/beautiful-html-templates/tree/main/templates/biennale-yellow/)

<p>
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/biennale-yellow-1.png" width="32.5%" alt="Biennale Yellow — slide 1" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/biennale-yellow-5.png" width="32.5%" alt="Biennale Yellow — slide 5" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/biennale-yellow-8.png" width="32.5%" alt="Biennale Yellow — slide 8" />
</p>

> Solar yellow on warm parchment with deep indigo serif and atmospheric sun-glow gradients. Dutch-editorial poster energy.

### [Long Table](https://github.com/zarazhangrui/beautiful-html-templates/tree/main/templates/long-table/)

<p>
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/long-table-1.png" width="32.5%" alt="Long Table — slide 1" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/long-table-3.png" width="32.5%" alt="Long Table — slide 3" />
  <img src="https://raw.githubusercontent.com/zarazhangrui/beautiful-html-templates/main/screenshots/long-table-7.png" width="32.5%" alt="Long Table — slide 7" />
</p>

> Warm cream and rust-red supper-club aesthetic with bold uppercase grotesk headlines, italic Fraunces, and pill-shaped outlined buttons.

## Architecture

This skill uses **progressive disclosure** — the main `SKILL.md` is a workflow map, with supporting files loaded on-demand only when needed:

| File                      | Purpose                        | Loaded When               |
| ------------------------- | ------------------------------ | ------------------------- |
| `SKILL.md`                | Core workflow and rules        | Always (skill invocation) |
| `STYLE_PRESETS.md`        | 12 curated visual presets      | Phase 2 (style selection) |
| `bold-template-pack/selection-index.json` | Compact bold template metadata for candidate selection | Phase 2 (style selection) |
| `bold-template-pack/templates/*/preview.md` | Tiny style cards for shortlisted bold previews | Phase 2 after shortlisting |
| `bold-template-pack/templates/*/design.md` | Full design system for the selected bold template | Phase 3 after user selection |
| `viewport-base.css`       | Mandatory fixed-stage CSS      | Phase 3 (generation)      |
| `html-template.md`        | HTML structure and JS features | Phase 3 (generation)      |
| `animation-patterns.md`   | CSS/JS animation reference     | Phase 3 (generation)      |
| `scripts/extract-pptx.py` | PPT content extraction         | Phase 4 (conversion)      |
| `scripts/deploy.sh`       | Deploy to Vercel               | Phase 6 (sharing)         |
| `scripts/export-pdf.sh`   | Export slides to PDF           | Phase 6 (sharing)         |

Maintenance-only source metadata and regeneration helpers live outside the
user-facing skill package. Normal users do not need them.

This design follows agent-skill best practices: give the agent a map first,
then reveal only the specific files needed for the current choice.

## Philosophy

This skill was born from the belief that:

1. **You don't need to be a designer to make beautiful things.** You just need to react to what you see.

2. **Dependencies are debt.** A single HTML file will work in 10 years. A React project from 2019? Good luck.

3. **Generic is forgettable.** Every presentation should feel custom-crafted, not template-generated.

4. **Comments are kindness.** Code should explain itself to future-you (or anyone else who opens it).

## Sharing Your Presentations

After creating a presentation, the skill offers two ways to share it:

### Deploy to a Live URL

One command deploys your slides to a permanent, shareable URL that works on any device — phones, tablets, laptops:

```bash
bash scripts/deploy.sh ./my-deck/
# or
bash scripts/deploy.sh ./presentation.html
```

Uses [Vercel](https://vercel.com) (free tier). The skill walks you through signup and login if it's your first time.

### Export to PDF

Convert your slides to a PDF for email, Slack, Notion, or printing:

```bash
bash scripts/export-pdf.sh ./my-deck/index.html
bash scripts/export-pdf.sh ./presentation.html ./output.pdf
```

Uses [Playwright](https://playwright.dev) to screenshot each slide at 1920×1080 and combine into a PDF. Installs automatically if needed. Animations are not preserved (it's a static snapshot).

## Requirements

- A local coding agent with filesystem access and the ability to run shell commands
- Claude Code is required only for the custom marketplace-source install and `/frontend-slides:frontend-slides` command
- For PPT conversion: Python with `python-pptx` library
- For URL deployment: Node.js + Vercel account (free)
- For PDF export: Node.js (Playwright installs automatically)

## Credits

Created by [@zarazhangrui](https://github.com/zarazhangrui).

## License

MIT — Use it, modify it, share it.
