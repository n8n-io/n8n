# @n8n/fs-proxy

Local AI gateway for n8n Instance AI. Bridges a remote n8n instance with your
local machine — filesystem, shell, screenshots, mouse/keyboard, and browser
automation — all through a single daemon.

## Why

n8n AI runs in the cloud but often needs access to your local
environment: reading project files, running shell commands, capturing
screenshots, controlling the browser, or using mouse and keyboard. This
gateway exposes these capabilities as MCP tools that the agent can call
remotely over a secure SSE connection.

## Capabilities

| Category | Module | Tools | Platform | Default |
|----------|--------|-------|----------|---------|
| **Filesystem** | filesystem | `read_file`, `list_files`, `get_file_tree`, `search_files` | All | Enabled |
| **Computer** | shell | `shell_execute` | All | Enabled |
| **Computer** | screenshot | `screen_screenshot`, `screen_screenshot_region` | macOS, Linux (X11), Windows | Enabled |
| **Computer** | mouse/keyboard | `mouse_move`, `mouse_click`, `mouse_double_click`, `mouse_drag`, `mouse_scroll`, `keyboard_type`, `keyboard_key_tap`, `keyboard_shortcut` | macOS, Linux (X11), Windows | Enabled |
| **Browser** | browser | 32 browser automation tools (navigate, click, type, snapshot, screenshot, etc.) | All | Enabled |

Modules that require native dependencies (screenshot, mouse/keyboard) are
automatically disabled when their platform requirements aren't met.

## Quick start

### Daemon mode (recommended)

Zero-click mode — n8n auto-detects the daemon on `127.0.0.1:7655`:

```bash
npx @n8n/fs-proxy serve

# With a specific directory
npx @n8n/fs-proxy serve /path/to/project

# Disable browser and mouse/keyboard
npx @n8n/fs-proxy serve --no-browser --no-computer-mouse-keyboard
```

### Direct mode

Connect to a specific n8n instance with a gateway token:

```bash
# Positional syntax
npx @n8n/fs-proxy https://my-n8n.com abc123xyz /path/to/project

# Flag syntax
npx @n8n/fs-proxy --url https://my-n8n.com --api-key abc123xyz --filesystem-dir /path/to/project
```

## Configuration

All configuration follows three-tier precedence: **defaults < env vars < CLI
flags**. There are no config files — the wrapping application owns
configuration.

### CLI flags

#### Global

| Flag | Default | Description |
|------|---------|-------------|
| `--log-level <level>` | `info` | Log level: `silent`, `error`, `warn`, `info`, `debug` |
| `-p, --port <port>` | `7655` | Daemon port (serve mode only) |
| `-h, --help` | | Show help |

#### Filesystem

| Flag | Default | Description |
|------|---------|-------------|
| `--filesystem-dir <path>` | `.` | Root directory for filesystem tools |
| `--no-filesystem` | | Disable filesystem tools entirely |

#### Computer use

| Flag | Default | Description |
|------|---------|-------------|
| `--no-computer-shell` | | Disable shell tool |
| `--computer-shell-timeout <ms>` | `30000` | Shell command timeout |
| `--no-computer-screenshot` | | Disable screenshot tools |
| `--no-computer-mouse-keyboard` | | Disable mouse/keyboard tools |

#### Browser

| Flag | Default | Description |
|------|---------|-------------|
| `--no-browser` | | Disable browser tools |
| `--browser-headless` | `true` | Run browser in headless mode |
| `--no-browser-headless` | | Run browser with visible window |
| `--browser-default <name>` | `chromium` | Default browser |
| `--browser-viewport <WxH>` | `1280x720` | Browser viewport size |
| `--browser-session-ttl-ms <ms>` | `1800000` | Session idle timeout (30 min) |
| `--browser-max-sessions <n>` | `5` | Max concurrent browser sessions |

### Environment variables

All options can be set via `N8N_GATEWAY_*` environment variables. CLI flags
take precedence.

| Env var | Maps to |
|---------|---------|
| `N8N_GATEWAY_LOG_LEVEL` | `--log-level` |
| `N8N_GATEWAY_FILESYSTEM_DIR` | `--filesystem-dir` |
| `N8N_GATEWAY_FILESYSTEM_ENABLED` | `--no-filesystem` (set to `false` to disable) |
| `N8N_GATEWAY_COMPUTER_SHELL_ENABLED` | `--no-computer-shell` (set to `false`) |
| `N8N_GATEWAY_COMPUTER_SHELL_TIMEOUT` | `--computer-shell-timeout` |
| `N8N_GATEWAY_COMPUTER_SCREENSHOT_ENABLED` | `--no-computer-screenshot` (set to `false`) |
| `N8N_GATEWAY_COMPUTER_MOUSE_KEYBOARD_ENABLED` | `--no-computer-mouse-keyboard` (set to `false`) |
| `N8N_GATEWAY_BROWSER_ENABLED` | `--no-browser` (set to `false`) |
| `N8N_GATEWAY_BROWSER_HEADLESS` | `--browser-headless` |
| `N8N_GATEWAY_BROWSER_DEFAULT` | `--browser-default` |
| `N8N_GATEWAY_BROWSER_VIEWPORT` | `--browser-viewport` (as `WxH`) |
| `LOG_LEVEL` | `--log-level` (legacy) |

### Programmatic configuration

When using the gateway as a library, pass a config object to `GatewayClient`:

```typescript
import { GatewayClient } from '@n8n/fs-proxy';

const client = new GatewayClient({
  url: 'https://my-n8n.com',
  apiKey: 'abc123xyz',
  config: {
    logLevel: 'info',
    port: 7655,

    // Filesystem — false to disable, object to configure
    filesystem: {
      dir: '/path/to/project',
    },

    // Computer use — each sub-module toggleable
    computer: {
      shell: { timeout: 30000 },
      screenshot: {},           // enabled with defaults
      mouseKeyboard: false,     // disabled
    },

    // Browser — false to disable, object to configure
    browser: {
      headless: true,
      defaultBrowser: 'chromium',
      viewport: { width: 1280, height: 720 },
      sessionTtlMs: 1800000,
      maxConcurrentSessions: 5,
    },
  },
});
```

## Module reference

### Filesystem

Read-only access to files within a sandboxed directory.

| Tool | Description |
|------|-------------|
| `read_file` | Read file contents (max 512KB, paginated) |
| `list_files` | List immediate children of a directory |
| `get_file_tree` | Get indented directory tree (configurable depth) |
| `search_files` | Regex search across files with optional glob filter |

### Shell

Execute shell commands with configurable timeout.

| Tool | Description |
|------|-------------|
| `shell_execute` | Run a shell command, returns stdout/stderr/exitCode |

### Screenshot

Capture screen contents (requires a display and `node-screenshots`).

| Tool | Description |
|------|-------------|
| `screen_screenshot` | Full-screen capture as base64 PNG |
| `screen_screenshot_region` | Capture a specific region (x, y, width, height) |

### Mouse & keyboard

Low-level input control (requires `@jitsi/robotjs`).

| Tool | Description |
|------|-------------|
| `mouse_move` | Move cursor to coordinates |
| `mouse_click` | Click at coordinates (left/right/middle) |
| `mouse_double_click` | Double-click at coordinates |
| `mouse_drag` | Drag from one point to another |
| `mouse_scroll` | Scroll at coordinates |
| `keyboard_type` | Type a string of text |
| `keyboard_key_tap` | Press a key with optional modifiers |
| `keyboard_shortcut` | Press a keyboard shortcut |

### Browser

Full browser automation via `@n8n/mcp-browser` (32 tools). Supports
Chromium, Firefox, Safari, and WebKit across ephemeral, persistent, and local
session modes.

See the [@n8n/mcp-browser docs](../mcp-browser/docs/tools.md) for the
complete tool reference.

## Permissions (upcoming)

Each tool definition includes annotation metadata (`readOnlyHint`,
`destructiveHint`) that classifies tools by risk level.

Permission enforcement and granular per-tool/per-argument rules are planned
for a future release.

## Prerequisites

### Filesystem & shell

No extra dependencies — works on all platforms.

### Screenshot

Requires a display server. Automatically disabled when no monitors are
detected.

### Mouse & keyboard

Requires `@jitsi/robotjs` which needs native build tools:

- **macOS**: Xcode Command Line Tools
- **Linux**: `libxtst-dev`, X11 (not supported on Wayland without XWayland)
- **Windows**: Visual Studio Build Tools

Automatically disabled when robotjs is unavailable.

### Browser

Requires Playwright browsers (for ephemeral/persistent modes):

```bash
npx playwright install chromium firefox
```

For local browser modes, see the
[@n8n/mcp-browser prerequisites](../mcp-browser/README.md#prerequisites).

## Auto-start

On `npm install`, the package sets up platform-specific auto-start in daemon
mode:

- **macOS**: LaunchAgent at `~/Library/LaunchAgents/com.n8n.fs-proxy.plist`
- **Linux**: systemd user service at `~/.config/systemd/user/n8n-fs-proxy.service`
- **Windows**: VBS script in Windows Startup folder

## Development

```bash
pnpm dev    # watch mode with auto-rebuild
pnpm build  # production build
pnpm test   # run tests
```
