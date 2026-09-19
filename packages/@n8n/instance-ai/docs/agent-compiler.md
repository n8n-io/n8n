# Agent Compiler

The agent compiler is the path behind `build-agent`. It replaces the embedded
LLM "Agent Builder" sub-agent that used to write the agent configuration
through `write_config` / `patch_config`. Like the workflow compiler
(`docs/workflow-compiler.md`), the model only scores bounded options;
deterministic code extracts requirements, plans a typed IR, compiles the
`AgentJsonConfig`, validates it and hands it to the agents module to persist.

> **The model chooses bounded semantic options. The compiler owns the config.
> The validator and Preview scenarios own correctness.**

## Pipeline

```text
User request (+ workflows built this session)
     │
     ▼
Requirement extraction (deterministic)          src/agent-compiler/requirements
  name · purpose · channels · tool actions · workflow tools · sub-agents
  schedules · memory · web search · model provider · approval policy · rules
     │
     ├── unsupported channel / no purpose → clarification
     ▼
Capability catalog (loaded once per build)      src/agent-compiler/catalog
  channels · attachable workflows · project agents · node operations · default model
     │
     ▼
One decision wave (tool operations, ambiguous sub-agents)
     │
     ├── low confidence / none_of_these → clarification
     ├── workflow tool that does not exist → needs_artifacts
     ▼
Agent IR → compile → validate                    ir/, compiler/, validation/
     │
     ▼
Scenario enumeration (behavior paths)            scenarios/
     │
     ▼
Builder delegate `writeAgentArtifact` (config fenced on the read hash, skills, tasks)
```

## Modules

| Folder | Responsibility |
|---|---|
| `ir/` | `AgentIR`: name, purpose, structured instructions, channels, model choice, tools (workflow / node / custom), skills, tasks, sub-agents, memory, MCP servers, options |
| `catalog/` | `AgentCapabilityCatalog` loaded from the builder delegate; reuses the workflow compiler's `NodeRegistry` for node tools |
| `requirements/` | Extraction from text, two-stage completeness (behavior, then resources) |
| `compiler/` | Deterministic `AgentIR → AgentJsonConfig` plus skill and task bodies; the system prompt is rendered from a fixed template (`instructions.ts`) that keeps the user's own words verbatim |
| `validation/` | Schema (`AgentJsonConfigSchema`), references (workflows, sub-agents, operations), channels and credentials, runnability; explicit report with `not_run` levels |
| `scenarios/` | Behavior-path enumeration (one scenario per tool, sub-agent, task, direct answer, refusal) and coverage scoring |
| `modes/` | `create` (plan IR), `edit` (minimal `AgentPatch[]` on the existing config, untouched fields carry over) |
| `service.ts` | `AgentCompilerService`: sessions, clarification loop, diagnostics |

## Decisions

The same decision service and policy as the workflow compiler
(`src/workflow-compiler/decision`): one batched read for tool operations
(retrieval narrows candidates, `none_of_these` is always present), one read
for an ambiguous sub-agent or edit target. Approval policy is code: write
operations require approval unless the user said otherwise.

## Persistence and verification

`build-agent` persists through the builder delegate's `writeAgentArtifact`
(cli: `AgentConfigService.updateConfig` fenced on the config hash read before
planning, then `AgentSkillsService.createSkills` and `AgentTaskService.createTasks`).
Draft agents without a resolvable model are saved as drafts and reported as
`runnable: warn`.

`build-agent` action `verify` runs every enumerated scenario in Preview
through the delegate's `runAgentPreview` and reports `scenarioCoverage`:
which tool paths the agent actually took. A scenario counts only when the
run invoked the expected tool (or, for a direct question, no tool at all).

## Configuration

The agent compiler shares `N8N_INSTANCE_AI_DECISION_URL` and related
variables with the workflow compiler (`docs/configuration.md`).
