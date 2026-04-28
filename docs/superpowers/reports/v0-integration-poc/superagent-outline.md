# Wiring the frontend builder into Instance AI ("superagent")

## Summary

The PoC ships a workflow-scoped drawer plus REST endpoints under
`POST/GET/DELETE /rest/workflows/:id/frontend[...]`, served by
`packages/cli/src/modules/frontend-builder/frontend-builder.controller.ts`.
The original spec (`docs/superpowers/specs/2026-04-22-v0-integration-poc-design.md`,
§2) describes a different north-star UX: the user chats with the n8n
in-app AI assistant ("Instance AI" in code,
`packages/cli/src/modules/instance-ai/`, "superagent" in spec docs)
and says *"build me a dashboard for my Orders workflow"*. The agent
calls v0 on the user's behalf and returns an inline preview. The same
backend module can power both surfaces — what's needed is a thin tool
adapter the Instance AI agent registry can invoke.

## Tool surface

Expose one tool, `generate_frontend`, that wraps
`FrontendBuilderService` (already DI-registered in
`packages/cli/src/modules/frontend-builder/frontend-builder.module.ts`).
Arguments:

- `workflowId: string` — which workflow the frontend talks to
- `prompt: string` — passed verbatim into v0
- `forceNew?: boolean` — if true, delete any existing chat for the
  workflow before generating (mirrors the drawer's reset action)

Return shape: `{ chatId, demoUrl, assistantMessage }` — the same fields
the REST controller already returns, so no new DTOs are needed beyond
re-exporting from `packages/@n8n/api-types/src/dto/frontend-builder/`.

Registration follows the pattern in
`packages/@n8n/ai-workflow-builder.ee/src/tools/` (e.g.
`add-node.tool.ts`, `node-search.tool.ts`): a single file declaring
the LangChain tool schema, calling into the injected service.

## Resolution flow

1. User: *"build me a dashboard for my Orders workflow"*
2. Agent uses existing workflow-search tooling (analogous to
   `node-search.tool.ts`) to resolve "Orders workflow" → `workflowId`.
   If ambiguous, it asks the user to disambiguate before spending v0
   credits.
3. Agent checks the workflow is published (precondition enforced by
   `FrontendBuilderService`); if not, it surfaces a "publish first"
   prompt instead of calling the tool.
4. Agent calls `generate_frontend({ workflowId, prompt })`.
5. Tool returns `{ chatId, demoUrl, assistantMessage }`; agent
   composes a reply.

## In-chat rendering

Two complementary affordances, both decisions owned by the Instance AI
team:

- An inline iframe of `demoUrl`, small and expandable — good for
  immediate feedback.
- A clickable link "Open generated frontend" that deep-links into the
  workflow's drawer (route already exists via `NodeView.vue`) — good
  for iteration in the richer drawer UI.
- Plus the assistant's textual summary derived from `assistantMessage`.

## Risks and open questions

- **Latency.** v0 generations take 10–30s. Chat needs an "I'm working
  on it" affordance — likely a streamed status message, not a spinner
  on a blocking call.
- **Cost.** Every successful tool call burns v0 credits. The agent
  must not auto-retry on transient failures, and should confirm before
  regenerating from scratch.
- **Error surfacing.** The REST layer maps v0 errors to 502
  (see `frontend-builder.errors.ts`). The agent must translate those
  into prose, not leak raw JSON into chat.
- **Multi-turn iteration.** v0 chats already support follow-ups.
  Whether one Instance AI conversation maps 1:1 to one v0 `chatId`,
  or whether each prompt forks a new chat, is a design decision for
  the Instance AI team. 1:1 is the obvious default.
- **Activation precondition.** The publish check belongs in the tool
  adapter so it short-circuits before any v0 call.

## Effort

Small once both modules exist: roughly 2–3 days for the frontend
builder team to write the adapter, register the tool, and add unit
tests. The in-chat rendering (iframe component, streamed status,
error formatting) is Instance AI team scope and is the bigger piece
of work.
