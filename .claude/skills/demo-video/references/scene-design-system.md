# Scene Design System

Reference material for demo video scene design — colors, typography, animation timing, voice options, and pacing.

## Color Language

| Color | Meaning | Use for |
|-------|---------|---------|
| `#c5d5ff` | Trust | Titles, logo |
| `#7c6af5` | Premium | Subtitles, badges |
| `#4ade80` | Success | "After" states |
| `#f28b82` | Problem | "Before" states |
| `#fbbf24` | Energy | Callouts |
| `#0d0e12` | Background | Always dark mode |

## Animation Timing

```
Element entrance:     0.5-0.8s  (cubic-bezier(0.16, 1, 0.3, 1))
Between elements:     0.2-0.4s  gap
Scene transition:     0.3-0.5s  crossfade
Hold after last anim: 1.0-2.0s
```

## Typography

```
Title:     48-72px, weight 800
Subtitle:  24-32px, weight 400, muted
Bullets:   18-22px, weight 600, pill background
Font:      Inter (Google Fonts)
```

## HTML Scene Layout (1920x1080)

```html
<body>
  <h1 class="title">...</h1>      <!-- Top 15% -->
  <div class="hero">...</div>     <!-- Middle 65% -->
  <div class="footer">...</div>   <!-- Bottom 20% -->
</body>
```

Background: dark with subtle purple-blue glow gradients. Screenshots: always `border-radius: 12px` with `box-shadow`. Easing: always `cubic-bezier(0.16, 1, 0.3, 1)` — never `ease` or `linear`.

## Voice Options (edge-tts)

| Voice | Best for |
|-------|----------|
| `andrew` | Product demos, launches |
| `jenny` | Tutorials, onboarding |
| `davis` | Enterprise, security |
| `emma` | Consumer products |

## Pacing Guide

| Duration | Max words | Fill |
|----------|-----------|------|
| 3-4s | 8-12 | ~70% |
| 5-6s | 15-22 | ~75% |
| 7-8s | 22-30 | ~80% |
