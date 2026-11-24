---
name: video-to-superprompt
description: Turn a reference video into a super detailed recreation or inspiration prompt. Use when the user provides, mentions, uploads, links, or points to a video and asks to analyze the design, UI, animations, transitions, scroll interactions, typography, colors, assets, WebGL/Three.js, storytelling, section-by-section behavior, or to create a prompt/article that recreates the page, app, interaction, or motion system.
---

# Video To Superprompt

## Goal

Convert any usable reference video into a builder-ready prompt that captures what the video shows, how it moves, how it should be rebuilt, and what assets or generated media are needed. The default output is one paste-ready prompt unless the user asks for an article, asset pack, or implementation.

## Workflow

1. **Locate the source video.**
   - Accept local paths, uploaded files, URLs, browser-visible videos, article assets, or repo media.
   - If the video is referenced but inaccessible, ask for the exact file or URL before inventing details.
   - If the user wants exact recreation, inspect any source HTML/CSS/JS or local page connected to the video before writing the prompt.

2. **Inspect the video technically.**
   - For local files, run `ffprobe` for duration, dimensions, frame rate, codec, and size.
   - Extract representative frames with `ffmpeg`, favoring timeline beats over uniform thumbnails.
   - Suggested quick pass:
     ```bash
     ffprobe -v error -show_entries format=duration,size:stream=width,height,r_frame_rate -of json "$VIDEO"
     mkdir -p /tmp/video-frames
     ffmpeg -y -i "$VIDEO" -vf fps=1 /tmp/video-frames/frame-%03d.jpg
     ```
   - For long or scroll-heavy videos, also extract start/middle/end and visible transition moments.

3. **Analyze in layers.**
   - Story: page/app purpose, emotional arc, section order, transition between beats.
   - Screen/layout: viewport framing, grids, sticky zones, cards, media, overlays, margins, navigation, footer.
   - Motion: reveal timing, easing, parallax, masks, pinned sections, scroll scrubbing, hover/tap states, looped ambient motion, camera moves.
   - Visual design: typography, color palette, surfaces, borders, shadows, texture, iconography, image/video treatment.
   - Technical rebuild: CSS/native APIs, IntersectionObserver, Web Animations API, GSAP ScrollTrigger, Lenis, Framer Motion/Motion One, Three.js/WebGL, canvas, video currentTime scrubbing, carousels, or other domain libraries.
   - Accessibility/performance: reduced motion, mobile behavior, touch/keyboard states, lazy loading, video preload, pixel-ratio caps, static fallbacks.

4. **Plan assets.**
   - Produce an asset map. Include exact URLs when supplied, local filenames when used, or placeholder names when assets still need generation.
   - If AI assets are needed, create separate prompts for image plates, video clips, WebGL/canvas elements, posters, sprites, masks, and texture overlays.
   - If user names specific models or APIs, preserve them exactly in the prompt and separate image prompts from video prompts.

5. **Write the superprompt.**
   - Use a single fenced `text` block for the paste-ready prompt unless the user asks for another format.
   - Start with the final thing to build and the reference boundary: exact recreation vs inspired adaptation.
   - Include: asset map, brand/content, global design language, layout rules, section-by-section anatomy, motion system, scroll system, video behavior, WebGL/Three.js behavior, responsive requirements, accessibility/performance, and anti-patterns.
   - For every major section, specify purpose, layout, visual details, animation, interactions, scroll behavior, library/API choice, and reduced-motion fallback.
   - Avoid vague phrases like “make it beautiful,” “similar animation,” or “nice transitions.” Convert taste into concrete build instructions.

6. **Verify before finalizing.**
   - Check that all asset paths/URLs in the prompt exist or are clearly marked as placeholders.
   - If screenshots/frames were created, confirm files are non-empty and representative.
   - If writing an article or repo artifact, obey local workspace instructions, keep dirty-worktree staging narrow, and commit when required.

## Output Modes

- **Prompt only:** Give the paste-ready prompt and, when helpful, a short asset map above it.
- **Article:** Create `content.md` plus local frame/video evidence, manifest, and prompts. Follow the current repo article conventions.
- **Implementation brief:** Add a build plan and QA checklist after the prompt.
- **Asset-generation pack:** Split prompts into background images, video clips, sprites/WebGL, posters, and final page prompt.

## Quality Bar

- The prompt should be long enough to rebuild the interaction without seeing the original video.
- It should preserve the video’s sequence, pacing, and notable quirks.
- It should name exact motion mechanisms: pinned section, scrubbed timeline, `video.currentTime`, parallax layer, opacity reveal, transform, mask, shader, particle field, hover state, or carousel physics.
- It should include mobile behavior and reduced-motion behavior every time.
- It should call out what to avoid, especially generic landing-page sections, decorative blobs, mismatched stock media, autoplay-only video when scroll-scrubbing is required, and text overlap.

## References

- Read `references/superprompt-template.md` when writing the final prompt from scratch or when the user asks for the “full detailed prompt.”
