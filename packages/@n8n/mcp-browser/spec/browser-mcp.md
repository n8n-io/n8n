# Browser MCP — Feature Specification

> Backend technical design: [technical-spec.md](./technical-spec.md)

## Overview

Browser MCP is a Model Context Protocol (MCP) server that gives AI agents
full control over a Chrome browser. It connects to the user's real installed
Chrome via the **n8n Browser Bridge** extension, using their actual profile,
cookies, and login sessions.

The AI can navigate pages, click elements, fill forms, read page content,
take screenshots, manage cookies and storage, and execute JavaScript — all
through MCP tools.

---

## Connection Model

### Single Connection

One browser connection at a time. The connection is established explicitly
via the `browser_connect` tool and torn down via `browser_disconnect`.

- **No sessions** — there is no session concept. The server either has an
  active connection or it doesn't.
- **No modes** — always connects to the user's real installed Chrome via the
  Browser Bridge extension.

### Connection Flow

1. AI calls `browser_connect`
2. Server launches Playwright, which connects over CDP to the relay server
3. Relay server waits for the Browser Bridge extension to connect via WebSocket
4. Extension reports its registered (user-selected) tabs to the relay —
   debugger is **not** attached yet
5. Connection is ready — AI can use browser tools

Tabs are lazily activated: the debugger only attaches to a tab when the AI
first interacts with it.

### Multi-Tab

All eligible Chrome tabs are controlled simultaneously. The extension
automatically tracks tab lifecycle (open/close) and reports changes to the
relay server. Each tab gets a unique page ID that tools accept via the
optional `pageId` parameter. Omitting `pageId` targets the active page.

The relay maintains a lightweight metadata cache (title, URL) for all known
tabs. Playwright only sees a tab after it has been **activated** (debugger
attached). Activation is lazy — triggered on first tool interaction with that
tab. Agent-created tabs (via `browser_tab_open`) are eagerly activated.

---

## Tools

All tools except `browser_connect` and `browser_disconnect` require an active
connection. They accept an optional `pageId` parameter to target a specific
tab; the default is the active page.

### Session

| Tool | Description |
|------|-------------|
| `browser_connect` | Launch browser and establish connection |
| `browser_disconnect` | Close browser and release resources |

### Tab Management

| Tool | Description |
|------|-------------|
| `browser_tab_open` | Open a new tab (optionally with a URL) |
| `browser_tab_list` | List all controlled tabs |
| `browser_tab_focus` | Switch the active tab |
| `browser_tab_close` | Close a tab |

### Navigation

| Tool | Description |
|------|-------------|
| `browser_navigate` | Navigate to a URL |
| `browser_back` | Go back in history |
| `browser_forward` | Go forward in history |
| `browser_reload` | Reload the page |

### Interaction

| Tool | Description |
|------|-------------|
| `browser_click` | Click an element (by ref or selector) |
| `browser_type` | Type text into an element |
| `browser_select` | Select an option in a dropdown |
| `browser_drag` | Drag an element to a target |
| `browser_hover` | Hover over an element |
| `browser_press` | Press a keyboard key |
| `browser_scroll` | Scroll the page or an element |
| `browser_upload` | Upload a file to a file input |
| `browser_dialog` | Handle a browser dialog (alert, confirm, prompt) |

### Inspection

| Tool | Description |
|------|-------------|
| `browser_snapshot` | Get an accessibility tree snapshot of the page |
| `browser_screenshot` | Capture a screenshot (PNG, base64) |
| `browser_content` | Extract page content as structured Markdown |
| `browser_evaluate` | Execute JavaScript in the page context |
| `browser_console` | Read console messages and page errors (filter by level) |
| `browser_pdf` | Generate a PDF of the page |
| `browser_network` | Read network request log |

### Wait

| Tool | Description |
|------|-------------|
| `browser_wait` | Wait for a condition (selector, URL, load state, text, or JS predicate) |

### State

| Tool | Description |
|------|-------------|
| `browser_cookies` | Read or set cookies |
| `browser_storage` | Read or modify localStorage/sessionStorage |

---

## Element Targeting

Interaction and inspection tools that operate on specific elements accept a
**target** which is one of:

- **ref** (preferred) — an element reference string from `browser_snapshot`.
  Refs are stable within a snapshot but become stale after navigation or DOM
  changes.
- **selector** — a CSS, text, role, or XPath selector as a fallback.

Using refs from a recent snapshot is preferred because they are unambiguous
and resilient to CSS changes.

---

## Configuration

### Programmatic API

```typescript
const { tools, connection } = createBrowserTools({
  defaultBrowser: 'chrome',   // 'chrome' | 'chromium' | 'brave' | 'edge'
  browsers: {                  // optional executable/profile overrides
    chrome: { executablePath: '/path/to/chrome' },
  },
});
```

### CLI Flags

| Flag | Alias | Default | Description |
|------|-------|---------|-------------|
| `--browser` | `-b` | `chrome` | Default browser to launch |
| `--transport` | `-t` | `http` | MCP transport (`http` or `stdio`) |

### Environment Variables

All CLI flags can be set via `N8N_MCP_BROWSER_` prefixed env vars:

- `N8N_MCP_BROWSER_DEFAULT_BROWSER`
- `N8N_MCP_BROWSER_TRANSPORT`

CLI flags take precedence over environment variables.

---

## Prerequisites

1. **Chrome** (or another Chromium-based browser) installed
2. **n8n Browser Bridge** extension loaded in Chrome:
   - Open `chrome://extensions`
   - Enable Developer mode
   - Click "Load unpacked" and select the `mcp-browser-extension` directory

---

## Non-Goals

- Multi-browser support (Firefox, Safari) — Chromium only via CDP
- Remote browser connections — local machine only
- Browser profile management — uses the user's existing profile
- Session persistence — connection is per-server-lifetime
