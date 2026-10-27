# AGENTS.md

Guidance for the skills module (`packages/cli/src/modules/skills`). See the [cli package AGENTS.md](../../../AGENTS.md) and the [root AGENTS.md](../../../../../AGENTS.md) for repo-wide conventions.

## What the module owns

- The skill tables: `skill`, `skill_version` and `skill_file`. Query them through `SkillRepository`.
- The rules of skills in `SkillService`: create, save, names, moves, permissions and the delete guard.
- The settings page API (`/skills`, `SkillsApiService`) and skills telemetry.

## Boundary

- Agents, MCP and n8n Assistant use skills. This module must not import them. The cli lint config enforces this rule.
- Agent refs and publish pins (`agent_skill_dependency`, `agent_version_skill_dependency`) belong to the agents module.
- When this module needs to know about agents, it asks `SkillAgentsProxy`. The agents module registers the provider on init.
- The provider is the dependency on agents. Skills are off until a provider is registered (`SkillAgentsProxy.hasProvider`): with the agents module off, the delete and move guards cannot see which agents use a skill. Every entry point (REST, MCP, n8n Assistant) checks this one gate. Do not check `isActive('agents')` in this module.
- This module cannot be disabled while the agents module is on: agents keep their skills only in the hub. `ModuleRegistry.eligibleModules` keeps `skills` eligible and logs a warning.
- New callers (for example, import and export, or n8n Assistant tools) import the services of this module, not agents internals. n8n Assistant reaches `SkillsApiService` through `instance-ai-skills.adapter.ts` in the instance-ai module.
