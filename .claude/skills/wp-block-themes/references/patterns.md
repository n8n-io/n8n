# Patterns (filesystem patterns)

Use this file when adding patterns that should be available in the inserter.

## Filesystem patterns

- Put patterns in `patterns/*.php`.
- Patterns are registered automatically by WordPress core based on file headers.

Upstream reference:

- https://developer.wordpress.org/themes/patterns/

## Practical guardrails

- Keep pattern markup stable; changing block names inside patterns can break older content in subtle ways.
- If a pattern should not be inserted directly by users, mark it as non-inserter / internal-only (per upstream header conventions).

