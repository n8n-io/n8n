---
name: n8n:agent-modal-design
description: Standardize or review modal interfaces in the Agent Builder. Use for Agent schedules, channels, tools, MCP servers, workflows, skills, sub-agents, vector stores, and Agent-only modal utilities.
---

# Agent modal design

Use this skill only for modal work in
`packages/frontend/editor-ui/src/features/agents`.

Before you change code:

1. Read `packages/frontend/editor-ui/src/features/agents/AGENTS.md`.
2. Read `reference.md` in this skill directory.
3. Inspect `AgentModal.vue` and `AgentModalMultiStep.vue`.
4. Use `n8n:ui-design` for visual implementation rules.
5. Use `n8n:content-design` when you add or change UI text.

Do not change the Design System for this pattern. Add reusable behavior to the
Agent feature components. Keep all changes inside the Agents scope unless an
existing shared component needs an opt-in prop.

Use the canonical Storybook stories in `AgentModal.stories.ts` as the visual
reference. Add or update unit tests for shell behavior and for each migrated
flow.
