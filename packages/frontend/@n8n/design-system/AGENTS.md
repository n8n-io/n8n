# @n8n/design-system

## Rules

- Load the `ui-design` skill (`.agents/skills/ui-design`) when you build or refactor a component.
- Add stories for each new component.
- Add a comment to each public interface. The comment tells what the interface is for.
- Add a `.test.ts` file with tests for each component.
- Put the stories and the tests in the component folder, next to the component, for example `N8nButton/Button.stories.ts` and `N8nButton/Button.test.ts`.
- Add i18n translations for all user-facing strings. This includes accessible labels.
- Load the `content-design` skill (`.agents/skills/content-design`) when you write copy.
- When you can, bind fixed props of a child component from a fixed props object. Add a comment that tells why each prop must stay fixed.
- Declare state that the parent owns as a named prop. Declare the change as `update:<name>` on the emits interface.
- Name the prop for that state. `N8nSettingsEnableRow` uses `enabled`. Callers bind `:enabled` and `@update:enabled`.
- Use `defineModel` only when the component must also work with no parent binding. `N8nSettingsRow` does this for its disclosure state.

### Storybook Stories

- Every story must use one of these title categories:
  - `Style Guide`: styles, tokens, and utilities
  - `Core`: components used across the app
  - `Areas/<Product area>`: patterns and components for a specific product area, for example `Areas/Settings` or `Areas/Assistant`
  - `Experimental`: beta components that require caution
- The last `title` segment is the component name and MUST be PascalCase (`Core/EmptyState`, not `Core/empty-state`). Category prefixes are unrestricted.

## References

- `README.md`, section "Contributing": Guidelines on contributing new components to the design-system
- [W3C-APG](https://www.w3.org/WAI/ARIA/apg/patterns/): Guidelines on proper ARIA implementation
