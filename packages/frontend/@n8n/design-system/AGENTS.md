# @n8n/design-system

## References
- @README.md
- When working on components, use `n8n:ui-design` skill
- Follow guidelines from [W3C-APG](https://www.w3.org/WAI/ARIA/apg/patterns/) where applicable

## Rules
- Every public interface for component props must have comments explaining what each prop is for
- Every component must include a `.test.ts` file with relevant tests
- Every user-facing string, including accessible labels, must have i18n translation 
- For copy wording, use `n8n:content-design` skill
- Every component should have a related `*.stories.ts` file
- Every story must use one of these title categories:
  - `Style guide`: styles, tokens, and utilities
  - `Core`: components used across the app
  - `Areas/<Product area>`: patterns and components for a specific product area, for example `Areas/Settings` or `Areas/Assistant`
  - `Experimental`: beta components that require caution
