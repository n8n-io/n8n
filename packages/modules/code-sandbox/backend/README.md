# @n8n/backend-module-code-sandbox

Runs code tasks, for example of the Code node, on the code sandbox service.

```bash
pnpm turbo typecheck --filter=@n8n/backend-module-code-sandbox
pnpm turbo lint --filter=@n8n/backend-module-code-sandbox
pnpm turbo test --filter=@n8n/backend-module-code-sandbox
```

Go through Turbo. It builds this package's workspace dependencies first.

## Import rules

- Do not import from `packages/cli` or from the `n8n` package.
- Declare each workspace and third-party import in this package.
- Export APIs for other packages from `src/index.ts`.
