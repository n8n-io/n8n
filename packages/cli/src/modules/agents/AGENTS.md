# AGENTS.md

Guidance for the agents module (`packages/cli/src/modules/agents`). See the [cli package AGENTS.md](../../../AGENTS.md) and the [root AGENTS.md](../../../../../AGENTS.md) for repo-wide conventions.

## Documentation

- [BUILT_IN_TOOLS.md](./BUILT_IN_TOOLS.md) — the built-in tools that the runtime attaches to an agent, with the attach condition for each. Read it before you add a built-in tool. Update it when you add, remove, or change a built-in tool.
- [PREVIEW_CHAT_RECOVERY.md](./PREVIEW_CHAT_RECOVERY.md) — the preview chat recovery contract.

## Skill refs

- Skills live in the skills hub (`skill`, `skill_version`, `skill_file`). A draft keeps its skill refs in `agent_skill_dependency`, in attach order (`createdAt`). A published version keeps its pins in `agent_history_skill`, in the same order.
- `agents.schema` and `agent_history.schema` hold a `StoredAgentConfig`. It has no readable `skills` key. Nothing reads or writes the `agents.skills` and `agent_history.skills` columns.
- Read and write the skill refs, and read the skill bodies, only through `AgentSkillRefsService`. A draft runs the latest saved version of each skill, or its pin (`versionId`). A published version runs its pins.
- Compose the JSON document (`AgentJsonConfig`) with `toAgentDocument` or `composeJsonConfig` only where code needs the document: REST, MCP, the agent builder tools, publish, runtime reconstruction, sub-agent resolution, telemetry, config hashes and create with a config. Compute `configHash` on the composed document. Split an inbound document with `fromAgentDocument`.
- A write that changes the skill refs of an existing draft calls `saveAgentDraftFenced` and then `replaceDraftRefs` with the same `ctx`, in one `TransactionRunner.run`. Agent creation calls `insertNew` and then `createDraftRefs` in one transaction. Revert calls `restoreDraftRefs`, and publish calls `pinDraftForPublish` after the `agent_history` row exists.
- Inline agents (`InlineAgentPayload`) embed their skills and never call the skill service.
