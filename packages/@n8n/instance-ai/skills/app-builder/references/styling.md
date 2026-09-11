# Styling an App

An App looks good when it uses three things in this order:

1. A **layout preset** (`layoutPreset` on `create`, or its blocks through
   `set-layout`): header, menu, footer and a theme in one step. See
   [layouts.md](layouts.md).
2. The **theme**: `colors`, `radius`, `fontFamily`, `contentWidth`. Set it with
   `apps(action="update-app", appId, theme={...})`; pass `theme: null` to reset.
3. The **`app-*` vocabulary** (below) in `html` and `code` block output:
   containers, cards, grids and sections that follow the theme.

Reach for `theme.customCss` only when none of these can express what you need.
Utility classes and inline `style` are the last resort, for one block only.

## Vocabulary

Every served page loads these classes. They read the theme variables, so they
follow `theme.colors`, `theme.radius` and `theme.contentWidth` without any CSS
from you.

| Class | Use it on | What it does |
| --- | --- | --- |
| `app-container` | a `div` inside a header, footer or section | Centers its content at `theme.contentWidth` (default `72rem`) with side padding. |
| `app-header` | a `header` layout block | Full-width surface bar with a bottom border; sticks to the top of the page. Put an `app-container` inside it, holding the logo and the nav. |
| `app-logo` | an `a` in the header | Bold app name (or an `img`, height `2rem`) that links to the index page. |
| `app-nav` | a `nav` around a `ul` of links | Horizontal menu; vertical inside `app-sidebar`. Mark the current page with `aria-current="page"` — it turns bold and primary. |
| `app-sidebar` | an `aside` layout block | A left column of `14rem` for the menu; the layout becomes two columns on screens wider than `48rem` and stacks below. |
| `app-hero` | a `section` layout block | Centered title area with large padding: `h1` is the title, `p` a muted lead, an `app-nav` inside is centered. |
| `app-footer` | a `footer` layout block | Full-width footer with a top border and muted small text. Put an `app-container` inside it. |
| `app-card` | any `div` or `section` | Surface background, border, theme radius, padding. |
| `app-section` | a wrapper around several blocks | Vertical stack with a medium gap. |
| `app-grid-2`, `app-grid-3` | a wrapper around cards | Two or three equal columns; one column below `40rem`. |
| `app-muted`, `app-link`, `app-text` | any element | Muted text color, primary link color, theme text color and font. |

The page content (the `slot`) renders inside `main.app-main`: a surface card
centered at the content width, with padding. Content blocks need no container.

Rules:

- Use the vocabulary classes as they are. Do not invent variants
  (`app-header-dark`, `app-grid-4`); add a rule to `theme.customCss` instead.
- One `app-header` per layout, as the first block.
- Do not wrap the `slot` in a container: the slot is `main.app-main` and is
  already centered.

## Page recipes

The four presets are the reference recipes. Each is a layout (`set-layout`)
with fixed block ids: `header`, `nav`, `slot`, `footer` — only the ones the
recipe uses. Every code block below is TSX for a `code` block.

### Top navigation (`top-nav`)

Blocks: `header` (code), `slot`, `footer` (code).

```tsx
export function render(ctx: PageContext) {
  return (
    <header class="app-header">
      <div class="app-container">
        <a class="app-logo" href={'/apps/' + ctx.app.namespace}>{ctx.app.name}</a>
        <nav class="app-nav">
          <ul>
            {ctx.menu.map((item) => (
              <li>
                <a href={item.path} aria-current={item.current ? 'page' : undefined}>{item.title}</a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
```

Footer, shared by `top-nav` and `landing`:

```tsx
export function render(ctx: PageContext) {
  return (
    <footer class="app-footer">
      <div class="app-container">© {new Date().getFullYear()} {ctx.app.name}</div>
    </footer>
  );
}
```

### Sidebar (`sidebar`)

Blocks: `header` (code: `app-header` with the `app-logo` only), `nav` (code),
`slot`.

```tsx
const List = (props: { items: readonly MenuItem[] }) => (
  <ul>
    {props.items.map((item) => (
      <li>
        <a href={item.path} aria-current={item.current ? 'page' : undefined}>{item.title}</a>
        {item.children.length > 0 && <List items={item.children} />}
      </li>
    ))}
  </ul>
);

export function render(ctx: PageContext) {
  return (
    <aside class="app-sidebar">
      <nav class="app-nav">
        <List items={ctx.menu} />
      </nav>
    </aside>
  );
}
```

### Landing (`landing`)

Blocks: `header` (code), `slot`, `footer` (code, as above).

```tsx
export function render(ctx: PageContext) {
  return (
    <section class="app-hero">
      <h1>{ctx.app.name}</h1>
      <nav class="app-nav">
        <ul>
          {ctx.menu.map((item) => (
            <li>
              <a href={item.path} aria-current={item.current ? 'page' : undefined}>{item.title}</a>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
```

Add a lead paragraph (`<p>` inside `app-hero`) or a call-to-action `button`
block after the hero when the page asks for it.

### Minimal (`minimal`)

Blocks: `slot` only. Content in a narrow column (`contentWidth: 48rem`).

### Cards and grids in content

Use the vocabulary inside a `code` block for dashboards:

```tsx
export async function render(ctx: PageContext) {
  const orders = await ctx.dataTables.get('orders');
  const { count } = await orders.getManyRowsAndCount({ take: 1 });
  return (
    <div class="app-grid-3">
      <section class="app-card">
        <p class="app-muted">Open orders</p>
        <h2>{count}</h2>
      </section>
      <section class="app-card">…</section>
      <section class="app-card">…</section>
    </div>
  );
}
```

## Theme

| Theme field | Custom property | Read by |
| --- | --- | --- |
| `colors.primary` | `--app-color-primary` | `app-link`, `app-nav` current and hover |
| `colors.background` | `--app-color-background` | `app-canvas` (the page background) |
| `colors.surface` | `--app-color-surface` | `app-main`, `app-header`, `app-card`, `app-menu` |
| `colors.text` | `--app-color-text` | `app-text` (the page text) |
| `colors.muted` | `--app-color-muted` | `app-muted`, `app-footer`, `app-nav` links, `app-hero p` |
| `radius` | `--app-radius` | `app-main`, `app-card`, `app-menu` (`none` → `0px`, else `var(--radius--sm\|md\|lg)`) |
| `fontFamily` | `--app-font-family` | `app-text` |
| `contentWidth` | `--app-content-width` | `app-container`, `app-main` (a length in `px` or `rem`, e.g. `72rem`) |

Every preset carries a theme. `create` with `layoutPreset` applies it; the
Layout panel's preset picker in the editor applies the blocks only. Keep
palettes restrained: one primary color, a light background, white surfaces.

Colors are CSS color strings (max 32 characters). `customCss` is a string
(max 20,000 characters) appended to every page after the theme variables.
`customCss` can read the variables: `var(--app-color-primary, var(--color--primary))`.

## Design-system tokens

The page loads the n8n design-system tokens; `customCss` can use them:

| Family | Examples |
| --- | --- |
| `--color--*` | `--color--primary`, `--color--success`, `--color--danger--tint-3` |
| `--text-color*` | `--text-color`, `--text-color--subtle`, `--text-color--inverse` |
| `--background--*` | `--background--surface`, `--background--subtle`, `--background--hover` |
| `--border-color*` | `--border-color`, `--border-color--strong`, `--border-color--danger` |
| `--spacing--*` | `--spacing--xs`, `--spacing--md`, `--spacing--xl`, `--spacing--3xl` |
| `--radius--*` | `--radius--sm`, `--radius--md`, `--radius--lg` |
| `--font-size--*` | `--font-size--sm`, `--font-size--md`, `--font-size--lg`, `--font-size--2xl` |
| `--font-weight--*` | `--font-weight--regular`, `--font-weight--medium`, `--font-weight--bold` |
| `--font-family*` | `--font-family`, `--font-family--monospace` |

Prefer a token over a literal value.

## Page anatomy

With a layout:

```html
<body class="app-canvas app-text">
  <div class="app-layout" data-app-root>
    <div class="app-block" data-block-id="header">…</div>
    <main class="app-main" data-app-slot>…content blocks in order…</main>
    <div class="app-block" data-block-id="footer">…</div>
  </div>
</body>
```

Each layout block sits in `.app-block[data-block-id="<id>"]`; the `slot` is
`main.app-main[data-app-slot]`. Use the ids as hooks in `customCss`.

Without a layout, the built-in shell renders `div.app-shell > nav.app-menu +
main.app-main`: a menu card and a content card side by side.

Root element of each typed block inside `main`:

| Block | Root element |
| --- | --- |
| `header` | `h1`–`h6` (`text-2xl` … `text-xs`, `font-bold mb-md`) |
| `paragraph` | `p.text-text.mb-md` |
| `list` | `ol.list-decimal` or `ul.list-disc` (`pl-lg mb-md text-text`) |
| `image` | `figure.mb-md` > `img.rounded-lg.max-w-full` + `figcaption` |
| `divider` | `hr.my-md.border-border` |
| `table` | `div.overflow-x-auto.rounded-lg.border` > `table.w-full.text-sm` |
| `form` | `div.rounded-lg.border.bg-surface.p-md` > `form.flex.flex-col` |
| `button` | `form.mb-md` > `button[type=submit]` |
| `html` | `div.app-block-html.mb-md` |
| `code` | no wrapper; the returned HTML is inserted as-is |

## Utility classes on a served page

The stylesheet is compiled from the server templates. **Do not invent
Tailwind classes: only the utilities below exist on a served page.** Any other
class name has no effect. Prefer the `app-*` vocabulary; use a utility only for
a one-off tweak inside one block.

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

Rules for block output:

- `code` block output may use inline `style` attributes and its own `<style>`
  element.
- `html` block output may **not** use `style`; the sanitizer strips it. Use
  the vocabulary, the utilities above, or `theme.customCss`.

## When to use `customCss`

- A layout the vocabulary does not cover (a right sidebar, three columns): use
  `.app-layout` and the `[data-block-id]` hooks (see [layouts.md](layouts.md)).
- A brand detail the theme fields cannot express (a gradient header, a
  different table header color).
- Never to re-create what a vocabulary class does.

Brand-colored table header:

```css
.app-main thead tr { background: var(--app-color-primary, var(--color--primary)); }
.app-main thead th { color: var(--text-color--inverse); }
```

Wider content on one App: `update-app` with `theme: { contentWidth: "90rem" }`.
