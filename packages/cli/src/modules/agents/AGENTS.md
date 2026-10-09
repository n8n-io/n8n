# AGENTS.md

Guidance for the agents module (`packages/cli/src/modules/agents`). See the [cli package AGENTS.md](../../../AGENTS.md) and the [root AGENTS.md](../../../../../AGENTS.md) for repo-wide conventions.

## Documentation

- [BUILT_IN_TOOLS.md](./BUILT_IN_TOOLS.md) — the built-in tools that the runtime attaches to an agent, with the attach condition for each. Read it before you add a built-in tool. Update it when you add, remove, or change a built-in tool.
- [PREVIEW_CHAT_RECOVERY.md](./PREVIEW_CHAT_RECOVERY.md) — the preview chat recovery contract.

## Skill refs

- `agents.schema` and `agent_history.schema` hold a `StoredAgentConfig`. It has no readable `skills` key.
- Read and write the skill refs of a draft or a published version only through `AgentSkillRefsService`.
- Compose the JSON document (`AgentJsonConfig`) with `toAgentDocument` or `composeJsonConfig` only at the edges: REST, MCP, the agent builder tools and create with a config. Split an inbound document with `fromAgentDocument`.
- A write that changes skill refs calls `saveAgentDraftFenced` and then `replaceDraftRefs` with the same `ctx`, in one `TransactionRunner.run`.
