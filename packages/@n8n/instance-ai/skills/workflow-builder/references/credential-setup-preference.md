---
name: credential-setup-preference
description: >-
  Load when node or credential discovery results include a `setupPreference`
  array and more than one interchangeable service could fill the requested
  capability.
---

# Credential Setup Preference

Discovery results can include a `setupPreference` array. Each entry has:

- `type`, the credential type
- `setupCompletionPercent`, a percentage from 0 to 100 rounded to the nearest
  5 percentage points, or `null`
- `popularityScore`, a relative adoption score from 0 to 1 rounded to one
  decimal place, or `null`

Setup completion measures completion of an Instance AI setup step containing
the credential; it is not an activation or validity rate. For either metric,
`null` means there was not enough data. Popularity is relative recent adoption,
not a percentage. Treat both as coarse signals and ignore small differences.

When choosing a service:

1. Honor explicit intent and existing workflow choices.
2. Prefer a semantically suitable service with a usable existing credential,
   then apply the existing Gateway credits rules.
3. Compare setup preference only among the remaining semantically
   interchangeable candidates. Before deciding, inspect discovery results for
   every candidate the user named.

- When setup completion and popularity clearly support one candidate, choose it
  and continue without asking.
- When the signals are close or conflict and the user has not delegated the
  choice, ask exactly one `single` question. If skipped, choose a default within
  the user's requested scope.
- When the user explicitly asks you to choose, make a sensible choice and
  continue without asking.

Use judgment instead of calculating a combined score or applying a fixed
threshold. Never let this metadata override stronger semantic relevance or use
it to choose between authentication methods for the same service.
