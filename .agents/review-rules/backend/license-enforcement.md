# License enforcement

Applies to: `packages/cli`, `*.ee.ts` files, licensed modules.

Nothing fails the build when a paid feature ships ungated, so this is review-only.

- Endpoints in `*.ee.ts` reaching licensed features without `@Licensed` — a
  scope decorator is a permission check, not a license check
- `@Licensed` not matching the feature (`LICENSE_FEATURES` in `@n8n/constants`)
- Bypassed quota checks, or missing `FeatureNotLicensedError` on an unlicensed
  path
- Custom licensing middleware where the `@Licensed` decorator fits
- Decorator order: route decorator → `@Licensed` → scope decorators
- Enterprise code reachable outside `*.ee.ts` files or licensed modules
