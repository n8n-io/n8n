# Styling: shadcn-vue components on CSS-variable theming

The template styles everything with shadcn-vue components (built on `reka-ui`)
and Tailwind v4 utility classes. Every color, radius and font a component uses
resolves to a CSS variable declared once in `src/style.css`'s `:root`/`.dark`
blocks — an app's Theme tab overrides these variables and every component
picks up the change, because none of them hardcode a color.

```css
@import 'tailwindcss';
@import 'tw-animate-css';
@custom-variant dark (&:is(.dark *));
@theme inline { --color-primary: var(--primary); --radius-lg: var(--radius); … }
:root { --primary: oklch(0.205 0 0); --radius: 0.625rem; … }
.dark { --primary: oklch(0.922 0 0); … }
```

Rules:

- Build UI from shadcn-vue components first (catalog below), not hand-rolled
  markup. None of them exist in a fresh app — call `apps(action:
  "add-component", appId, component: "<name>")` for each one you need before
  importing it. It runs the real `shadcn-vue` CLI (`components.json` and
  `src/lib/utils.ts` are already in place) and installs the component's own
  dependencies; it is safe to call again for a component you already added.
  Do not hand-write a component shadcn-vue already provides. Reach for a
  `reka-ui` primitive directly only for behavior no shadcn-vue component
  covers.
- Style with the utility names below — they all resolve to the theme's CSS
  variables (`bg-primary`, `text-muted-foreground`, `rounded-lg`). No hex
  colors, no inline styles, no `dark:` variants: dark mode comes from the
  `.dark` class `src/theme-mode.ts` sets, not a Tailwind variant.
- Do not edit the `:root`/`.dark` blocks in `src/style.css`, or
  `src/theme-overrides.css` / `src/theme-mode.ts` — the app's Theme tab
  manages those. Ask the user to use the Theme tab for color/font/radius
  changes instead of hardcoding a look.

## Component catalog

Add one with `apps(action: "add-component", appId, component: "<name>")`,
then import it as `import { X } from '@/components/ui/<name>'`:

| Component | Import | Notes |
|---|---|---|
| Button | `Button` | `variant`: `default`, `secondary`, `outline`, `ghost`, `link`, `destructive`. `size`: `default`, `sm`, `lg`, `icon`. |
| Input | `Input` | `v-model` a string ref. |
| Card | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter` | |
| Dialog | `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose` | Wrap the trigger element with `as-child` so the Dialog controls it directly. |
| Select | `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectGroup`, `SelectLabel`, `SelectItem`, `SelectSeparator` | |
| Tabs | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | `default-value` on `Tabs`, matching `value` on each trigger/content pair. |
| Badge | `Badge` | `variant`: `default`, `secondary`, `outline`, `destructive`. |
| Switch | `Switch` | `v-model` a boolean ref. |
| Checkbox | `Checkbox` | `v-model` a boolean ref. |
| Tooltip | `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` | Wrap the tree in one `TooltipProvider`. |
| DropdownMenu | `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuGroup`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioGroup`, `DropdownMenuRadioItem`, `DropdownMenuSub`, `DropdownMenuSubTrigger`, `DropdownMenuSubContent`, `DropdownMenuShortcut` | |

## Recipe (after `add-component` for `card`, `button`, `switch`)

```vue
<Card>
	<CardHeader><CardTitle>Clicked {{ count }} times</CardTitle></CardHeader>
	<CardContent class="flex items-center justify-between gap-4">
		<Button @click="count++">Click me</Button>
		<label class="flex items-center gap-2 text-sm">
			<Switch v-model="enabled" />
			Notifications {{ enabled ? 'on' : 'off' }}
		</label>
	</CardContent>
</Card>
```

The template's own `Home.vue` predates any `add-component` call, so it styles
its counter/switch demo with plain elements, utilities and a `reka-ui`
`SwitchRoot`/`SwitchThumb` — the same pattern to fall back on for anything
`add-component` doesn't cover.

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

Font and radius: `font-sans` reads `--font-sans` (the Theme tab's font
picker); `rounded`, `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`
read `--radius` (the Theme tab's corner-radius slider) via the `@theme
inline` mapping's `calc()` offsets.

## Headless primitives: reka-ui

`reka-ui` is in the template for behavior no shadcn-vue component covers:
focus management, keyboard navigation, ARIA state. It ships no styles; style
every part with the utilities above. State comes as `data-state` attributes,
so use `data-[state=checked]:bg-primary`, `data-[state=open]:…`,
`data-[disabled]:opacity-50`.

Docs: https://reka-ui.com/docs/components/<name> (kebab-case).
