# AGENTS.md

Guidance for the agents module (`packages/cli/src/modules/agents`). See the [cli package AGENTS.md](../../../AGENTS.md) and the [root AGENTS.md](../../../../../AGENTS.md) for repo-wide conventions.

## Documentation

- [BUILT_IN_TOOLS.md](./BUILT_IN_TOOLS.md) — the built-in tools that the runtime attaches to an agent, with the attach condition for each. Read it before you add a built-in tool. Update it when you add, remove, or change a built-in tool.
- [TEST_CHAT_RECOVERY.md](./TEST_CHAT_RECOVERY.md) — the preview chat recovery contract.

## Backend boundary

- Instance AI calls `AgentsBuilderService`, `AgentContextService`, `AgentDraftService`, and `AgentEvaluationService` directly. Skills are not part of this module: Instance AI calls `SkillService`, `SkillRuntimeService` and `AssistantSkillsFlagGate` in the [skills module](../skills/AGENTS.md). These services own their operations and access checks. Keep repositories, entities, and runtime reconstruction services private.
- Keep contracts beside their owner: `agent-context.contracts.ts`, `agent-draft.contracts.ts`, `agent-credential-provider.contracts.ts`, `builder/builder-session.ts`, and `evaluation/agent-evaluation.contracts.ts`. Evaluation callers can also use `pruneConfigForEval` from `evaluation/evaluation-config.ts`.
- The `agents-instance-ai-boundary` Code Health rule lists the supported import paths. Do not add an umbrella facade or a barrel of internals.
- Do not import the Instance AI backend or `@n8n/instance-ai` here. This includes types and tests.
- Keep Agent data access, availability checks, and project authorization in Agents. Keep Assistant tools, presentation, model policy, and billing in Instance AI.
- Builder operations expose direct tools and runtime skills. The host owns model policy, billing, and run telemetry context.
- Builder operations own credential-provider construction and legacy session cleanup. Authorized draft deletion and session cleanup remain available when Agents are disabled.
- Evaluation preparation keeps a detached Agent snapshot private. Build evaluation runtimes without the production cache. Never save the pruned configuration.

## Skill refs

- Skills live in the `skill`, `skill_version` and `skill_file` tables, which the [skills module](../skills/AGENTS.md) owns. The skills module cannot be disabled while this module is on: `ModuleRegistry.eligibleModules` keeps `skills` eligible and logs a warning. The skills module starts first, and this module registers `AgentSkillUsage` on `SkillUsageProxy` on init (see below).
- A draft keeps its skill refs in `agent_skill_dependency`, in attach order (`createdAt`). A saved version keeps its pins in `agent_version_skill_dependency`, in the same order. These two tables belong to this module: query them through `AgentSkillRepository`.
- Do not read or write `agents.skills` or `agent_history.skills`. Only the migration `MigrateAgentSkillsToHub` reads them, and a later release drops them.
- The skills module does not import this module. On init, this module registers `AgentSkillUsage` on `SkillUsageProxy`. `AgentSkillUsage` implements the `SkillUsage` contract of the skills module: agent names and projects, the agents that use a skill, and the save side effects. Import the skills module from `@/modules/skills`, or its test fixtures from `@/modules/skills/testing`. Read skills only through its services. Integration tests that do not start the modules call `registerSkillUsage()`.
- A skill that an agent page creates is available to the project or to the instance (`availableTo` on the create request, default `project`). A duplicate of an agent in the same project refers to the same stored skills. A ref that carries only a skill body becomes a new project skill (see `createDraftRefs`).
- Read and write the skill refs, and read the skill bodies, only through `AgentSkillRefsService`. A draft runs the latest saved version of each skill, or its pin (`versionId`). A saved version runs its pins.
- Compose the JSON document (`AgentJsonConfig`) with `toAgentDocument` or `composeJsonConfig` only where code needs the document: REST, MCP, the agent builder tools, publish, runtime reconstruction, sub-agent resolution, telemetry, config hashes and create with a config. Compute `configHash` on the composed document. Split an inbound document with `fromAgentDocument`.
- A write that changes the skill refs of an existing draft calls `saveAgentDraftFenced` and then `replaceDraftRefs` with the same `ctx`, in one `TransactionRunner.run`. Agent creation calls `insertNew` in the same transaction as its skill references. An initial `config` uses `replaceDraftRefs`, as an update does. Duplication and evaluation seeds use `createDraftRefs`: a ref with only a body becomes a new project skill. Revert calls `restoreDraftRefs`. Each draft mutation calls `AgentDefinitionService.captureVersion` after all writes in the same transaction. Restore creates a new draft version. Publication selects a saved version and preserves the draft.
- The migration `MigrateAgentSkillsToHub` copies inline skills into the skill tables. Each inline skill became an agent skill. A later migration moved each agent skill to the project of its agent, or to the instance when the agent has no project. Each published version pins the versions that hold its bodies, and the draft refs become dependency rows. On an instance where the earlier startup copy ran (the `agents.skillsHubCopy` settings row exists), it copies nothing. It does not change `agents.skills` or `agent_history.skills`.
- Inline agents (`InlineAgentPayload`) embed their skills and never call the skill service.
