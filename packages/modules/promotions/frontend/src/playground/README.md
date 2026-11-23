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
