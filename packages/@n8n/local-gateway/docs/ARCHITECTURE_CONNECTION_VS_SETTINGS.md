# Local Gateway — settings vs connection vs runtime

This desktop app keeps three concerns separate:

## Global `AppSettings` (electron-store)

**Owns:** Tool toggles, log level, filesystem directory, **explicit `allowedOrigins`** (origin patterns, not derived from a tenant URL), and other preferences that apply regardless of which n8n instance you connect to.

**Merge into `GatewayConfig`:** `SettingsStore.toGatewayConfig()` maps these fields into the structural + permission parts of `GatewayConfig`. **`allowedOrigins` comes only from the persisted list** in `AppSettings` — never from connection URLs or “last connected” display state.

## Connection (ephemeral or future profiles)

**Owns:** The target n8n instance URL and pairing token for a **single connect attempt** or live session. Today the URL and token are **not** written into `AppSettings`.

**Pre-connect:** Before `GatewayClient` is created, the main process normalizes the URL, computes `origin = new URL(url).origin`, and requires `isOriginAllowed(origin, appSettings.allowedOrigins)` (from `@n8n/computer-use/config`). Malicious or mistyped deep links to disallowed origins are rejected before any network client is constructed.

## Runtime (`GatewayClient` / `GatewaySession`)

**Owns:** SSE connection, negotiated tools, session file state under the computer-use settings directory. Upgraded session keys exist in memory and on disk per the computer-use package; they are **not** mixed into global Electron `AppSettings`.

**Note:** Reconnect-on-settings-change was removed; changing tool preferences while connected may require an explicit disconnect until mid-session updates exist (see product tickets).
