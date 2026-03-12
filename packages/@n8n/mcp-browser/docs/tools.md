# Tools Reference

All tools are exported as plain objects with `name`, `config`, and `handler`.
They can be registered on any MCP server.

## Common parameters

Most tools share these parameters:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | string | Yes (except `browser_open`) | Target session |
| `pageId` | string | No | Target page/tab. Defaults to active page |

Invalid `sessionId` or `pageId` returns a structured error with a hint.

## Element targeting

Interaction tools (`click`, `type`, `select`, `hover`, `drag`, etc.) accept
two targeting modes. Exactly one of `ref` or `selector` must be provided.

**Always use refs.** Selectors are an escape hatch — not the default.

### Refs (always prefer)

The standard workflow is **snapshot → act using refs**:

1. Call `browser_snapshot` → get a ref-annotated accessibility tree
2. Use the `ref` string to target elements in subsequent tool calls

```json
{ "sessionId": "s1", "ref": "e42" }
```

Refs are scoped to the most recent `browser_snapshot` call for a given page.
A new snapshot invalidates all previous refs. If a stale ref is used, the
tool returns an error with a hint to take a fresh snapshot.

Refs are deterministic — the element the agent sees in the snapshot is the
element it acts on. This avoids the brittleness of selector-based targeting
where the DOM may change between inspection and action.

### Selectors (escape hatch)

Only use selectors when refs are not available: elements not in the
accessibility tree, programmatic automation by consumers who know the DOM
structure, or targeting elements within iframes. Tools accept a `selector`
string using Playwright's selector syntax:

- **CSS**: `#myId`, `.myClass`, `div > span`
- **Text**: `text=Click me`, `text="Exact match"`
- **Role**: `role=button[name="Submit"]`
- **XPath**: `xpath=//div[@class="foo"]`
- **Chained**: `article >> text=Read more`

For WebDriver adapters (Firefox local, Safari local), selectors are
translated to the appropriate locator strategy. CSS and XPath work natively.
Text and role selectors are translated to XPath equivalents.

---

## Session & Tab Tools

### `browser_open`

Create a new browser session.

**Input:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `mode` | `"ephemeral" \| "persistent" \| "local"` | from config | Session mode |
| `browser` | string | from config | Browser to use |
| `headless` | boolean | from config | Headless mode |
| `viewport` | `{ width, height }` | from config | Viewport size |
| `profileName` | string | `"default"` | Profile name (persistent mode) |
| `ttlMs` | number | from config | Idle timeout in ms |

**Output:**

```json
{
  "sessionId": "sess_abc123",
  "browser": "chrome",
  "mode": "local",
  "pages": [{ "id": "page_xyz", "title": "New Tab", "url": "about:blank" }]
}
```

**Annotations:** `readOnlyHint: false`, `destructiveHint: false`

---

### `browser_close`

Close a session and release all resources.

**Input:**

| Param | Type | Required |
|-------|------|----------|
| `sessionId` | string | Yes |

**Output:**

```json
{ "closed": true, "sessionId": "sess_abc123" }
```

---

### `browser_tab_open`

Open a new tab in an existing session.

**Input:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `sessionId` | string | — | Required |
| `url` | string | `"about:blank"` | URL to navigate to |

**Output:**

```json
{ "pageId": "page_def456", "title": "Example", "url": "https://example.com" }
```

---

### `browser_tab_list`

List all open tabs in a session.

**Input:**

| Param | Type | Required |
|-------|------|----------|
| `sessionId` | string | Yes |

**Output:**

```json
{
  "pages": [
    { "id": "page_xyz", "title": "Google", "url": "https://google.com", "active": true },
    { "id": "page_def", "title": "GitHub", "url": "https://github.com", "active": false }
  ]
}
```

---

### `browser_tab_focus`

Switch the active tab.

**Input:**

| Param | Type | Required |
|-------|------|----------|
| `sessionId` | string | Yes |
| `pageId` | string | Yes |

**Output:**

```json
{ "activePageId": "page_def456" }
```

---

### `browser_tab_close`

Close a tab. If it's the last tab, the session closes.

**Input:**

| Param | Type | Required |
|-------|------|----------|
| `sessionId` | string | Yes |
| `pageId` | string | Yes |

**Output:**

```json
{ "closed": true, "pageId": "page_def456", "sessionClosed": false }
```

---

## Navigation

### `browser_navigate`

Navigate to a URL and wait for the page to load.

**Input:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `sessionId` | string | — | Required |
| `url` | string | — | Required. Full URL |
| `waitUntil` | `"load" \| "domcontentloaded" \| "networkidle"` | `"load"` | When to consider navigation done |
| `pageId` | string | active | Target page |

**Output:**

```json
{ "title": "Example Domain", "url": "https://example.com/", "status": 200 }
```

**Annotations:** `readOnlyHint: false`, `openWorldHint: true`

---

### `browser_back`

Navigate back in history.

**Input:** `sessionId`, optional `pageId`

**Output:** `{ "title": "...", "url": "..." }`

---

### `browser_forward`

Navigate forward in history.

**Input:** `sessionId`, optional `pageId`

**Output:** `{ "title": "...", "url": "..." }`

---

### `browser_reload`

Reload the current page.

**Input:** `sessionId`, optional `pageId`, optional `waitUntil`

**Output:** `{ "title": "...", "url": "..." }`

---

## Interaction

### `browser_click`

Click an element.

**Input:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `sessionId` | string | — | Required |
| `ref` | string | — | Element ref from snapshot. Provide `ref` or `selector` |
| `selector` | string | — | CSS/text/role/XPath selector (fallback) |
| `button` | `"left" \| "right" \| "middle"` | `"left"` | Mouse button |
| `clickCount` | number | `1` | Number of clicks (2 = double-click) |
| `modifiers` | string[] | `[]` | `["Alt"]`, `["Control"]`, `["Meta"]`, `["Shift"]` |
| `pageId` | string | active | Target page |

**Output:**

```json
{ "clicked": true, "ref": "e42" }
```

**Annotations:** `readOnlyHint: false`, `destructiveHint: true`

---

### `browser_type`

Type text into an element.

**Input:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `sessionId` | string | — | Required |
| `ref` | string | — | Element ref from snapshot. Provide `ref` or `selector` |
| `selector` | string | — | CSS/text/role/XPath selector (fallback) |
| `text` | string | — | Required. Text to type |
| `clear` | boolean | `false` | Clear existing text first |
| `submit` | boolean | `false` | Press Enter after typing |
| `delay` | number | `0` | Delay between keystrokes in ms |
| `pageId` | string | active | Target page |

**Output:**

```json
{ "typed": true, "ref": "e7", "text": "user@example.com" }
```

---

### `browser_select`

Select option(s) in a `<select>` element.

**Input:**

| Param | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Required |
| `ref` | string | Element ref from snapshot. Provide `ref` or `selector` |
| `selector` | string | CSS/text/role/XPath selector (fallback) |
| `values` | string[] | Required. Option values or labels to select |
| `pageId` | string | Target page |

**Output:**

```json
{ "selected": ["option1", "option2"] }
```

---

### `browser_drag`

Drag from one element to another.

**Input:**

| Param | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Required |
| `fromRef` | string | Source element ref. Provide `fromRef` or `from` |
| `from` | string | Source element selector (fallback) |
| `toRef` | string | Target element ref. Provide `toRef` or `to` |
| `to` | string | Target element selector (fallback) |
| `pageId` | string | Target page |

**Output:**

```json
{ "dragged": true }
```

---

### `browser_hover`

Hover over an element.

**Input:** `sessionId`, `ref` or `selector`, optional `pageId`

**Output:** `{ "hovered": true }`

---

### `browser_press`

Press keyboard key(s).

**Input:**

| Param | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Required |
| `keys` | string | Required. Key or key combination (e.g. `"Enter"`, `"Control+A"`, `"Escape"`) |
| `pageId` | string | Target page |

**Output:**

```json
{ "pressed": "Control+A" }
```

---

### `browser_scroll`

Scroll an element into view, or scroll the page.

**Input:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `sessionId` | string | — | Required |
| `ref` | string | — | Element ref to scroll into view |
| `selector` | string | — | Element selector to scroll into view (fallback) |
| `direction` | `"up" \| "down"` | `"down"` | Scroll direction (when no ref/selector) |
| `amount` | number | `500` | Pixels to scroll (when no ref/selector) |
| `pageId` | string | active | Target page |

**Output:**

```json
{ "scrolled": true }
```

---

### `browser_upload`

Set files on a file input element.

**Input:**

| Param | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Required |
| `ref` | string | File input element ref. Provide `ref` or `selector` |
| `selector` | string | File input element selector (fallback) |
| `files` | string[] | Required. Absolute file paths |
| `pageId` | string | Target page |

**Output:**

```json
{ "uploaded": true, "files": ["/tmp/report.pdf"] }
```

---

### `browser_dialog`

Handle a JavaScript dialog (alert, confirm, prompt, beforeunload).

**Input:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `sessionId` | string | — | Required |
| `action` | `"accept" \| "dismiss"` | — | Required |
| `text` | string | — | Text to enter (for prompt dialogs) |
| `pageId` | string | active | Target page |

**Output:**

```json
{ "handled": true, "action": "accept", "dialogType": "confirm" }
```

Note: Call this tool **before** the action that triggers the dialog. The
adapter arms a dialog handler that fires when the dialog appears.

---

## Inspection

### `browser_snapshot`

**Use this tool as your primary way to observe the page.** Returns a
ref-annotated accessibility tree — a compact, structured text representation
of all visible elements. Each interactive element gets a `ref` for
use in subsequent tool calls (`browser_click`, `browser_type`, etc.).

Snapshots are small (~5-50KB vs 100KB-1MB for screenshots), fast, and give
you refs for deterministic element targeting. Prefer this over
`browser_screenshot` unless you specifically need visual/layout information.

**Input:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `sessionId` | string | — | Required |
| `ref` | string | — | Scope to a subtree rooted at this ref |
| `selector` | string | — | Scope to a subtree via selector (fallback) |
| `pageId` | string | active | Target page |

**Output:**

```json
{
  "snapshot": "- heading \"Welcome to Example\" [level=1]\n  - link \"Sign in\" [ref=e1]\n  - textbox \"Search\" [ref=e2] [focused]\n  - button \"Submit\" [ref=e3]\n  - navigation\n    - link \"Home\" [ref=e4]\n    - link \"About\" [ref=e5]\n..."
}
```

Refs are assigned to all interactive elements (links, buttons, inputs,
selects, textareas, etc.). Non-interactive elements (headings, paragraphs,
containers) do not get refs. Taking a new snapshot invalidates all previous
refs for that page.

**Adapter support:** WebDriver BiDi and safaridriver use a DOM-based accessibility tree (injected JavaScript). The tree is comparable to Playwright's but may be slightly less detailed for complex ARIA patterns.

---

### `browser_screenshot`

Take a screenshot of the page or a specific element. Returns a base64-encoded
PNG image.

**Note:** Prefer `browser_snapshot` for most tasks — it's smaller, faster,
and returns refs for element targeting. Use screenshots only when you need
visual information (verifying layout, reading images/charts, debugging
visual rendering issues).

**Input:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `sessionId` | string | — | Required |
| `ref` | string | — | Element ref to screenshot |
| `selector` | string | — | Element selector to screenshot (fallback) |
| `fullPage` | boolean | `false` | Capture full scrollable page |
| `pageId` | string | active | Target page |

If no `ref` or `selector` is provided, captures the viewport.

**Output:**

```json
{
  "image": "<base64 PNG data>",
  "width": 1280,
  "height": 720,
  "hint": "Prefer browser_snapshot for element discovery and interaction — it returns refs and uses less context."
}
```

**Annotations:** `readOnlyHint: true`

---

### `browser_text`

Get the text content of an element or the full page.

**Input:**

| Param | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Required |
| `selector` | string | Element to get text from. If omitted, returns `document.body.innerText` |
| `pageId` | string | Target page |

**Output:**

```json
{ "text": "Welcome to Example\nSign in to continue..." }
```

---

### `browser_evaluate`

Execute JavaScript in the page context and return the result.

**Input:**

| Param | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Required |
| `script` | string | Required. JavaScript to execute. Must be an expression or IIFE |
| `pageId` | string | Target page |

**Output:**

```json
{ "result": { "title": "Example", "links": 42 } }
```

The result is JSON-serialized. Non-serializable values (DOM nodes,
functions) return a string representation.

**Security note:** This executes arbitrary JavaScript in the page context.
See [tradeoffs.md](tradeoffs.md) for trust boundary discussion.

---

### `browser_console`

Get console log entries from the page.

**Input:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `sessionId` | string | — | Required |
| `level` | `"log" \| "warn" \| "error" \| "info" \| "debug"` | all | Filter by level |
| `clear` | boolean | `false` | Clear buffer after reading |
| `pageId` | string | active | Target page |

**Output:**

```json
{
  "entries": [
    { "level": "error", "text": "Uncaught TypeError: Cannot read property 'x' of undefined", "timestamp": 1709827200000 },
    { "level": "log", "text": "App initialized", "timestamp": 1709827201000 }
  ]
}
```

**Adapter support:** Playwright and WebDriver BiDi. Not available in
safaridriver.

---

### `browser_errors`

Get page errors (uncaught exceptions).

**Input:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `sessionId` | string | — | Required |
| `clear` | boolean | `false` | Clear buffer after reading |
| `pageId` | string | active | Target page |

**Output:**

```json
{
  "errors": [
    { "message": "Uncaught TypeError: x is not a function", "stack": "...", "timestamp": 1709827200000 }
  ]
}
```

---

### `browser_pdf`

Generate a PDF of the current page.

**Input:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `sessionId` | string | — | Required |
| `format` | `"A4" \| "Letter" \| "Legal"` | `"A4"` | Page format |
| `landscape` | boolean | `false` | Landscape orientation |
| `pageId` | string | active | Target page |

**Output:**

```json
{ "pdf": "<base64 PDF data>", "pages": 3 }
```

**Adapter support:** Playwright, WebDriver BiDi, and safaridriver (via W3C WebDriver `printPage`).

---

### `browser_network`

Get recent network requests and responses.

**Input:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `sessionId` | string | — | Required |
| `filter` | string | — | URL pattern filter (glob) |
| `clear` | boolean | `false` | Clear buffer after reading |
| `pageId` | string | active | Target page |

**Output:**

```json
{
  "requests": [
    {
      "url": "https://api.example.com/data",
      "method": "GET",
      "status": 200,
      "contentType": "application/json",
      "timestamp": 1709827200000
    }
  ]
}
```

**Adapter support:** Playwright and WebDriver BiDi. Not available in
safaridriver.

---

## Wait

### `browser_wait`

Wait for one or more conditions. Conditions can be combined — all must be
satisfied.

**Input:**

| Param | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Required |
| `selector` | string | CSS/text/role selector to wait for |
| `url` | string | URL pattern (glob) to wait for |
| `loadState` | `"load" \| "domcontentloaded" \| "networkidle"` | Wait for load state |
| `predicate` | string | JavaScript expression that must return truthy |
| `text` | string | Text content to wait for on the page |
| `timeoutMs` | number | Timeout in ms (default: 30000) |
| `pageId` | string | Target page |

**Output:**

```json
{ "waited": true, "elapsedMs": 1234 }
```

**Examples:**

Wait for an element:
```json
{ "sessionId": "s1", "selector": "#results" }
```

Wait for URL change:
```json
{ "sessionId": "s1", "url": "**/dashboard" }
```

Wait for multiple conditions:
```json
{ "sessionId": "s1", "selector": "#main", "url": "**/dash", "loadState": "networkidle" }
```

---

## State

### `browser_cookies`

Get, set, or clear cookies.

**Input:**

| Param | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Required |
| `action` | `"get" \| "set" \| "clear"` | Required |
| `cookies` | Cookie[] | Required for `set`. Array of cookie objects |
| `url` | string | Filter cookies by URL (for `get`) |
| `pageId` | string | Target page |

Cookie object:
```typescript
{
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: number;     // Unix timestamp
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}
```

**Output (get):**

```json
{
  "cookies": [
    { "name": "session", "value": "abc123", "domain": ".example.com", "path": "/" }
  ]
}
```

---

### `browser_storage`

Get, set, or clear localStorage or sessionStorage.

**Input:**

| Param | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Required |
| `kind` | `"local" \| "session"` | Required. Storage type |
| `action` | `"get" \| "set" \| "clear"` | Required |
| `data` | Record<string, string> | Required for `set`. Key-value pairs |
| `pageId` | string | Target page |

**Output (get):**

```json
{ "data": { "theme": "dark", "language": "en" } }
```

**Implementation note:** For WebDriver adapters, storage operations are
implemented via `evaluate` (JavaScript execution).

---

### `browser_set_offline`

Toggle offline mode.

**Input:**

| Param | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Required |
| `offline` | boolean | Required. `true` = offline, `false` = online |
| `pageId` | string | Target page |

**Output:** `{ "offline": true }`

**Adapter support:** Playwright and WebDriver BiDi.

---

### `browser_set_headers`

Set extra HTTP headers for all requests.

**Input:**

| Param | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Required |
| `headers` | Record<string, string> | Required. Headers to set. Empty object clears |
| `pageId` | string | Target page |

**Output:** `{ "headers": { "X-Debug": "1" } }`

**Adapter support:** Playwright and WebDriver BiDi. Not available in
safaridriver.

---

### `browser_set_geolocation`

Override geolocation.

**Input:**

| Param | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Required |
| `latitude` | number | Required (unless clearing) |
| `longitude` | number | Required (unless clearing) |
| `accuracy` | number | Optional. Accuracy in meters |
| `clear` | boolean | Set to `true` to remove override |
| `pageId` | string | Target page |

**Output:** `{ "geolocation": { "latitude": 37.7749, "longitude": -122.4194 } }`

**Adapter support:** Playwright. Limited in WebDriver BiDi. Not available in
safaridriver.

---

### `browser_set_timezone`

Override timezone.

**Input:**

| Param | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Required |
| `timezone` | string | Required. IANA timezone (e.g. `"America/New_York"`) |
| `pageId` | string | Target page |

**Output:** `{ "timezone": "America/New_York" }`

**Adapter support:** Playwright only.

---

### `browser_set_locale`

Override locale.

**Input:**

| Param | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Required |
| `locale` | string | Required. BCP 47 locale (e.g. `"en-US"`, `"de-DE"`) |
| `pageId` | string | Target page |

**Output:** `{ "locale": "en-US" }`

**Adapter support:** Playwright only.

---

### `browser_set_device`

Emulate a device (sets viewport, user agent, device scale factor, touch
support, etc.).

**Input:**

| Param | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Required |
| `device` | string | Required. Playwright device name (e.g. `"iPhone 14"`, `"Pixel 7"`) |
| `pageId` | string | Target page |

**Output:** `{ "device": "iPhone 14", "viewport": { "width": 390, "height": 844 } }`

**Adapter support:** Playwright only.

---

## Tool annotations summary

| Tool | readOnly | destructive | idempotent | openWorld |
|------|----------|-------------|------------|-----------|
| `browser_open` | false | false | false | false |
| `browser_close` | false | false | true | false |
| `browser_tab_*` | false | false | varies | false |
| `browser_navigate` | false | false | true | true |
| `browser_back/forward/reload` | false | false | true | false |
| `browser_click` | false | true | false | false |
| `browser_type` | false | true | false | false |
| `browser_select` | false | true | false | false |
| `browser_drag` | false | true | false | false |
| `browser_hover` | true | false | true | false |
| `browser_press` | false | true | false | false |
| `browser_scroll` | true | false | false | false |
| `browser_upload` | false | true | false | false |
| `browser_dialog` | false | false | false | false |
| `browser_screenshot` | true | false | true | false |
| `browser_snapshot` | true | false | true | false |
| `browser_text` | true | false | true | false |
| `browser_evaluate` | false | true | false | false |
| `browser_console` | true | false | true | false |
| `browser_errors` | true | false | true | false |
| `browser_pdf` | true | false | true | false |
| `browser_network` | true | false | true | false |
| `browser_wait` | true | false | true | false |
| `browser_cookies` | varies | varies | varies | false |
| `browser_storage` | varies | varies | varies | false |
| `browser_set_*` | false | false | true | false |
