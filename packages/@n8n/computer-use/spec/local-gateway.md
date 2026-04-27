# Local Gateway — Feature Specification

> Backend technical design: [technical-spec.md](./technical-spec.md)

## Overview

The Local Gateway is a feature of n8n's Instance AI that allows a user to connect
their local machine to the n8n instance. Once connected, the n8n AI Agent gains
access to capabilities on the user's machine — such as reading local files,
executing shell commands, controlling the screen, and automating a browser.

This enables the AI to assist with tasks that require local context: reading
source code, running scripts, interacting with desktop applications, or browsing
the web on behalf of the user.

---

## Capabilities

The Local Gateway exposes four capability groups. Which capabilities are available
depends on what the local machine supports. The user can enable or disable each
capability individually before connecting.

### 1. Filesystem Access

The AI can read files and navigate the directory structure within a
user-specified root directory. Access is strictly scoped — the AI cannot access
files outside the configured root.

#### Read operations (always available when filesystem is enabled)

- **Read file** — read the text content of a file. Files larger than 512 KB or
  binary files are rejected. Supports paginated access via a start line and
  line count (default: 200 lines).
- **List files** — list the immediate children of a directory. Results can be
  filtered by type (file, directory, or all) and capped at a maximum count
  (default: 200).
- **Get file tree** — get an indented directory tree starting from a given
  path. Traversal depth is configurable (default: 2 levels). Common
  generated directories (`node_modules`, `dist`, `.git`, etc.) are excluded
  automatically.
- **Search files** — search for a regex pattern across all files under a
  directory. Supports an optional glob filter (e.g. `**/*.ts`),
  case-insensitive mode, and a result cap (default: 50 matches). Files
  larger than 512 KB are skipped.

#### Write operations (requires `writeAccess` to be enabled)

Write operations are disabled by default. They must be explicitly enabled via
the `writeAccess` configuration property on the filesystem capability. This
gives the user clear, deliberate control over whether the AI is permitted to
modify the local filesystem.

When `writeAccess` is enabled, the following additional operations become
available:

- **Write file** — create a new file with the given content. Overwrites if the
  file already exists. Parent directories are created automatically.
  Content must not exceed the maximum file size\*.
- **Edit file** — apply a targeted search-and-replace to an existing file.
  Finds the first occurrence of an exact string and replaces it with the
  provided replacement. Fails if the string is not found. File must not exceed
  the maximum file size\*.
- **Create directory** — create a new directory. Idempotent: does nothing if
  the directory already exists. Parent directories are created automatically.
- **Delete** — delete a file or directory. Deleting a directory removes it and
  all of its contents recursively.
- **Move** — move or rename a file or directory to a new path. Overwrites the
  destination if it already exists. Parent directories at the destination are
  created automatically.
- **Copy file** — copy a file to a new path. Overwrites the destination if it
  already exists. Parent directories at the destination are created
  automatically.

All write operations are subject to the same path-scoping rules as read
operations — paths outside the configured root are rejected.

\* Maximum file size: 512 KB.

#### Configuration

The filesystem capability is configured with two properties:

```
dir         — the root directory the AI can access (required)
writeAccess — enables write operations (default: false)
```

Exposed as CLI flags `--filesystem-dir <path>` and `--filesystem-write-access`,
and as env vars `N8N_GATEWAY_FILESYSTEM_DIR` and
`N8N_GATEWAY_FILESYSTEM_WRITE_ACCESS`.

### 2. Shell Execution

The AI can execute shell commands on the local machine. This allows it to run
scripts, build tools, CLI utilities, or any other command available in the
user's shell environment.

### 3. Computer Control

The AI can observe and interact with the user's screen:

- **Screenshot** — capture the current screen state
- **Mouse control** — move the cursor, click, double-click, drag, scroll
- **Keyboard control** — type text, press keys, trigger keyboard shortcuts

This allows the AI to interact with desktop applications that have no API.

### 4. Browser Automation

The AI can control a web browser: navigate to URLs, click elements, fill forms,
read page content, manage cookies and storage, and execute JavaScript. Three
session modes are supported:

- **Ephemeral** — a clean, temporary browser context with no persistent data
- **Persistent** — a named browser profile that retains cookies and history
  across sessions
- **Local** — the user's real installed browser, using their actual profile and
  data

---

## Connection Flow

### 1. Silent startup

The app starts silently. If no settings file exists, one is created
automatically using the **Recommended** template (`filesystemDir` left empty).
No prompts are shown.

### 2. Connect command

The user starts the daemon with their n8n instance URL:

```
npx @n8n/computer-use <instance-url>
```

The start command is displayed inside n8n AI. Only connections from the
specified URL are accepted; requests from any other origin are silently refused.

### 3. Confirmation prompt

The app shows a single confirmation prompt displaying:

- The URL being connected to
- The current permission table (one row per tool group)
- The working directory

The user is offered three choices: **Yes**, **Edit permissions / directory**,
or **No**.

### 4. Optional edit

If the user chooses **Edit**, they can adjust per-group permission modes and/or
the working directory for this session. These edits are **session-local** — they
are not written back to the settings file.

### 5. Session established

The session is established with the confirmed settings. The AI is immediately
aware of which tools are available and can use them in subsequent conversations.

### 6. Active connection

While connected:

- The user can see that their Local Gateway is active.
- The AI can invoke any of the registered capabilities as needed during a
  conversation.
- Session rules (`allowForSession`) accumulate in memory for the duration of
  the connection.
- The connection persists across page reloads.

### 7. Disconnection

The user can explicitly disconnect the Local Gateway at any time. After
disconnection, the AI no longer has access to any local capabilities. If the
Local Gateway process on the user's machine stops unexpectedly, the connection
is terminated and the AI loses access.

---

## Access Control & Isolation

### Per-User Connections

Each Local Gateway connection is tied to a single user. A user's connection is
private — other users on the same n8n instance cannot see it, access it, or use
it. Only one active connection is allowed per user at a time.

### Filesystem Scope

When connecting, the user specifies a root directory. The AI can only access
files within that directory and its subdirectories. Access to any path outside
the root is denied — this applies equally to read and write operations.

Write access is an opt-in: even within the root, the AI cannot modify the
filesystem unless `writeAccess` is explicitly enabled. Read and write access
are independent — read-only mode remains the default.

---

## Permission Management

The Local Gateway uses a two-tier permission model: **tool group permission
modes** (coarse-grained, configured at startup) and **resource-level rules**
(fine-grained, confirmed at runtime during tool execution).

### Tool Group Permission Modes

Each tool group has an independent permission mode, configured before the
gateway connects and stored in the gateway configuration file.

| Tool Group | Available Modes |
|---|---|
| Filesystem Access | Deny / Ask / Allow |
| Filesystem Write Access | Deny / Ask / Allow |
| Shell Execution | Deny / Ask / Allow |
| Computer Control | Deny / Ask / Allow |
| Browser Automation | Deny / Ask / Allow |

**Deny** — The tool group is disabled. Its tools are not registered with the
n8n instance; the AI has no knowledge of them.

**Ask** — The tool group is enabled. Before each tool execution the user is
prompted to confirm. Confirmation is scoped to a resource (see below).
Existing resource-level rules are applied automatically without prompting.

**Allow** — The tool group is enabled. All tool calls execute without user
confirmation. Resource-level `always allow` rules have no effect in this mode.
Permanently stored `always deny` rules still take precedence and will block
the matching resources.

**Constraints:**

- The gateway cannot start unless at least one tool group is set to `Ask` or
  `Allow`.
- If Filesystem Access is set to `Deny`, Filesystem Write Access is also
  disabled regardless of its own mode.

---

### Resource-Level Rules

When a tool group operates in `Ask` mode, confirmation is scoped to a
**resource**. The resource is defined by the tool itself. For Browser
Automation the resource is the **domain** (e.g. `github.com`). For Shell
Execution the resource is the **normalized command**: wrapper commands
(`sudo`, `env`, etc.) and environment variable assignments are stripped, and
the executable basename replaces an absolute path (e.g. `sudo apt install foo`
→ `apt install foo`). Compound or otherwise unrecognizable commands (chained
operators, command substitution, variable-indirect execution, relative paths)
are returned as-is so the full command is visible in the confirmation prompt.
For other tool groups the resource is determined by the respective tool.

Resource-level `always deny` rules take precedence over the tool group
permission mode. A resource with a stored `always deny` rule is blocked
regardless of whether the tool group is set to `Ask` or `Allow`. All
other resource-level rules (`allow once`, `allow for session`, `always allow`)
apply only when the tool group is in `Ask` mode.

#### Rule Types

| Rule | Effect | Persistence |
|---|---|---|
| Allow once | Execute this specific invocation only | Not stored |
| Allow for session | Execute all invocations of this resource until the session ends | In-memory, cleared on session end |
| Always allow | Execute all future invocations of this resource | Stored permanently in config |
| Deny once | Block this specific invocation only | Not stored |
| Always deny | Block all future invocations of this resource | Stored permanently in config |

Permanently stored resource-level rules (`always allow`, `always deny`) are
stored in the gateway configuration file, separately from the tool group
permission modes.

---

### Runtime Confirmation Prompt

When a tool group is in `Ask` mode and no stored rule applies to the resource,
the user is presented with a confirmation prompt. The prompt shows:

- The tool group being used
- The resource being accessed (domain, command, path, etc.)
- A description of the action the AI intends to perform
- The confirmation options: `Allow once`, `Allow for session`, `Always allow`,
  `Deny once`, `Always deny`

---

### Session

A session is defined as a single active connection between the Local Gateway
and the n8n instance. A session ends when the user explicitly disconnects or
the n8n instance terminates the connection. A temporary network interruption
followed by automatic reconnection is considered part of the same session.

`Allow for session` rules persist across such re-connections and are cleared
only when the session ends.

---

## Default Configuration

On first run the settings file is created silently at
`~/.n8n-gateway/settings.json` using the **Recommended** template
(`filesystemDir` left empty). No user interaction is required.

On subsequent runs the stored permissions and directory are loaded as
**defaults** for the next connection confirmation prompt. The user can override
them at connect time for the current session — these overrides are
**not** written back to the settings file.

The settings file is only updated when the user chooses **Always allow** or
**Always deny** for a resource-level rule during an active session. Tool group
permission modes and the working directory are not persisted at connect time.

The configuration file stores:

- Permission mode per tool group (used as defaults for the next connect prompt)
- Filesystem root directory (used as default for the next connect prompt)
- Permanently stored resource-level rules (`always allow` / `always deny`)
