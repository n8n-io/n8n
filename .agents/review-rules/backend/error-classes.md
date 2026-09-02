# Throw a typed error, not a plain Error

Applies to: backend packages (`cli`, `@n8n/db`, `core`, `workflow`) and the node packages.

The `no-plain-errors` lint rule is switched off repo-wide, so nothing catches
this. Flag `throw new Error(...)` in new code and pick by cause:

- `UserError` — the user caused it: invalid input, unauthorized action,
  business-rule violation
- `OperationalError` — transient and expected: a failing network request, a DB
  timeout; something to handle gracefully
- `UnexpectedError` — a bug: logic mistake, unhandled case, failed assertion

Do not flag `ApplicationError`; the `no-application-error` ESLint rule already
fails the build for it.
