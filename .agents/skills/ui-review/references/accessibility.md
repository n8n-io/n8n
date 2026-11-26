# Accessibility

Guidance for reviewing and fixing keyboard and focus behavior, ARIA, accessible names, forms, screen-reader announcements, motion and zoom against WCAG 2.2.

## Rules

- Color contrast should be 4.5:1 for normal text. At least 3:1 for large text.
- Prefer a native element when it exists. `<button>` for actions, `<a href>` for navigation, never `<div @click>`. A real link must support Cmd/Ctrl/middle-click.
- Use native `disabled` when a control is genuinely unavailable. Reach for `aria-disabled="true"` only when it should stay focusable, then block pointer, keyboard and form behavior in code and style the state explicitly.
- WCAG 2.5.8's Level AA baseline is a 24×24 CSS-pixel target, or one of its exceptions. Extend with a pseudo-element when the visible element should stay smaller. Never let extended hit areas overlap.
- Explain unavailable actions with `N8nButton disabled focusableWhenDisabled` inside `N8nTooltip as-child`. Show the same explanation as nearby text and link it with `aria-describedby`. Do not use hover-only explanations on native disabled buttons.
- Focusable elements in a composite widget such as a listbox, menu, grid, or tablist should follow that widget's arrow-key pattern.
- Icon-only interactive elements should define an explicit `aria-label`.
- Tooltips triggered by hover should not contain interactive content.
- Use `<img>` with appropriate `alt` text for content images that need an accessible name. Use `alt=""` for decorative images. Decorative graphics may use inline SVG or CSS and should be hidden from assistive technology.
- Pair color with a second cue, such as an icon or label.
- Moving, blinking or scrolling content needs a visible pause control once it lasts more than 5 seconds. Auto-updating content needs one however long it runs, and a frequency control counts (2.2.2). Toasts carrying an action or an error stay until dismissed.
- Three mechanisms, three jobs. `aria-describedby` carries field-specific validation. A polite live region (`role="status"`) carries non-urgent updates not tied to a control, such as toasts and result counts. `role="alert"` carries urgent untied errors and nothing else.
- Validate on submit, never by disabling submit until the form is valid. A destructive confirmation whose label states its one requirement, such as typing the object's name, may keep its button disabled until that is met. Mark failing fields `aria-invalid="true"`, point `aria-describedby` at the inline error text and focus the first invalid field.

## Common fixes

| Pattern | Fix |
| --- | --- |
| `outline: none` with no `focus-visible` replacement nearby | use `focus` mixin to apply ring |
| `<div @click` or `<span @click` | Use `<button>`, or `<a href>` when it navigates |
| `role="button"` or `role="tab"` with no `@keydown` | Use the native element, or implement the APG key map |
| `tabindex="1"` or any positive `tabindex` | Fix the DOM order and use `0` |
| `:disabled="!isValid"` on a submit button | Keep it enabled and validate on submit |
| `aria-live="assertive"` on a success toast | `role="status"` |
| `<img` with no `alt` attribute | `alt=""` if decorative, otherwise describe the purpose |
| `aria-label` whose text omits the visible label | Start the name with the visible text |
| `aria-hidden` on an ancestor of a button, link or input | Remove it, or make the subtree inert |
| Tooltip on a natively `disabled` control | Use the `focusableWhenDisabled` prop on `N8nButton` |
| `@dragstart` or a drag library with no button alternative | Add a single-pointer path to the same result |
