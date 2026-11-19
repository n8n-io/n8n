# AGENTS.md

## No runtime dependency on `n8n-workflow`

This package must not have a runtime dependency on `n8n-workflow`. The code
runtime in the sandbox reads the task files with this package, and it must not
load `n8n-workflow` only for that.

- Keep `n8n-workflow` in `devDependencies`.
- Outside tests, use only type imports from it. Lint enforces this.