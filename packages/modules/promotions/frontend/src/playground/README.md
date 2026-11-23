# Environments Playground (prototype only)

A design prototype. It lets you trigger each cross-project promotion scenario
with sample data. It is not product code. Engineers do not need it.

Available in development builds only. A production build holds none of it.

## What to ignore

Everything in this folder:

- `PromotionsPlaygroundView.vue`: the page, with the scenario list and the
  Few / Some / Many control.
- `playground.scenarios.ts` and the other `playground.*` files: sample data
  and the list of scenarios.
- `playground.module.ts`: the only link to the module. It adds the Settings
  entry and the route.

Also in other files:

- `promotions.module.ts`: two lines, `...playgroundSettingsPages` and
  `...playgroundRoutes`.
- `@n8n/i18n` `en.json`: the keys `settings.promotions.playground.title` and
  `promotions.playground.*`.

To remove the Playground, delete this folder, those two lines and those keys.

## What to take

The product UI is not in this folder. It is in the normal places of the module
(`components/`, `views/`, `composables/`). The Playground only shows it.

## Scenarios

Apply (A1 to A4), Promote (P1 to P4) and Review (B1). Each one has three amounts: Few, Some, Many.

- Apply and Promote run the real preview page. A mock API answers its requests, and also answers
  Promote and Apply with a success, so the dialogs and the toasts can be seen. After a success the
  page stays in the Playground.
- P4 answers the first Promote with "the list changed", and the next preview has new issues.
- B1 shows the real Inbox in a frame, with a sample promotion review. The frame page loads with
  `?playground=review`, which gives it the sample data and hides the app sidebar.
- "Add credential" and "Add variable" open the real editors, and save to the real database. The
  names and ids in the sample data change on each page load, so an earlier load never collides.

## Product changes behind the scenarios

These are not in this folder. Engineers take them:

- The Issues tab: `components/preview/PromotionBlockers.vue`, with "Needs your action", "Outside
  your access" and "Cannot be promoted". The backend does not send the last two yet. The shape is
  `outsideAccess` on the check, in `promotions.types.ts`.
- The confirmation of unresolved dependencies, in the Promote dialog and a dialog for Apply:
  `PromoteSelectionDialog.vue`, `PromotionUnresolvedDialog.vue`, `PromotionUnresolvedSummary.vue`.
- The Issues tab of the promotion review: `PromotionReviewIssues.vue`, the `promotion-issues` slot
  of the module SDK, and `PromotionReviewDetail.vue` in the inbox module.
- The markers on workflows, the icon and number hints, and the `2/8` counts of the selection tree.

## Open

- The backend must send `outsideAccess`, and the review changes must carry it.
- The wording of the confirmation for a Promote that opens a review is a guess.

