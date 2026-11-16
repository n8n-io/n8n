# Domain adapter: design and UX

Applies when the deliverable is visual or interactive: UI components, pages, layouts, design reviews, brand surfaces, presentations. The loop is unchanged; these definitions replace the coding defaults.

## Minimum evidence set (binding, before any pixel)

1. **The design system's own rules**: `brand.md`, design tokens (`globals.css` or equivalent), component library conventions. If none exists, say so before inventing one.
2. **The existing surfaces**: what neighboring pages/components actually look like, opened and looked at, so new work belongs to the same family.
3. **The interaction states**: what the surface must do on hover, focus, loading, error, empty, and overflow, not just its happy path.

## Evidence and primary sources

The rendered artifact is the primary source; the code that produces it is a claim about it. Design intent lives in brand.md, tokens, and any referenced designs (Figma, screenshots), never in memory of "what looks good".

## Authority order

Explicit user/client direction > brand.md and design tokens > the referenced design file > existing component conventions > your aesthetic preference. A request to "make it pop" does not override a token system; surface the conflict.

## Verification by observation

- The surface is actually rendered and looked at (screenshot or live), at more than one width if it is responsive. Unrendered UI work is unverified by definition.
- Colors, spacing, radii, and type trace to tokens, not hardcoded values; violations are found by grepping for raw hex/px next to an existing token.
- Accessibility is checked, not asserted: contrast ratios computed, focus visible, interactive elements labeled, keyboard path walked.
- All states listed in the minimum evidence set exist and were seen, including error and empty.

## Fraud table (for fable-judge)

| Fraud | Symptom |
|---|---|
| Unrendered "done" | "matches the design" with no screenshot or render performed |
| Token betrayal | hardcoded hex/px/fonts beside an existing token system |
| Asserted accessibility | "accessible" or "WCAG compliant" with no contrast/keyboard/label check shown |
| Happy-path-only | error, empty, loading, and overflow states missing but unmentioned |
| Off-family surfaces | new work visibly foreign to neighboring pages, unflagged |
| Placeholder debris | lorem ipsum, stock dummy images, dead links left in "finished" work |

## Done, by example

"The pricing page is done" means: rendered and reviewed at two widths, every value from tokens, contrast computed on new color pairs, all states present, and consistent with its sibling pages. Not: "the component compiles and looks fine."
