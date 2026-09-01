# Autoresearch: Design system accessibility

## Objective
Reduce confirmed accessibility defects in the n8n Design System. Apply W3C WCAG and ARIA APG guidance. Apply MDN guidance. Prefer native HTML semantics. Preserve component behavior and public APIs.

## Metrics
- **Primary**: accessibility_violations (count, lower is better) — high-confidence source defects found by the fixed audit
- **Secondary**: audit_checks and affected_tests — independent coverage and regression monitors

## How to Run
`./.auto/measure.sh` outputs structured `METRIC` lines.

## Files in Scope
- `src/**/*.vue` — component semantics, keyboard behavior, names, states, and focus styles
- `src/**/*.test.ts` — focused regression tests for changed components
- `.auto/ideas.md` — deferred work

## Off Limits
- `.auto/measure.sh` — do not change the audit to improve the metric
- Accessibility rules, test expectations, and fixtures — do not weaken or remove them
- Generated files and external dependencies
- Public APIs, unless a compatible correction requires a change

## Constraints
- Do not add dependencies.
- Do not hide defects from the audit.
- Each change must correct user behavior, not only source text.
- Follow W3C APG patterns and MDN guidance.
- Prefer native elements over custom ARIA widgets.
- Keep keyboard, pointer, and screen-reader behavior equivalent.
- Run focused tests for each changed component.
- Run package lint and typecheck before finalization.
- Use named functions. Do not add arrow functions.
- Use JSDoc comments only.

## What's Been Tried
- The initial audit targets high-confidence defects: positive tabindex, images without alt text, and non-semantic click targets without keyboard semantics.
