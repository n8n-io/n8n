# @n8n/eslint-plugin-design-system

Internal ESLint rules for safe composition of n8n Design System components.

Use ESLint rules to enforce Design System constraints that cannot be reliably enforced through:

- The component API or implementation, such as safe defaults or restricting invalid prop combinations
- Storybook documentation, such as “Do/Don’t” usage guidance
- Established UI patterns and code review

ESLint is appropriate when a constraint spans component composition or usage context and cannot be expressed through TypeScript or the component API.

Oxlint runs these rules through `@n8n/oxlint-config/vue`. Oxlint gives a JS plugin only the script block of an SFC, so a template rule reads the SFC from disk and parses it with `@vue/compiler-dom`. The rule reports at the start of the script block, and the message gives the template position.

## Rules

### `require-teleported-tooltip-in-dropdown`

Requires `N8nTooltip` nested anywhere inside `N8nDropdownMenu` to keep teleportation enabled. Dropdown content clips overflow, so an inline tooltip can otherwise be cropped.

The `teleported` prop may be omitted because it defaults to `true`, or it may be set explicitly to `true`. Dynamic values are rejected because they cannot guarantee teleportation.
