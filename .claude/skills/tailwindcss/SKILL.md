---
name: tailwindcss
description: Use when designing/implementing UI with Tailwind CSS (layout, typography, responsive, theming, component patterns). Includes quick recipes and conventions for clean, consistent web design.
---

# Tailwind CSS — Utility-first Styling Skill

## When to use
- Rapid UI building with consistent spacing/typography scales
- Design systems where composition beats bespoke CSS
- Component-driven apps (React/Vue/Svelte), marketing pages, prototypes → production

## Key concepts & patterns
- Utilities compose in HTML/JSX: `class="flex gap-4 p-6 bg-zinc-950 text-white"`
- Responsive variants: `sm: md: lg: xl:` etc.
- State variants: `hover:`, `focus:`, `active:`, `disabled:`, `group-hover:`, `peer-checked:`
- Arbitrary values (use sparingly): `w-[42rem]`, `bg-[#0b1220]`, `translate-y-[3px]`
- Dark mode patterns: `dark:` with class-based strategy
- Extracting repeated patterns:
  - Prefer components (JSX/Vue components) first
  - Then `@apply` for small reusable patterns (avoid overuse)
- Build pipeline:
  - Tailwind scans “content” files for class names and generates CSS (zero-runtime)

## Common pitfalls
- Classes not generated in production
  - Ensure content paths include all templates/components.
  - Avoid building class names dynamically (e.g. `"text-" + color`) unless safelisted.
- Overusing `@apply` and losing the utility-first benefits
- Conflicting styles due to class order assumptions
- Huge HTML class lists with no structure
  - Use component composition; break into subcomponents; use `clsx/cva` when needed.

## Quick recipes

### 1) A clean CTA button
```html
<button class="inline-flex items-center justify-center rounded-xl px-5 py-3
               bg-indigo-600 text-white font-medium
               hover:bg-indigo-500 active:bg-indigo-700
               focus:outline-none focus:ring-2 focus:ring-indigo-400/60">
  Get started
</button>
```

### 2) Responsive hero layout
```html
<section class="mx-auto max-w-6xl px-6 py-16">
  <div class="grid gap-10 lg:grid-cols-2 lg:items-center">
    <div>
      <h1 class="text-4xl font-semibold tracking-tight sm:text-5xl">
        Ship a beautiful site fast.
      </h1>
      <p class="mt-4 text-zinc-600">
        Tailwind helps you move quickly without fighting CSS.
      </p>
    </div>
    <div class="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <!-- media -->
    </div>
  </div>
</section>
```

### 3) Handling dynamic classnames safely
Prefer mapping:
```js
const toneClass = {
  success: "bg-emerald-600",
  danger: "bg-rose-600",
  info: "bg-sky-600",
}[tone];
```

## What to ask the user
- Framework/build tool (Next/Vite/Remix/Webflow export)?
- Do we need a design system (tokens, component library) or a one-off page?
- Dark mode? RTL? accessibility constraints?
