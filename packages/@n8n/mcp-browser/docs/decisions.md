# Decision Log

A chronological log of architectural decisions and their reasoning.

---

### 001: Library-first, server-optional

The primary export is an array of tool definitions (name + schema + handler)
that any MCP server can register. A standalone MCP server is provided as a
thin convenience wrapper over the same tools.

**Why:** Browser tools need to be usable from existing MCP servers (the
primary use case) and also runnable standalone for testing or external clients.

**Trade-offs:**
- Adding browser tools to an existing server is one function call
- No MCP protocol overhead for in-process consumers
- Standalone server is ~20 lines of glue code
- Tools must be self-contained — they can't assume anything about the hosting
  server

---

### 002: Three adapters — Playwright, WebDriver BiDi, safaridriver

Three adapter implementations behind a common interface:

| Adapter | Protocol | Browsers |
|---------|----------|----------|
| PlaywrightAdapter | Playwright API | Chromium (all modes), Firefox (ephemeral/persistent), WebKit (ephemeral/persistent) |
| WebDriverBiDiAdapter | WebDriver BiDi via geckodriver | Firefox (local mode) |
| SafariDriverAdapter | WebDriver via safaridriver | Safari (local mode) |

**Why:** We want to support all major browsers with the user's actual
installed browser and real profile data. No single protocol covers all
browsers.

**Alternatives considered:**
- **Playwright only**: Can't control user's installed Firefox or Safari with
  their real profile. Playwright uses patched browser binaries.
- **WebDriver only**: Fewer features (no accessibility tree, no network
  interception, no state manipulation). Playwright is significantly more
  capable.
- **CDP only**: Chromium-only. No Firefox or Safari support.

**Trade-offs:**
- Adapter abstraction adds complexity but enables real multi-browser support
- Feature parity is not guaranteed — some tools are Playwright-only
  (documented in capability matrix)
- geckodriver and safaridriver become runtime dependencies for local
  Firefox/Safari

---

### 003: Ref-based interaction (primary) with selector fallback

Ref-based targeting is the primary interaction mode. Selectors are supported
as an escape hatch for cases where refs are insufficient (dynamic content,
elements not in the accessibility tree, programmatic automation).

`browser_snapshot` returns a ref-annotated accessibility tree. Each
interactive element gets a stable string ref. Interaction tools (`click`,
`type`, `select`, `hover`, `drag`, etc.) accept either a `ref` string or a
`selector` string:

```typescript
// Primary: ref-based (from snapshot)
{ sessionId: "s1", ref: "e42" }

// Fallback: selector-based
{ sessionId: "s1", selector: "button.submit" }
```

Refs are scoped to the most recent snapshot for a given page. A new snapshot
invalidates all previous refs for that page. Playwright uses its `aria-ref=` selector engine to resolve refs. WebDriver adapters use `data-n8n-ref` DOM attributes set by an injected snapshot script.

**Why:** LLMs are good at reading accessibility trees and referencing numbered
elements. They are bad at writing correct CSS selectors, especially for
dynamic SPAs. The ref-based model is the dominant pattern in the ecosystem
(Playwright MCP's primary mode) for good reason.

**Alternatives considered:**
- **Selectors only**: Simpler API but LLMs struggle to write correct
  selectors. Brittle when the DOM changes between inspection and action.
- **Refs only**: More deterministic but no escape hatch for elements outside
  the accessibility tree, or for programmatic automation where the consumer
  already knows the selector.

**Trade-offs:**
- Snapshot-then-act is the recommended workflow for agents
- Refs provide deterministic targeting — the element the agent sees is the
  element it acts on
- Selectors remain available for power users, programmatic automation, and
  edge cases
- Ref map is ephemeral per-snapshot — no complex state management
- WebDriver adapters maintain their own ref map from the last snapshot
- Each interaction tool validates that `ref` or `selector` (exactly one) is
  provided

**Steering agents toward refs and snapshots:**

Tool descriptions are the primary steering mechanism — LLMs read them before
deciding which tool to call. We use four reinforcing signals:

1. **`browser_snapshot` description** leads with "Use this tool as your
   primary way to observe the page" — agents see this as the default
2. **`browser_screenshot` description** explicitly says "Prefer
   `browser_snapshot` for most tasks" — defers to snapshot
3. **`browser_screenshot` response** includes a `hint` field:
   `"Prefer browser_snapshot for element discovery and interaction"`
4. **Interaction tool schemas** list `ref` before `selector` in their
   parameter tables — LLMs tend to use the first option they see

This is soft steering — selectors and screenshots still work. But the
descriptions make the optimal path (snapshot → ref) the path of least
resistance.

---

### 004: Many separate tools (not unified)

Each capability is a separate MCP tool (e.g., `browser_click`,
`browser_navigate`, `browser_screenshot`).

**Why:** Separate tools have focused, simple schemas — easy for LLMs to
discover and understand. Standard MCP pattern.

**Alternatives considered:**
- **Unified tool**: Fewer entries in the tool list but a complex
  discriminated union schema. Harder for LLMs to discover capabilities.
- **Grouped (3-4 tools)**: Middle ground but still complex schemas per group.

**Trade-offs:**
- ~30 tools in the tool list
- Consumers can selectively register only the tools they need

---

### 005: Multi-page sessions

Each session supports multiple pages/tabs. Tools accept an optional `pageId`
parameter that defaults to the active page.

**Why:** Real browser automation often requires multiple tabs — OAuth flows
open new windows, comparing data across pages, etc. One page per session
would require a new session for each tab, losing shared cookies/context.

**Trade-offs:**
- Session tracks `Map<string, Page>` with `activePageId`
- Tab management tools (`browser_tab_open/list/focus/close`) added
- Closing the last page closes the session
- Slightly more complex session state

---

### 006: Session-scoped BrowserContext

Each session gets its own BrowserContext (Playwright) or WebDriver session.
No sharing of contexts between sessions.

**Why:** Concurrent sessions must be isolated from each other. Sharing one
browser process with multiple contexts makes cleanup messier — closing one
context while keeping the browser alive requires careful lifecycle management.

**Trade-offs:**
- Full isolation: cookies, localStorage, cache are per-session
- Higher memory usage (~100-300MB per session)
- Clean lifecycle: close session = close everything, no dangling state

---

### 007: TTL + explicit close

Dual cleanup strategy:
- **Explicit close**: `browser_close` tool
- **TTL-based**: auto-expire after configurable idle timeout (default 30 min).
  Every tool call resets the timer.

**Why:** Sessions hold expensive resources (browser processes). If the
consumer crashes or forgets to close, resources leak. Explicit-only leaks on
crash; TTL-only forces unnecessary recreation.

**Trade-offs:**
- Reaper runs every 60 seconds, checking `lastAccessedAt`
- No resource leaks even if the consumer disappears
- TTL is configurable per-session and via global config
- Graceful shutdown closes all sessions regardless of TTL

---

### 008: Full state manipulation from day one

Include the full state manipulation suite: cookies (get/set/clear),
localStorage/sessionStorage (get/set/clear), HTTP headers, geolocation,
timezone, locale, device emulation, offline mode.

**Why:** Browser automation often needs to manipulate these. Building them
later would require API changes. Most are trivial to implement in Playwright
(1-2 lines each).

**Trade-offs:**
- ~8 state-related tools
- Safari/WebDriver support is partial — documented per-tool
- API is stable from day one

---

### 009: Auto-discover + programmatic config (no config file)

Two-layer configuration:
1. **Auto-discovery**: Scan known OS paths on init, detect installed browsers
   and their default profile locations
2. **Programmatic config**: Constructor arguments for overrides

No config file. The wrapping application passes settings through.

**Why:** This package will be wrapped by a larger application that owns its
own config file. A separate config file would be redundant and confusing.

**Alternatives considered:**
- **Config file (`~/.n8n-browser/config.json`)**: Creates a second config
  file the user has to manage.
- **Env vars only**: Harder to manage, no structured overrides
- **Auto-discover only**: No way to handle non-standard installations

**Trade-offs:**
- Zero-config for standard installations
- Discovery is cached for process lifetime (fast subsequent calls)

---

### 010: Three session modes (ephemeral, persistent, local)

- **`ephemeral`**: Fresh context, no user data. Destroyed on close. For
  scraping, testing, throwaway tasks.
- **`persistent`**: Named managed profile in `~/.n8n-browser/profiles/<name>/`.
  Data survives across sessions. For agent-managed accounts.
- **`local`**: User's actual installed browser with their real profile. For
  automating tasks as the logged-in user.

**Why:** Different use cases need different data persistence guarantees. Two
modes would miss the "agent has its own persistent account" use case.

**Trade-offs:**
- Ephemeral is fastest and safest (no cleanup needed beyond browser close)
- Persistent requires managed profile directory and naming
- Local requires browser discovery and may conflict with running browsers
  (Firefox profile lock)
- Clear separation of trust levels: ephemeral < persistent < local

---

### 011: Playwright selector passthrough

Pass selector strings directly to Playwright's locator API. Support the full
Playwright selector syntax: CSS, `text=`, `role=`, `xpath=`, chained
selectors. For WebDriver adapters, translate selectors to the closest
WebDriver locator strategy.

**Why:** Playwright's string syntax is already expressive. A custom DSL or
structured object (`{ type: "css", value: "#foo" }`) would add verbosity
without benefit.

**Trade-offs:**
- Agents can use any Playwright selector syntax
- WebDriver translation covers CSS and XPath natively; text and role are
  translated to XPath equivalents
- Some advanced Playwright selectors (chaining, `has=`, `nth=`) may not
  translate perfectly to WebDriver

---

### 012: No session persistence

Sessions are in-memory only. Server shutdown kills all sessions and browser
processes. No persistence, no reconnection.

**Why:** Reconnecting to running browsers after restart is complex — browsers
may have crashed, ports may have changed, browser contexts can't be
reconstructed. Simplest approach wins.

**Trade-offs:**
- Server restart = clean slate. The wrapping application re-creates sessions.
- No resource leaks from orphaned browser processes (all killed on shutdown)
- Persistent *profiles* (mode: `persistent`) still survive — it's the session
  metadata that's not persisted, not the browser data

---

### 013: Cross-platform from day one (macOS, Linux, Windows)

Support macOS, Linux, and Windows from the first release. Browser discovery,
profile paths, process management, and path handling are implemented for all
three platforms.

**Why:** Deferring Windows support creates platform debt that's harder to fix
later.

**Trade-offs:**
- Browser discovery must handle three sets of filesystem paths
- Process management must handle POSIX signals (macOS/Linux) and Windows
  alternatives
- More initial work, less rework later
- See [cross-platform.md](cross-platform.md) for implementation details
