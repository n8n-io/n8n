# @n8n/design-system

## Rules

- Always use `n8n:ui-design` skill when building or refactoring components
- Always add stories for new components to `packages/frontend/@n8n/design-system`.
- Always add comments to the public interfaces, with comments explaining what each one is for
- Always add a `.test.ts` file with relevant tests for each component
- Always add i18n translations for user-facing strings, including accessible labels
- Always use `n8n:content-design` skill for copy wording
- Prefer to bind fixed child component props from a fixed props object. Add comment that explain why each prop must remain fixed.

### Storybook Stories

- Every story must use one of these title categories:
  - `Style Guide`: styles, tokens, and utilities
  - `Core`: components used across the app
  - `Areas/<Product area>`: patterns and components for a specific product area, for example `Areas/Settings` or `Areas/Assistant`
  - `Experimental`: beta components that require caution
- The last `title` segment is the component name and MUST be PascalCase (`Core/EmptyState`, not `Core/empty-state`). Category prefixes are unrestricted.

## References

- @README.md: Guidelines on contributing new components to the design-system
- [W3C-APG](https://www.w3.org/WAI/ARIA/apg/patterns/): Guidelines on proper ARIA implementation
