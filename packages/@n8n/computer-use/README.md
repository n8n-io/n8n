# @n8n/computer-use

Computer Use for n8n Assistant. Bridges a remote n8n instance with your
local machine — filesystem, shell, screenshots, mouse/keyboard, and browser
automation.

## Why

n8n Assistant runs in the cloud but may need access to your local
environment: reading project files, running shell commands, capturing
screenshots, controlling the browser, or using mouse and keyboard. This
gateway exposes these capabilities as tools that the agent can call
remotely over a secure SSE connection.

## Capabilities

| Capability | Tools | Platform | Default Permission |
|------------|-------|----------|--------------------|
| **Filesystem (read)** | `read_file`, `list_files`, `get_file_tree`, `search_files` | All | `allow` |
| **Filesystem (write)** | `write_file`, `edit_file`, `create_directory`, `delete`, `move`, `copy_file` | All | `ask` |
| **Shell** | `shell_execute` | All | `deny` |
| **Computer** | `screen_screenshot`, `screen_screenshot_region`, `mouse_move`, `mouse_click`, `mouse_double_click`, `mouse_drag`, `mouse_scroll`, `keyboard_type`, `keyboard_key_tap`, `keyboard_shortcut` | macOS, Linux (X11), Windows | `deny` |
| **Browser** | 32 browser automation tools | All | `ask` |

Modules that require native dependencies (screenshot, mouse/keyboard) are
automatically disabled when their platform requirements aren't met.

## Quick start

### Daemon mode (recommended)

Start the daemon with your n8n instance URL. n8n will connect to the daemon
on `127.0.0.1:7655` when the AI needs local machine access.

```bash
# The start command is shown inside n8n AI — replace with your instance URL
npx @n8n/computer-use https://my-instance.app.n8n.cloud

# For local development (localhost is not in the default allowlist)
npx @n8n/computer-use http://localhost:5678 --allowed-origins http://localhost:5678

# Specify a working directory
npx @n8n/computer-use https://my-instance.app.n8n.cloud --dir /path/to/project
npx @n8n/computer-use https://my-instance.app.n8n.cloud -d /path/to/project

# Non-interactive (uses Recommended defaults, override with --permission-* flags)
npx @n8n/computer-use https://my-instance.app.n8n.cloud --non-interactive --permission-shell ask
```

### Direct mode

Connect directly to an n8n instance with a Computer Use token:

```bash
npx @n8n/computer-use https://my-n8n.com abc123xyz /path/to/project
```

## Configuration

All configuration follows three-tier precedence: **defaults < env vars < CLI
flags**.

### CLI flags

#### Global

| Flag | Default | Description |
|------|---------|-------------|
| `--log-level <level>` | `info` | Log level: `silent`, `error`, `warn`, `info`, `debug` |
| `--allowed-origins <patterns>` | `https://*.app.n8n.cloud` | Comma-separated allowed origin patterns (CLI only) |
| `-p, --port <port>` | `7655` | Daemon port (daemon mode only) |
| `--non-interactive` | | Skip all prompts; use defaults and env/CLI overrides |
| `--auto-confirm` | | Auto-confirm all resource access prompts |
| `-h, --help` | | Show help |

#### Filesystem

| Flag | Default | Description |
|------|---------|-------------|
| `--dir <path>`, `-d` | `.` | Root directory for filesystem tools and shell execution |

#### Permissions

Each capability has an independent permission mode (`deny` \| `ask` \| `allow`):

| Flag | Default | Description |
|------|---------|-------------|
| `--permission-filesystem-read <mode>` | `allow` | Filesystem read access |
| `--permission-filesystem-write <mode>` | `ask` | Filesystem write access |
| `--permission-shell <mode>` | `deny` | Shell execution |
| `--permission-computer <mode>` | `deny` | Computer control (screenshot, mouse/keyboard) |
| `--permission-browser <mode>` | `ask` | Browser automation |

#### Computer use

| Flag | Default | Description |
|------|---------|-------------|
| `--computer-shell-timeout <ms>` | `30000` | Shell command timeout |

#### Browser

| Flag | Default | Description |
|------|---------|-------------|
| `--browser-default <name>` | `chrome` | Default browser |

### Environment variables

All options can be set via `N8N_GATEWAY_*` environment variables. CLI flags
take precedence.

| Env var | Maps to |
|---------|---------|
| `N8N_GATEWAY_LOG_LEVEL` | `--log-level` |
| `N8N_GATEWAY_FILESYSTEM_DIR` | `--dir` |
| `N8N_GATEWAY_COMPUTER_SHELL_TIMEOUT` | `--computer-shell-timeout` |
| `N8N_GATEWAY_BROWSER_DEFAULT` | `--browser-default` |
| `N8N_GATEWAY_AUTO_CONFIRM` | `--auto-confirm` (set to `true`) |
| `N8N_GATEWAY_NON_INTERACTIVE` | `--non-interactive` (set to `true`) |
| `N8N_GATEWAY_PERMISSION_FILESYSTEM_READ` | `--permission-filesystem-read` |
| `N8N_GATEWAY_PERMISSION_FILESYSTEM_WRITE` | `--permission-filesystem-write` |
| `N8N_GATEWAY_PERMISSION_SHELL` | `--permission-shell` |
| `N8N_GATEWAY_PERMISSION_COMPUTER` | `--permission-computer` |
| `N8N_GATEWAY_PERMISSION_BROWSER` | `--permission-browser` |

> **Note:** `--allowed-origins` is CLI-only and cannot be configured via environment variables.
> This is intentional — it prevents a malicious actor from overriding the allowlist via an env var.

## Module reference

### Filesystem (read)

Read-only access to files within a sandboxed directory.

| Tool | Description |
|------|-------------|
| `read_file` | Read file contents (max 512 KB, paginated by line range) |
| `list_files` | List immediate children of a directory |
| `get_file_tree` | Get indented directory tree (configurable depth) |
| `search_files` | Regex search across files with optional glob filter |

### Filesystem (write)

Write access within the specified directory. Requires `--permission-filesystem-write ask` or `allow`.

| Tool | Description |
|------|-------------|
| `write_file` | Create or overwrite a file (parent directories created automatically) |
| `edit_file` | Targeted search-and-replace on an existing file |
| `create_directory` | Create a directory (idempotent, parents created automatically) |
| `delete` | Delete a file or directory recursively |
| `move` | Move or rename a file or directory |
| `copy_file` | Copy a file to a new path |

All write operations are subject to the same path-scoping rules as read
operations — paths outside the configured root are rejected.

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

## Permissions

The gateway uses a two-tier permission model.

### Tool group permission modes

Each capability has an independent mode saved to
`~/.n8n-gateway/settings.json`.

| Mode | Behavior |
|------|----------|
| `deny` | Capability disabled. Tools are not registered; the AI has no knowledge of them. |
| `ask` | Tools are registered. Before each tool execution the user is prompted to confirm. Existing resource-level rules are applied automatically. |
| `allow` | Tools are registered. All tool calls execute without confirmation. Permanently stored `always deny` resource-level rules still take precedence. |

The gateway will not connect unless at least one capability is set to `ask` or
`allow`.

### Resource-level rules

When a capability is in `ask` mode, confirmation is scoped to a **resource**:
the domain for browser tools, the normalized command for shell, or the path
for filesystem write operations.

| Rule | Effect | Persistence |
|------|--------|-------------|
| Allow once | Execute this specific invocation only | Not stored |
| Allow for session | Execute all invocations of this resource until disconnected | In-memory |
| Always allow | Execute all future invocations of this resource | Saved to settings file |
| Deny once | Block this specific invocation only | Not stored |
| Always deny | Block all future invocations of this resource | Saved to settings file |

`Always deny` rules take precedence over the tool group mode — a blocked
resource is rejected even when the capability is set to `allow`.

## Prerequisites

### Filesystem & shell

No extra dependencies — works on all platforms.

### Screenshot

Requires a display server. Automatically disabled when no monitors are
detected.

### Mouse & keyboard

Uses `@jitsi/robotjs` which needs native build tools:

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

## Development

```bash
pnpm dev    # build, watch for changes, and start daemon on localhost:5678
pnpm build  # production build
pnpm test   # run tests
pnpm start  # start daemon for localhost:5678 (requires prior build)
```
