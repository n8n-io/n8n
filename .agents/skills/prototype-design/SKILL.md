---
name: n8n:prototype-design
description: Builds low-fidelity UX flow prototypes as a single self-contained HTML file in the n8n wireframe theme (handwritten font, monochrome, scenario pills). Use when the user asks for a prototype, wireframe, mockup, or clickable demo of a UX flow, or says /prototype-design. Not for production UI.
---

# Prototype design

A prototype shows a UX flow. It does not do real work. Nothing calls a
backend, and nothing persists. Reviewers click through it to judge the
flow, the states, and the copy.

For production UI, use `n8n:ui-design` instead. The rules for the n8n design
system do not apply here: no i18n, no design tokens, no `N8n*` components.
The theme below is a wireframe theme on purpose. It keeps reviewers on the
structure, not on the visuals.

## Stack

- One `.html` file. Inline `<style>` and `<script>`. No build step.
- Plain HTML, CSS, and vanilla JS. Do not add React, Vue, Tailwind, or a
  package. The file must open with a double-click and work in any browser or
  HTML preview.
- The only external resource is the Kalam font from Google Fonts. Keep the
  `'Segoe Print', 'Comic Sans MS', cursive` fallbacks.
- Start from [template.html](template.html). It contains the theme, the
  components, and the state and render scaffold.

## Theme

The tokens are in `template.html`. Keep them. Do not add brand colors.

| Aspect | Rule |
|---|---|
| Font | Kalam only. Weight 300 for text, weight 400 for emphasis. Do not use bold. |
| Type scale | 16px title, 14px heading, 12px body, 11px meta and hints. |
| Color | Ink on paper. Use `--ink`, `--ink-soft`, `--ink-faint`, `--wash`. Use `--red` and `--green` only for error and success text and icons. |
| Borders | 1.5px `--line-soft` for quiet borders. 1.5px `--line` for buttons and controls. 2px `--line` for modals, menus, sheets. |
| Radius | 7px controls. 14px modal. 8-10px menus and sheets. 999px pills and chips. 50% for avatars. |
| Shadow | A hard offset only: `5px 5px 0 var(--wash)`. No blur. |
| Primary button | Filled `--ink`, text `--paper`. Disabled is `--line-soft`. |
| Icons | Unicode glyphs (`✕ ⌄ › ✓ ⊗ ⌕`) or small inline SVG with `stroke="currentColor"`. A brand icon is one letter in a circle or square on `--wash`. |
| Modal | 584px wide, `max-width: 100%`. Centered on the page. |
| Dark mode | Support it. Follow `prefers-color-scheme` and allow `data-theme` to override. Swap only the color tokens. |

Use realistic sample data, such as `https://mcp.acme-crm.com/mcp` or
"CRM API token". Never use lorem ipsum. Never use real customer names.

## Prototype chrome

Put a pill bar above the UI. It belongs to the prototype, not to the product.
Keep it visually lighter than the UI.

- One pill for each scenario. Name pills by outcome:
  "Setup - connect succeeds", "Setup - connect fails", "Settings - connection lost".
- Use a second pill row or a checkbox for a second axis, such as
  "AIA / Agents" or "credentials expired".
- Selecting a pill resets all state and re-renders from the start.
- Cover the failure paths, not only the happy path. Each error state in the
  flow must be reachable from a pill.

## Code pattern

Keep every prototype in this shape:

1. **State.** One mutable object `S` plus a few module variables. Write a
   comment that names each state and its allowed values.
2. **`render()`.** Rebuild the UI with `innerHTML` from state. Do not patch
   the DOM by hand.
3. **`wire()`.** Call it at the end of `render()`. Bind listeners with
   `data-act`, `data-sel`, `data-pick` attributes. Do not use inline `onclick`.
4. **Fake async.** Use `await new Promise(r => setTimeout(r, 900))`. Take a
   `token` before the wait. Return if `token` changed. This cancels stale
   results when the user edits a field or switches a pill.
5. **Simulated outcomes.** The active pill decides success or failure. Do not
   use `Math.random()`. A reviewer must get the same result every time.
6. **Escape user text.** Pass every user-typed value through the `esc()`
   helper before you put it in `innerHTML`.
7. **Keep input focus.** If a keystroke triggers `render()`, restore focus and
   the cursor position to the input.

## UX rules

- Show the whole flow: entry, loading, success, failure, edit, remove.
- Show each loading state with a 10px spinner (`.spin`) and a short verb
  ("Connecting"). Disable the controls that the wait affects.
- Any edit to a verified value must reset the verification. Show a hint, such
  as "Connect to apply changes".
- Dim and disable content that depends on an unfinished step (`.dim`). Add a
  note that says why, such as "Available after you connect".
- Use a menu (`.menu`) for choices. Use a sheet (`.overlay` and `.sheet`)
  inside the modal for confirmation and small create forms.
- Confirm destructive actions. Name the action on the button, for example
  "Remove tool" and "Keep tool". Do not use "OK" and "Cancel".
- Confirm success with a toast (`toast('Changes saved')`). The toast hides after
  about 2.6 seconds.
- Put an inline error under the field it belongs to. Say what happened, then
  what to try. Use sentence case and curly apostrophes.
- Change one thing between two variants. Switch variants with a pill so that
  reviewers can compare them in place.

## Accessibility baseline

Keep it even in a throwaway file:

- Real `<button>` and `<input>` elements. Do not use clickable `<div>`.
- `:focus-visible` outline. `aria-label` on icon-only buttons.
- `role="status"` for progress and success. `role="alert"` for errors.
- `aria-expanded` on toggles. `role="dialog" aria-modal="true"` on sheets.
- Escape closes menus and sheets.
- `@media (prefers-reduced-motion: reduce)` stops the spinner.

## Workflow

1. Ask what flow to show and which states matter. If the user gave a spec,
   list the states from it before you write code.
2. Copy `template.html`. Rename the file and the `<title>`
   (`<flow> - prototype`).
3. List the scenarios. Add one pill for each.
4. Build the states, then the transitions.
5. Open the file in a browser. Click every pill and every path. Check light
   and dark mode.
6. Tell the user which states and paths the prototype covers, and which it
   does not.

Do not add the prototype to `packages/`. Do not add tests, lint, or i18n. Save assets in `.agent-setup/` folder
