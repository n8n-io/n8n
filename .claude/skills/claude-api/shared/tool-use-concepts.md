# Tool Use Concepts

This file covers the conceptual foundations of tool use with the Claude API. For language-specific code examples, see the `python/`, `typescript/`, or other language folders. For decision heuristics on which tools to expose, how to manage context in long-running agents, and caching strategy, see `agent-design.md`.

## User-Defined Tools

### Tool Definition Structure

> **Note:** When using the Tool Runner (beta), tool schemas are generated automatically from your function signatures (Python), Zod schemas (TypeScript), annotated classes (Java), `jsonschema` struct tags (Go), or `BaseTool` subclasses (Ruby). The raw JSON schema format below is for the manual approach - including PHP's `BetaRunnableTool`, which wraps a run closure around a hand-written schema - or SDKs without tool runner support.

Each tool requires a name, description, and JSON Schema for its inputs:

```json
{
  "name": "get_weather",
  "description": "Get current weather for a location",
  "input_schema": {
    "type": "object",
    "properties": {
      "location": {
        "type": "string",
        "description": "City and state, e.g., San Francisco, CA"
      },
      "unit": {
        "type": "string",
        "enum": ["celsius", "fahrenheit"],
        "description": "Temperature unit"
      }
    },
    "required": ["location"]
  }
}
```

**Best practices for tool definitions:**

- Use clear, descriptive names (e.g., `get_weather`, `search_database`, `send_email`)
- Write detailed descriptions - Claude uses these to decide when to use the tool. Be **prescriptive about *when* to call it**, not just what it does (e.g. "Call this when the user asks about current prices or recent events"). On recent Opus models, which reach for tools more conservatively, trigger conditions in the description give measurable lift in should-call rate.
- Include descriptions for each property
- Use `enum` for parameters with a fixed set of values
- Mark truly required parameters in `required`; make others optional with defaults

---

### Eager input streaming (default for streaming requests with client tools)

By default the API **buffers and validates each tool-input parameter** before it emits any `input_json_delta` for it. For a small `{"location": "Paris"}` that is invisible; for a tool that takes a file body, a code block, or a document, nothing arrives until the whole parameter is generated (a 20K-token parameter is a multi-minute silent gap on the stream). Setting `eager_input_streaming: true` on the tool turns off that buffering for that tool: fragments stream as they are generated, the first fragment arrives immediately, and the fragments are longer. The events are the same (`content_block_start` -> `input_json_delta` × N -> `content_block_stop`) - only the timing and the validation guarantee change.

**Default rule:** when a request is streamed (`client.messages.stream(...)`, `stream=True`, tool runner with streaming on) and defines user-defined tools, set `eager_input_streaming: true` on each of those tools. Do not set it on non-streaming requests (it is ignored), on server tools (`web_search`, `code_execution`, `mcp_toolset`, etc. - it is not a valid field there), or when the client has no way to handle invalid JSON.

```json
{
  "name": "write_file",
  "description": "Write text to a file",
  "eager_input_streaming": true,
  "input_schema": {
    "type": "object",
    "properties": {
      "path": {"type": "string"},
      "contents": {"type": "string", "description": "Full file contents"}
    },
    "required": ["path", "contents"]
  }
}
```

Tool runner: Python `@beta_tool(eager_input_streaming=True)` passes it through. TypeScript `betaZodTool()` has no option for it - spread the field onto the returned tool: `{ ...betaZodTool({ name, description, inputSchema, run }), eager_input_streaming: true }`. Go/Java/Ruby/C#/PHP: the field is on the tool param type (`EagerInputStreaming`, `.eagerInputStreaming(true)`, `eager_input_streaming:`).

**What you give up, and how to handle it.** Without buffering the API does not validate or coerce the parameter, so the accumulated `partial_json` can be (a) cut off at `max_tokens` mid-parameter or (b) invalid JSON the model emitted. Both SDKs accumulate it with a *tolerant* partial-JSON parser, so malformed input often comes back as a silently truncated object (an unescaped inner quote ends the string early; trailing garbage is dropped) rather than an exception. Do not rely on an exception. Always:

1. **Validate the parsed input against the tool's schema before running the tool.** The typed runner helpers do this for you and never call `run` on input that fails: TS `betaZodTool` (Zod), Python `@beta_tool` on a function with typed parameters, Java's annotated classes, Go's struct tags, Ruby's `BaseTool`. The raw JSON-Schema helpers do **not** validate at runtime - TS `betaTool()` and PHP's `BetaRunnableTool` hand `run` whatever was parsed - so with those, validate inside `run` (or leave `eager_input_streaming` off for that tool). In a manual loop, validate yourself (`schema.safeParse(block.input)` in TS, a pydantic model or explicit type checks in Python) and treat a failure exactly like invalid JSON. A raw SSE / cURL client should `JSON.parse` the accumulated fragments strictly and then validate.
2. Check `stop_reason == "max_tokens"` when a `tool_use` block is present: a truncated input usually parses as a valid partial object, so this is what catches it; retry with a higher `max_tokens` rather than running the tool. Also stop on `stop_reason == "refusal"` - a refusal can cut a `tool_use` off mid-input, so never execute that turn's tools.
3. Still guard the exceptions the SDKs do raise for JSON they cannot parse at all: **Python** raises `ValueError` from the stream iterator (wrap the `with client.messages.stream(...)` block); **TypeScript** materializes the input at `content_block_stop`, so the error rejects whatever you are awaiting at that moment - the `for await (const event of stream)` loop if you iterate events, otherwise `await stream.finalMessage()` - so wrap the whole consumption of the stream (iteration and final read together), as the Python guidance wraps the whole `with` block; the **tool runners** surface the same error from their iteration (wrap the loop). Catch only that error - rethrow the SDK's typed API errors (`RateLimitError`, `AuthenticationError`, ...) so an auth or rate-limit failure is not mistaken for bad JSON - and cap retries.
4. When validation fails and you still hold the `tool_use` block (manual loop after `finalMessage()` / `get_final_message()`, raw SSE), do not run the tool; return the raw text to Claude as an error result so it can retry:

```json
{
  "type": "tool_result",
  "tool_use_id": "toolu_01...",
  "is_error": true,
  "content": "{\"INVALID_JSON\": \"<the unparseable input you received>\"}"
}
```

When the SDK raised before the block completed (Python stream, either tool runner), there is no `tool_use_id` to answer, so re-issue the request instead.

Build that wrapper with the JSON library (not string concatenation) so quotes in the bad input are escaped. With the buffered default the server would have delivered the same broken parameter as a single string value instead; eager mode moves that failure to the client, it does not create it.

**Availability:** Claude API, Claude Platform on AWS, Vertex AI, and Microsoft Foundry for all current models (`shared/platform-availability.md`). On Amazon Bedrock only the newer serving stack accepts the field (Opus 4.7 / 4.8 / 5, Fable 5, Sonnet 4.6 / 5); older Bedrock deployments (Opus 4.5 / 4.6, Sonnet 4.0 / 4.5, Haiku 4.5) return 400 on the unknown field - drop it there. `shared/platform-availability.md` is the source of truth for this list. Any proxy or gateway in front of the API may likewise reject it; if the user's code points at a custom `base_url`, leave it off unless they confirm the upstream is the real API.

---

### Tool Choice Options

Control when Claude uses tools:

| Value                             | Behavior                                      |
| --------------------------------- | --------------------------------------------- |
| `{"type": "auto"}`                | Claude decides whether to use tools (default) |
| `{"type": "any"}`                 | Claude must use at least one tool             |
| `{"type": "tool", "name": "..."}` | Claude must use the specified tool            |
| `{"type": "none"}`                | Claude cannot use tools                       |

Any `tool_choice` value can also include `"disable_parallel_tool_use": true` to force Claude to use at most one tool per response. By default, Claude may request multiple tool calls in a single response.

**Claude Fable 5.1, Claude Mythos 5.1, Claude Opus 5.5, and Claude Sonnet 5.5 reject forced tool use:** `{"type": "any"}` and `{"type": "tool", "name": ...}` return a 400 there (`tool_choice: type "tool" and "any" are not supported for this model.` - on `count_tokens` and Batches too). It is a model-specific restriction (Claude Fable 5 and Claude Opus 5 accept them). Because `auto` does not guarantee a call, check that one was made and retry if it wasn't. Use `{"type": "auto"}` and state the expectation in the prompt ("Use the get_weather tool to answer") - `strict: true` on the tool keeps the schema-valid-arguments guarantee `any` gave you - or structured outputs (`output_config.format`) when the forced call only existed to extract JSON. `auto` and `none` are unaffected; `disable_parallel_tool_use` with `auto` still means at most one call (the "exactly one" combination with `any`/`tool` is gone). Combining `tool_choice` `any` with `strict: true` applies only on models that support forced tool use. See `shared/model-migration.md` -> Migrating to Claude Fable 5.1 from Claude Fable 5.

---

### Tool Runner vs Manual Loop

**Tool Runner (Recommended):** The SDK's tool runner handles the agentic loop automatically - it calls the API, detects tool use requests, executes your tool functions, feeds results back to Claude, and repeats until Claude stops calling tools. Available in Python, TypeScript, Java, Go, Ruby, PHP, and C# SDKs (beta). The Python SDK also provides MCP conversion helpers (`anthropic.lib.tools.mcp`) to convert MCP tools, prompts, and resources for use with the tool runner - see `python/claude-api/tool-use.md` for details. **Default to the tool runner** for any custom-tool agent.

**The tool runner is not a black box - "I need control" is rarely a reason to drop to the manual loop.** Each iteration yields the assistant message *before* the tools run and lets you intervene, so most "fine-grained control" needs are covered without hand-writing the loop:

- **Human-in-the-loop approval / gating** - gate in the tool's run function (return a "user declined" result instead of executing), or inspect the tool call in the yielded message and override the pending request with `set_messages_params()` / `setMessagesParams()` / `append_messages()` / `pushMessages()` to allow or deny *before* the tool executes. The runner runs your function automatically only if you don't intervene.
- **Error interception** - inspect the tool result before it returns to Claude (`generate_tool_call_response()` / `generateToolResponse()`); stop early or handle it yourself.
- **Result modification** - mutate the tool result before it goes back (e.g. add `cache_control` for prompt caching, or transform the output).
- **Per-turn retries / param changes** - e.g. bump `max_tokens` and re-run a truncated turn; bound the whole loop with `max_iterations`.
- **Streaming and automatic compaction** are both supported.

These hooks are SDK helper features, not separate API parameters - for the exact method names and worked examples, WebFetch the per-language SDK repo listed in `shared/live-sources.md` -> *Claude API SDK Repositories* (the tool-runner helpers live in each repo's `tools.md` / `helpers.md`). The bundled `python/claude-api/tool-use.md` and `typescript/claude-api/tool-use.md` show the basic tool-runner setup.

**Don't drop to a manual loop because of these misconceptions:**

- The tool runner does not require Zod/Pydantic - `betaTool()` (TS) and `@beta_tool` (Python) accept raw JSON Schema; other SDKs use plain structs/maps/classes.
- The runner makes detecting the final turn *easier*, not harder - iteration ends when Claude stops calling tools, and the last yielded message is the final response. Most SDKs also offer a one-shot variant (`runner.until_done()` / `runner.runUntilDone()` / `RunToCompletion()`).
- Confirmation/approval gates work with the runner (see Security below).

**Manual Agentic Loop:** Reach for this only when you want to own the *entire* loop - you need control the runner does not expose (e.g., a custom transport, request shapes the SDK cannot build, per-token streaming on SDKs whose runner does not support it), you'd rather not take the beta dependency, or your control flow doesn't fit the runner's per-turn hooks (e.g. interleaving unrelated work mid-loop). Approval gates, logging, interception, result modification, and conditional execution do **not** require it - the tool runner covers those (above). Loop until `stop_reason == "end_turn"`, always append the full `response.content` to preserve tool_use blocks, and ensure each `tool_result` includes the matching `tool_use_id`.

**Stop reasons for server-side tools:** When using server-side tools (code execution, web search, etc.), the API runs a server-side sampling loop. If this loop reaches its default limit of 10 iterations, the response will have `stop_reason: "pause_turn"`. To continue, re-send the user message and assistant response and make another API request - the server will resume where it left off. Do NOT add an extra user message like "Continue." - the API detects the trailing `server_tool_use` block and knows to resume automatically.

```python
# Handle pause_turn in your agentic loop
if response.stop_reason == "pause_turn":
    messages = [
        {"role": "user", "content": user_query},
        {"role": "assistant", "content": response.content},
    ]
    # Make another API request - server resumes automatically
    response = client.messages.create(
        model="claude-opus-5-5", messages=messages, tools=tools
    )
```

**Note:** the SDK tool runners do not auto-resume `pause_turn` (as of `@anthropic-ai/sdk` 0.110.0 / `anthropic` 0.116.0) - a paused turn ends the runner and is returned as the final message, with no error. In TypeScript you can resume inside the iteration body (push the paused assistant turn back onto the runner); in Python the runner cannot be resumed mid-loop - restart a new runner with the paused turn appended, or handle `pause_turn` in a manual loop. See each language's `tool-use.md` for the pattern.

Set a `max_continuations` limit (e.g., 5) to prevent infinite loops. For the full guide, see: `https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons`

> **Security:** The tool runner executes your tool functions automatically whenever Claude requests them. For tools with side effects (sending emails, modifying databases, financial transactions), validate inputs and gate destructive operations behind human approval. **Both** the tool runner and the manual loop support this - with the tool runner, gate inside the tool's run function (prompt the user and return a "user declined" result instead of executing), or inspect the tool call in each yielded message and take over message history with `set_messages_params()` / `setMessagesParams()` to allow or deny *before* the tool runs (it executes your function automatically only if you don't intervene); with the manual loop you gate inline before calling the function.

---

### Handling Tool Results

When Claude uses a tool, the response contains a `tool_use` block. You must:

1. Execute the tool with the provided input
2. Send the result back in a `tool_result` message
3. Continue the conversation

**Error handling in tool results:** When a tool execution fails, set `"is_error": true` and provide an informative error message. Claude will typically acknowledge the error and either try a different approach or ask for clarification.

**Multiple tool calls:** Claude can request multiple tools in a single response. Handle them all before continuing - send all results back in a single `user` message.

---

## Server-Side Tools: Code Execution

The code execution tool lets Claude run code in a secure, sandboxed container. Unlike user-defined tools, server-side tools run on Anthropic's infrastructure - you don't execute anything client-side. Just include the tool definition and Claude handles the rest.

### Key Facts

- Runs in an isolated container (1 CPU, 5 GiB RAM, 5 GiB disk)
- No internet access (fully sandboxed)
- Python 3.11 with data science libraries pre-installed
- Containers persist for 30 days and can be reused across requests
- Free when used with web search/web fetch tools; otherwise $0.05/hour after 1,550 free hours/month per organization

### Tool Definition

The tool requires no schema - just declare it in the `tools` array:

```json
{
  "type": "code_execution_20260120",
  "name": "code_execution"
}
```

Claude automatically gains access to `bash_code_execution` (run shell commands) and `text_editor_code_execution` (create/view/edit files).

### Pre-installed Python Libraries

- **Data science**: pandas, numpy, scipy, scikit-learn, statsmodels
- **Visualization**: matplotlib, seaborn
- **File processing**: openpyxl, xlsxwriter, pillow, pypdf, pdfplumber, python-docx, python-pptx
- **Math**: sympy, mpmath
- **Utilities**: tqdm, python-dateutil, pytz, sqlite3

Additional packages can be installed at runtime via `pip install`.

### Supported File Types for Upload

| Type   | Extensions                         |
| ------ | ---------------------------------- |
| Data   | CSV, Excel (.xlsx/.xls), JSON, XML |
| Images | JPEG, PNG, GIF, WebP               |
| Text   | .txt, .md, .py, .js, etc.          |

### Container Reuse

Reuse containers across requests to maintain state (files, installed packages, variables). Extract the `container_id` from the first response and pass it to subsequent requests.

### Response Structure

The response contains interleaved text and tool result blocks:

- `text` - Claude's explanation
- `server_tool_use` - What Claude is doing
- `bash_code_execution_tool_result` - Code execution output (check `return_code` for success/failure)
- `text_editor_code_execution_tool_result` - File operation results

> **Security:** Always sanitize filenames with `os.path.basename()` / `path.basename()` before writing downloaded files to disk to prevent path traversal attacks. Write files to a dedicated output directory.

---

## Server-Side Tools: Web Search and Web Fetch

Web search and web fetch let Claude search the web and retrieve page content. They run server-side - just include the tool definitions and Claude handles queries, fetching, and result processing automatically.

### Tool Definitions

```json
[
  { "type": "web_search_20260209", "name": "web_search" },
  { "type": "web_fetch_20260209", "name": "web_fetch" }
]
```

### Dynamic Filtering (Claude Opus 5.5 / Claude Opus 5 / Fable 5 / Opus 4.8 / Opus 4.7 / Opus 4.6 / Claude Sonnet 5.5 / Sonnet 5 / Sonnet 4.6)

The `web_search_20260209` and `web_fetch_20260209` versions support **dynamic filtering** - Claude writes and executes code to filter search results before they reach the context window, improving accuracy and token efficiency. Dynamic filtering is built into these tool versions and activates automatically; you do not need to separately declare the `code_execution` tool or pass any beta header.

```json
{
  "tools": [
    { "type": "web_search_20260209", "name": "web_search" },
    { "type": "web_fetch_20260209", "name": "web_fetch" }
  ]
}
```

Without dynamic filtering, the previous `web_search_20250305` version is also available.

> **Note:** Only include the standalone `code_execution` tool when your application needs code execution for its own purposes (data analysis, file processing, visualization) independent of web search. Including it alongside `_20260209` web tools creates a second execution environment that can confuse the model.

---

## Server-Side Tools: Programmatic Tool Calling

With standard tool use, each tool call is a round trip: Claude calls, the result enters Claude's context, Claude reasons, then calls the next tool. Chained calls accumulate latency and tokens - most of that intermediate data is never needed again.

Programmatic tool calling lets Claude compose those calls into a script. The script runs in the code execution container; when it invokes a tool, the container pauses, the call executes, and the result returns to the running code (not to Claude's context). The script processes it with normal control flow. Only the final output returns to Claude. Use it when chaining many tool calls or when intermediate results are large and should be filtered before reaching the context window.

For full documentation, use WebFetch:

- URL: `https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling`

---

## Server-Side Tools: Tool Search

The tool search tool lets Claude dynamically discover tools from large libraries without loading all definitions into the context window. Use it when you have many tools but only a few are relevant to any given request. Discovered tool schemas are appended to the request, not swapped in - this preserves the prompt cache (see `agent-design.md` §Caching for Agents).

For full documentation, use WebFetch:

- URL: `https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool`

---

## Mid-conversation tool changes (Beta)

**Beta header `mid-conversation-tool-changes-2026-07-01`; Claude Opus 5, Claude Opus 5.5, Claude Opus 4.8, Claude Fable 5, Claude Fable 5.1, Claude Mythos 5, Claude Mythos 5.1, and Claude Sonnet 5.5 - not Claude Sonnet 5; not available on Microsoft Foundry (availability: `shared/platform-availability.md`).** Normally `tools` is fixed for a conversation's lifetime - editing it changes the very front of the prompt prefix and invalidates the entire cache (see `prompt-caching.md` § Invalidation hierarchy). This feature lets you add and remove tools between turns while the cached prefix survives.

Both operations are content blocks on a `{"role": "system", ...}` message appended to `messages[]`, and both reference a tool by name via a `tool_reference`:

```python
# Removal - must sit immediately before an assistant message, or last in messages.
{"role": "system", "content": [
    {"type": "tool_removal", "tool": {"type": "tool_reference", "name": "get_weather"}},
]}

# Addition - surfaces a tool declared up front with defer_loading.
{"role": "system", "content": [
    {"type": "tool_addition", "tool": {"type": "tool_reference", "name": "get_forecast"}},
]}
```

**A tool you plan to add must already be declared in `tools[]` with `"defer_loading": True`.** Deferred tools are known to the request but not loaded into the model's context until a `tool_addition` surfaces them:

```python
tools = [
    {"name": "get_weather", "description": "Get weather",
     "input_schema": {"type": "object", "properties": {"city": {"type": "string"}}}},
    {"name": "get_forecast", "description": "Get 5-day forecast",
     "input_schema": {"type": "object", "properties": {"city": {"type": "string"}}},
     "defer_loading": True},
]
```

**To change a tool's definition**, do it across two requests: send a `tool_removal` for the old definition on the first, then carry the conversation forward with the updated entry in `tools[]` on the next.

> Warning: Earlier previews used a different beta header and different block shapes; both are deprecated. Use `mid-conversation-tool-changes-2026-07-01` with `tool_addition` / `tool_removal` / `tool_reference`.

SDK typings lag these blocks - pass them as plain dicts in Python, or add a `@ts-expect-error` in TypeScript.

**Choosing between this and tool search:** tool search is for *discovery* - Claude finds what it needs from a large library on its own. Mid-conversation tool changes are for *control* - your application decides the tool set has changed (a mode switch, a resource that became available, a capability you want to revoke) and says so explicitly.

---

## Agent Skills (Messages API)

Agent Skills package task-specific instructions and files that Claude loads when relevant (e.g., the Anthropic pre-built `pptx`, `xlsx`, `pdf`, `docx` skills). On the **Messages API**, skills are enabled via the `container` parameter alongside the code-execution tool - this is **not** the Managed Agents surface and does **not** use `client.beta.agents` / `sessions` / `environments`. Availability: see `shared/platform-availability.md`.

Required on each request:

1. `client.beta.messages.create(...)` with the `code-execution-2025-08-25` beta flag (Skills is out of beta - no `skills-2025-10-02` header needed).
2. `container={"skills": [{"type": "anthropic", "skill_id": "<id>", "version": "latest"}]}` - the skills list selects which skills are available inside the execution container.
3. `tools=[{"type": "code_execution_20260521", "name": "code_execution"}]` - skills execute via code execution in the container.

```python
response = client.beta.messages.create(
    model="claude-opus-5-5", max_tokens=16000,
    betas=["code-execution-2025-08-25"],
    container={"skills": [{"type": "anthropic", "skill_id": "pptx", "version": "latest"}]},
    tools=[{"type": "code_execution_20260521", "name": "code_execution"}],
    messages=[{"role": "user", "content": "Create a 3-slide presentation on X"}],
)
```

Generated files (`.pptx`, `.xlsx`, ...) are written inside the container; the response carries a file ID for each. Download by passing that ID to the Files API (`client.files.download(file_id)` / `GET /v1/files/{id}/content`).

List available skills via `GET /v1/skills` (no beta header).

---

## MCP Connector (Beta)

The MCP connector lets Claude call tools hosted on a remote MCP server directly from the Messages API - Anthropic makes the MCP connection server-side. Requires beta flag `mcp-client-2025-11-20` on `client.beta.messages.create(...)`. Availability: see `shared/platform-availability.md`.

**Two parameters are required together:**

- `mcp_servers` - array of server connection definitions: `[{"type": "url", "url": "<server URL>", "name": "<server-name>", "authorization_token": "<optional>"}]`
- `tools` - must include an `mcp_toolset` entry that references the server by name: `[{"type": "mcp_toolset", "mcp_server_name": "<server-name>"}]`

The `mcp_server_name` in the toolset must match a `name` in `mcp_servers`. Omitting the `mcp_toolset` entry is rejected as a validation error - every server in `mcp_servers` must be referenced by exactly one toolset.

```python
client.beta.messages.create(
    model="claude-opus-5-5", max_tokens=1024,
    betas=["mcp-client-2025-11-20"],
    mcp_servers=[{"type": "url", "url": "https://example/sse", "name": "example-mcp"}],
    tools=[{"type": "mcp_toolset", "mcp_server_name": "example-mcp"}],
    messages=[...],
)
```

Go uses the typed constant `anthropic.AnthropicBetaMCPClient2025_11_20`; the older `...2025_04_04` constant is deprecated.

Optional toolset fields: `default_config` (defaults for all tools, e.g. `{"enabled": false}` for allowlist mode) and `configs` (per-tool overrides keyed by tool name).

---

## Tool Use Examples

You can provide sample tool calls directly in your tool definitions to demonstrate usage patterns and reduce parameter errors. This helps Claude understand how to correctly format tool inputs, especially for tools with complex schemas.

For full documentation, use WebFetch:

- URL: `https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use`

---

## Client-Side Tools: Computer Use

Computer use lets Claude interact with a desktop environment (screenshots, mouse, keyboard). It is a client-side tool - your application provides the environment and executes the actions Claude requests; Anthropic processes the screenshots and action requests in real time but does not host the environment or retain the data.

**Two request shapes.** The current one is the **computer toolset** - GA on the Claude API and Google Cloud, no beta header: one `tools` entry `{"type": "computer_toolset_20260801"}` with **no `name`** and no display dimensions, plus an optional `configs` map to turn member tools off (`{"zoom": {"enabled": false}}`; all 17 members, `zoom` included, are on by default). Claude's calls are `tool_use` blocks whose `name` is the member (`screenshot`, `left_click`, `type`, `zoom`, ...) carrying `"toolset_name": "computer"`, often several per turn; return one `tool_result` per call in the next `user` message, **each echoing `"toolset_name": "computer"`** (only `screenshot` / `zoom` need an image; `OK` suffices for the rest). Coordinates are in the pixel space of the full screenshots you return, also after a `zoom`, and screenshots must already fit the model's image limits. The earlier `computer_20251124` tool (beta `computer-use-2025-11-24`, a `name: "computer"` entry with `display_width_px` / `display_height_px`, actions in `input.action`) keeps working on the models and platforms that offer it - Bedrock, Claude Platform on AWS, and Foundry offer only the earlier beta versions today - and the two forms can't share a request. **Claude Opus 5.5 accepts only the toolset**: `computer_20251124` returns a 400 there (`shared/model-migration.md` -> Migrating to Claude Opus 5.5 -> Breaking change 4 has the request and agent-loop changes; test them on Claude Opus 5, which accepts both). **Claude Sonnet 5.5 accepts only the toolset on the Claude API and Google Cloud** (`computer_20251124` returns a 400 there; Amazon Bedrock still accepts it, and no platform accepts `computer_20250124`) - see `shared/model-migration.md` -> Migrating to Claude Sonnet 5.5 -> Breaking change 4.

For full documentation (member reference, batch actions, scaling, the `computer_20251124` migration steps), use WebFetch:

- URL: `https://platform.claude.com/docs/en/agents-and-tools/computer-use/overview`

---

## Context Editing

Context editing clears stale tool results and thinking blocks from the transcript as a long-running agent accumulates turns. Unlike compaction (which summarizes), context editing prunes - the cleared content is removed, not replaced. Use it when old tool outputs are no longer relevant and you want to keep the transcript lean without losing the conversation structure.

**Beta.** Use `client.beta.messages.*` with beta `context-management-2025-06-27`. Configure via `context_management.edits` with a strategy type of `clear_tool_uses_20250919` (clear old tool results; optional `clear_tool_inputs: true` also clears the tool_use params) or `clear_thinking_20251015` (clear thinking blocks). These are **not** the compaction types - `compact_20260112` with beta `compact-2026-01-12` is the separate compaction feature.

For full documentation, use WebFetch:

- URL: `https://platform.claude.com/docs/en/build-with-claude/context-editing`

---

## Server-Side Tools: Advisor (Beta)

The advisor tool pairs a faster, lower-cost **executor** model (the top-level `model` on the request) with a higher-intelligence **advisor** model (the `model` field inside the tool definition) that provides strategic guidance mid-generation. The executor does most of the token generation; the advisor is consulted for planning. Availability: see `shared/platform-availability.md`.

### Tool Definition

```json
{
  "type": "advisor_20260301",
  "name": "advisor",
  "model": "claude-opus-4-8"
}
```

Optional fields on the tool definition:

- `max_uses` - cap on advisor consultations per request. Exceeding it makes the `advisor_tool_result` block's `content` the error object `{"type": "advisor_tool_result_error", "error_code": "max_uses_exceeded"}` - the third member of the content union in the payload-shape table below.
- `max_tokens` - bounds the advisor's total output (thinking + text) per call. At the cap the result block carries `stop_reason: "max_tokens"` and a truncation note is appended to the advice the executor sees; the server also emits a remaining-tokens budget block in the advisor's prompt so it self-shapes toward the cap.
- `caching` - cache-control for the advisor's own prompt, same shape as a cache breakpoint: `"caching": {"type": "ephemeral", "ttl": "5m"}` (`ttl` is `"5m"` or `"1h"`, default `"5m"`). Each call writes a cache entry at that TTL so later calls in the conversation read the stable prefix. Omitted = advisor prompt not cached.

**The advisor model must be at least as capable as the executor.** An invalid pairing returns `400 invalid_request_error`. Valid pairs:

| Executor (request `model`) | Valid advisor (tool `model`) |
|---|---|
| `claude-haiku-4-5` / `claude-sonnet-4-6` | `claude-mythos-5-1`, `claude-fable-5-1`, `claude-mythos-5`, `claude-fable-5`, `claude-opus-5-5`, `claude-opus-5`, `claude-opus-4-8`, `claude-opus-4-7`, `claude-opus-4-6`, `claude-sonnet-5-5`, `claude-sonnet-5`, `claude-haiku-5-5`, or `claude-sonnet-4-6` |
| `claude-sonnet-5` / `claude-haiku-5-5` | `claude-mythos-5-1`, `claude-fable-5-1`, `claude-mythos-5`, `claude-fable-5`, `claude-opus-5-5`, `claude-opus-5`, `claude-opus-4-8`, `claude-opus-4-7`, `claude-sonnet-5-5`, `claude-sonnet-5`, or `claude-haiku-5-5` |
| `claude-opus-4-6` | `claude-mythos-5-1`, `claude-fable-5-1`, `claude-mythos-5`, `claude-fable-5`, `claude-opus-5-5`, `claude-opus-5`, `claude-opus-4-8`, `claude-opus-4-7`, `claude-opus-4-6`, `claude-sonnet-5-5`, `claude-sonnet-5`, or `claude-haiku-5-5` |
| `claude-opus-4-7` / `claude-opus-4-8` | `claude-mythos-5-1`, `claude-fable-5-1`, `claude-mythos-5`, `claude-fable-5`, `claude-opus-5-5`, `claude-opus-5`, `claude-opus-4-8`, `claude-opus-4-7`, or `claude-sonnet-5-5` |
| `claude-opus-5-5` / `claude-opus-5` / `claude-fable-5` / `claude-mythos-5` | `claude-mythos-5-1`, `claude-fable-5-1`, `claude-mythos-5`, `claude-fable-5`, `claude-opus-5-5`, or `claude-opus-5` |
| `claude-fable-5-1` / `claude-mythos-5-1` | `claude-mythos-5-1` or `claude-fable-5-1` - and these executors (like `claude-opus-5-5`) reject forced `tool_choice`, so nudge the advisor call from the prompt |
| `claude-sonnet-5-5` | `claude-mythos-5-1`, `claude-fable-5-1`, `claude-mythos-5`, `claude-fable-5`, `claude-opus-5-5`, `claude-opus-5`, or `claude-sonnet-5-5` - Claude Opus 4.8 / 4.7 / 4.6, Claude Sonnet 5, and Sonnet 4.6 advisors return a 400; every accepted advisor returns the encrypted `advisor_redacted_result`, and this executor rejects forced `tool_choice`, so nudge the advisor call from the prompt |

> Warning: **The advisor's payload shape differs by advisor model.** The response block is always `advisor_tool_result`; what varies is its **`content`**, a discriminated union:
>
> | `content` type | Fields | When |
> |---|---|---|
> | `advisor_result` | `text`, `stop_reason` | Advisor returns plaintext (e.g. Opus 4.8) |
> | `advisor_redacted_result` | `encrypted_content`, `stop_reason` | Advisor returns encrypted output - Claude Opus 5.5, Claude Opus 5, Claude Fable 5.1, Claude Mythos 5.1, Claude Fable 5, Claude Mythos 5, Claude Sonnet 5.5, Claude Haiku 5.5 |
> | `advisor_tool_result_error` | `error_code` | Consultation failed - `max_uses_exceeded`, `prompt_too_long`, `too_many_requests`, `overloaded`, `unavailable`, `execution_time_exceeded`, or `model_not_found` |
>
> So switch on `advisor_tool_result.content` type, not on the block type. Code that reads `.text` unconditionally gets nothing back from an Claude Opus 5.5 or Claude Opus 5 advisor, because the payload is under `encrypted_content` instead - and you cannot read it, only replay it.

Call via `client.beta.messages.create(...)` with `betas=["advisor-tool-2026-03-01"]` (or the `anthropic-beta: advisor-tool-2026-03-01` header). In multi-turn conversations, append the full `response.content` - including any `advisor_tool_result` blocks - back to `messages` on the next turn. If you remove the advisor tool from `tools` on a later turn while the history still contains `advisor_tool_result` blocks, the API returns a 400.

> **Advisor on Managed Agents:** CMA sessions support an advisor too, configured as a `{"type": "advisor", "model"}` entry in the agent's multiagent roster rather than as a tool definition - no `max_uses`/`max_tokens`/`caching` options, and advice is delivered as thread events on the session's event stream rather than `advisor_tool_result` blocks. See `shared/managed-agents-multiagent.md` -> Advisor.

---

## Client-Side Tools: Memory

The memory tool enables Claude to store and retrieve information across conversations through a memory file directory. Claude can create, read, update, and delete files that persist between sessions.

### Key Facts

- Client-side tool - you control storage via your implementation
- Supports commands: `view`, `create`, `str_replace`, `insert`, `delete`, `rename`
- Operates on files in a `/memories` directory
- The Python, TypeScript, and Java SDKs provide helper classes/functions for implementing the memory backend

> **Security:** Never store API keys, passwords, tokens, or other secrets in memory files. Be cautious with personally identifiable information (PII) - check data privacy regulations (GDPR, CCPA) before persisting user data. The reference implementations have no built-in access control; in multi-user systems, implement per-user memory directories and authentication in your tool handlers.

For full implementation examples, use WebFetch:

- Docs: `https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool.md`

---

## Client-Side Tools: Bash and Text Editor

The bash and text editor tools are **Anthropic-defined, schema-less** tools. Declare them by `type` and `name` only - the input schema is built into the model and cannot be modified. **Do not pass an `input_schema`**, and do not define a custom tool that happens to be named `"bash"` - that creates a user-defined tool without the built-in behavior.

Both are **client-executed**: Claude returns a `tool_use` block, your code performs the action locally, and you send back a `tool_result`. The API is stateless; your application maintains the shell session or filesystem between turns.

### Bash tool declaration

```json
{"type": "bash_20250124", "name": "bash"}
```

| Language | Declaration |
|---|---|
| Python / TypeScript / Ruby / cURL | plain object `{"type": "bash_20250124", "name": "bash"}` |
| Go | `anthropic.ToolUnionParam{OfBashTool20250124: &anthropic.ToolBash20250124Param{}}` |
| Java | `.addTool(ToolBash20250124.builder().build())` from `com.anthropic.models.messages` |
| C# | `Tools = [new ToolBash20250124()]` from `Anthropic.Models.Messages` |
| PHP | `tools: [new \Anthropic\Messages\ToolBash20250124()]` |

Claude's `tool_use.input` contains either `{"command": "<string>"}` or `{"restart": true}`. Check for `restart` first (reset the session, return a confirmation string); otherwise run `command` and return combined stdout + stderr.

> **Security - commands are untrusted model output.** Run in an isolated environment (container, VM, or restricted user); apply an **allowlist** of permitted executables and reject shell operators (`&&`, `|`, `;`, `` ` ``, `$()`); set timeouts and resource limits; log every command. A blocklist is not sufficient.

### Text editor tool declaration

```json
{"type": "text_editor_20250728", "name": "str_replace_based_edit_tool"}
```

Optional field: `max_characters` to cap `view` output. Java exposes a typed `ToolTextEditor20250728` builder (`com.anthropic.models.messages`); other statically-typed SDKs follow the same naming pattern - see the Anthropic-Defined Tools section in `{lang}/claude-api/tool-use.md` for the exact class.

> **Security - `path` is untrusted model output. Confine every file operation to a fixed project root.** Before executing any command, resolve the model-supplied `path` to its canonical form and verify it remains within your project root; reject the request if it escapes (`..`, symlinks, absolute paths outside the root, URL-encoded traversal like `%2e%2e%2f`). Use your language's built-in path utilities (e.g., Python `pathlib.Path.resolve()` then check `.is_relative_to(root)`). Never call `open()` / `writeFile` / `unlink` directly on the raw `path` value.

`tool_use.input.command` is one of:

| `command` | Other inputs | Action |
|---|---|---|
| `view` | `path`, optional `view_range` | Return file contents or directory listing |
| `create` | `path`, `file_text` | Create/overwrite file with `file_text`. Create a backup if the file already exists. |
| `str_replace` | `path`, `old_str`, `new_str` | Replace exactly one occurrence; error if 0 or >1 matches |
| `insert` | `path`, `insert_line`, `insert_text` | Insert `insert_text` after line `insert_line` (0 = beginning of file) |

For both tools, on error return `{"type": "tool_result", "tool_use_id": "...", "content": "<error text>", "is_error": true}` so Claude can recover.

---

## Structured Outputs

Structured outputs constrain Claude's responses to follow a specific JSON schema, guaranteeing valid, parseable output. This is not a separate tool - it enhances the Messages API response format and/or tool parameter validation.

Two features are available:

- **JSON outputs** (`output_config.format`): Control Claude's response format
- **Strict tool use** (`strict: true`): Guarantee valid tool parameter schemas

**Supported models:** Claude Fable 5, Claude Mythos 5, Claude Fable 5.1, Claude Mythos 5.1, Claude Opus 5.5, Claude Opus 5, Claude Opus 4.8, Claude Sonnet 5.5, Claude Sonnet 5, Claude Haiku 5.5, and Claude Haiku 4.5. Legacy models (Claude Opus 4.5, Claude Opus 4.1) also support structured outputs.

> **Recommended:** Use `client.messages.parse()` which automatically validates responses against your schema. When using `messages.create()` directly, use `output_config: {format: {...}}`. The `output_format` convenience parameter is also accepted by some SDK methods (e.g., `.parse()`), but `output_config.format` is the canonical API-level parameter.

### JSON Schema Limitations

**Supported:**

- Basic types: object, array, string, integer, number, boolean, null
- `enum`, `const`, `anyOf`, `allOf`, `$ref`/`$def`
- String formats: `date-time`, `time`, `date`, `duration`, `email`, `hostname`, `uri`, `ipv4`, `ipv6`, `uuid`
- `additionalProperties: false` (required for all objects)

**Not supported:**

- Recursive schemas
- Numerical constraints (`minimum`, `maximum`, `multipleOf`)
- String constraints (`minLength`, `maxLength`)
- Complex array constraints
- `additionalProperties` set to anything other than `false`

The Python and TypeScript SDKs automatically handle unsupported constraints by removing them from the schema sent to the API and validating them client-side.

### Important Notes

- **First request latency**: New schemas incur a one-time compilation cost. Subsequent requests with the same schema use a 24-hour cache.
- **Refusals**: If Claude refuses for safety reasons (`stop_reason: "refusal"`), the output may not match your schema.
- **Token limits**: If `stop_reason: "max_tokens"`, output may be incomplete. Increase `max_tokens`.
- **Incompatible with**: Citations (returns 400 error), message prefilling.
- **Works with**: Batches API, streaming, token counting, extended thinking.

---

## Tips for Effective Tool Use

1. **Provide detailed descriptions**: Claude relies heavily on descriptions to understand when and how to use tools
2. **Use specific tool names**: `get_current_weather` is better than `weather`
3. **Validate inputs**: Always validate tool inputs before execution
4. **Handle errors gracefully**: Return informative error messages so Claude can adapt
5. **Limit tool count**: Too many tools can confuse the model - keep the set focused
6. **Test tool interactions**: Verify Claude uses tools correctly in various scenarios

For detailed tool use documentation, use WebFetch:

- URL: `https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview`
