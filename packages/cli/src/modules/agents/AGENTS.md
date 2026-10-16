# AGENTS.md

Guidance for the agents module (`packages/cli/src/modules/agents`). See the [cli package AGENTS.md](../../../AGENTS.md) and the [root AGENTS.md](../../../../../AGENTS.md) for repo-wide conventions.

## Documentation

- [BUILT_IN_TOOLS.md](./BUILT_IN_TOOLS.md) — the built-in tools that the runtime attaches to an agent, with the attach condition for each. Read it before you add a built-in tool. Update it when you add, remove, or change a built-in tool.
- [PREVIEW_CHAT_RECOVERY.md](./PREVIEW_CHAT_RECOVERY.md) — the preview chat recovery contract.

## Skill refs

- Skills live in the skills hub (`skill`, `skill_version`, `skill_file`). A draft keeps its skill refs in `agent_skill_dependency`, in attach order (`createdAt`). A published version keeps its pins in `agent_version_skill_dependency`, in the same order.
- A skill that an agent page creates is available to the project, to that agent only (`skill.agentId`), or to the instance (`availableTo` on the create request, default `project`). A duplicate of an agent gets its own copy of each agent-only skill.
- Legacy columns: before the skills hub, the refs were the `skills` key of `agents.schema` and `agent_history.schema`, and the bodies were the `agents.skills` and `agent_history.skills` columns. Nothing reads them at runtime. A later migration drops them.
- Only `AgentSkillRefsService` reads the `skills` key of a `StoredAgentConfig`.
- Read and write the skill refs, and read the skill bodies, only through `AgentSkillRefsService`. A draft runs the latest saved version of each skill, or its pin (`versionId`). A published version runs its pins.
- Compose the JSON document (`AgentJsonConfig`) with `toAgentDocument` or `composeJsonConfig` only where code needs the document: REST, MCP, the agent builder tools, publish, runtime reconstruction, sub-agent resolution, telemetry, config hashes and create with a config. Compute `configHash` on the composed document. Split an inbound document with `fromAgentDocument`.
- A write that changes the skill refs of an existing draft calls `saveAgentDraftFenced` and then `replaceDraftRefs` with the same `ctx`, in one `TransactionRunner.run`. Agent creation calls `insertNew` and then `createDraftRefs` in one transaction. Revert calls `restoreDraftRefs`. Publish calls `versionSnapshot` before it writes the `agent_history` row and `pinVersion` after.
- The migration `MigrateAgentSkillsToHub` copies the legacy inline skills into the hub once. `SkillsHubStartupCopy` applies the same rules on every main at startup, to catch what an older main writes inline during a rolling upgrade; each agent's copy holds its row, so mains do not copy twice. Each inline skill becomes an agent skill. A published version is copied while it pins nothing; a draft is copied while the agent has no hub rows. Both reuse content by hash and never write the legacy columns, so they can run again safely. Keep the two in sync.
- Publish still writes the legacy columns in full: the refs in `agent_history.schema.skills` and, in `agent_history.skills`, the bodies of the versions the draft runs. A downgrade to a release that reads those columns keeps running published agents.
- Inline agents (`InlineAgentPayload`) embed their skills and never call the skill service.
