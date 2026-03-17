# Local Gateway — Feature Specification

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

Supported operations:
- Read file contents
- List files in a directory
- Get a directory tree
- Search file contents

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
the root is denied.

---

## Human-in-the-Loop (HITL)

> **Work in progress.** This section will define how the AI requests user
> confirmation before performing sensitive or destructive local operations
> (e.g. executing a shell command, clicking a UI element). Details to be
> specified.
