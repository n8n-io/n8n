# Video Superprompt Template

Use this structure for a paste-ready prompt. Delete sections that do not apply, but keep section-by-section motion detail.

```text
Build [exact thing] based on the supplied reference video. Treat the video as [exact recreation / visual and motion inspiration]. The result should feel [tone], with [domain-specific visual language].

ASSET MAP
- Main video/reference: [path or URL]
- Background images: [URLs/placeholders]
- Scroll-scrub videos: [URLs/placeholders]
- Posters/sprites/textures/WebGL assets: [URLs/placeholders]

BRAND AND CONTENT
- Brand/name:
- Core headline:
- Supporting copy:
- Navigation:
- CTA:
- Footer:

GLOBAL DESIGN SYSTEM
- Visual style:
- Typography:
- Colors:
- Layout grid and spacing:
- Image/video treatment:
- Texture/surface/shadow rules:
- Explicit anti-patterns:

MOTION SYSTEM
- Overall motion feel:
- Easing/duration:
- Reveal rules:
- Scroll rules:
- Hover/tap/focus states:
- Ambient loops:
- Reduced-motion behavior:

SECTION 1: [Name]
- Purpose:
- Layout:
- Visual details:
- Animation:
- Interaction:
- Scroll behavior:
- Implementation notes:

SECTION 2: [Name]
- Purpose:
- Layout:
- Visual details:
- Animation:
- Interaction:
- Scroll behavior:
- Implementation notes:

[Repeat for every visible beat/section in video order.]

VIDEO AND SCROLL IMPLEMENTATION
- If a video should scrub with scroll, use a pinned/sticky section and map scroll progress to video.currentTime.
- Keep videos muted, playsInline, preload metadata/auto, object-fit cover, no controls unless user-facing playback is required.
- Use GSAP ScrollTrigger or native requestAnimationFrame for precise pinned scroll timelines.

WEBGL / THREE.JS IMPLEMENTATION
- Use Three.js/WebGL only for real particles, 3D, shaders, or canvas scenes.
- Cap pixel ratio, reduce density on mobile, pause when hidden/offscreen, and provide static fallback.

RESPONSIVE REQUIREMENTS
- Desktop:
- Tablet:
- Mobile:
- Safe-area/text-overlap constraints:

ACCESSIBILITY AND PERFORMANCE
- prefers-reduced-motion:
- Keyboard/focus states:
- Lazy loading/preloading:
- Video/poster fallbacks:
- Performance caps:

SUCCESS CHECK
- First viewport must show:
- During scroll:
- At the final section:
- The build fails if:
```
