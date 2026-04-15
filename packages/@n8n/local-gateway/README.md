# @n8n/local-gateway

A native tray application that bridges an n8n cloud or self-hosted instance to capabilities on your local machine. It runs silently in the system tray and exposes a secure local HTTP gateway that n8n workflows can connect to.

## What it does

When an n8n workflow needs to interact with your computer — take a screenshot, move the mouse, type text, run a shell command, or read a file — it connects to this gateway. The app listens for incoming connections and, for new origins, prompts you to approve the connection before anything runs.

Supported capabilities (each can be individually enabled or disabled):

| Capability | Default | Description |
|---|---|---|
| Filesystem | On | Read/write files in a configurable directory (defaults to home directory) |
| Screenshots | On | Capture screen content |
| Mouse & Keyboard | On | Simulate input events |
| Browser automation | On | Control a local browser |
| Shell execution | **Off** | Run shell commands — requires explicit opt-in |

> **Permissions note:** On first use, macOS and Windows will prompt you to grant accessibility and screen recording permissions when an n8n workflow triggers screenshot or mouse/keyboard actions. This is a one-time OS-level prompt per capability.

## Platform support

- macOS (arm64 and x64)
- Windows (x64)
- Linux (not officially packaged, but runnable from source)

## Development

Install dependencies from the repo root:

```bash
pnpm install
```

Start in development mode (watch mode for both main and renderer):

```bash
pnpm --filter=@n8n/local-gateway dev
```

Or from within the package directory:

```bash
cd packages/@n8n/local-gateway
pnpm dev
```

## Building

Compile the TypeScript sources:

```bash
pnpm --filter=@n8n/local-gateway build
```

This produces compiled output in `dist/main/` (main process) and `dist/renderer/` (settings UI).

Run the compiled app directly:

```bash
pnpm --filter=@n8n/local-gateway start
```

## Distribution

Build a distributable installer:

```bash
# macOS (universal: arm64 + x64)
pnpm --filter=@n8n/local-gateway dist:mac

# Windows (x64)
pnpm --filter=@n8n/local-gateway dist:win
```

Installers are written to the `out/` directory.

## Configuration

Settings are persisted across restarts and can be changed via the tray icon → **Settings**:

- **Port** — the local port the gateway listens on (default: `7655`)
- **Allowed origins** — n8n instance URLs that are pre-approved and skip the connection prompt
- **Capability toggles** — enable or disable individual capabilities

## Architecture

The app is built with Electron and follows a standard main/renderer split:

```
src/main/       — Electron main process: tray, daemon lifecycle, IPC handlers
src/renderer/   — Settings UI (plain HTML/CSS/TS, sandboxed)
src/shared/     — Types shared between main and renderer
```

The actual gateway daemon is provided by the `@n8n/computer-use` package and is managed by `DaemonController`, which starts/stops it and surfaces status (`stopped → starting → waiting → connected → disconnected`) to the tray menu and settings window via IPC.
