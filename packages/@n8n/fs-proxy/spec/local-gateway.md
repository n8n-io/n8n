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

### 1. Capability Preview & Configuration

Before the Local Gateway initiates a connection to the n8n instance, the user
is shown a list of capabilities that the local machine supports. Capabilities
that are not available on the machine (e.g. computer control on a headless
server) are indicated as unavailable.

The user can enable or disable each capability individually. This gives the
user explicit control over what the AI is permitted to do on their machine
for this connection.

The user must confirm the capability selection before the connection proceeds.

### 2. Establishing a Connection

After the user confirms, the Local Gateway connects to the n8n instance and
registers the selected capabilities. The AI Agent is immediately aware of
which tools are available and can use them in subsequent conversations.

### 3. Active Connection

While connected:

- The user can see that their Local Gateway is active.
- The AI can invoke any of the registered capabilities as needed during a
  conversation.
- The connection persists across page reloads.

### 4. Disconnection

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

## Human-in-the-Loop (HITL)

> **Work in progress.** This section will define how the AI requests user
> confirmation before performing sensitive or destructive local operations
> (e.g. executing a shell command, clicking a UI element). Details to be
> specified.
