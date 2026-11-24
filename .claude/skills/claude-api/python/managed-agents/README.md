# Managed Agents - Python

> **Bindings not shown here:** This README covers the most common managed-agents flows for Python. If you need a class, method, namespace, field, or behavior that isn't shown, WebFetch the Python SDK repo **or the relevant docs page** from `shared/live-sources.md` rather than guess. Do not extrapolate from cURL shapes or another language's SDK.

> **Agents are persistent - create once, reference by ID.** Store the agent ID returned by `agents.create` and pass it to every subsequent `sessions.create`; do not call `agents.create` in the request path. **Recommended:** define agents and environments as version-controlled files synced with `ant apply` - see `shared/anthropic-cli.md` (its live-docs URL is in `shared/live-sources.md`). The CLI owns the control plane (create/update); your code owns the data plane (sessions with the stored ID). The examples below show in-code creation for when you must provision programmatically; in production the create call belongs in setup, not in the request path.

## Installation

```bash
pip install anthropic
```

## Client Initialization

```python
import anthropic

# Default - resolves credentials from the environment:
# ANTHROPIC_API_KEY, or ANTHROPIC_AUTH_TOKEN, or an `ant auth login` profile.
# Prefer this for local dev; don't hardcode a key.
client = anthropic.Anthropic()

# Explicit API key (only when you must inject a specific key)
client = anthropic.Anthropic(api_key="your-api-key")
```

---

## Create an Environment

```python
environment = client.beta.environments.create(
    name="my-dev-env",
    config={
        "type": "cloud",
        "networking": {"type": "limited", "allow_package_managers": True, "allow_mcp_servers": True},
    },
)
print(environment.id)  # env_...
```

---

## Create an Agent (required first step)

> Warning: **There is no inline agent config.** `model`/`system`/`tools` live on the agent object, not the session. Always start with `agents.create()` - the session only takes `agent={"type": "agent", "id": agent.id}`.

### Minimal

The examples on this page turn both web tools off. Set `enabled` to true on `web_fetch` / `web_search` only when the job as described needs the web (a general-purpose or open-ended job stays off; tell the user how to switch it on) - see `shared/managed-agents-tools.md` § Agent Toolset. They also set the `auto` permission policy, under which a call can pause for your approval - the event loop under Stream Events answers it. When nobody is watching the run, answer `deny`; never answer `allow` to every paused call.

```python
# 1. Create the agent (reusable, versioned)
agent = client.beta.agents.create(
    name="Coding Assistant",
    model="claude-opus-5-5",
    tools=[
        {
            "type": "agent_toolset_20260401",
            "default_config": {"enabled": True, "permission_policy": {"type": "auto"}},
            "configs": [
                {"name": "web_fetch", "enabled": False},
                {"name": "web_search", "enabled": False},
            ],
        },
    ],
)

# 2. Start a session
session = client.beta.sessions.create(
    agent={"type": "agent", "id": agent.id, "version": agent.version},
    environment_id=environment.id,
)
print(session.id, session.status)
print(f"Trace: https://platform.claude.com/workspaces/default/sessions/{session.id}")  # swap 'default' for your workspace ID if the API key is not in the Default workspace
```

### With system prompt and custom tools

```python
import os

agent = client.beta.agents.create(
    name="Code Reviewer",
    model="claude-opus-5-5",
    system="You are a senior code reviewer.",
    tools=[
        {
            "type": "agent_toolset_20260401",
            "default_config": {"permission_policy": {"type": "auto"}},
            "configs": [
                {"name": "web_fetch", "enabled": False},
                {"name": "web_search", "enabled": False},
            ],
        },
        {
            "type": "custom",
            "name": "run_tests",
            "description": "Run the test suite",
            "input_schema": {
                "type": "object",
                "properties": {
                    "test_path": {"type": "string", "description": "Path to test file"}
                },
                "required": ["test_path"],
            },
        },
    ],
)

session = client.beta.sessions.create(
    agent={"type": "agent", "id": agent.id, "version": agent.version},
    environment_id=environment.id,
    title="Code review session",
    resources=[
        {
            "type": "github_repository",
            "url": "https://github.com/owner/repo",
            "mount_path": "/workspace/repo",
            "authorization_token": os.environ["GITHUB_TOKEN"],
            "checkout": {"type": "branch", "name": "main"},
        }
    ],
)
```

---

## Send a User Message

```python
client.beta.sessions.events.send(
    session_id=session.id,
    events=[
        {
            "type": "user.message",
            "content": [{"type": "text", "text": "Review the auth module"}],
        }
    ],
)
```

> Tip: **Stream-first:** Open the stream *before* (or concurrently with) sending the message. The stream only delivers events that occur after it opens - stream-after-send means early events arrive buffered in one batch. See [Steering Patterns](../../shared/managed-agents-events.md#steering-patterns).

---

## Define an Outcome (default kickoff for one deliverable)

When the session's job is one checkable deliverable - an artifact, a report, a PR - kick off with `user.define_outcome` instead of `user.message`: the harness grades each iteration against your rubric and the agent revises until it passes. Send one or the other, never both. See [Outcomes](../../shared/managed-agents-outcomes.md) for the event reference and rubric-writing guidance. The job below reads live prices, so its agent needs `web_search` and `web_fetch` set to `enabled: true`. Under the `limited` networking created above, those tools reach only the hosts in `allowed_hosts`, and with none listed they return no page or search result: list the sites the job reads there (a listed host is also open to the sandbox). When the sites can't be listed in advance, the other mode is `unrestricted`, which gives the whole sandbox full egress, not only the web tools: offer it to the user with that warning, do not choose it for them, and if they take it, keep secrets and sensitive files out of the sandbox (see [Environments](../../shared/managed-agents-environments.md)).

```python
STARTER_RUBRIC = """# Report rubric - starter, tune the criteria
- Output is a single `report.md` in /mnt/session/outputs/
- Every claim cites a source URL
- Includes a summary table with one row per competitor
- Prices are current as of the run date and each row says where it was read from
- No placeholder text, TODOs, or empty sections remain
"""

client.beta.sessions.events.send(
    session_id=session.id,
    events=[
        {
            "type": "user.define_outcome",
            "description": "Write a competitor-pricing report as report.md",
            "rubric": {"type": "text", "content": STARTER_RUBRIC},
            "max_iterations": 5,  # optional; default 3, max 20
        }
    ],
)
```

---

## Stream Events (SSE)

```python
import json

# Stream-first: open stream, then send while stream is live
with client.beta.sessions.events.stream(
    session_id=session.id,
) as stream:
    client.beta.sessions.events.send(
        session_id=session.id,
        events=[{"type": "user.message", "content": [{"type": "text", "text": "..."}]}],
    )
    for event in stream:
        ...  # process events

# Standalone stream iteration:
with client.beta.sessions.events.stream(
    session_id=session.id,
) as stream:
    for event in stream:
        if event.type == "agent.message":
            for block in event.content:
                if block.type == "text":
                    print(block.text, end="", flush=True)
        elif event.type == "agent.custom_tool_use":
            # Custom tool invocation - session is now idle
            print(f"\nCustom tool call: {event.name}")
            print(f"Input: {json.dumps(event.input)}")
            # Send result back (see below)
        elif (event.type == "agent.tool_use" or event.type == "agent.mcp_tool_use") and event.evaluated_permission == "ask":
            # Paused for your decision (always_ask, or auto with no determination)
            client.beta.sessions.events.send(
                session_id=session.id,
                events=[{
                    "type": "user.tool_confirmation",
                    "tool_use_id": event.id,
                    # you write approve(): ask a person or apply your own rule; deny when unattended
                    "result": "allow" if approve(event) else "deny",
                }],
            )
        elif event.type == "session.status_idle":
            print("\n--- Agent idle ---")
            if event.stop_reason.type != "requires_action":  # requires_action: waiting on you, keep streaming
                break
        elif event.type == "session.status_terminated":
            print("\n--- Session terminated ---")
            break
```

---

## Provide Custom Tool Result

```python
client.beta.sessions.events.send(
    session_id=session.id,
    events=[
        {
            "type": "user.custom_tool_result",
            "custom_tool_use_id": "sevt_abc123",
            "content": [{"type": "text", "text": "All 42 tests passed."}],
        }
    ],
)
```

---

## Poll Events

```python
events = client.beta.sessions.events.list(
    session_id=session.id,
)
for event in events.data:
    print(f"{event.type}: {event.id}")
```

> Warning: **Prefer the SDK over raw `requests`/`httpx`.** If you hand-roll a poll loop, don't assume `timeout=(5, 60)` or `httpx.Timeout(120)` caps total call duration - both are **per-chunk** read timeouts (reset on every byte), so a trickling response can block forever. For a hard wall-clock deadline, track `time.monotonic()` at the loop level and bail explicitly, or wrap with `asyncio.wait_for()`. See [Receiving Events](../../shared/managed-agents-events.md#receiving-events).

---

## Full Streaming Loop with Custom Tools

```python
import json


def run_custom_tool(tool_name: str, tool_input: dict) -> str:
    """Execute a custom tool and return the result."""
    if tool_name == "run_tests":
        # Your tool implementation here
        return "All tests passed."
    return f"Unknown tool: {tool_name}"


def run_session(client, session_id: str):
    """Stream events; answer custom tool calls and paused calls as they arrive."""
    with client.beta.sessions.events.stream(
        session_id=session_id,
    ) as stream:
        for event in stream:
            if event.type == "agent.message":
                for block in event.content:
                    if block.type == "text":
                        print(block.text, end="", flush=True)
            elif event.type == "agent.custom_tool_use":
                client.beta.sessions.events.send(
                    session_id=session_id,
                    events=[{
                        "type": "user.custom_tool_result",
                        "custom_tool_use_id": event.id,
                        "content": [{"type": "text", "text": run_custom_tool(event.name, event.input)}],
                    }],
                )
            elif (event.type == "agent.tool_use" or event.type == "agent.mcp_tool_use") and event.evaluated_permission == "ask":
                # Paused for your decision (always_ask, or auto with no determination)
                client.beta.sessions.events.send(
                    session_id=session_id,
                    events=[{
                        "type": "user.tool_confirmation",
                        "tool_use_id": event.id,
                        # you write approve(): ask a person or apply your own rule; deny when unattended
                        "result": "allow" if approve(event) else "deny",
                    }],
                )
            elif event.type == "session.status_idle":
                if event.stop_reason.type != "requires_action":  # requires_action: waiting on you, keep streaming
                    return
            elif event.type == "session.status_terminated":
                return
```

---

## Upload a File

```python
with open("data.csv", "rb") as f:
    file = client.beta.files.upload(
        file=f,
    )

# Use in a session
session = client.beta.sessions.create(
    agent={"type": "agent", "id": agent.id, "version": agent.version},
    environment_id=environment.id,
    resources=[{"type": "file", "file_id": file.id, "mount_path": "/data.csv"}],
)
```

---

## List and Download Session Files

List files the agent wrote to `/mnt/session/outputs/` during a session, then download them.

```python
# List files associated with a session
files = client.beta.files.list(
    scope_id=session.id,
    betas=["managed-agents-2026-04-01"],
)
for f in files.data:
    print(f.filename, f.size_bytes)
    # Download each file and save to disk
    file_content = client.beta.files.download(f.id)
    file_content.write_to_file(f.filename)
```

> Tip: There's a brief indexing lag (~1-3s) between `session.status_idle` and output files appearing in `files.list`. Retry once or twice if the list is empty.

---

## Session Management

```python
# Get session details
session = client.beta.sessions.retrieve(session_id="sesn_011CZxAbc123Def456")
print(session.status, session.usage)

# List sessions
sessions = client.beta.sessions.list()

# Delete a session
client.beta.sessions.delete(session_id="sesn_011CZxAbc123Def456")

# Archive a session
client.beta.sessions.archive(session_id="sesn_011CZxAbc123Def456")
```

---

## MCP Server Integration

```python
# Agent declares MCP server (no auth here - auth goes in a vault)
agent = client.beta.agents.create(
    name="MCP Agent",
    model="claude-opus-5-5",
    mcp_servers=[
        {"type": "url", "name": "my-tools", "url": "https://my-mcp-server.example.com/sse"},
    ],
    tools=[
        {
            "type": "agent_toolset_20260401",
            "default_config": {"enabled": True, "permission_policy": {"type": "auto"}},
            "configs": [
                {"name": "web_fetch", "enabled": False},
                {"name": "web_search", "enabled": False},
            ],
        },
        {"type": "mcp_toolset", "mcp_server_name": "my-tools"},
    ],
)

# Session attaches vault(s) containing credentials for those MCP server URLs
session = client.beta.sessions.create(
    agent=agent.id,
    environment_id=environment.id,
    vault_ids=[vault.id],
)
```

See `shared/managed-agents-tools.md` §Vaults for creating vaults and adding credentials.
