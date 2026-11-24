# Workflow Pattern Templates

## Sequential

Use when each step depends on prior output.

```json
{
  "pattern": "sequential",
  "steps": ["research", "draft", "review"]
}
```

## Parallel

Use when independent tasks can fan out and then fan in.

```json
{
  "pattern": "parallel",
  "fan_out": ["task_a", "task_b", "task_c"],
  "fan_in": "synthesizer"
}
```

## Router

Use when tasks must be routed to specialized handlers by intent.

```json
{
  "pattern": "router",
  "router": "intent_router",
  "routes": ["sales", "support", "engineering"],
  "fallback": "generalist"
}
```

## Orchestrator

Use when dynamic planning and dependency management are required.

```json
{
  "pattern": "orchestrator",
  "orchestrator": "planner",
  "specialists": ["researcher", "analyst", "coder"],
  "dependency_mode": "dag"
}
```

## Evaluator

Use when output quality gates are mandatory before finalization.

```json
{
  "pattern": "evaluator",
  "generator": "content_agent",
  "evaluator": "quality_agent",
  "max_iterations": 3,
  "pass_threshold": 0.8
}
```

## Pattern Selection Heuristics

- Choose `sequential` for strict linear workflows.
- Choose `parallel` for throughput and latency reduction.
- Choose `router` for intent- or type-based branching.
- Choose `orchestrator` for complex adaptive workflows.
- Choose `evaluator` when correctness/quality loops are required.

## Handoff Minimum Contract

- `workflow_id`
- `step_id`
- `task`
- `constraints`
- `upstream_artifacts`
- `budget_tokens`
- `timeout_seconds`
