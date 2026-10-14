# AGENTS.md

Guidance for the agents module (`packages/cli/src/modules/agents`). See the [cli package AGENTS.md](../../../AGENTS.md) and the [root AGENTS.md](../../../../../AGENTS.md) for repo-wide conventions.

## Documentation

- [BUILT_IN_TOOLS.md](./BUILT_IN_TOOLS.md) — the built-in tools that the runtime attaches to an agent, with the attach condition for each. Read it before you add a built-in tool. Update it when you add, remove, or change a built-in tool.
- [PREVIEW_CHAT_RECOVERY.md](./PREVIEW_CHAT_RECOVERY.md) — the preview chat recovery contract.

## Skill refs

- The PostHog flag `125_context_skills` (`SKILLS_FLAG`) selects where skills live. `SkillsHubRollout` reads it for the instance once, when the agents module starts, and keeps the value for the life of the process; a change needs a restart. `AgentSkillRefsService.usesSkillsHub` and the `/skills` routes read `SkillsHubRollout`. Turn it on locally with `N8N_FEATURE_FLAG_OVERRIDES`. There are no double writes: data written with one setting is not visible with the other.
- Hub on: skills live in the skills hub (`skill`, `skill_version`, `skill_file`). A draft keeps its skill refs in `agent_skill_dependency`, in attach order (`createdAt`). A published version keeps its pins in `agent_version_skill_dependency`, in the same order.
- Hub on: a skill that an agent page creates is available to the project, to that agent only (`skill.agentId`), or to the instance (`availableTo` on the create request, default `project`). A duplicate of an agent gets its own copy of each agent-only skill.
- Hub off: the refs are the `skills` key of `agents.schema` and `agent_history.schema`, and the bodies are the `agents.skills` and `agent_history.skills` columns, as before the skills hub. A ref with `enabled: false` is hidden, and its body stays in the column.
- Only `AgentSkillRefsService` reads the `skills` key of a `StoredAgentConfig`.
- Read and write the skill refs, and read the skill bodies, only through `AgentSkillRefsService`. A draft runs the latest saved version of each skill, or its pin (`versionId`). A published version runs its pins.
- Compose the JSON document (`AgentJsonConfig`) with `toAgentDocument` or `composeJsonConfig` only where code needs the document: REST, MCP, the agent builder tools, publish, runtime reconstruction, sub-agent resolution, telemetry, config hashes and create with a config. Compute `configHash` on the composed document. Split an inbound document with `fromAgentDocument`.
- A write that changes the skill refs of an existing draft calls `saveAgentDraftFenced` and then `replaceDraftRefs` with the same `ctx`, in one `TransactionRunner.run`. Agent creation calls `insertNew` and then `createDraftRefs` in one transaction. Revert calls `restoreDraftRefs`. Publish calls `versionSnapshot` before it writes the `agent_history` row and `pinVersion` after.
- Publish writes the legacy columns in full with either setting: the refs in `agent_history.schema.skills` and the bodies in `agent_history.skills`. With the hub on, the bodies are the versions the draft runs, so a published agent keeps running after the flag is turned off.
- Inline agents (`InlineAgentPayload`) embed their skills and never call the skill service.
