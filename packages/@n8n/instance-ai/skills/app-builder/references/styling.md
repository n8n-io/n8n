# Styling an App

Use this order of preference:

1. `theme.colors`, `theme.radius`, `theme.fontFamily` — covers brand colors,
   corner radius and font.
2. `theme.customCss` — for everything the theme fields cannot express.
3. Utility classes or inline `style` in `html` / `code` block output — for one
   block only. Read "Utility classes on a served page" first.

Set the theme with `apps(action="update-app", appId, theme={...})`. `theme`
takes `colors`, `radius`, `fontFamily` and `customCss` (a string, max 20,000
characters). Pass `theme: null` to reset.

## Page anatomy

A page without a layout (see [layouts.md](layouts.md)) has this shell:

```html
<body class="app-canvas app-text">
  <div class="app-shell">
    <nav class="app-menu">…app name and page menu…</nav>
    <main class="app-main">…blocks in order…</main>
  </div>
</body>
```

The menu is a nested `ul.list-none > li` tree. The current page is a
`span.app-text`; other pages are `a.app-link`.

Root element of each typed block inside `main`:

| Block | Root element |
| --- | --- |
| `header` | `h1`–`h6` (`text-2xl` … `text-xs`, `font-bold mb-md`) |
| `paragraph` | `p.text-text.mb-md` |
| `list` | `ol.list-decimal` or `ul.list-disc` (`pl-lg mb-md text-text`) |
| `image` | `figure.mb-md` > `img.rounded-lg.max-w-full` + `figcaption` |
| `divider` | `hr.my-md.border-border` |
| `table` | `div.overflow-x-auto.rounded-lg.border` > `table.w-full.text-sm` > `thead tr.bg-subtle th` / `tbody tr td`; with row actions, a last `td.text-right` holds `a.app-link` and a `form.inline` with a button |
| `form` | `div.rounded-lg.border.bg-surface.p-md` > `form.flex.flex-col` > one `div.flex.flex-col` per field + `button[type=submit]` |
| `button` | `form.mb-md` > `button[type=submit]` |
| `html` | `div.app-block-html.mb-md` |
| `code` | no wrapper; the returned HTML is inserted as-is |

Content blocks have no per-block id in the HTML. To target one block, give it
a class or id inside an `html` block, or use structural selectors such as
`.app-main > h1:first-child`.

A page with a layout replaces the shell with this structure:

```html
<body class="app-canvas app-text">
  <div class="app-layout" data-app-root>
    <div class="app-block" data-block-id="menu">…one layout block…</div>
    <main class="app-main" data-app-slot>…content blocks in order…</main>
    <div class="app-block" data-block-id="footer">…one layout block…</div>
  </div>
</body>
```

`.app-layout` is a vertical flex column (`gap: var(--spacing--md)`) with no
menu. Each layout block sits in `.app-block[data-block-id="<id>"]`; the
`slot` block becomes `main.app-main[data-app-slot]`. Use the block ids as
CSS hooks to build columns or grids in `theme.customCss`.

## Theme variables

The theme fields land on `:root` as custom properties:

| Theme field | Custom property |
| --- | --- |
| `colors.primary` | `--app-color-primary` |
| `colors.background` | `--app-color-background` |
| `colors.surface` | `--app-color-surface` |
| `colors.text` | `--app-color-text` |
| `colors.muted` | `--app-color-muted` |
| `radius` | `--app-radius` (`none` → `0px`, else `var(--radius--sm|md|lg)`) |
| `fontFamily` | `--app-font-family` |

The stylesheet reads them here: `.app-canvas` (background), `.app-text`
(text color and font), `.app-muted`, `.app-link` (primary color),
`.app-menu` and `.app-main` (surface color and radius). Custom CSS can
read them too: `var(--app-color-primary, var(--color--primary))`.

## Design-system tokens

The page loads the n8n design-system tokens. Custom CSS can use any of them,
for example:

| Family | Examples |
| --- | --- |
| `--color--*` | `--color--primary`, `--color--success`, `--color--danger--tint-3` |
| `--text-color*` | `--text-color`, `--text-color--subtle`, `--text-color--inverse` |
| `--background--*` | `--background--surface`, `--background--subtle`, `--background--hover` |
| `--border-color*` | `--border-color`, `--border-color--strong`, `--border-color--danger` |
| `--spacing--*` | `--spacing--xs`, `--spacing--md`, `--spacing--xl` |
| `--radius--*` | `--radius--sm`, `--radius--md`, `--radius--lg` |
| `--font-size--*` | `--font-size--sm`, `--font-size--md`, `--font-size--lg` |
| `--font-weight--*` | `--font-weight--regular`, `--font-weight--medium`, `--font-weight--bold` |
| `--line-height--*` | `--line-height--sm`, `--line-height--md`, `--line-height--lg` |
| `--font-family*` | `--font-family`, `--font-family--monospace` |

Prefer a token over a literal value. Tokens follow the viewer's light or dark
theme.

## Utility classes on a served page

The stylesheet is compiled from the server templates only. **Only the utility
classes below exist on a served page.** Any other Tailwind class has no
effect.

```
bg-background-danger bg-background-success bg-brand bg-subtle bg-surface block
border border-border border-border-danger border-border-success border-t
flex flex-col font-bold font-medium font-semibold gap-2xs gap-3xs gap-sm
hover:bg-brand-hover hover:bg-hover hover:underline inline items-center
list-decimal list-disc list-none max-w-full mb-md mb-sm mb-xs min-h-screen
mr-xs mt-xs my-md no-underline overflow-x-auto p-md p-sm p-xs pl-lg pl-sm
py-2xs rounded-lg rounded-md rounded-sm text-2xl text-2xs text-left text-lg
text-md text-right text-sm text-text text-text-danger text-text-disabled
text-text-inverse text-text-subtle text-text-success text-xl text-xs
uppercase w-full whitespace-nowrap
```

Hand-written shell classes (not utilities, defined in the stylesheet):
`app-canvas app-shell app-menu app-main app-layout app-block app-text
app-muted app-link app-block-html`.

Rules for block output:

- `code` block output may use inline `style` attributes and its own `<style>`
  element.
- `html` block output may **not** use `style`; the sanitizer strips it. Use
  the classes above or put the rule in `theme.customCss`.

## Examples

Wider main card:

```css
.app-shell { max-width: 90rem; }
.app-main { padding: var(--spacing--lg); }
```

Brand-colored table header:

```css
.app-main thead tr {
  background: var(--app-color-primary, var(--color--primary));
}
.app-main thead th {
  color: var(--text-color--inverse);
}
```
