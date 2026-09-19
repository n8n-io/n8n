# Agent Compiler

The agent compiler is the path behind `build-agent`. It replaces the embedded
LLM "Agent Builder" sub-agent. As in `docs/workflow-compiler.md`, the model
only scores bounded options; deterministic code extracts requirements, plans
an `AgentIR`, compiles the `AgentJsonConfig`, validates it and hands it to
the agents module.

> **The model chooses bounded semantic options. The compiler owns the config.
> The validator and Preview scenarios own correctness.**

```text
request (+ workflows built this session) → requirements (deterministic)
  → capability catalog (channels, workflows, agents, operations, model)
  → one decision wave (tool operations, ambiguous sub-agents)
  → AgentIR → compile → validate → scenarios → writeAgentArtifact
```

| Folder | Responsibility |
|---|---|
| `ir/` | `AgentIR`: name, purpose, structured instructions, channels, model, tools (workflow / node / custom), skills, tasks, sub-agents, memory, MCP servers, options |
| `catalog/`, `requirements/` | `AgentCapabilityCatalog` from the builder delegate (reuses the workflow `NodeRegistry`); extraction and two-stage completeness |
| `compiler/` | Deterministic `AgentIR → AgentJsonConfig` plus skill and task bodies; the system prompt comes from a fixed template that keeps the user's words verbatim |
| `validation/`, `scenarios/` | Schema, references, channels and runnability report with `not_run` levels; one behavior scenario per tool, sub-agent, task, direct answer and refusal |
| `modes/`, `session/`, `service.ts` | `create` (plan IR), `edit` (minimal `AgentPatch[]`, untouched fields carry over), sessions, `AgentCompilerService` |

Decisions use the workflow compiler's decision service and policy: one read
for tool operations (retrieval narrows candidates, `none_of_these` is always
present) and one for an ambiguous sub-agent or edit target. Approval policy
is code: write operations require approval unless the user said otherwise.

`build-agent` persists through the delegate's `writeAgentArtifact` (config
update fenced on the hash read before planning, then skills and tasks).
Agents without a resolvable model are saved as drafts (`runnable: warn`).
Action `verify` runs every scenario in Preview through `runAgentPreview` and
reports `scenarioCoverage`; a scenario counts only when the run invoked the
expected tool, or no tool for a direct question. Configuration is shared
with the workflow compiler (`docs/configuration.md`).
