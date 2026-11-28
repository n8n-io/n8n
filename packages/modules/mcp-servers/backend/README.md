# @n8n/backend-module-mcp-servers

Backend feature module for custom MCP servers. The n8n runtime loads the module through the lazy
import in `packages/cli/src/modules/modules.manifest.ts`.

```bash
pnpm turbo typecheck --filter=@n8n/backend-module-mcp-servers
pnpm turbo lint --filter=@n8n/backend-module-mcp-servers
pnpm turbo test --filter=@n8n/backend-module-mcp-servers
```

Go through Turbo. It builds this package's workspace dependencies first.

Read `src/AGENTS.md` for the module layout, layer boundaries, ports and adapters model, public API,
and recipes for common changes. Read `docs/backend/how-to/build-a-backend-module.md` for general
backend module patterns.
