# Design system enforcement

Applies to: `packages/frontend`.

The design system skill linked alongside this file is the source of truth for
which token to reach for. This file sets the enforcement level.

Stylelint validates CSS custom-property *names* but never their values, so
nothing catches a hard-coded one.

- Strong warning: hard-coded visual values (px, rem, hex colours, durations)
  where a token exists; legacy token usage; deprecated style or component
  surfaces.
- Soft warning: token-to-token substitutions. Ask for intent rather than
  asserting a regression — a deliberate change looks identical to a mistake.
