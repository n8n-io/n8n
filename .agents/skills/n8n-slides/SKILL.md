---
name: n8n-slides
description: Create or edit slides, a deck, a presentation or a talk with the n8n Slidev theme (@n8n/slidev-theme-n8n). Use when asked to make slides or a presentation, unless the user asks for PowerPoint, Google Slides or another tool, and for any change to a deck whose headmatter sets the theme to @n8n/slidev-theme-n8n.
---

# n8n slides

## New deck

Outside a deck, create one: `npx github:n8n-io/slidev-theme <folder>`, then `cd <folder> && pnpm install`. Inside a deck, the copy of this skill at `node_modules/@n8n/slidev-theme-n8n/skills/n8n-slides/SKILL.md` matches the installed theme; follow that one.

## The theme

These are the theme's own rules; for Slidev itself (syntax, clicks, CLI, export, the MCP server), read the Slidev skill that ships with the deck: `node_modules/@slidev/cli/skills/slidev/SKILL.md`.

- Reference for every layout, component and prop: `node_modules/@n8n/slidev-theme-n8n/README.md`.
- Slides to copy from: `node_modules/@n8n/slidev-theme-n8n/pages/*.md`, one file per topic.

## Loop

1. `pnpm dev` serves the deck on http://localhost:3030 and hot-reloads on save. If the user already runs it, don't start a second one.
2. Edit `slides.md`. The Slidev MCP server at `http://localhost:3030/__mcp` can edit slides and `slidev-goto-slide` shows the user the slide you changed.
3. After every batch of edits, run `pnpm check --slides 3,7-9 --shots .shots` with the numbers of the slides you changed. It opens those slides after all their clicks, in light and dark, and lists overflow, `[n8n-theme]` warnings and page errors; it exits 1 if it found anything. Look at their PNGs in `.shots` too: overflow is not the only way a slide can look wrong. Each slide takes about a second and a half.
4. Before you say the deck is done, run `pnpm check` without `--slides` to check the whole deck, and fix every finding. Split an overflowing slide; `zoom: 0.9` is a last resort.

## Pick the right piece

| To show | Use |
| --- | --- |
| A section break | `layout: section`. Sections number themselves and fill the `agenda` slide; never write numbers or an agenda by hand. |
| A screenshot or photo | `image-right` / `image-left` with `aspect: 16/9` for app screenshots, `image` for a full-bleed photo. `backgroundPosition: top` keeps the top of a cropped image. |
| Before and after | `layout: compare` |
| One big number | `layout: fact`, or `<Stat>` in a grid |
| A chart | `<BarChart>`, `<LineChart>`, `<Donut>`, `<Sparkline>` |
| Code | a titled fence (```` ```ts [file.ts] ````), `layout: code` with `<CodeNote>`s next to a `{1-3\|5}` fence |
| A real n8n workflow | `<N8nWorkflow :workflow>` from exported JSON, or `<Workflow flow="Webhook -> AI Agent -> Slack">` to sketch one |
| Any other flow, architecture or sequence | A fenced `mermaid` block, not `<Workflow>`: workflow nodes make the audience think it's something to build in n8n |
| A web page, video or demo | `<Embed size="md">`, `<Video>`, `<N8nDemo>`; always set `fallback` for print |

## Rules

- One idea per slide, three or four bullets at most.
- Colour comes from `tint: pink|dark|maker` on a few accent slides, and from token utilities in markup (`text-accent-ink`, `bg-surface-2`). No hex colours and no arbitrary Uno values like `w-[700px]` or `grid-cols-[1fr_540px]`: use the `size`, `width` and `aspect` props and the standard Uno scale.
- Keep `label`s and `<Tag>`s to one or two words: capsules hold labels (a date, a place, a category), never sentences. Tags side by side go in a `<div class="n8n-tags">` row, stacked ones in a `<div class="n8n-tags-stack">`.
- Copy follows the n8n tone of voice: sentence case for every heading, American English, lowercase `n8n`, no exclamation marks, ampersands, emojis or hype. Say what the product does; never invent stats.
- `maker` slides contain no photos. Never draw or recolour the logo; `<N8nLogo>` is the official one.
- The full brand system is `n8ndesign.md` at https://guidelines.n8n.design/build-with-ai. The theme already applies it; read it when a slide needs something the theme doesn't cover.
- Speaker notes go in an HTML comment at the end of the slide.

## Known limits

- Mermaid diagrams shrink to fit the slide, so they don't overflow, but their text gets small. Prefer `flowchart LR`; add `direction LR` to an `erDiagram` or `stateDiagram`; a sequence diagram reads well up to about 6 messages under a heading, and every note or self-message takes a row.
- `<Workflow flow>` scales itself to fit the slide. From 5 branch outputs, or 3 chains with AI sub-nodes, its labels get too small: split the flow.
- If a slide added after deleting another shows stale content, that's a Slidev dev-server bug: save the new slide again or restart `pnpm dev`.
