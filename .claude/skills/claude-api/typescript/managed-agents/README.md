# Managed Agents - TypeScript

> **Bindings not shown here:** This README covers the most common managed-agents flows for TypeScript. If you need a class, method, namespace, field, or behavior that isn't shown, WebFetch the TypeScript SDK repo **or the relevant docs page** from `shared/live-sources.md` rather than guess. Do not extrapolate from cURL shapes or another language's SDK.

> **Agents are persistent - create once, reference by ID.** Store the agent ID returned by `agents.create` and pass it to every subsequent `sessions.create`; do not call `agents.create` in the request path. **Recommended:** define agents and environments as version-controlled files synced with `ant apply` - see `shared/anthropic-cli.md` (its live-docs URL is in `shared/live-sources.md`). The CLI owns the control plane (create/update); your code owns the data plane (sessions with the stored ID). The examples below show in-code creation for when you must provision programmatically; in production the create call belongs in setup, not in the request path.

## Installation

```bash
npm install @anthropic-ai/sdk
```

## Client Initialization

```typescript
import Anthropic from "@anthropic-ai/sdk";

// Default - resolves credentials from the environment:
// ANTHROPIC_API_KEY, or ANTHROPIC_AUTH_TOKEN, or an `ant auth login` profile.
// Prefer this for local dev; don't hardcode a key.
const client = new Anthropic();

// Explicit API key (only when you must inject a specific key)
const client = new Anthropic({ apiKey: "your-api-key" });
```

---

## Create an Environment

```typescript
const environment = await client.beta.environments.create(
  {
    name: "my-dev-env",
    config: {
      type: "cloud",
      networking: { type: "limited", allow_package_managers: true, allow_mcp_servers: true },
    },
  },
);
console.log(environment.id); // env_...
```

---

## Create an Agent (required first step)

> Warning: **There is no inline agent config.** `model`/`system`/`tools` live on the agent object, not the session. Always start with `agents.create()` - the session only takes `agent: { type: "agent", id: agent.id }`.

### Minimal

The examples on this page turn both web tools off. Set `enabled` to true on `web_fetch` / `web_search` only when the job as described needs the web (a general-purpose or open-ended job stays off; tell the user how to switch it on) - see `shared/managed-agents-tools.md` § Agent Toolset. They also set the `auto` permission policy, under which a call can pause for your approval - the event loop under Stream Events answers it. When nobody is watching the run, answer `deny`; never answer `allow` to every paused call.

```typescript
// 1. Create the agent (reusable, versioned)
const agent = await client.beta.agents.create(
  {
    name: "Coding Assistant",
    model: "claude-opus-5-5",
    tools: [
      {
        type: "agent_toolset_20260401",
        default_config: { enabled: true, permission_policy: { type: "auto" } },
        configs: [
          { name: "web_fetch", enabled: false },
          { name: "web_search", enabled: false },
        ],
      },
    ],
  },
);

// 2. Start a session
const session = await client.beta.sessions.create(
  {
    agent: { type: "agent", id: agent.id, version: agent.version },
    environment_id: environment.id,
  },
);
console.log(session.id, session.status);
console.log(`Trace: https://platform.claude.com/workspaces/default/sessions/${session.id}`); // swap 'default' for your workspace ID if the API key is not in the Default workspace
```

### With system prompt and custom tools

```typescript
const agent = await client.beta.agents.create(
  {
    name: "Code Reviewer",
    model: "claude-opus-5-5",
    system: "You are a senior code reviewer.",
    tools: [
      {
        type: "agent_toolset_20260401",
        default_config: { enabled: true, permission_policy: { type: "auto" } },
        configs: [
          { name: "web_fetch", enabled: false },
          { name: "web_search", enabled: false },
        ],
      },
      {
        type: "custom",
        name: "run_tests",
        description: "Run the test suite",
        input_schema: {
          type: "object",
          properties: {
            test_path: { type: "string", description: "Path to test file" },
          },
          required: ["test_path"],
        },
      },
    ],
  },
);

const session = await client.beta.sessions.create(
  {
    agent: { type: "agent", id: agent.id, version: agent.version },
    environment_id: environment.id,
    title: "Code review session",
    resources: [
      {
        type: "github_repository",
        url: "https://github.com/owner/repo",
        mount_path: "/workspace/repo",
        authorization_token: process.env.GITHUB_TOKEN,
        checkout: { type: "branch", name: "main" },
      },
    ],
  },
);
```

---

## Send a User Message

```typescript
await client.beta.sessions.events.send(
  session.id,
  {
    events: [
      {
        type: "user.message",
        content: [{ type: "text", text: "Review the auth module" }],
      },
    ],
  },
);
```

> Tip: **Stream-first:** Open the stream *before* (or concurrently with) sending the message. The stream only delivers events that occur after it opens - stream-after-send means early events arrive buffered in one batch. See [Steering Patterns](../../shared/managed-agents-events.md#steering-patterns).

---

## Define an Outcome (default kickoff for one deliverable)

When the session's job is one checkable deliverable - an artifact, a report, a PR - kick off with `user.define_outcome` instead of `user.message`: the harness grades each iteration against your rubric and the agent revises until it passes. Send one or the other, never both. See [Outcomes](../../shared/managed-agents-outcomes.md) for the event reference and rubric-writing guidance. The job below reads live prices, so its agent needs `web_search` and `web_fetch` set to `enabled: true`. Under the `limited` networking created above, those tools reach only the hosts in `allowed_hosts`, and with none listed they return no page or search result: list the sites the job reads there (a listed host is also open to the sandbox). When the sites can't be listed in advance, the other mode is `unrestricted`, which gives the whole sandbox full egress, not only the web tools: offer it to the user with that warning, do not choose it for them, and if they take it, keep secrets and sensitive files out of the sandbox (see [Environments](../../shared/managed-agents-environments.md)).

```typescript
const STARTER_RUBRIC = `# Report rubric - starter, tune the criteria
- Output is a single \`report.md\` in /mnt/session/outputs/
- Every claim cites a source URL
- Includes a summary table with one row per competitor
- Prices are current as of the run date and each row says where it was read from
- No placeholder text, TODOs, or empty sections remain
`;

await client.beta.sessions.events.send(
  session.id,
  {
    events: [
      {
        type: "user.define_outcome",
        description: "Write a competitor-pricing report as report.md",
        rubric: { type: "text", content: STARTER_RUBRIC },
        max_iterations: 5, // optional; default 3, max 20
      },
    ],
  },
);
```

---

## Stream Events (SSE)

```typescript
// Stream-first: open stream and send concurrently
const [events] = await Promise.all([
  collectStream(session.id),
  client.beta.sessions.events.send(
    session.id,
    { events: [{ type: "user.message", content: [{ type: "text", text: "..." }] }] },
  ),
]);

// Standalone stream iteration:
const stream = await client.beta.sessions.events.stream(
  session.id,
);

loop: for await (const event of stream) {
  switch (event.type) {
    case "agent.message":
      for (const block of event.content) {
        if (block.type === "text") {
          process.stdout.write(block.text);
        }
      }
      break;
    case "agent.custom_tool_use":
      // Custom tool invocation - session is now idle
      console.log(`\nCustom tool call: ${event.name}`);
      console.log(`Input: ${JSON.stringify(event.input)}`);
      break;
    case "agent.tool_use":
    case "agent.mcp_tool_use":
      if (event.evaluated_permission === "ask") {
        // Paused for your decision (always_ask, or auto with no determination)
        await client.beta.sessions.events.send(session.id, {
          events: [
            {
              type: "user.tool_confirmation",
              tool_use_id: event.id,
              // you write approve(): ask a person or apply your own rule; deny when unattended
              result: (await approve(event)) ? "allow" : "deny",
            },
          ],
        });
      }
      break;
    case "session.status_idle":
      console.log("\n--- Agent idle ---");
      if (event.stop_reason.type !== "requires_action") break loop; // requires_action: waiting on you, keep streaming
      break;
    case "session.status_terminated":
      console.log("\n--- Session terminated ---");
      break loop;
  }
}
```

---

## Provide Custom Tool Result

```typescript
await client.beta.sessions.events.send(
  session.id,
  {
    events: [
      {
        type: "user.custom_tool_result",
        custom_tool_use_id: "sevt_abc123",
        content: [{ type: "text", text: "All 42 tests passed." }],
      },
    ],
  },
);
```

---

## Poll Events

```typescript
const events = await client.beta.sessions.events.list(
  session.id,
);
for (const event of events.data) {
  console.log(`${event.type}: ${event.id}`);
}
```

---

## Full Streaming Loop with Custom Tools

```typescript
function runCustomTool(toolName: string, toolInput: unknown): string {
  if (toolName === "run_tests") {
    // Your tool implementation here
    return "All tests passed.";
  }
  return `Unknown tool: ${toolName}`;
}

// Stream events; answer custom tool calls and paused calls as they arrive
async function runSession(client: Anthropic, sessionId: string) {
  const stream = await client.beta.sessions.events.stream(
    sessionId,
  );

  for await (const event of stream) {
    if (event.type === "agent.message") {
      for (const block of event.content) {
        if (block.type === "text") {
          process.stdout.write(block.text);
        }
      }
    } else if (event.type === "agent.custom_tool_use") {
      await client.beta.sessions.events.send(sessionId, {
        events: [
          {
            type: "user.custom_tool_result",
            custom_tool_use_id: event.id,
            content: [{ type: "text", text: runCustomTool(event.name, event.input) }],
          },
        ],
      });
    } else if (
      (event.type === "agent.tool_use" || event.type === "agent.mcp_tool_use") &&
      event.evaluated_permission === "ask"
    ) {
      // Paused for your decision (always_ask, or auto with no determination)
      await client.beta.sessions.events.send(sessionId, {
        events: [
          {
            type: "user.tool_confirmation",
            tool_use_id: event.id,
            // you write approve(): ask a person or apply your own rule; deny when unattended
            result: (await approve(event)) ? "allow" : "deny",
          },
        ],
      });
    } else if (event.type === "session.status_idle") {
      if (event.stop_reason.type !== "requires_action") return; // requires_action: waiting on you, keep streaming
    } else if (event.type === "session.status_terminated") {
      return;
    }
  }
}
```

---

## Upload a File

```typescript
import fs from "fs";

const file = await client.beta.files.upload({
  file: fs.createReadStream("data.csv"),
});

// Use in a session
const session = await client.beta.sessions.create(
  {
    agent: { type: "agent", id: agent.id, version: agent.version },
    environment_id: environment.id,
    resources: [{ type: "file", file_id: file.id, mount_path: "/data.csv" }],
  },
);
```

---

## List and Download Session Files

List files the agent wrote to `/mnt/session/outputs/` during a session, then download them.

```typescript
import fs from "fs";

// List files associated with a session
const files = await client.beta.files.list({
  scope_id: session.id,
  betas: ["managed-agents-2026-04-01"],
});
for (const f of files.data) {
  console.log(f.filename, f.size_bytes);

  // Download and save to disk
  const resp = await client.beta.files.download(f.id);
  const buffer = Buffer.from(await resp.arrayBuffer());
  fs.writeFileSync(f.filename, buffer);
}
```

> Tip: There's a brief indexing lag (~1-3s) between `session.status_idle` and output files appearing in `files.list`. Retry once or twice if the list is empty.

---

## Session Management

```typescript
// Get session details
const session = await client.beta.sessions.retrieve("sesn_011CZxAbc123Def456");
console.log(session.status, session.usage);

// List sessions
const sessions = await client.beta.sessions.list();

// Delete a session
await client.beta.sessions.delete("sesn_011CZxAbc123Def456");

// Archive a session
await client.beta.sessions.archive("sesn_011CZxAbc123Def456");
```

---

## MCP Server Integration

```typescript
// Agent declares MCP server (no auth here - auth goes in a vault)
const agent = await client.beta.agents.create({
  name: "MCP Agent",
  model: "claude-opus-5-5",
  mcp_servers: [
    { type: "url", name: "my-tools", url: "https://my-mcp-server.example.com/sse" },
  ],
  tools: [
    {
      type: "agent_toolset_20260401",
      default_config: { enabled: true, permission_policy: { type: "auto" } },
      configs: [
        { name: "web_fetch", enabled: false },
        { name: "web_search", enabled: false },
      ],
    },
    { type: "mcp_toolset", mcp_server_name: "my-tools" },
  ],
});

// Session attaches vault(s) containing credentials for those MCP server URLs
const session = await client.beta.sessions.create({
  agent: agent.id,
  environment_id: environment.id,
  vault_ids: [vault.id],
});
```

See `shared/managed-agents-tools.md` §Vaults for creating vaults and adding credentials.
