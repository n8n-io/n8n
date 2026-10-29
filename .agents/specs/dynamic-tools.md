# Dynamic tools for any model (AGENT-1405, AGENT-1406)

## Goal

Give every agent tool discovery and deferred tool loading on any model the user
configures. Do not depend on provider features (Anthropic or OpenAI tool search).

## Design summary

- The model always gets the same tool array: a small core set plus
  `get_tools` and `call_tool`. The array never changes during a run, so the
  prompt cache stays valid on every provider.
- All other tools are in namespaces in a registry. The cached prompt contains
  a catalog of namespaces, tool names and one-line descriptions.
- The model calls `get_tools` to get schemas. It calls `call_tool` to run a
  tool. `call_tool` sends the call through the existing `ToolCallRunner`, so
  validation, approval, suspend/resume, telemetry and output guards still apply.
- Permissions are allow / ask / deny for each tool or namespace. Denied tools
  are left out of the catalog and are also blocked at dispatch.

Reference: Cursor uses the same model (`GetDynamicTools` / `CallDynamicTool`,
catalog in the first user message, no schemas in the prompt).

## Components

| Component | Status | Responsibility |
|---|---|---|
| Tool registry | new | Namespaces with name, short description, schema, wrapped `BuiltTool`, status (`ready`, `needsAuth`, `loading`) |
| Permission policy | new | Applies allow / ask / deny rules. Wraps `ask` tools with `wrapToolForApproval` (`sdk/tool.ts`) |
| Catalog builder | new | Renders the catalog text within a token budget |
| `get_tools` / `call_tool` | new | Schema lookup and search. Dispatch to the real tool through `ToolCallRunner` |
| `RuntimeContextBuilder` | change | Puts the catalog in the cached prefix. Sends the fixed tool array |
| `ToolCallRunner` | change | Supports a dispatched inner tool and resume to that inner tool |
| Native deferral, `DeferredToolManager` attach | remove | Replaced by the above |

## Contracts

```ts
get_tools({ namespace: string; tools?: string[]; query?: string })
// → { tools: { name; description; inputSchema }[] } or { error; status }

call_tool({ namespace: string; tool: string; arguments: unknown; summary?: string })
// → the real tool's output, or a validation error with the schema
```

- `call_tool` resolves the tool only from the allowed set for the run. It
  never trusts the model's names.
- Invalid arguments return the error and the real schema, so the model can retry.
- `summary` is model-written text for the approval card. Show it next to the
  real arguments. Never use it for a decision.
- A suspended `call_tool` step stores `{ namespace, tool, arguments }`. Resume
  goes to the inner tool. Session grants use the real tool name.
- Telemetry, eval traces, approvals and the UI show the real tool name.

## Decisions

| Question | Decision |
|---|---|
| Move first-party extras (skills, sub-agents, workflow tools) behind the wrapper? | Yes, except the core set. Add use-when hints in the namespace instructions so the model uses them |
| Description token budget | Start at 8k tokens. Above the budget, show names only. Tune with evals |
| Native attach for weak models | Do not build now. Add it only if evals show a gap that schema-on-error retries do not fix |
| Integration operations | Split `*_context` / `*_action` operations into separate tools. Context defaults to allow, action defaults to ask |

All decisions are open to change after phase 4 evals.

## Implementation TODO

### Phase 1 — Registry and catalog
- [x] Define the registry types and namespace model in `@n8n/agents`
- [ ] Register MCP servers, integrations, node tools, workflow tools and sub-agents as namespaces
- [ ] Split integration operations into separate tools
- [x] Build the catalog builder with a token budget and names-only fallback
- [x] Unit tests for the registry and the catalog output

### Phase 2 — Dispatch
- [x] Add `get_tools` (namespace lookup and keyword search)
- [x] Add `call_tool` and send dispatched calls through `ToolCallRunner`
- [x] Return schema-on-error for invalid arguments
- [x] Put the catalog in the cached prefix. Keep the tool array fixed
- [ ] Show real tool names in telemetry, traces and stream events
- [ ] Put this behind an opt-in flag for the Agents module

### Phase 3 — Permissions
- [ ] Add permission rules to the agent config (tool and namespace scope)
- [ ] Map MCP `requireApproval` to the rules
- [x] Filter the catalog and block denied calls at dispatch
- [ ] Persist the inner tool on suspend. Resume to it
- [ ] Session grants keyed by the real tool name. Check how Instance AI stores `approvalContext`
- [ ] Approval card shows real name, arguments and summary
- [ ] Sub-agents inherit the same or stricter rules
- [ ] Tests: deny, ask, session grant, resume after restart

### Phase 4 — Evals and rollout
- [ ] Eval suite across capable, small and local models
- [ ] Measure call success rate, argument retries, round trips, cache hit rate and total tokens
- [ ] Compare with the current native deferral on Anthropic and OpenAI
- [ ] Remove native deferral and `DeferredToolManager` attach after the evals pass
- [ ] Move Instance AI to the same mechanism (separate ticket)

## Risks

- Weak models can fail the two-step call. Evals in phase 4 decide whether native attach is needed.
- Resume through the wrapper touches crash-resume. Test it with `crash-resume.test.ts`.
- A large catalog costs tokens on every turn, but it is cached.
