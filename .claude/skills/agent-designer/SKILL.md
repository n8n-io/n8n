---
name: "agent-designer"
description: "Use when the user asks to design a multi-agent system, pick an orchestration pattern (supervisor/swarm/pipeline), generate tool schemas for agents, or evaluate agent execution logs for cost, latency, and failure bottlenecks. Examples: 'design an agent architecture for research automation', 'generate Anthropic tool schemas from these tool descriptions', 'analyze these agent run logs for bottlenecks'. NOT for Claude Code workflow files (use workflow-builder) or single-agent prompt design (use agent-workflow-designer)."
---

# Agent Designer — Multi-Agent System Architecture

Design, schema-generate, and evaluate multi-agent systems with three deterministic tools. The scripts are the workflow — do not freehand an architecture when the planner can score one from requirements.

## When to use

- Designing a new multi-agent system from requirements (pattern choice, roles, comms)
- Generating provider-ready tool schemas (Anthropic + OpenAI formats) from plain tool descriptions
- Evaluating execution logs: success rate, latency distribution, cost, bottlenecks

**When NOT to use:** Claude Code Workflow-tool automations → `workflow-builder`; single-agent workflow scaffolds → `agent-workflow-designer`; multi-agent fan-out at runtime → `agenthub`.

## Pattern decision table

| Choose | When | Watch out for |
|---|---|---|
| Single agent | One bounded task, < ~5 tools | Don't add agents you don't need |
| Supervisor | Central decomposition, specialists report back | Supervisor becomes the bottleneck |
| Pipeline | Strictly sequential stages with handoffs | Rigid order; slowest stage gates throughput |
| Hierarchical | Multiple org layers, > ~8 agents | Communication overhead per level |
| Swarm | Parallel peers, fault tolerance over predictability | Hard to debug; needs consensus rules |

The planner applies this scoring deterministically — run it rather than picking by feel.

## Workflow

All paths relative to this skill folder. Each step's JSON output is the next step's design input.

### 1. Design the architecture

Write a requirements JSON (copy `assets/sample_system_requirements.json` — keys: `goal`, `tasks[]`, `constraints{max_response_time, budget_per_task, concurrent_tasks}`, `team_size`):

```bash
python3 agent_planner.py requirements.json --format json -o arch
```

Emits `arch.json` with `architecture_design` (pattern, agents, communication links), `mermaid_diagram`, and `implementation_roadmap`. Read `architecture_design.pattern` and the per-agent role list; present the mermaid diagram to the user.

### 2. Generate tool schemas

Describe each agent's tools in plain JSON (copy `assets/sample_tool_descriptions.json`), then:

```bash
python3 tool_schema_generator.py tool_descriptions.json --validate -o tools
```

Emits `tools.json` (`tool_schemas`, `validation_summary`) plus provider-specific `tools_anthropic.json` / `tools_openai.json`. **Gate: every tool must print `✓ Valid`.** Fix any invalid schema before proceeding — never hand an agent an unvalidated schema.

### 3. Evaluate execution logs

Once the system runs (or against `assets/sample_execution_logs.json` for a dry run):

```bash
python3 agent_evaluator.py execution_logs.json --detailed -o eval
```

Emits `eval.json` with `summary`, `agent_metrics`, `bottleneck_analysis`, `error_analysis`, `cost_breakdown`, `sla_compliance`, and `optimization_recommendations`, plus split files (`eval_errors.json`, `eval_recommendations.json`).

### 4. Verification loop

The design is not done until:

1. `tool_schema_generator.py --validate` reports 0 invalid schemas.
2. `agent_evaluator.py` on a pilot run reports **0 critical issues** (the tool prints `CRITICAL: N critical issues` when found). If N > 0, apply the top item in `eval_recommendations.json`, re-run the pilot, and re-evaluate.
3. Compare your outputs against `expected_outputs/` to confirm the schema shape you're consuming hasn't drifted.

## References

- `references/agent_architecture_patterns.md` — pattern trade-offs in depth
- `references/tool_design_best_practices.md` — schema, idempotency, error-handling rules
- `references/evaluation_methodology.md` — metric definitions the evaluator implements
