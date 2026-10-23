# @n8n/eslint-plugin-design-system

Internal ESLint rules for accessible web interfaces and safe composition of n8n Design System components.

Use ESLint rules to enforce Design System constraints that cannot be reliably enforced through:

- The component API or implementation, such as safe defaults or restricting invalid prop combinations
- Storybook documentation, such as “Do/Don’t” usage guidance
- Established UI patterns and code review

ESLint is appropriate when a constraint spans component composition or usage context and cannot be expressed through TypeScript or the component API.

The recommended flat config enables all rules for Vue files and is included by `@n8n/eslint-config/frontend`.

## Rules

Add accessibility and web guideline rules to `src/rules`. Export each rule from `src/rules/index.ts`. Enable each stable rule in the recommended config in `src/plugin.ts`. The frontend ESLint config applies the recommended config to editor-ui and the Design System.

Base accessibility rules on W3C specifications and WAI-ARIA Authoring Practices. Keep attribute-name, attribute-value, and role compatibility checks in separate rules so each diagnostic has one clear action.

### `label-has-for`

Requires each native `label` to contain a labelable form control or to use a `for` value that matches a control ID. The rule accepts dynamic `for` bindings because it cannot resolve their runtime values.

### `no-access-key`

Disallows static and bound `accesskey` attributes. Access keys can conflict with assistive technology and system keyboard shortcuts.

### `no-aria-hidden-on-focusable`

Disallows `aria-hidden="true"` on a focusable element or on an ancestor of a focusable element. The rule checks native controls, links, media controls, `contenteditable`, and static `tabindex` values.

### `no-invalid-aria-props`

Disallows `aria-*` attributes that WAI-ARIA 1.2 does not define. The rule checks static attributes and statically named `v-bind` attributes. It ignores dynamic argument names because their values are not available during static analysis.

### `no-invalid-aria-role`

Requires static ARIA roles to be valid, non-abstract WAI-ARIA 1.2 roles. The rule ignores dynamic role values because it cannot resolve their runtime values.

### `no-pointer-only-events`

Requires `mousedown`, `mouseup`, `pointerdown`, and `pointerup` handlers to have equivalent semantic or keyboard activation. Native interactive elements, interactive ARIA roles, and elements with keyboard handlers meet this requirement. The rule ignores dynamic event names and custom components because it cannot resolve their runtime behavior.

### `no-positive-tabindex`

Disallows positive static `tabindex` values. Use `0` to add an element to the natural tab order. Use `-1` for programmatic focus.

### `no-redundant-roles`

Disallows an explicit ARIA role when it duplicates the native or implicit semantics of an HTML element. Use native HTML semantics without a duplicate role.

### `no-static-element-interactions`

Requires static HTML elements with mouse, keyboard, pointer, or touch handlers to use interactive HTML or an interactive ARIA role. The rule ignores custom components because their rendered semantics are not available.

### `prefers-reduced-motion`

Requires selectors with CSS animations, transitions, or smooth scrolling to disable the same motion in a `prefers-reduced-motion: reduce` media query. A matching selector or a universal selector can set `animation: none`, `transition: none`, or `scroll-behavior: auto`.

### `require-teleported-tooltip-in-dropdown`

Requires `N8nTooltip` nested anywhere inside `N8nDropdownMenu` to keep teleportation enabled. Dropdown content clips overflow, so an inline tooltip can otherwise be cropped.

The `teleported` prop may be omitted because it defaults to `true`, or it may be set explicitly to `true`. Dynamic values are rejected because they cannot guarantee teleportation.

### `role-has-required-aria-props`

Requires explicit ARIA roles to include each state or property that WAI-ARIA 1.2 requires. Static and bound attributes both satisfy the requirement.
