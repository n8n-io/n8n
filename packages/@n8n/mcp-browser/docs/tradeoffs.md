# Tradeoffs & Limitations

## Browser-specific

### Playwright's bundled browsers vs user's installed browsers

Playwright downloads its own browser binaries (~400MB total for Chromium +
Firefox). These are not the user's installed browsers.

| Mode | What runs |
|------|-----------|
| `ephemeral` / `persistent` | Playwright's bundled Chromium, Firefox, or WebKit |
| `local` + Chrome/Brave/Edge | User's installed browser (via Playwright `channel`) |
| `local` + Firefox | User's installed Firefox (via geckodriver + WebDriver BiDi) |
| `local` + Safari | User's installed Safari (via safaridriver) |

For `ephemeral` and `persistent` modes, the browser engine matches real
browsers closely but is not identical — minor rendering or behavior
differences are possible.

### Safari via safaridriver

safaridriver provides the fewest capabilities of any adapter:

| Not available | Why |
|--------------|-----|
| Network interception/logging | Not part of WebDriver spec |
| Extra HTTP headers | Not supported |
| Geolocation override | Not supported |
| Timezone/locale override | Not supported |
| Device emulation | Not supported |
| Offline mode | Not supported |
| Console log capture | Not supported |

Safari sessions can still navigate, click, type, take screenshots, evaluate
JavaScript, and manage cookies. For full-featured automation, use Chromium or
Firefox.

Safari also requires a one-time setup: `safaridriver --enable` and enabling
"Allow Remote Automation" in Safari's Develop menu.

### Firefox profile lock

Firefox uses a profile lock file (`lock` / `.parentlock`). If Firefox is
already running with a profile, no other Firefox instance can use that same
profile.

For `local` Firefox sessions, this means:
- The user must close their running Firefox first
- Or use a different profile (non-default)
- The error message is clear and actionable

This is a Firefox limitation, not a package limitation. Chromium-based
browsers and Safari don't have this restriction.

### WebKit limitations

Playwright's WebKit is based on the WebKit engine but is **not Safari**. It
lacks Safari-specific features (iCloud Keychain, Apple Pay, Safari
extensions). It's useful for WebKit rendering tests in ephemeral/persistent
mode but shouldn't be confused with real Safari automation.

For actual Safari with the user's data, use `local` mode with
`browser: "safari"`.

## Resource & performance

### Memory footprint

Each session runs a full browser process:

| Browser | Approximate memory per session |
|---------|-------------------------------|
| Chromium (headless) | 80-150 MB |
| Chromium (headful) | 150-300 MB |
| Firefox | 100-250 MB |
| Safari | 100-200 MB |

Memory grows with page complexity (heavy SPAs, many tabs). With the default
30-minute TTL, idle sessions consume memory until reaped.

**Mitigation:**
- `maxConcurrentSessions` limits total resource usage
- TTL reaper closes idle sessions
- Ephemeral sessions have no persistent overhead

### Playwright install size

First-time setup requires downloading Playwright browsers:

```bash
npx playwright install chromium    # ~150 MB
npx playwright install firefox     # ~150 MB
npx playwright install webkit      # ~100 MB
```

Total: ~400 MB on disk. This is a one-time cost and browsers are cached in
`~/.cache/ms-playwright/`.

For `local` mode only (no ephemeral/persistent), Playwright browsers don't
need to be installed — but Playwright itself is still a dependency for the
Chromium local adapter.

### Headful mode on servers

Headful (visible browser window) requires a display server:
- **macOS**: Works natively
- **Linux**: Requires X11 or Wayland (or Xvfb for virtual display)
- **Windows**: Works natively
- **Docker/CI**: Typically headless only, or requires Xvfb setup

Default is `headless: false`. Set `headless: true` in config or per-session
for headless mode.

### Startup time

| Mode | Approximate startup time |
|------|-------------------------|
| Ephemeral (Playwright) | 1-3 seconds |
| Persistent (Playwright) | 1-3 seconds |
| Local Chrome (Playwright) | 2-5 seconds |
| Local Firefox (geckodriver) | 3-8 seconds |
| Local Safari (safaridriver) | 2-5 seconds |

WebDriver-based sessions (Firefox local, Safari) are slower to start due to
driver initialization.

## Security

### evaluate_js / browser_evaluate

This tool executes arbitrary JavaScript in the page context. Risks:

- **Prompt injection**: A malicious page could include text that tricks the
  LLM into calling `browser_evaluate` with harmful JavaScript
- **Data exfiltration**: JS has access to cookies, localStorage, DOM content
  of the current page (same-origin)
- **Side effects**: JS can submit forms, make API calls, modify page state

**Trust boundary:** The page context is the trust boundary. The agent's JS
runs with the same permissions as any script on that page. It cannot access
other origins, the filesystem, or system resources.

**Mitigation options for consumers:**
- Don't register `browser_evaluate` if not needed
- Implement a JS allowlist/blocklist in a wrapper
- Use `browser_text` and `browser_snapshot` for read-only inspection instead

### User profile access

In `local` mode, the session has access to the user's real browser profile:
- Cookies (including session tokens for logged-in services)
- Saved passwords (if the browser has an unlocked password store)
- localStorage data
- Browsing history
- Installed extensions (Chromium only)

This is the intended behavior — the user wants the agent to act as them. But
it means:
- The MCP server process has access to sensitive data
- Any tool that reads cookies or evaluates JS can access auth tokens
- The agent could navigate to banking, email, or other sensitive sites

**Consumers should:**
- Only enable `local` mode when the user explicitly opts in
- Consider restricting which URLs the agent can navigate to
- Log all browser actions for audit

### SSRF (Server-Side Request Forgery)

`browser_navigate` can navigate to any URL including:
- `localhost` and `127.0.0.1`
- Private network IPs (`10.x.x.x`, `192.168.x.x`)
- Internal services

**Mitigation options:**
- Implement URL allowlist/blocklist in a wrapper around the navigate tool
- Block private network ranges by default (like OpenClaw's `ssrfPolicy`)
- This is left to the consumer — the package itself doesn't restrict URLs

### Process isolation

Browser processes are separate OS processes. A crash or exploit in the
browser doesn't directly affect the Node.js host process. However:
- Chromium's sandbox may be disabled in some environments (`--no-sandbox`)
- Browser extensions (local Chromium) run with elevated permissions
- Playwright's `--disable-web-security` is never used by default

## Context budget

### Screenshots vs snapshots

| Method | Size | Content |
|--------|------|---------|
| `browser_screenshot` (viewport) | 50-200 KB | Pixel-perfect visual |
| `browser_screenshot` (full page) | 200 KB - 2 MB | Full scrollable page |
| `browser_snapshot` | 5-50 KB | Accessibility tree (text) |
| `browser_text` | 1-100 KB | Plain text content |

For LLM agents with limited context windows, prefer `browser_snapshot` or
`browser_text` over screenshots. Use screenshots when visual information is
essential (layout verification, image content, visual bugs).

### Network log size

`browser_network` can accumulate many entries on busy pages. Use the `filter`
parameter to limit results, and `clear: true` to reset the buffer after
reading.

## WebDriver BiDi limitations

WebDriver BiDi for Firefox is production-ready but not feature-complete
compared to Playwright:

| Feature | Playwright | WebDriver BiDi |
|---------|-----------|----------------|
| DOM interaction | Full | Full |
| Screenshots | Full | Full |
| JavaScript evaluation | Full | Full |
| Cookies | Full | Full |
| Network interception | Full | Yes |
| Accessibility tree | Full | Yes (DOM-based) |
| Extra headers | Yes | Yes |
| Geolocation | Yes | Limited |
| Timezone/locale | Yes | No |
| Device emulation | Yes | No |
| Offline mode | Yes | Yes (BiDi) |
| PDF generation | Yes | Yes (printPage) |

The adapter returns clear "not supported" errors for unavailable features
rather than silently failing.

## Selector translation for WebDriver

Playwright's selector syntax is powerful but not all features translate to
WebDriver locator strategies:

| Playwright selector | WebDriver translation |
|--------------------|-----------------------|
| CSS (`#id`, `.class`) | CSS (native) |
| `xpath=//div` | XPath (native) |
| `text=Click me` | XPath (`//*[contains(text(), "Click me")]`) |
| `role=button[name="Submit"]` | XPath with ARIA attributes |
| Chained (`div >> text=foo`) | Not supported (error) |
| `has=`, `nth=` | Not supported (error) |

When a selector can't be translated, the tool returns an error with a
suggestion to use a CSS or XPath equivalent.

## Ref-based targeting

Refs are the primary interaction mode — agents take a snapshot, read
annotated elements, and use `ref` in subsequent tool calls. This is more
reliable than selectors because the agent targets exactly what it sees.

**Tradeoffs:**

| Aspect | Refs | Selectors |
|--------|------|-----------|
| Reliability | High — targets exactly what the agent sees | Medium — DOM may change between inspection and action |
| Discoverability | Requires a snapshot first | Can be used directly if the agent knows the selector |
| Stale elements | Invalidated by any DOM change or new snapshot | Always re-queried (but may match a different element) |
| WebDriver support | Works — adapters maintain their own ref map | Works — native CSS/XPath, translated text/role |
| Programmatic use | Less useful (consumer must take snapshot first) | More useful for consumers who know the DOM |
| Memory | Small overhead — ref map per page (~KB) | None |

**Stale refs:** When the DOM changes after a snapshot (navigation, SPA
route change, dynamic content load), refs may point to detached or wrong
elements. The adapter detects this and returns a `StaleRefError` with a
hint to take a fresh snapshot. Agents should re-snapshot after any action
that may change the page.

**Recommendation for agents:** Snapshot → act → re-snapshot if the page
changed. For stable pages (forms, static content), a single snapshot
covers multiple interactions.

## Session persistence

Sessions are in-memory only. Server shutdown = all sessions gone, all
browser processes killed.

**What this means:**
- No reconnection to browsers after a server restart
- The wrapping application must re-create sessions as needed
- No session metadata is written to disk (no DB, no files)

**What still persists:**
- **Persistent mode profiles** (`~/.n8n-browser/profiles/<name>/`) survive
  across restarts — it's browser data (cookies, localStorage) that persists,
  not the session itself
- **Local mode** uses the user's real browser profile, which obviously
  persists

**Why no persistence:**
- Reconnecting to a browser process after restart is unreliable (process
  may have crashed, ports change, BrowserContext state can't be reconstructed)
- Simpler implementation, cleaner lifecycle
- The wrapping application can track what sessions it needs and re-create them

## Cross-platform considerations

This package supports macOS, Linux, and Windows. Key platform differences:

### Windows-specific

- **Path separators**: All paths use `path.join()` and `os.homedir()` — never
  hardcoded `/` or `\`
- **`~` expansion**: Not native on Windows. Must use `os.homedir()` explicitly
- **Spaces in paths**: `C:\Program Files\` requires proper quoting in
  `child_process.spawn()`. Use array-based args, not string concatenation
- **Process signals**: `SIGTERM` and `SIGINT` work differently. Use
  `process.on('exit')` as a fallback for cleanup
- **Browser detection**: Uses `%ProgramFiles%`, `%LocalAppData%` environment
  variables and registry lookups
- **safaridriver**: Not available on Windows (Safari is macOS only)

### Linux-specific

- **Headful mode**: Requires X11 or Wayland. In Docker/CI, use headless or
  set up Xvfb
- **Snap/Flatpak browsers**: Installed in non-standard paths. Discovery
  checks common snap/flatpak locations
- **Permissions**: Browser data directories may have restrictive permissions

### macOS-specific

- **App bundles**: Browsers are in `.app` bundles. Executable path is inside
  `Contents/MacOS/`
- **Safari**: Only platform with Safari support. Requires one-time
  `safaridriver --enable`
- **Notarization**: Playwright's bundled browsers may trigger Gatekeeper
  warnings on first run

See [cross-platform.md](cross-platform.md) for the full implementation
guide.
