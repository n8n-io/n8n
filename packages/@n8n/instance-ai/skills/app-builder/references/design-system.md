# Styling: Tailwind utilities on n8n tokens

The template styles everything with Tailwind v4 utility classes, and every
utility resolves to an n8n design-system token (`var(--…)` from
`@n8n/design-system/theme.css`). `src/style.css` holds the whole setup:

```css
@layer theme, base, utilities;
@import '@n8n/design-system/theme.css' layer(base); /* tokens, reset, fonts, dark mode */
@import 'tailwindcss/theme' layer(theme);
@import 'tailwindcss/utilities' layer(utilities);
@theme inline reference { --color-*: initial; … --color-brand: var(--background--brand); … }
```

`theme.css` sits in the `base` layer so its element rules (`h1 { color }`, `a`,
`code`) lose to any utility; `reference` keeps the mapped names out of `:root`,
where they would collide with the legacy hooks `theme.css` reads.

The `@theme` block removes Tailwind's own palette and scales (colors, spacing,
fonts, sizes, radius, shadows) and puts the n8n tokens in their place. So
`bg-red-500`, `p-4`, `text-base`, `rounded-md` from the Tailwind docs do not
exist here; the names below do. Tailwind's preflight is not imported because
`theme.css` already ships a reset and the body font. The same `style.css` works
in any Vite project with `@tailwindcss/vite` (React, Svelte, vanilla).

Rules:

- Style with utility classes in the template. No hex colors, no `px`/`rem`
  values, no `style="…"`, no `[value]` arbitrary values (`p-[13px]`) for things a
  token covers. Custom CSS only for what utilities cannot express (keyframes,
  complex grids); use `var(--…)` tokens there too.
- Dark mode is automatic: `theme.css` switches every token under
  `[data-theme='dark']` and `prefers-color-scheme: dark`, and the utilities
  reference the tokens. Do not use `dark:` variants and do not pick colors per
  theme. To force a theme set `data-theme="dark"` (or `"light"`) on `<body>`.
- Add a token to the `@theme` block when you need one that is not mapped; the
  token names come from `@n8n/design-system/theme.css`. Do not invent values.
- `N8n*` Vue components from `@n8n/design-system` are not available in the
  sandbox (see the end of this file).

## Token → utility table

Use the utility prefix from Tailwind (`bg-`, `text-`, `border-`, `p-`, `m-`,
`gap-`, `w-`, `h-`, `rounded-`, `shadow-`, `font-`, `leading-`) with the names
below. `hover:`, `focus-visible:`, `active:`, `disabled:` and responsive
variants (`sm:`, `md:`, `lg:`) work as usual.

### Colors (`bg-`, `text-`, `border-`, `outline-`, `ring-`)

| Utility name | n8n token | Use |
|---|---|---|
| `text` | `--text-color` | default text (`text-text`) |
| `text-subtle`, `text-subtler`, `text-disabled`, `text-inverse` | `--text-color--subtle` … | secondary text (`text-text-subtle`) |
| `text-success`, `text-warning`, `text-danger`, `text-info` | `--text-color--success` … | status text (`text-text-danger`; a bare `text-danger` is the palette red below) |
| `surface` | `--background--surface` | cards, panels (white / dark grey) |
| `subtle` | `--background--subtle` | page background, inset areas |
| `hover`, `active`, `disabled`, `inverse` | `--background--hover` … | interaction states of neutral surfaces |
| `background-success`, `background-warning`, `background-danger`, `background-info` | `--background--success` … | tinted status surfaces (callouts) |
| `brand`, `brand-hover`, `brand-active`, `brand-focus`, `brand-disabled` | `--background--brand`, `--background--brand--hover` … | primary action surfaces |
| `border`, `border-subtle`, `border-strong`, `border-stronger` | `--border-color`, `--border-color--subtle` … | borders (`border border-border`) |
| `border-success`, `border-warning`, `border-danger`, `border-info` | `--border-color--success` … | status borders |
| `primary`, `primary-shade-1`, `primary-tint-1` … `primary-tint-3` | `--color--primary`, `--color--primary--shade-1` … | brand orange; `text-primary` for links/accents |
| `secondary`, `secondary-shade-1`, `secondary-tint-1`, `secondary-tint-2` | `--color--secondary` … | purple accent |
| `success`, `success-shade-1`, `success-tint-1` … `success-tint-4` | `--color--success` … | green |
| `warning`, `warning-shade-1`, `warning-tint-1`, `warning-tint-2` | `--color--warning` … | gold |
| `danger`, `danger-shade-1`, `danger-tint-1` … `danger-tint-4` | `--color--danger` … | red |
| `info` | `--color--info` | neutral info |
| `neutral-white` | `--color--neutral-white` | text on `bg-brand` |

Opacity modifiers work on every name: `bg-primary/10`, `border-danger/50`.

### Spacing (`p-`, `px-`, `m-`, `gap-`, `space-x-`, `inset-`, `w-`, `h-`, `translate-`)

| Utility name | n8n token | Value |
|---|---|---|
| `5xs`, `4xs`, `3xs`, `2xs` | `--spacing--5xs` … `--spacing--2xs` | 2, 4, 6, 8 px |
| `xs`, `sm`, `md`, `lg`, `xl` | `--spacing--xs` … `--spacing--xl` | 12, 16, 20, 24, 32 px |
| `2xl`, `3xl`, `4xl`, `5xl` | `--spacing--2xl` … `--spacing--5xl` | 48, 64, 128, 256 px |

Example: `p-md gap-xs mt-lg h-xl w-2xl`. The numeric scale (`p-4`) is off.
Control heights: `h-sm` (16 px) is too small for a button; use `h-xl` (32 px)
or `h-2xl` (48 px), or the design-system height tokens with the var shorthand:
`h-(--height--md)` (32 px), `h-(--height--lg)` (36 px).

These names also drive `w-`, `h-`, `max-w-` and `max-h-`, so `max-w-md` is the
20 px spacing token, not a container. For page and panel widths use
percentages (`w-3/4`, `max-w-full`) or the breakpoint widths `max-w-screen-sm`
(640 px), `max-w-screen-md` (768 px, the template's page shell),
`max-w-screen-lg` (1024 px), `max-w-screen-xl` (1280 px).

### Typography

| Utility | n8n token |
|---|---|
| `font-sans` (default), `font-mono` | `--font-family`, `--font-family--monospace` |
| `text-4xs`, `text-3xs`, `text-2xs`, `text-xs`, `text-sm`, `text-md`, `text-lg`, `text-xl`, `text-2xl` | `--font-size--4xs` … `--font-size--2xl` (8 … 28 px) |
| `font-regular`, `font-medium`, `font-bold` | `--font-weight--regular` (400), `--font-weight--medium` (500), `--font-weight--bold` (600) |
| `leading-xs`, `leading-sm`, `leading-md`, `leading-lg`, `leading-xl` | `--line-height--xs` … `--line-height--xl` (1 … 1.5) |

Heading: `text-2xl leading-sm font-bold text-text`. Body: `text-md leading-md
text-text`. Secondary: `text-sm text-text-subtle`. `text-base` and `text-lg`
from Tailwind's defaults do not exist except where listed.

### Radius and shadow

| Utility | n8n token |
|---|---|
| `rounded` | `--radius` (4 px, buttons and inputs) |
| `rounded-4xs`, `rounded-3xs`, `rounded-2xs`, `rounded-xs`, `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-full` | `--radius--4xs` … `--radius--2xl` (2 … 32 px), `--radius--full` |
| `shadow-2xs`, `shadow-xs`, `shadow-sm`, `shadow-md`, `shadow-xl`, `shadow-outline` | `--shadow--2xs` … `--shadow--xl`, `--shadow--outline` |

Cards: `rounded-lg border border-border bg-surface p-md shadow-xs`.

### Recipes (from the template's `Home.vue`)

```html
<button class="inline-flex h-xl items-center rounded bg-brand px-xs text-sm font-medium text-neutral-white hover:bg-brand-hover active:bg-brand-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-focus">Save</button>
<button class="inline-flex h-xl items-center rounded border border-border bg-surface px-xs text-sm font-medium text-text hover:bg-hover">Cancel</button>
<section class="rounded-lg border border-border bg-surface p-md shadow-xs">…</section>
<div class="rounded border border-border-danger bg-background-danger p-xs text-sm text-text-danger">Error</div>
<input class="h-xl w-full rounded border border-border bg-surface px-2xs text-sm text-text focus-visible:border-brand-focus focus-visible:outline-none" />
```

## Headless primitives: reka-ui

`reka-ui` (the Vue port of Radix, the same library `@n8n/design-system` builds
on) is in the template for behaviour that plain elements do not give you:
focus management, keyboard navigation, ARIA state. It ships no styles; style
every part with the utilities above. State comes as `data-state` attributes,
so use `data-[state=checked]:bg-brand`, `data-[state=open]:…`,
`data-[disabled]:opacity-50`.

Import what you use from `'reka-ui'`: `SwitchRoot`/`SwitchThumb`,
`CheckboxRoot`/`CheckboxIndicator`, `RadioGroupRoot`/`RadioGroupItem`,
`DialogRoot`/`DialogTrigger`/`DialogPortal`/`DialogOverlay`/`DialogContent`/
`DialogTitle`/`DialogDescription`/`DialogClose`, `PopoverRoot`/`PopoverTrigger`/
`PopoverContent`, `TooltipProvider`/`TooltipRoot`/`TooltipTrigger`/
`TooltipContent`, `DropdownMenuRoot`/`DropdownMenuTrigger`/`DropdownMenuContent`/
`DropdownMenuItem`, `SelectRoot`/`SelectTrigger`/`SelectValue`/`SelectContent`/
`SelectItem`, `TabsRoot`/`TabsList`/`TabsTrigger`/`TabsContent`,
`AccordionRoot`/`AccordionItem`/`AccordionTrigger`/`AccordionContent`,
`SliderRoot`/`SliderTrack`/`SliderRange`/`SliderThumb`, `ProgressRoot`/
`ProgressIndicator`, `ToastProvider`/`ToastRoot`/`ToastTitle`/`ToastViewport`.
Docs: https://reka-ui.com/docs/components/<name> (kebab-case).

```vue
<SwitchRoot
	v-model="enabled"
	class="relative h-sm w-xl rounded-full bg-border-strong transition-colors data-[state=checked]:bg-brand"
>
	<SwitchThumb
		class="block h-xs w-xs translate-x-4xs rounded-full bg-neutral-white shadow-xs transition-transform data-[state=checked]:translate-x-sm"
	/>
</SwitchRoot>
```

```vue
<DialogRoot>
	<DialogTrigger class="…button classes…">Open</DialogTrigger>
	<DialogPortal>
		<DialogOverlay class="fixed inset-0 bg-inverse/40" />
		<DialogContent class="fixed top-1/2 left-1/2 w-3/4 max-w-screen-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-surface p-lg shadow-md">
			<DialogTitle class="text-lg font-bold text-text">Title</DialogTitle>
			<DialogDescription class="mt-2xs text-sm text-text-subtle">…</DialogDescription>
			<DialogClose class="…button classes…">Close</DialogClose>
		</DialogContent>
	</DialogPortal>
</DialogRoot>
```

## Not available in the sandbox: `N8n*` Vue components

Importing anything from `'@n8n/design-system'` (the JS entry) pulls the whole
component library plus element-plus and tiptap into the bundle; `vite build`
then needs more than 1 GiB while the sandbox has 512 MiB and dies with exit
134 or 137. The package keeps its place in `package.json` for `theme.css`
only. Build the UI from elements, utilities and reka-ui instead.
