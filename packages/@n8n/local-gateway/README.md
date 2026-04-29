# @n8n/local-gateway

A native tray application that bridges an n8n cloud or self-hosted instance to capabilities on your local machine. It runs silently in the system tray and connects directly to your n8n instance using a gateway token.

## What it does

When an n8n workflow needs to interact with your computer — take a screenshot, move the mouse, type text, run a shell command, or read a file — this app runs the local tools and streams requests/results between your machine and n8n.

Supported capabilities (each can be individually enabled or disabled):


| Capability         | Default | Description                                                               |
| ------------------ | ------- | ------------------------------------------------------------------------- |
| Filesystem         | On      | Read/write files in a configurable directory (defaults to home directory) |
| Screenshots        | On      | Capture screen content                                                    |
| Mouse & Keyboard   | On      | Simulate input events                                                     |
| Browser automation | On      | Control a local browser                                                   |
| Shell execution    | **Off** | Run shell commands — requires explicit opt-in                             |


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

## Connecting

You can connect in two ways:

### 1) Manual connect (paste token in Settings)

1. Open tray icon → **Settings**.
2. Enter your n8n instance URL.
3. Paste a fresh **Gateway token** from n8n.
4. Click **Connect**.

Notes:

- The gateway token is one-time.
- After successful connect, n8n upgrades it to a reusable session key.
- The token field is shown only while disconnected.

### 2) URL-based deep link

`@n8n/local-gateway` registers a custom protocol handler and accepts:

```text
n8n-gateway://connect?url=<ENCODED_N8N_URL>&token=<TOKEN>
```

Example:

```bash
open "n8n-gateway://connect?url=http%3A%2F%2Flocalhost%3A5678&token=YOUR_TOKEN"
```

## Settings

Settings are persisted across restarts and can be changed via the tray icon → **Settings**:

- **n8n URL** — target instance URL used for direct connection
- **Gateway token** — one-time token used when initiating a new connection
- **Capability toggles** — enable or disable individual capabilities
- **Filesystem directory** — root path for filesystem tools
- **Log level** — controls verbosity of local gateway logs (`~/.n8n-local-gateway/log`)

## Architecture

The app is built with Electron and follows a standard main/renderer split:

```
src/main/       — Electron main process: tray, daemon lifecycle, IPC handlers
src/renderer/   — Settings UI (plain HTML/CSS/TS, sandboxed)
src/shared/     — Types shared between main and renderer
```

The local runtime is provided by `@n8n/computer-use` and managed by `DaemonController`, which handles connect/disconnect and surfaces status (`idle → connecting → connected → disconnected/error`) to the tray menu and settings window via IPC.