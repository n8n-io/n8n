# Layouts

A layout is the frame around a page's content: a header, a menu, a footer, a
sidebar. Without one, every page renders in the built-in shell (menu card on
the left, content card on the right; see [styling.md](styling.md)).

## Model

`Page.layout` is an array of blocks, like `content`, with two differences:

- It may hold a `slot` block, and it must hold exactly one. The slot is where
  the server puts the page content.
- Any content block type is allowed around the slot (`header`, `html`, `code`,
  `button`, ...). Blocks stack vertically in order.

```json
[
  { "id": "menu", "type": "code", "data": { "source": "..." } },
  { "id": "slot", "type": "slot", "data": {} },
  { "id": "footer", "type": "html", "data": { "template": "<footer class=\"text-xs app-muted\">© Acme</footer>" } }
]
```

Set it with `apps(action="set-layout", appId, pageId, layout=[...])`. Block
ids are optional; the tool generates missing ones. A layout that has no slot,
two slots, or a duplicate id comes back as `{ denied: true, issues }`.

## Inheritance

A page renders in its own layout when it has one. Otherwise it walks up its
parents and uses the first layout it finds. When no ancestor has one, it uses
the layout of the app's index page (route `""`, top level). When that page has
none either, it uses the built-in shell. `get-page` returns the page's own
`layout` only; `null` means "inherit".

- To give a whole app one frame, set the layout on the index page (route
  `""`). It is the app-wide default: every page without a layout of its own,
  or of an ancestor, uses it.
- To give a section its own frame, set the layout on the section's parent
  page. Every page below it inherits.
- To make a page inherit again, call `set-layout` with `layout: null`.

## Menu from `ctx.menu`

A `code` block in a layout reads `ctx.menu`: the page tree as a nested list
of `{ title, path, current, children }`. `path` is absolute (`/apps/<ns>/...`),
`current` is `true` for the page being rendered, and pages behind an
unresolved `:param` are left out. Call `apps(action="code-api")` for the type.

```tsx
const List = (props: { items: readonly MenuItem[] }) => (
  <ul class="list-none pl-sm text-sm">
    {props.items.map((item) => (
      <li class="py-2xs">
        {item.current ? (
          <span class="font-semibold app-text">{item.title}</span>
        ) : (
          <a class="app-link no-underline hover:underline" href={item.path}>{item.title}</a>
        )}
        {item.children.length > 0 && <List items={item.children} />}
      </li>
    ))}
  </ul>
);

export function render(ctx: PageContext) {
  return (
    <nav class="app-menu">
      <span class="block text-xs font-semibold app-muted uppercase mb-sm">{ctx.app.name}</span>
      <List items={ctx.menu} />
    </nav>
  );
}
```

JSX escapes `title` and `path` (a `:param` page's title is a value from the
URL), so no escape helper is needed.

## Two columns with custom CSS

Layout blocks stack vertically by default. Turn the stack into a grid with
`theme.customCss`, using the block ids as hooks:

```css
.app-layout {
  display: grid;
  grid-template-columns: 14rem 1fr;
  gap: var(--spacing--xl);
  max-width: 64rem;
  margin: 0 auto;
  padding: var(--spacing--xl);
}
.app-layout > [data-block-id="menu"] { grid-column: 1; }
.app-layout > .app-main { grid-column: 2; }
.app-layout > [data-block-id="footer"] { grid-column: 1 / -1; }
```

Set it with `apps(action="update-app", appId, theme={ customCss: "..." })`.

## Actions in a layout

A `button`, `form`, `table` or `code` block in a layout works on every page
that inherits the layout. Its action URL names the page that owns the layout,
not the page the visitor is on, so `ctx.actionUrl(name)` in a layout block
returns the owner page's URL. `ctx.page` inside a layout block is still the
page being rendered.
