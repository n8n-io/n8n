# @n8n/mcp-browser

MCP server that gives AI agents full control over Chrome. Connects to the
user's real installed browser via the **n8n AI Browser Bridge** extension, using
their actual profile, cookies, and sessions. Action tools return an
accessibility snapshot with every response for single-roundtrip interaction.

See [spec/browser-mcp.md](spec/browser-mcp.md) for the full feature spec and
[spec/technical-spec.md](spec/technical-spec.md) for the technical design.

## Usage

### Library mode

```typescript
import { createBrowserTools } from '@n8n/mcp-browser';

const { tools, connection } = createBrowserTools({
  defaultBrowser: 'chrome',
  headless: false,
  viewport: { width: 1280, height: 720 },
});

// Register tools on any MCP server
for (const tool of tools) {
  server.tool(tool.name, tool.description, tool.inputSchema, tool.execute);
}

// Cleanup on shutdown
process.on('SIGTERM', () => connection.shutdown());
```

### Standalone mode

```bash
# HTTP transport (default) — binds to 127.0.0.1 and requires bearer-token auth
npx @n8n/mcp-browser --browser chrome --transport http --port 3100

# stdio transport — recommended for IDE/desktop MCP clients that can't pass
# custom HTTP headers
npx @n8n/mcp-browser --browser chrome --transport stdio
```

When the HTTP transport starts without an auth token configured it generates a
random one and prints it to stderr. Pass it on every request as
`Authorization: Bearer <token>`. For a stable token across restarts, set
`N8N_MCP_BROWSER_AUTH_TOKEN`. Prefer the env var over `--auth-token`: command
line arguments are visible in process listings (`ps`, `/proc/<pid>/cmdline`)
to other local users.

### CLI flags

| Flag | Alias | Env var | Default | Description |
|------|-------|---------|---------|-------------|
| `--browser` | `-b` | `N8N_MCP_BROWSER_DEFAULT_BROWSER` | `chrome` | Default browser |
| `--headless` | | `N8N_MCP_BROWSER_HEADLESS` | `false` | Headless mode |
| `--viewport` | | `N8N_MCP_BROWSER_VIEWPORT` | `1280x720` | Viewport (WxH) |
| `--transport` | `-t` | `N8N_MCP_BROWSER_TRANSPORT` | `http` | `http` or `stdio` |
| `--port` | `-p` | `N8N_MCP_BROWSER_PORT` | `3100` | HTTP port |
| `--host` | | `N8N_MCP_BROWSER_HOST` | `127.0.0.1` | HTTP bind address. Use `0.0.0.0` only when the listener must accept connections from outside the host. |
| `--auth-token` | | `N8N_MCP_BROWSER_AUTH_TOKEN` | _generated_ | Bearer token required on every HTTP request. Prefer the env var (see above). |

CLI flags take precedence over environment variables.

## Prerequisites

1. **Chrome** (or Brave/Edge) installed
2. **n8n AI Browser Bridge** extension loaded in Chrome:
   - Open `chrome://extensions`
   - Enable Developer mode
   - Click "Load unpacked" and select the `mcp-browser-extension` directory

## Testing with AI clients

Start the server:

```bash
N8N_MCP_BROWSER_AUTH_TOKEN=my-secret npx @n8n/mcp-browser --transport http --port 3100
```

Or from the monorepo:

```bash
N8N_MCP_BROWSER_AUTH_TOKEN=my-secret npx tsx packages/@n8n/mcp-browser/src/server.ts --transport http --port 3100
```

Every request to `http://localhost:3100/mcp` must include
`Authorization: Bearer <token>`. Most current MCP clients (Claude Desktop,
Cursor, Windsurf, VS Code Copilot) configure servers via a bare `url` and
cannot attach custom headers; use `--transport stdio` with those clients
until they support a `headers` option.

Then point your client at `http://localhost:3100/mcp`:

<details>
<summary>Claude Desktop</summary>

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`
(macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "n8n-browser": {
      "url": "http://localhost:3100/mcp"
    }
  }
}
```

</details>

<details>
<summary>Claude Code</summary>

Add to `.mcp.json` in your project root (per-project) or
`~/.claude/mcp.json` (global):

```json
{
  "mcpServers": {
    "n8n-browser": {
      "url": "http://localhost:3100/mcp"
    }
  }
}
```

Or add interactively with `/mcp add`.

</details>

<details>
<summary>Cursor</summary>

Add to `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "n8n-browser": {
      "url": "http://localhost:3100/mcp"
    }
  }
}
```

</details>

<details>
<summary>Windsurf</summary>

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "n8n-browser": {
      "url": "http://localhost:3100/mcp"
    }
  }
}
```

</details>

<details>
<summary>VS Code (GitHub Copilot)</summary>

Add to `.vscode/mcp.json` in your project root. Note: VS Code uses `"servers"`
instead of `"mcpServers"`.

```json
{
  "servers": {
    "n8n-browser": {
      "url": "http://localhost:3100/mcp"
    }
  }
}
```

</details>

## Development

```bash
pnpm dev    # start standalone MCP server with hot reload
pnpm build  # build for production
pnpm test   # run tests
```
