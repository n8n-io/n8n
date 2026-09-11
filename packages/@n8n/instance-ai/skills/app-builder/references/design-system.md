# Styling: catalog components on CSS-variable theming

The template styles everything with this skill's own component catalog (built
on `@ark-ui/vue`) and Tailwind v4 utility classes. Every color, radius and
font a component uses resolves to a CSS variable declared once in
`src/style.css`'s `:root`/`.dark` blocks — an app's Theme tab overrides these
variables and every component picks up the change, because none of them
hardcode a color.

```css
@import 'tailwindcss';
@import 'tw-animate-css';
@custom-variant dark (&:is(.dark *));
@theme inline { --color-primary: var(--primary); --radius-lg: var(--radius); … }
:root { --primary: oklch(0.205 0 0); --radius: 0.625rem; … }
.dark { --primary: oklch(0.922 0 0); … }
```

Rules:

- Build UI from the catalog components first (below), not hand-rolled markup.
  `create` adds `button` and `switch`; add every other one you need in one
  call, `apps(action: "add-component", appId, components: ["card", "dialog"])`,
  before importing them. It copies the files from this skill's catalog into
  `src/components/ui/<name>/` without changing dependencies, and is safe to
  repeat for a component you already have. Reach for `@ark-ui/vue` directly
  (already a project dependency) only for behavior no catalog component
  covers.
- Style with the utility names below — they all resolve to the theme's CSS
  variables (`bg-primary`, `text-muted-foreground`, `rounded-lg`). No hex
  colors, no inline styles, no `dark:` variants: dark mode comes from the
  `.dark` class `src/theme-mode.ts` sets, not a Tailwind variant.
- You can edit any theme variable directly: write it into `src/theme-overrides.css`'s
  `:root { }` block, or its `.dark { }` block for dark-mode-only values
  (create the file's content if it is empty) — a rebuild picks
  it up like any other source change. Do not edit `src/style.css`'s `:root`/`.dark`
  blocks (the template defaults); put overrides in `theme-overrides.css`
  instead. A Theme-tab save (and the `theme` passed to `apps(create)`) owns
  these keys and rewrites them in both blocks: `--primary`,
  `--primary-foreground`, `--ring`, `--radius`, `--font-sans`, `--space-unit`,
  `--background`, `--card`, `--popover`, `--secondary`, `--muted`, `--accent`,
  `--border`, `--input`. Every other variable you set survives a save. `src/theme-mode.ts` is different: the Theme tab's mode control
  always overwrites it on save, so edit it directly only when the user won't
  also be using that tab for this app.

## Component catalog

Add them with `apps(action: "add-component", appId, components: ["<name>", …])`,
then import each as `import { X } from '@/components/ui/<name>'`:

| Component | Import | Notes |
|---|---|---|
| Button | `Button` | `variant`: `default`, `secondary`, `outline`, `ghost`, `link`, `destructive`. `size`: `default`, `sm`, `lg`, `icon`. |
| Input | `Input` | `v-model` a string or number ref. |
| Card | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter` | |
| Dialog | `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose` | `v-model:open` on `Dialog` if you need to control it programmatically. Wrap the trigger element with `DialogTrigger`/`DialogClose` — they use `as-child` so the Dialog controls the element you put inside directly. |
| Select | `Select` | One component: pass `:items="[{ label, value }]"` and `v-model` a single string. No sub-parts — for a custom trigger or grouped items, compose `@ark-ui/vue/select`'s own parts directly instead. |
| Tabs | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | `v-model` or `default-value` on `Tabs`, matching `value` on each trigger/content pair. |
| Badge | `Badge` | `variant`: `default`, `secondary`, `outline`, `destructive`. |
| Switch | `Switch` | `v-model` a boolean ref. |
| Checkbox | `Checkbox` | `v-model` a boolean ref. |
| Tooltip | `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` | `TooltipProvider` is a plain passthrough (Ark UI needs no shared context) — wrap the tree in one only to match other libraries' convention if you want to. |
| DropdownMenu | `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuGroup`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioGroup`, `DropdownMenuRadioItem`, `DropdownMenuSub`, `DropdownMenuSubTrigger` | For a submenu, nest a `DropdownMenuSub` inside the parent's `DropdownMenuContent`, with a `DropdownMenuSubTrigger` and its own `DropdownMenuContent` inside it. |

Every `Item`/`Trigger`/`CheckboxItem`/`RadioItem` that identifies one entry in
a list (`DropdownMenuItem`, `DropdownMenuRadioItem`, `TabsTrigger`,
`TabsContent`) takes a `value` prop — pick a stable string per entry.

## Recipe (from the template's own `Home.vue`)

`apps(action="create")` already runs `add-component` for `button` and
`switch` — the two the template's starter page uses — so a fresh app has them
from the start:

```vue
<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
</script>

<template>
	<section class="flex items-center justify-between rounded-lg border border-border bg-card p-4">
		<p class="text-sm">Clicked {{ count }} times</p>
		<Button @click="count++">Click me</Button>
	</section>
	<label class="mt-4 flex items-center gap-2 text-sm">
		<Switch v-model="enabled" />
		Notifications {{ enabled ? 'on' : 'off' }}
	</label>
</template>
```

Everything else follows the same shape: one `add-component` call with every
name the page needs, then import from `@/components/ui/<name>`. Reach for `@ark-ui/vue` directly, styled with the utilities above,
only for behavior no catalog component covers (e.g. `Combobox`, `Popover`,
`Accordion`, `RadioGroup` — part of Ark UI's own broader catalog, not
pre-generated here). Compose its parts the same way the catalog components
do, following https://ark-ui.com/vue/docs/components/<name>.

## CSS-variable → utility reference

Use these with the usual utility prefixes (`bg-`, `text-`, `border-`,
`outline-`, `ring-`). `hover:`, `focus-visible:`, `active:`, `disabled:` and
responsive variants (`sm:`, `md:`, `lg:`) work as usual; Tailwind's own
default color palette (`bg-blue-500`) also still works for anything not
covered below.

| Utility name | CSS variable | Use |
|---|---|---|
| `background`, `foreground` | `--background`, `--foreground` | page background / default text |
| `card`, `card-foreground` | `--card`, `--card-foreground` | `Card`'s surface |
| `popover`, `popover-foreground` | `--popover`, `--popover-foreground` | `Dialog`/`Select`/`DropdownMenu` surfaces |
| `primary`, `primary-foreground` | `--primary`, `--primary-foreground` | the accent color the Theme tab's swatch picker sets |
| `secondary`, `secondary-foreground` | `--secondary`, `--secondary-foreground` | secondary buttons/badges |
| `muted`, `muted-foreground` | `--muted`, `--muted-foreground` | de-emphasized text and surfaces |
| `accent`, `accent-foreground` | `--accent`, `--accent-foreground` | hover/highlight states |
| `destructive` | `--destructive` | delete/danger actions |
| `border`, `input`, `ring` | `--border`, `--input`, `--ring` | borders, input borders, focus rings |
| `chart-1` … `chart-5` | `--chart-1` … `--chart-5` | data-visualization palette |

Font, radius and density: `font-sans` reads `--font-sans` (the Theme tab's font
picker); `rounded`, `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`
read `--radius` (the Theme tab's corner-radius slider) via the `@theme
inline` mapping's `calc()` offsets. Every spacing utility (`p-4`, `gap-2`,
`w-64`, `h-10`) is a multiple of `--space-unit` (the Theme tab's density:
0.2rem compact, 0.25rem comfortable, 0.3rem spacious), so use the utilities
and never fixed px paddings. The `tinted` background tone derives
`--background`, `--card`, `--secondary`, `--muted`, `--accent`, `--border`
and `--input` from the primary's hue in both modes.

## Headless primitives: @ark-ui/vue

`@ark-ui/vue` is in the template for every catalog component and for behavior
no catalog component covers: focus management, keyboard navigation, ARIA
state. It ships no styles; style every part with the utilities above. State
comes as `data-state`/`data-part`/`data-highlighted`/`data-disabled`
attributes, so use `data-[state=checked]:bg-primary`, `data-[state=open]:…`,
`data-[highlighted]:bg-accent`, `data-[disabled]:opacity-50`.

Docs: https://ark-ui.com/vue/docs/components/<name> (kebab-case), styling
guide at https://ark-ui.com/docs/guides/styling.
