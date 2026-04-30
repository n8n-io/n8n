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

**OS deeplink / connect handshake:** Plain `pnpm start` is fine for tray and settings UI. To verify **`n8n-computer-use://…`** routing from n8n the way end users experience it, build the macOS artefact (**`pnpm dist:mac`**, see below), install or run the generated app under **`packages/@n8n/local-gateway/out/`**, and trigger connect from n8n’s computer-use / local-gateway flow.

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

Pairing is done from n8n via the **computer-use / local gateway** flow, which opens an OS deeplink into this app. The Settings window does not accept an instance URL or gateway token; it only stores global preferences (allowed origins, capabilities, etc.).

1. In n8n, start the connect flow for the local gateway / computer-use integration so your browser or OS opens the registered protocol URL (see below).
2. Before connecting, open tray icon → **Settings** and ensure **Allowed origins** includes the origin of your n8n instance (for local dev, add `http://localhost:5678` or your port). Origins are validated before any connection.

The app registers **`n8n-computer-use`** as the primary OS protocol handler. The URL shape is:

```text
n8n-computer-use://connect?url=<ENCODED_N8N_URL>&token=<TOKEN>
```

Example (manual test of the handler):

```bash
open "n8n-computer-use://connect?url=http%3A%2F%2Flocalhost%3A5678&token=YOUR_TOKEN"
```

Notes:

- The gateway token is one-time for pairing.
- URL and token are not stored in global settings; connect again after restart using n8n’s link or a deeplink.
- For headless or scripted use outside Electron, the **`n8n-computer-use` CLI** in `@n8n/computer-use` remains available.

## Settings

Global preferences are persisted across restarts (tray icon → **Settings**). They are separate from connection credentials:

- **Allowed origins** — patterns used to validate an instance URL **before** any connection is attempted (defaults include `https://*.app.n8n.cloud`). Never derived from the URL you paste.
- **Capability toggles** — enable or disable individual capabilities
- **Filesystem directory** — root path for filesystem tools
- **Log level** — controls verbosity of local gateway logs (`~/.n8n-local-gateway/log`)

Connection URL and gateway token are supplied only via the deeplink (or CLI); not through Settings.

## Architecture

The app is built with Electron and follows a standard main/renderer split:

```
src/main/       — Electron main process: tray, daemon lifecycle, IPC handlers
src/renderer/   — Settings UI (plain HTML/CSS/TS, sandboxed)
src/shared/     — Types shared between main and renderer
```

The local runtime is provided by `@n8n/computer-use` and managed by `DaemonController`, which handles connect/disconnect and surfaces status (`disconnected` until a session starts, then `connecting → connected → disconnected/error`) to the tray menu and settings window via IPC.

See `docs/ARCHITECTURE_CONNECTION_VS_SETTINGS.md` for how global settings, connection attempts, and runtime session state relate.
