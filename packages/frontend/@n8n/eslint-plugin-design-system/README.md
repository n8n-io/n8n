# @n8n/eslint-plugin-design-system

Internal ESLint rules for safe composition of n8n Design System components.

Use ESLint rules to enforce Design System constraints that cannot be reliably enforced through:

- The component API or implementation, such as safe defaults or restricting invalid prop combinations
- Storybook documentation, such as “Do/Don’t” usage guidance
- Established UI patterns and code review

ESLint is appropriate when a constraint spans component composition or usage context and cannot be expressed through TypeScript or the component API.

`configs.recommended` enables every rule for Vue files. `configs.componentImports` enables the import ban for TypeScript files. `@n8n/eslint-config/frontend` includes both.

## Rules

### `no-direct-wrapped-component-imports`

Disallow use of Reka UI and Element Plus primitives that a design-system component already wraps.

Callers use the design-system component. The wrapper folder may still import the primitive. Add a row to `src/rules/wrapped-component-bans.ts` when a new wrapper replaces a primitive.

The rule checks script imports and re-exports. In Vue files it also checks Element Plus template tags. A deep Element Plus component path is reported for every import form and every re-export form. Namespace imports, star re-exports, and default imports of a package root (`reka-ui` or `element-plus`) stay out of scope, because both libraries still export primitives that are not wrapped yet.

### `require-teleported-tooltip-in-dropdown`

Requires `N8nTooltip` nested anywhere inside `N8nDropdownMenu` to keep teleportation enabled. Dropdown content clips overflow, so an inline tooltip can otherwise be cropped.

The `teleported` prop may be omitted because it defaults to `true`, or it may be set explicitly to `true`. Dynamic values are rejected because they cannot guarantee teleportation.
