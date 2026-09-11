# Layouts

A layout is the frame around a page's content: a header, a menu, a footer, a
sidebar. Without one, every page renders in the built-in shell (menu card on
the left, content card on the right; see [styling.md](styling.md)).

## Start from a preset

Four presets ship with n8n. Each is a layout plus a theme:

| Id | Layout | Theme |
| --- | --- | --- |
| `top-nav` | sticky header with logo and horizontal menu, content, footer | indigo primary, cool gray background, `72rem` |
| `sidebar` | header with logo, menu in a `14rem` left column, content beside it | teal primary, `80rem` |
| `landing` | centered hero with the app name and the menu, content, footer | warm orange primary, serif font, `64rem` |
| `minimal` | content only in a narrow column, no menu | near-black primary, white, `48rem` |

- **New app**: `apps(action="create", name, layoutPreset="top-nav")`. The app
  gets the preset's theme and an index page (route `""`) that carries the
  layout. Do not `create-page` with route `""` afterwards — the page exists;
  fill it with `set-content`.
- **Existing app**: `set-layout` on the index page with the preset's blocks
  (the recipes in [styling.md](styling.md) → "Page recipes"), and
  `update-app` with a theme of your own. The editor's Layout panel offers the
  same presets; there they apply the blocks only.

Pick `top-nav` when in doubt. Pick `sidebar` for an app with many pages or
nested pages, `landing` for a public one-pager with a form, `minimal` for a
single document or form.

Start from a preset even when the user asks for something custom, then change
one block at a time. Keep the fixed block ids (`header`, `nav`, `slot`,
`footer`) so the user can tell "same block, edited" from "new block".

## Model

`Page.layout` is an array of blocks, like `content`, with two differences:

- It may hold a `slot` block, and it must hold exactly one. The slot is where
  the server puts the page content.
- Any content block type is allowed around the slot (`header`, `html`, `code`,
  `button`, ...). Blocks stack vertically in order.

```json
[
  { "id": "header", "type": "code", "data": { "source": "..." } },
  { "id": "slot", "type": "slot", "data": {} },
  { "id": "footer", "type": "code", "data": { "source": "..." } }
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

Render the menu with the `app-nav` class and mark the current item with
`aria-current="page"`; the stylesheet does the rest (horizontal in a header,
vertical in a sidebar, centered in a hero). The `top-nav` header and the
`sidebar` nav in [styling.md](styling.md) are the two shapes: a flat list of
the top level, or a recursive `List` component for nested pages.

JSX escapes `title` and `path` (a `:param` page's title is a value from the
URL), so no escape helper is needed.

## Beyond the presets: custom CSS

The vocabulary covers a header, a footer, a left sidebar and a hero. For
anything else (a right sidebar, three columns), turn the stack into a grid with
`theme.customCss`, using the block ids as hooks:

```css
.app-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 16rem;
}
.app-layout > [data-block-id="header"],
.app-layout > [data-block-id="footer"] { grid-column: 1 / -1; }
.app-layout > .app-main { grid-column: 1; }
.app-layout > [data-block-id="aside"] { grid-column: 2; }
```

Set it with `apps(action="update-app", appId, theme={ customCss: "..." })`.

## Actions in a layout

A `button`, `form`, `table` or `code` block in a layout works on every page
that inherits the layout. Its action URL names the page that owns the layout,
not the page the visitor is on, so `ctx.actionUrl(name)` in a layout block
returns the owner page's URL. `ctx.page` inside a layout block is still the
page being rendered.
