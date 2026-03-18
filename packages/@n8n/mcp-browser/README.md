# @n8n/mcp-browser

Standalone browser automation package built on Playwright, WebDriver BiDi, and
safaridriver. Provides a full suite of browser control tools that can be
registered on any MCP server or run as a standalone MCP server.

Supports macOS, Linux, and Windows.

## Why

Browser automation for AI agents requires:

- **Multi-browser support** — Chrome, Firefox, Safari with the user's actual
  data
- **Session isolation** — concurrent sessions that don't interfere
- **Flexible modes** — ephemeral (throwaway), persistent (named profiles), or
  local (user's real browser)
- **Easy integration** — drop tools into any existing MCP server with one
  function call

This package handles the protocol complexity internally. The user chooses a
mode and a browser; we pick the right adapter (Playwright, WebDriver BiDi, or
safaridriver).

## Usage

### Library mode (primary)

Import tool definitions and register them on your existing MCP server:

```typescript
import { createBrowserTools } from '@n8n/mcp-browser';

// All configuration is programmatic — no config files
const { tools, sessionManager } = createBrowserTools({
  defaultBrowser: 'chromium',
  defaultMode: 'ephemeral',
  headless: false,
  viewport: { width: 1280, height: 720 },
  sessionTtlMs: 30 * 60 * 1000,
  maxConcurrentSessions: 5,
  profilesDir: '~/.n8n-browser/profiles',
  // Override auto-detected browser paths
  browsers: {
    chrome: { executablePath: '/usr/bin/google-chrome' },
  },
});

// Register on any MCP server
for (const tool of tools) {
  server.tool(tool.name, tool.config.description, tool.config.inputSchema, async (args) => {
    return await tool.handler(args as Record<string, unknown>);
  });
}

// Cleanup on shutdown
process.on('SIGTERM', () => sessionManager.shutdown());
```

All fields are optional — sensible defaults and auto-discovery handle the
common case.

### Standalone mode

Run as an MCP server over stdio (default) or streamable HTTP:

```bash
# stdio (default)
npx @n8n/mcp-browser

# With CLI flags
npx @n8n/mcp-browser --browser chrome --headless false

# Streamable HTTP transport
npx @n8n/mcp-browser --transport http --port 3100

# Environment variables (CLI flags take precedence)
N8N_MCP_BROWSER_DEFAULT_BROWSER=chrome N8N_MCP_BROWSER_HEADLESS=false npx @n8n/mcp-browser
```

Or from the monorepo:

```bash
node packages/@n8n/mcp-browser/dist/server.js
```

#### Standalone CLI flags

| Flag | Env var | Default | Description |
|------|---------|---------|-------------|
| `--browser`, `-b` | `N8N_MCP_BROWSER_DEFAULT_BROWSER` | `chromium` | Default browser |
| `--mode`, `-m` | `N8N_MCP_BROWSER_DEFAULT_MODE` | `ephemeral` | Default session mode |
| `--headless` | `N8N_MCP_BROWSER_HEADLESS` | `false` | Run headless |
| `--viewport` | `N8N_MCP_BROWSER_VIEWPORT` | `1280x720` | Viewport as `WxH` |
| `--session-ttl-ms` | `N8N_MCP_BROWSER_SESSION_TTL_MS` | `1800000` | Idle TTL (ms) |
| `--max-sessions` | `N8N_MCP_BROWSER_MAX_SESSIONS` | `5` | Max concurrent sessions |
| `--profiles-dir` | `N8N_MCP_BROWSER_PROFILES_DIR` | `~/.n8n-browser/profiles` | Persistent profiles dir |
| `--transport`, `-t` | `N8N_MCP_BROWSER_TRANSPORT` | `stdio` | `stdio` or `http` |
| `--port`, `-p` | `N8N_MCP_BROWSER_PORT` | `3100` | HTTP port (when `--transport http`) |

## Supported browsers

| Mode | Browser | Protocol | Binary |
|------|---------|----------|--------|
| `ephemeral` | chromium / firefox / webkit | Playwright | Playwright's bundled browser |
| `persistent` | chromium / firefox / webkit | Playwright | Playwright's bundled browser |
| `local` | chrome / brave / edge | Playwright + channel | User's installed browser |
| `local` | firefox | WebDriver BiDi | User's installed Firefox |
| `local` | safari | WebDriver (safaridriver) | User's installed Safari (macOS only) |

### Session modes

- **`ephemeral`** — Fresh context with no user data. Everything is destroyed
  when the session closes. Use for scraping, testing, or throwaway tasks.
- **`persistent`** — Named managed profile stored in a configurable directory.
  Data (cookies, localStorage, history) survives across sessions. Use for
  agent-managed accounts.
- **`local`** — User's actual installed browser with their real
  profile/cookies/sessions. Use for automating tasks as the logged-in user.

Sessions are in-memory only. When the server shuts down, all sessions are
closed and all browser processes are killed. There is no session persistence
or reconnection across restarts.

## Prerequisites

Install Playwright browsers (for ephemeral and persistent modes):

```bash
npx playwright install chromium firefox
```

For local Firefox on all platforms, ensure Firefox is not already running
(profile lock).

For local Safari (macOS only), enable remote automation once:

```bash
safaridriver --enable
```

For local Firefox via WebDriver BiDi, `geckodriver` must be installed and
on PATH:

```bash
# macOS
brew install geckodriver

# Linux (Debian/Ubuntu)
sudo apt install firefox-geckodriver

# Windows (via chocolatey)
choco install geckodriver
```

## Configuration

This package has **no config file**. All configuration is passed
programmatically via `createBrowserTools()`. This is intentional — the
wrapping application owns its own config file and passes relevant settings
through.

```typescript
const { tools, sessionManager } = createBrowserTools({
  // All fields optional — defaults shown
  defaultBrowser: 'chromium',
  defaultMode: 'ephemeral',
  headless: false,
  viewport: { width: 1280, height: 720 },
  sessionTtlMs: 1800000,           // 30 minutes
  maxConcurrentSessions: 5,
  profilesDir: '~/.n8n-browser/profiles',

  // Override auto-detected browser executable paths
  browsers: {
    chrome: { executablePath: '/usr/bin/google-chrome' },
    firefox: { executablePath: '/usr/bin/firefox' },
    brave: { executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser' },
  },
});
```

Installed browsers are auto-detected from standard OS locations on
initialization. See [Browser Discovery](docs/discovery.md) for details.

## Documentation

- [Architecture](docs/architecture.md) — system design, adapters, layers
- [Session Management](docs/session-management.md) — lifecycle, TTL, isolation
- [Browser Discovery](docs/discovery.md) — auto-detection, programmatic config
- [Cross-Platform](docs/cross-platform.md) — OS-specific considerations
- [Tools Reference](docs/tools.md) — complete tool catalog with schemas
- [Decisions](docs/decisions.md) — architecture decision records
- [Tradeoffs](docs/tradeoffs.md) — limitations and constraints

## Development

```bash
pnpm dev    # start standalone MCP server with hot reload (tsx watch)
pnpm build  # build for production
pnpm test   # run tests
```

### Testing with AI clients

Start the server with HTTP transport:

```bash
npx @n8n/mcp-browser --transport http --port 3100 --browser chrome --headless false
```

Or from the monorepo:

```bash
npx tsx packages/@n8n/mcp-browser/src/server.ts --transport http --port 3100 --browser chrome --headless false
```

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
