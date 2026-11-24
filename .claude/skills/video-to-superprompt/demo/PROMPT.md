# Video To Superprompt Demo Prompts

## Minimal prompt

Use $video-to-superprompt to create a polished standalone HTML example that clearly demonstrates the skill.

## Recreate the demo

Use $video-to-superprompt to build a responsive reference demo for this capability:

> Turn a reference video into a super detailed recreation or inspiration prompt. Use when the user provides, mentions, uploads, links, or points to a video and asks to analyze the design, UI, animations, transitions, scroll interactions, typography, colors, assets, WebGL/Three.js, storytelling, section-by-section behavior, or to create a prompt/article that recreates the page, app, interaction, or motion system.

### Direction

Present the workflow as a compact evidence-first input and output handoff.

Use an art-directed composition with one clear focal point, restrained supporting copy, and enough surrounding interface to show how the technique behaves in a real product or landing page.

### Canonical example

- Use demo/input.md as the fictional source packet.
- Present demo/expected-output.md as the verified handoff beside it.

### Deliverable

- Create demo/index.html as a standalone document.
- Keep CSS and JavaScript inline.
- Put any required images, fonts, models, textures, or vendor files in demo/assets/.
- Do not add a framework, package manager, build step, or node_modules.
- Add controls only when they help inspect or replay the technique.

### Acceptance checks

- Keep the demo responsive from 390px through 1440px.
- Use semantic HTML, visible focus states, and reduced-motion handling.
- Keep all HTML, CSS, and JavaScript inside demo/index.html.
- Use only relative local asset paths.
- Show a realistic input and expected output without exposing real customer or account data.
- Make authorization boundaries and verification status explicit.

## Remix prompt

Use $video-to-superprompt and keep the same implementation contract, but change the subject, copy, palette, and content hierarchy. Preserve the core technique, accessibility behavior, responsive rules, and performance constraints demonstrated by the reference.
