# tasteskill v2 (`design-taste-frontend`)

A design skill for coding agents, built from a study of 247 curated sites (One Page Love and Awwwards
Sites of the Day, October 2026). It gives an agent an art direction instead of letting it fall back on
the average landing page, holds it to a strict no-ornament house style, and makes it look at its own
render before calling the work done.

## How it works

1. **Inventory.** The agent lists what only this client has: the name and what it means, the street,
   the numbers, the one constraint, the materials, the hours.
2. **Draw.** `scripts/draw.mjs` deals three of 20 directions (each an idea engine seen on the
   strongest studied sites); the agent picks the one that can carry something from the inventory, and
   the script deals the rest: a hero composition, section compositions, a type system of real free
   fonts, a palette, photographs, a motion, studied references, and under every blueprint a list of
   where it disagrees with the house rules. Recent draws are remembered so projects do not repeat.
3. **Idea and live thing.** One sentence tying the client's own material to the direction's device,
   checked against the nearest competitor, and one thing the visitor can do on the page.
4. **Build** from the sheet, words first, full content. When the project has no photographs of its
   own, `scripts/assets.mjs` finds real pictures of the subject's world in open collections (its
   street in old postcards, old maps, its materials, engravings of its trade, museum objects of its
   kind), downloads them into the project and records their credits; the subject is drawn in code
   only where no honest picture exists.
5. **Gate.** `scripts/lint.mjs` (source) and `scripts/inspect.mjs` (real browser, 1440 / 768 / 390)
   measure the house rules: headlines of two lines or fewer, no eyebrow labels, no monospace, no
   01/02/03, no thin rules, no gradients, no resting shadows, no cream-and-terracotta, no violet, and
   the faults blind jurors punished: no focal point, empty screens, text covered or cut, long pins,
   sideways rows, faded text.
6. **Look.** The inspector saves screenshots; the agent critiques them with an Awwwards-weighted
   rubric, fixes the top three problems and repeats, at most three rounds.

Five rounds of blind tests against a no-skill baseline and another design skill are recorded in
`references/research.md` §11.

## Contents

```
SKILL.md                 the run, the house rules, the laws
references/              copy, type, colour, layout, imagery, motion, critique, tells, research
scripts/draw.mjs         deal options / a direction / reprint / redraw; --alternatives, --photos, --site
scripts/assets.mjs       search open image collections (Openverse, Wikimedia Commons, Art Institute of
                         Chicago, the Met) and, with --video, real footage (Wikimedia Commons, Internet
                         Archive, NASA); --get downloads with the credit, --credits prints them
scripts/lint.mjs         static scan for banned patterns and stock phrases
scripts/inspect.mjs      render, measure, photograph
scripts/lib/             zero-dependency Chrome DevTools client, the in-page probe, the rules
library/                 directions (20), heroes, sections, type systems, palettes, photographs,
                         studied sites, motions
assets/base.css, base.js an optional neutral foundation
evals/evals.json         six briefs for testing the skill against a no-skill baseline
```

## Requirements

Node 22 or newer and an installed Chrome, Edge or Chromium for `inspect.mjs` (it drives the browser
over the DevTools protocol with Node's built-in WebSocket; nothing is installed). `draw.mjs`,
`lint.mjs` and `assets.mjs` run on Node 18+; `assets.mjs` needs network access and no API keys. Set
`CHROME_PATH` if the browser is somewhere unusual.

## Install

Copy this folder to your skills directory, for example `~/.claude/skills/design-taste-frontend/`, or keep it in
a repository under `.claude/skills/`.

## Notes

- Photographs in the library are served by Lorem Picsum from Unsplash, under the Unsplash licence.
  They are placeholders for atmosphere; replace them with the project's own pictures.
- Pictures found with `assets.mjs` keep their own licences. By default it offers only CC0, public
  domain, CC BY and CC BY-SA, and `--get` records the title, creator, licence and source of every
  download in `assets/credits.json`. The page must carry the credits (`--credits` prints them).
- `assets.mjs --video` finds short clips of the subject's world, takes a 720p-or-smaller rendition,
  refuses files over 25 MB unless `--max-mb` is passed, and saves a poster frame with each clip; how
  to use one on a page (muted loop, poster, stopped under reduced motion) is in
  `references/imagery.md` §11.
- Fonts are loaded from Google Fonts and Fontshare. Check each face's licence for your use.
- The scores in `references/research.md` are model judgements from screenshots, not Awwwards scores.
- The draw history lives in `~/.taste-skill/history.json` (set `TASTE_SKILL_HISTORY` to move it).
  Delete it to reset.
- A build takes an agent roughly 30–45 minutes and a few hundred thousand tokens with the full
  look-and-fix loop; most of that is finding or drawing pictures when a project has no photographs.
