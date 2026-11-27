# Layout

Guidance on grouping, alignment and spacing structure.

## Rules

- Prefer `flex` or `grid` for layout.
- When stacking elements, consider vertical alignment between elements such as icons and text labels.
- Write direction-dependent layout as leading and trailing: `margin-inline-start`, `padding-inline-end`, `inset-inline-start`, `text-align: start`. Reserve physical left and right for physical geometry such as safe-area insets.
- Give every interactive element a background shape, a border, an underline or a consistent placement zone. A control styled like the static text beside it does not read as a control.
- Space groups first, background shapes second, separator lines last. The gap between groups is at least 2× the gap within one (e.g. 8px inside a group means 16px or more between groups).
- Prefer even spacing inside a container such as a panel or `N8nCard`.
- The most important content sits near the top and the leading edge. Within a row, identifying content leads and metadata and actions trail. Visual order matches DOM order, so never move content out of source sequence with order, row-reverse or grid placement.
- Every piece of off-screen or collapsed content needs a visible cue. Use the project's established cue, let the next item peek 16–32px past the scroll edge or show a disclosure control.
- Ghost containers need more clearance than those with borders or backgrounds.
- Never park a critical action where resizing, zoom or scrolling clips it. Keep it in the normal flow or in stable chrome.
- Prefer text that is aligned at the start.
- Actions such as buttons should either stack vertically or be aligned at the end of horizontal containers. Never at the start.
- Scrollbars should keep gutter stable and use `mixins.scroll-bar` to display prettier scrollbars. Prefer using `N8nScrollArea` when you can.
- When content scrolls outside the viewport, add `mixins.scroll-mask` to the edge where the content cuts-off.

## Common fixes

| Pattern | Fix |
| --- | --- |
| `grid-template-columns: … 1fr` or a flex child holding long text or a wide table, overflowing its track | `minmax(0, 1fr)` on the track, `min-width: 0` on the flex child |
| `width: 100vw` | `width: 100%`; `100vw` includes the scrollbar and scrolls horizontally on desktop |
| `height:` with a fixed length on a box holding text | `min-height`, or `max-height` with `overflow-y: auto` |
| `@media (max-width: …)` inside a reusable component | `@container` on the component's parent |
| `container-type: inline-size` on a flex item, inline-block or absolute element with no width | Give it a definite width; size containment collapses a shrink-to-fit box to zero |
| `env(safe-area-inset-*)` with no `viewport-fit=cover` in the viewport meta | Add it, or the insets resolve to `0` |
| `inset-inline-*` or `*-inline-*` combined with `safe-area-inset-left` or `-right` | Physical `left` or `right` with the matching inset, plus a `[dir="rtl"]` override |
| `float: left` on mirrored UI | `float: inline-start` |
| `translateX` or `background-position: left` on mirrored UI | A `[dir="rtl"]` override; neither has a logical form |
| Sticky header with no `scroll-padding-block-start` | Set it to the header height |
