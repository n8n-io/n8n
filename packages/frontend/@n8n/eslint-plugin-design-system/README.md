# @n8n/eslint-plugin-design-system

Internal lint rules for safe composition of n8n Design System components. The rules use the ESLint plugin API, and Oxlint runs them as a JS plugin.

Use these rules to enforce Design System constraints that cannot be reliably enforced through:

- The component API or implementation, such as safe defaults or restricting invalid prop combinations
- Storybook documentation, such as “Do/Don’t” usage guidance
- Established UI patterns and code review

A lint rule is appropriate when a constraint spans component composition or usage context and cannot be expressed through TypeScript or the component API.

`@n8n/oxlint-config/frontend` loads this package as an Oxlint JS plugin. It turns on `no-direct-component-imports` for every file and `require-teleported-tooltip-in-dropdown` for Vue files. Oxlint gives a JS plugin the `<script>` blocks of an SFC only, so the template check of `no-direct-component-imports` does not run under Oxlint (`scripts/lint-parity/oxlint-gap.json`).

For packages that still lint with ESLint, `configs.recommended` enables every rule for Vue files and `configs.componentImports` enables the import bans for TypeScript files. `@n8n/eslint-config/frontend` includes both.

## Rules

### `no-direct-component-imports`

Disallow a direct import of a Reka UI or Element Plus primitive. Callers use the design-system component.

Two lists select the exceptions:

- `src/rules/pending-reka-imports.ts` and `allowedElementPlusComponents` in `src/rules/element-plus-components.ts` name primitives that are not migrated yet. Those imports are allowed in any file. Remove a name when that primitive is migrated.
- `src/rules/wrapped-component-bans.ts` names a migrated primitive. Only the wrapper folder may import it. Add a row when a new wrapper replaces a primitive.

The rule checks named script imports and named re-exports. In Vue files it also checks Element Plus template tags. A deep Element Plus component path is reported for every import form and every re-export form. Namespace imports, star re-exports, and default imports of a package root (`reka-ui` or `element-plus`) stay out of scope, because those forms do not name one primitive.

### `require-teleported-tooltip-in-dropdown`

Requires `N8nTooltip` nested anywhere inside `N8nDropdownMenu` to keep teleportation enabled. Dropdown content clips overflow, so an inline tooltip can otherwise be cropped.

The `teleported` prop may be omitted because it defaults to `true`, or it may be set explicitly to `true`. Dynamic values are rejected because they cannot guarantee teleportation.
